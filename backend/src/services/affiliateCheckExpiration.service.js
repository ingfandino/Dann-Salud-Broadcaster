"use strict";

const mongoose = require("mongoose");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const {
    rebuildOperationalStateForAffiliateIds
} = require("./affiliateOperationalState.service");
const logger = require("../utils/logger").getLogger("affiliate-check-expiration");

const EXPIRATION_BATCH_SIZE = Number(process.env.AFFILIATE_CHECK_EXPIRATION_BATCH_SIZE || 100);
const EXPIRATION_REASON = "ownership_period_elapsed";

function asObjectId(value) {
    if (!value || !mongoose.isValidObjectId(value)) return null;
    return new mongoose.Types.ObjectId(value);
}

function createStats({ now = new Date(), limit = EXPIRATION_BATCH_SIZE, dryRun = false } = {}) {
    return {
        dryRun,
        now,
        batchSize: limit,
        scanned: 0,
        eligible: 0,
        expired: 0,
        skippedNotDue: 0,
        skippedChanged: 0,
        alreadyExpired: 0,
        missingExpiresAt: 0,
        duplicateActiveAssignmentAnomalies: 0,
        operationalStateUpdated: 0,
        operationalStateFailed: 0,
        errors: 0,
        durationMs: 0,
        effects: {
            availableGeneralStock: 0,
            reusableRecheckRequired: 0,
            blockedByQrSale: 0,
            blockedByActiveReservation: 0,
            stillOwnedByAnotherAssignment: 0,
            unavailableOther: 0
        },
        safeToExecute: true
    };
}

function effectKeyForState(state) {
    if (state?.ownership?.supervisorId) return "stillOwnedByAnotherAssignment";
    if (state?.unavailableReason === "checking_in_progress") return "blockedByActiveReservation";
    if (["qr_done", "in_progress"].includes(state?.saleStatus)
        || state?.unavailableReason === "sold_qr_done") return "blockedByQrSale";
    if (state?.verificationStatus === "expired"
        || state?.unavailableReason === "verification_expired") return "reusableRecheckRequired";
    if (state?.availableForSale === true) return "availableGeneralStock";
    return "unavailableOther";
}

function countEffects(stats, states = []) {
    for (const state of states) {
        const key = effectKeyForState(state);
        stats.effects[key] += 1;
    }
}

function dueAssignmentQuery(now) {
    return {
        status: "active",
        expiresAt: { $ne: null, $lte: now }
    };
}

function activeAssignmentQuery(affiliateIds) {
    return {
        affiliateId: { $in: affiliateIds },
        status: "active"
    };
}

