"use strict";

const mongoose = require("mongoose");
const Affiliate = require("../models/Affiliate");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckConfig = require("../models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const Audit = require("../models/Audit");
const { normalizeCuil, isValidNormalizedCuil } = require("../utils/cuilUtils");
const logger = require("../utils/logger").getLogger("affiliate-check");

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_OWNERSHIP_DAYS = 30;
const DEFAULT_VERIFICATION_EXPIRY_DAYS = 30;
const CALCULATION_VERSION = "phase2_v1";
const ALLOWED_DATA_SOURCES = new Set(["fresh", "reusable", "extra"]);
const ACTIVE_RESERVATION_JOB_STATUSES = new Set(["pending", "processing", "pausing", "paused", "retrying", "stuck"]);
const REJECTED_AUDIT_STATUSES = new Set(["rechazada"]);
const FAILED_AUDIT_STATUSES = new Set([
    "caida",
    "caída",
    "fallido",
    "remuneracion no valida",
    "remuneración no válida"
]);

function addDays(date, days) {
    return date ? new Date(new Date(date).getTime() + Number(days || 0) * DAY_MS) : null;
}

async function loadOperationalStateConfig() {
    const config = await AffiliateCheckConfig.findOne({ active: true }).lean();
    return {
        ownershipDays: Number(config?.ownershipDays || DEFAULT_OWNERSHIP_DAYS),
        verificationExpiryDays: Number(config?.verificationExpiryDays || DEFAULT_VERIFICATION_EXPIRY_DAYS)
    };
}

function normalizedStatus(value) {
    return String(value || "").trim().toLocaleLowerCase("es");
}

function buildCuilStorageVariants(cuil) {
    if (!isValidNormalizedCuil(cuil)) return [];
    return [
        cuil,
        `${cuil.slice(0, 2)}-${cuil.slice(2, 10)}-${cuil.slice(10)}`,
        `${cuil.slice(0, 2)}.${cuil.slice(2, 10)}.${cuil.slice(10)}`,
        `${cuil.slice(0, 2)} ${cuil.slice(2, 10)} ${cuil.slice(10)}`
    ];
}

function auditDate(audit) {
    return new Date(
        audit.statusUpdatedAt || audit.updatedAt || audit.createdAt || 0
    ).getTime();
}

function selectAuditState(audits = []) {
    const sorted = [...audits].sort((left, right) => auditDate(right) - auditDate(left));
    const qrAudit = sorted.find(audit => normalizedStatus(audit.status) === "qr hecho");
    if (qrAudit) return { saleStatus: "qr_done", lastAuditId: qrAudit._id };

    const activeAudit = sorted.find(audit => {
        const status = normalizedStatus(audit.status);
        return status
            && !REJECTED_AUDIT_STATUSES.has(status)
            && !FAILED_AUDIT_STATUSES.has(status);
    });
    if (activeAudit) {
        return { saleStatus: "in_progress", lastAuditId: activeAudit._id };
    }

    const latest = sorted[0];
    if (!latest) return { saleStatus: "none", lastAuditId: null };
    const latestStatus = normalizedStatus(latest.status);
    if (REJECTED_AUDIT_STATUSES.has(latestStatus)) {
        return { saleStatus: "rejected", lastAuditId: latest._id };
    }
    if (FAILED_AUDIT_STATUSES.has(latestStatus)) {
        return { saleStatus: "failed", lastAuditId: latest._id };
    }
    return { saleStatus: "none", lastAuditId: latest._id };
}

function calculateFreshness(affiliate) {
    if (ALLOWED_DATA_SOURCES.has(affiliate.dataSource)) return affiliate.dataSource;
    if (affiliate.dataSource) return "unknown";
    return affiliate.isUsed === true || affiliate.ultimoUso ? "reusable" : "fresh";
}

function calculateUsage(affiliate, config) {
    let usageStatus = "never_used";
    if (affiliate.active === false) usageStatus = "blocked";
    else if (affiliate.leadStatus === "Reutilizable") usageStatus = "reusable";
    else if (affiliate.assignedTo) usageStatus = "assigned";
    else if (affiliate.exported === true) usageStatus = "exported";
    else if (affiliate.isUsed === true) usageStatus = "worked";

    const lastUsedAt = affiliate.ultimoUso
        || affiliate.exportedAt
        || affiliate.assignedAt
        || null;

    return {
        usageStatus,
        lastUsedAt,
        reusableAfter: addDays(lastUsedAt, config.verificationExpiryDays)
    };
}

function calculateVerification(contribution, now, config) {
    if (!contribution) {
        return {
            verificationStatus: "unchecked",
            lastCheckedAt: null,
            verificationExpiresAt: null,
            canSell: null
        };
    }

    const sourceStatus = contribution.verification?.status;
    const lastCheckedAt = contribution.verification?.checkedAt || null;
    const verificationExpiresAt = addDays(lastCheckedAt, config.verificationExpiryDays);
    const statusMap = {
        pending: "unchecked",
        success: "checked",
        no_data: "no_data",
        captcha: "captcha",
        error: "error"
    };
    let verificationStatus = statusMap[sourceStatus] || "unchecked";

    if (lastCheckedAt && verificationExpiresAt <= now) {
        verificationStatus = "expired";
    }

    return {
        verificationStatus,
        lastCheckedAt,
        verificationExpiresAt,
        canSell: contribution.canSell ?? null
    };
}

function selectActiveAssignment(assignments = [], affiliateId) {
    if (assignments.length === 0) return null;
    const sorted = [...assignments].sort((left, right) => {
        const leftAssignedAt = new Date(left.assignedAt || left.createdAt || 0).getTime();
        const rightAssignedAt = new Date(right.assignedAt || right.createdAt || 0).getTime();
        if (rightAssignedAt !== leftAssignedAt) return rightAssignedAt - leftAssignedAt;
        return String(right._id).localeCompare(String(left._id));
    });
    if (sorted.length > 1) {
        logger.warn(`[AFFILIATE-OPSTATE] Multiple active assignments for affiliateId=${affiliateId}; using assignmentId=${sorted[0]._id}`);
    }
    return sorted[0];
}

function calculateOwnership({ affiliate, assignment, config }) {
    if (assignment) {
        return {
            supervisorId: assignment.supervisorId || null,
            teamId: assignment.teamId || null,
            assignedAt: assignment.assignedAt || assignment.createdAt || null,
            expiresAt: assignment.expiresAt || null,
            source: assignment.source || "manual"
        };
    }

    const ownershipAssignedAt = affiliate.exportedAt || affiliate.assignedAt || null;
    return {
        supervisorId: affiliate.exportedTo || null,
        teamId: null,
        assignedAt: ownershipAssignedAt,
        expiresAt: addDays(ownershipAssignedAt, config.ownershipDays),
        source: affiliate.exportedTo || ownershipAssignedAt ? "legacy" : null
    };
}

function determineAvailability({
    affiliate,
    verificationStatus,
    canSell,
    saleStatus,
    usageStatus,
    ownership,
    activeReservation,
    now
}) {
    let unavailableReason = null;
    if (affiliate.active === false) unavailableReason = "inactive_affiliate";
    else if (activeReservation) unavailableReason = "checking_in_progress";
    else if (saleStatus === "qr_done") unavailableReason = "sold_qr_done";
    else if (verificationStatus === "expired") unavailableReason = "verification_expired";
    else if (verificationStatus !== "checked") unavailableReason = "unchecked";
    else if (canSell !== true) unavailableReason = "cannot_sell";
    else if (usageStatus === "blocked") unavailableReason = "blocked";
    else if (
        ownership.supervisorId
        && (!ownership.expiresAt || ownership.expiresAt > now)
    ) unavailableReason = "assigned_to_supervisor";

    return {
        availableForSale: unavailableReason === null,
        unavailableReason
    };
}

function buildOperationalStateForAffiliate({
    affiliate,
    contribution = null,
    audits = [],
    activeAssignment = null,
    reservation = null,
    now = new Date(),
    config = {
        ownershipDays: DEFAULT_OWNERSHIP_DAYS,
        verificationExpiryDays: DEFAULT_VERIFICATION_EXPIRY_DAYS
    }
}) {
    const cuilNormalized = normalizeCuil(affiliate?.cuil);
    if (!affiliate?._id || !isValidNormalizedCuil(cuilNormalized)) return null;

    const freshness = calculateFreshness(affiliate);
    const usage = calculateUsage(affiliate, config);
    const verification = calculateVerification(contribution, now, config);
    const sale = selectAuditState(audits);
    const ownership = calculateOwnership({ affiliate, assignment: activeAssignment, config });
    const effectiveUsageStatus = ownership.supervisorId
        && (!ownership.expiresAt || ownership.expiresAt > now)
        ? "assigned"
        : usage.usageStatus;
    const availability = determineAvailability({
        affiliate,
        verificationStatus: verification.verificationStatus,
        canSell: verification.canSell,
        saleStatus: sale.saleStatus,
        usageStatus: effectiveUsageStatus,
        ownership,
        activeReservation: Boolean(reservation?.active),
        now
    });

    return {
        affiliateId: affiliate._id,
        cuil: cuilNormalized,
        cuilNormalized,
        freshness,
        verificationStatus: verification.verificationStatus,
        usageStatus: effectiveUsageStatus,
        saleStatus: sale.saleStatus,
        canSell: verification.canSell,
        availableForSale: availability.availableForSale,
        unavailableReason: availability.unavailableReason,
        lastCheckedAt: verification.lastCheckedAt,
        verificationExpiresAt: verification.verificationExpiresAt,
        lastUsedAt: usage.lastUsedAt,
        reusableAfter: usage.reusableAfter,
        ownership,
        obraSocial: affiliate.obraSocial || null,
        localidad: affiliate.localidad || null,
        dataSource: ALLOWED_DATA_SOURCES.has(affiliate.dataSource)
            ? affiliate.dataSource
            : "unknown",
        sourceFile: affiliate.sourceFile || null,
        batchId: affiliate.batchId || null,
        uploadDate: affiliate.uploadDate || null,
        contributionId: contribution?._id || null,
        lastAuditId: sale.lastAuditId,
        currentCheckJobId: reservation?.jobId || null,
        currentCheckStartedAt: reservation?.startedAt || null,
        calculatedAt: now,
        calculationVersion: CALCULATION_VERSION
    };
}

function groupAuditsByCuil(audits) {
    const grouped = new Map();
    for (const audit of audits) {
        const cuil = normalizeCuil(audit.cuilNormalized || audit.cuil);
        if (!isValidNormalizedCuil(cuil)) continue;
        if (!grouped.has(cuil)) grouped.set(cuil, []);
        grouped.get(cuil).push(audit);
    }
    return grouped;
}

async function rebuildOperationalStateForAffiliateIds(
    affiliateIds,
    { dryRun = false, now = new Date(), excludedAssignmentIds = [] } = {}
) {
    const ids = Array.from(new Set((affiliateIds || []).map(String)))
        .filter(mongoose.isValidObjectId);
    if (ids.length === 0) {
        return {
            scanned: 0,
            wouldCreate: 0,
            wouldUpdate: 0,
            skipped: 0,
            created: 0,
            updated: 0,
            states: []
        };
    }

    const affiliates = await Affiliate.find(
        { _id: { $in: ids } },
        {
            cuil: 1,
            obraSocial: 1,
            localidad: 1,
            dataSource: 1,
            sourceFile: 1,
            batchId: 1,
            uploadDate: 1,
            active: 1,
            exported: 1,
            exportedAt: 1,
            exportedTo: 1,
            leadStatus: 1,
            assignedTo: 1,
            assignedAt: 1,
            isUsed: 1,
            ultimoUso: 1
        }
    ).lean();

    const validAffiliates = affiliates.filter(affiliate =>
        isValidNormalizedCuil(normalizeCuil(affiliate.cuil))
    );
    const validIds = validAffiliates.map(affiliate => affiliate._id);
    const cuils = Array.from(new Set(
        validAffiliates.map(affiliate => normalizeCuil(affiliate.cuil))
    ));
    const rawCuilVariants = cuils.flatMap(buildCuilStorageVariants);

    const config = await loadOperationalStateConfig();
    const excludedAssignmentObjectIds = Array.from(new Set((excludedAssignmentIds || []).map(String)))
        .filter(mongoose.isValidObjectId)
        .map(id => new mongoose.Types.ObjectId(id));
    const assignmentFilter = {
        affiliateId: { $in: validIds },
        status: "active",
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
        ...(excludedAssignmentObjectIds.length > 0 ? { _id: { $nin: excludedAssignmentObjectIds } } : {})
    };
    const [contributions, assignments, audits, existingStates] = await Promise.all([
        AffiliateContribution.find(
            { affiliateId: { $in: validIds } },
            { affiliateId: 1, canSell: 1, verification: 1 }
        ).lean(),
        AffiliateAssignment.find(
            assignmentFilter,
            {
                affiliateId: 1,
                supervisorId: 1,
                teamId: 1,
                source: 1,
                sourceJobId: 1,
                assignedAt: 1,
                expiresAt: 1,
                createdAt: 1
            }
        ).sort({ assignedAt: -1, createdAt: -1, _id: -1 }).lean(),
        cuils.length
            ? Audit.find(
                {
                    $or: [
                        { cuilNormalized: { $in: cuils } },
                        { cuil: { $in: rawCuilVariants } }
                    ]
                },
                {
                    cuil: 1,
                    cuilNormalized: 1,
                    status: 1,
                    statusUpdatedAt: 1,
                    createdAt: 1
                }
            ).lean()
            : [],
        AffiliateOperationalState.find(
            { affiliateId: { $in: validIds } },
            { affiliateId: 1, currentCheckJobId: 1, currentCheckStartedAt: 1 }
        ).lean()
    ]);

    const contributionByAffiliate = new Map(
        contributions.map(item => [String(item.affiliateId), item])
    );
    const assignmentsByAffiliate = new Map();
    for (const assignment of assignments) {
        const key = String(assignment.affiliateId);
        if (!assignmentsByAffiliate.has(key)) assignmentsByAffiliate.set(key, []);
        assignmentsByAffiliate.get(key).push(assignment);
    }
    const reservedJobIds = Array.from(new Set(
        existingStates
            .map(item => item.currentCheckJobId)
            .filter(Boolean)
            .map(String)
    )).filter(mongoose.isValidObjectId);
    const reservationJobs = reservedJobIds.length
        ? await AffiliateCheckJob.find(
            { _id: { $in: reservedJobIds } },
            { status: 1 }
        ).lean()
        : [];
    const reservationJobStatusById = new Map(
        reservationJobs.map(job => [String(job._id), job.status])
    );
    const reservationByAffiliate = new Map();
    for (const state of existingStates) {
        const jobId = state.currentCheckJobId ? String(state.currentCheckJobId) : null;
        if (!jobId) continue;
        const status = reservationJobStatusById.get(jobId);
        reservationByAffiliate.set(String(state.affiliateId), {
            jobId: state.currentCheckJobId,
            startedAt: state.currentCheckStartedAt || null,
            status: status || null,
            active: status ? ACTIVE_RESERVATION_JOB_STATUSES.has(status) : true
        });
    }
    const auditsByCuil = groupAuditsByCuil(audits);
    const existingIds = new Set(existingStates.map(item => String(item.affiliateId)));
    const states = validAffiliates.map(affiliate => {
        const cuil = normalizeCuil(affiliate.cuil);
        return buildOperationalStateForAffiliate({
            affiliate,
            contribution: contributionByAffiliate.get(String(affiliate._id)) || null,
            audits: auditsByCuil.get(cuil) || [],
            activeAssignment: selectActiveAssignment(assignmentsByAffiliate.get(String(affiliate._id)) || [], affiliate._id),
            reservation: reservationByAffiliate.get(String(affiliate._id)) || null,
            now,
            config
        });
    }).filter(Boolean);

    const wouldCreate = states.filter(
        state => !existingIds.has(String(state.affiliateId))
    ).length;
    const result = {
        scanned: affiliates.length,
        wouldCreate,
        wouldUpdate: states.length - wouldCreate,
        skipped: affiliates.length - states.length,
        created: 0,
        updated: 0,
        states
    };

    if (dryRun || states.length === 0) return result;

    const writeResult = await AffiliateOperationalState.bulkWrite(
        states.map(state => ({
            updateOne: {
                filter: { affiliateId: state.affiliateId },
                update: { $set: state },
                upsert: true
            }
        })),
        { ordered: false }
    );
    result.created = writeResult.upsertedCount || 0;
    result.updated = writeResult.modifiedCount || 0;
    return result;
}

async function upsertOperationalStateForAffiliate(affiliateId, options = {}) {
    const result = await rebuildOperationalStateForAffiliateIds([affiliateId], options);
    return result.states[0] || null;
}

module.exports = {
    CALCULATION_VERSION,
    buildOperationalStateForAffiliate,
    rebuildOperationalStateForAffiliateIds,
    upsertOperationalStateForAffiliate
};
