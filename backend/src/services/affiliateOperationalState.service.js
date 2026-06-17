"use strict";

const mongoose = require("mongoose");
const Affiliate = require("../models/Affiliate");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const Audit = require("../models/Audit");
const { normalizeCuil, isValidNormalizedCuil } = require("../utils/cuilUtils");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CALCULATION_VERSION = "phase2_v1";
const ALLOWED_DATA_SOURCES = new Set(["fresh", "reusable", "extra"]);
const REJECTED_AUDIT_STATUSES = new Set(["rechazada"]);
const FAILED_AUDIT_STATUSES = new Set([
    "caida",
    "caída",
    "fallido",
    "remuneracion no valida",
    "remuneración no válida"
]);

function addThirtyDays(date) {
    return date ? new Date(new Date(date).getTime() + THIRTY_DAYS_MS) : null;
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

function calculateUsage(affiliate) {
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
        reusableAfter: addThirtyDays(lastUsedAt)
    };
}

function calculateVerification(contribution, now) {
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
    const verificationExpiresAt = addThirtyDays(lastCheckedAt);
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

function determineAvailability({
    affiliate,
    verificationStatus,
    canSell,
    saleStatus,
    usageStatus,
    ownership,
    now
}) {
    let unavailableReason = null;
    if (affiliate.active === false) unavailableReason = "inactive_affiliate";
    else if (verificationStatus === "expired") unavailableReason = "verification_expired";
    else if (verificationStatus !== "checked") unavailableReason = "unchecked";
    else if (saleStatus === "qr_done") unavailableReason = "sold_qr_done";
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
    now = new Date()
}) {
    const cuilNormalized = normalizeCuil(affiliate?.cuil);
    if (!affiliate?._id || !isValidNormalizedCuil(cuilNormalized)) return null;

    const freshness = calculateFreshness(affiliate);
    const usage = calculateUsage(affiliate);
    const verification = calculateVerification(contribution, now);
    const sale = selectAuditState(audits);
    const ownershipAssignedAt = affiliate.exportedAt || affiliate.assignedAt || null;
    const ownership = {
        supervisorId: affiliate.exportedTo || null,
        teamId: null,
        assignedAt: ownershipAssignedAt,
        expiresAt: addThirtyDays(ownershipAssignedAt),
        source: affiliate.exportedTo || ownershipAssignedAt ? "legacy" : null
    };
    const availability = determineAvailability({
        affiliate,
        verificationStatus: verification.verificationStatus,
        canSell: verification.canSell,
        saleStatus: sale.saleStatus,
        usageStatus: usage.usageStatus,
        ownership,
        now
    });

    return {
        affiliateId: affiliate._id,
        cuil: cuilNormalized,
        cuilNormalized,
        freshness,
        verificationStatus: verification.verificationStatus,
        usageStatus: usage.usageStatus,
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
    { dryRun = false, now = new Date() } = {}
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

    const [contributions, audits, existingStates] = await Promise.all([
        AffiliateContribution.find(
            { affiliateId: { $in: validIds } },
            { affiliateId: 1, canSell: 1, verification: 1 }
        ).lean(),
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
            { affiliateId: 1 }
        ).lean()
    ]);

    const contributionByAffiliate = new Map(
        contributions.map(item => [String(item.affiliateId), item])
    );
    const auditsByCuil = groupAuditsByCuil(audits);
    const existingIds = new Set(existingStates.map(item => String(item.affiliateId)));
    const states = validAffiliates.map(affiliate => {
        const cuil = normalizeCuil(affiliate.cuil);
        return buildOperationalStateForAffiliate({
            affiliate,
            contribution: contributionByAffiliate.get(String(affiliate._id)) || null,
            audits: auditsByCuil.get(cuil) || [],
            now
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