async function countDuplicateActiveAssignments(affiliateIds) {
    const ids = Array.from(new Set((affiliateIds || []).map(String)))
        .filter(mongoose.isValidObjectId)
        .map(id => new mongoose.Types.ObjectId(id));
    if (ids.length === 0) return 0;

    const duplicateGroups = await AffiliateAssignment.aggregate([
        { $match: activeAssignmentQuery(ids) },
        { $group: { _id: "$affiliateId", count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $count: "groups" }
    ]);
    return duplicateGroups[0]?.groups || 0;
}

async function loadDueAssignments({ now, limit }) {
    return AffiliateAssignment.find(dueAssignmentQuery(now))
        .sort({ expiresAt: 1, _id: 1 })
        .limit(limit)
        .lean();
}

async function previewExpirationEffects(assignments, { now }) {
    const affiliateIds = assignments.map(item => item.affiliateId).filter(Boolean);
    const excludedAssignmentIds = assignments.map(item => item._id).filter(Boolean);
    if (affiliateIds.length === 0) return [];
    const preview = await rebuildOperationalStateForAffiliateIds(affiliateIds, {
        dryRun: true,
        now,
        excludedAssignmentIds
    });
    return preview.states || [];
}

async function auditAffiliateCheckExpiration({ now = new Date(), limit = EXPIRATION_BATCH_SIZE } = {}) {
    const startedAt = Date.now();
    const stats = createStats({ now, limit, dryRun: true });
    const activeAssignments = await AffiliateAssignment.find({ status: "active" })
        .sort({ expiresAt: 1, _id: 1 })
        .limit(limit)
        .lean();

    stats.scanned = activeAssignments.length;
    const due = [];
    const affiliateIds = [];
    for (const assignment of activeAssignments) {
        if (!assignment.expiresAt) {
            stats.missingExpiresAt += 1;
            continue;
        }
        if (new Date(assignment.expiresAt) > now) {
            stats.skippedNotDue += 1;
            continue;
        }
        due.push(assignment);
        affiliateIds.push(assignment.affiliateId);
    }

    stats.eligible = due.length;
    stats.duplicateActiveAssignmentAnomalies = await countDuplicateActiveAssignments(affiliateIds);
    if (stats.duplicateActiveAssignmentAnomalies > 0) {
        stats.safeToExecute = false;
    }
    const states = await previewExpirationEffects(due, { now });
    countEffects(stats, states);
    stats.durationMs = Date.now() - startedAt;
    return stats;
}

async function expireAssignment(assignment, now = new Date(), { rebuildState = true } = {}) {
    const assignmentId = asObjectId(assignment?._id);
    if (!assignmentId) return { skipped: true, reason: "invalid_assignment" };
    if (assignment.status && assignment.status !== "active") {
        return {
            skipped: true,
            reason: assignment.status === "expired" ? "already_expired" : "already_transitioned"
        };
    }
    if (!assignment.expiresAt || new Date(assignment.expiresAt) > now) {
        return { skipped: true, reason: "not_due" };
    }

    const updated = await AffiliateAssignment.findOneAndUpdate(
        {
            _id: assignmentId,
            status: "active",
            expiresAt: assignment.expiresAt
        },
        {
            $set: {
                status: "expired",
                expiredAt: now,
                expirationReason: EXPIRATION_REASON
            }
        },
        { new: true }
    ).lean();

    if (!updated) {
        const current = await AffiliateAssignment.findById(assignmentId)
            .select("status expiresAt")
            .lean();
        return {
            skipped: true,
            reason: current?.status === "expired" ? "already_expired" : "already_transitioned"
        };
    }

    let operationalState = null;
    if (rebuildState && updated.affiliateId) {
        const rebuild = await rebuildOperationalStateForAffiliateIds([updated.affiliateId], { now });
        operationalState = rebuild.states?.[0] || null;
    }

    logger.info(`[EXPIRATION] Expired assignment assignmentId=${updated._id} affiliateId=${updated.affiliateId} sourceJobId=${updated.sourceJobId || "none"} supervisorId=${updated.supervisorId || "none"}`);
    return { expired: true, assignment: updated, operationalState };
}

async function expireStaleAssignments({ now = new Date(), limit = EXPIRATION_BATCH_SIZE, rebuildOperationalState = rebuildOperationalStateForAffiliateIds } = {}) {
    const startedAt = Date.now();
    const stats = createStats({ now, limit, dryRun: false });
    const assignments = await loadDueAssignments({ now, limit });
    stats.scanned = assignments.length;
    stats.eligible = assignments.length;

    const affiliateIds = assignments.map(item => item.affiliateId).filter(Boolean);
    stats.duplicateActiveAssignmentAnomalies = await countDuplicateActiveAssignments(affiliateIds);
    const blockedAffiliates = new Set();
    if (stats.duplicateActiveAssignmentAnomalies > 0) {
        const duplicateGroups = await AffiliateAssignment.aggregate([
            { $match: activeAssignmentQuery(affiliateIds) },
            { $group: { _id: "$affiliateId", count: { $sum: 1 } } },
            { $match: { count: { $gt: 1 } } }
        ]);
        for (const group of duplicateGroups) blockedAffiliates.add(String(group._id));
        logger.warn(`[EXPIRATION] duplicate_active_assignments groups=${duplicateGroups.length}; affected affiliates skipped`);
    }

    const expiredAffiliateIds = [];
    for (const assignment of assignments) {
        try {
            if (blockedAffiliates.has(String(assignment.affiliateId))) {
                stats.skippedChanged += 1;
                continue;
            }
            const result = await expireAssignment(assignment, now, { rebuildState: false });
            if (result.expired) {
                stats.expired += 1;
                expiredAffiliateIds.push(result.assignment.affiliateId);
            } else if (result.reason === "already_expired") {
                stats.alreadyExpired += 1;
            } else if (result.reason === "not_due") {
                stats.skippedNotDue += 1;
            } else {
                stats.skippedChanged += 1;
            }
        } catch (error) {
            stats.errors += 1;
            logger.error(`[EXPIRATION] Error expiring assignment assignmentId=${assignment._id}: ${error.message}`);
        }
    }

    if (expiredAffiliateIds.length > 0) {
        try {
            const rebuild = await rebuildOperationalState(expiredAffiliateIds, { now });
            stats.operationalStateUpdated = (rebuild.created || 0) + (rebuild.updated || 0);
            countEffects(stats, rebuild.states || []);
        } catch (error) {
            stats.operationalStateFailed = expiredAffiliateIds.length;
            stats.errors += 1;
            logger.warn(`[EXPIRATION] Operational-state rebuild failed after expiration count=${expiredAffiliateIds.length}: ${error.message}`);
        }
    }

    stats.durationMs = Date.now() - startedAt;
    logger.info(`[EXPIRATION] batch scanned=${stats.scanned} eligible=${stats.eligible} expired=${stats.expired} skippedNotDue=${stats.skippedNotDue} skippedChanged=${stats.skippedChanged} alreadyExpired=${stats.alreadyExpired} operationalStateUpdated=${stats.operationalStateUpdated} operationalStateFailed=${stats.operationalStateFailed} errors=${stats.errors} durationMs=${stats.durationMs}`);
    return stats;
}

module.exports = {
    EXPIRATION_REASON,
    auditAffiliateCheckExpiration,
    expireAssignment,
    expireStaleAssignments
};
