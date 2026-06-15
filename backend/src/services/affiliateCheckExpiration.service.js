"use strict";

const mongoose = require("mongoose");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const logger = require("../utils/logger").getLogger("affiliate-check-expiration");

const ACTIVE_JOB_STATUSES = ["pending", "processing", "pausing", "paused", "retrying", "stuck"];
const EXPIRATION_BATCH_SIZE = Number(process.env.AFFILIATE_CHECK_EXPIRATION_BATCH_SIZE || 100);

function deriveUsageStatusAfterExpiration(state) {
    if (!state) return "available";
    if (state.saleStatus === "qr_done") return "blocked";
    if (state.saleStatus === "in_progress") return "blocked";
    if (state.usageStatus === "blocked") return "blocked";
    if (state.verificationStatus === "checked" && state.canSell === true) return "available";
    if (["expired", "error", "no_data", "captcha"].includes(state.verificationStatus)) return "reusable";
    if (state.usageStatus === "never_used") return "never_used";
    return "available";
}

async function hasActiveCheckJob(affiliateId) {
    const state = await AffiliateOperationalState.findOne(
        { affiliateId },
        { currentCheckJobId: 1 }
    ).lean();
    if (!state?.currentCheckJobId) return false;
    const job = await AffiliateCheckJob.findOne({
        _id: state.currentCheckJobId,
        status: { $in: ACTIVE_JOB_STATUSES }
    }).select("_id").lean();
    return !!job;
}

async function hasNewerActiveAssignment(affiliateId, currentAssignmentId) {
    const newer = await AffiliateAssignment.findOne({
        affiliateId,
        status: "active",
        _id: { $ne: currentAssignmentId }
    }).select("_id").lean();
    return !!newer;
}

async function expireAssignment(assignment, now = new Date()) {
    const affiliateId = assignment.affiliateId;

    if (await hasActiveCheckJob(affiliateId)) {
        logger.debug(`[EXPIRATION] Skipping assignment ${assignment._id}: active check job`);
        return { skipped: true, reason: "active_check_job" };
    }

    if (await hasNewerActiveAssignment(affiliateId, assignment._id)) {
        logger.debug(`[EXPIRATION] Skipping assignment ${assignment._id}: newer active assignment`);
        return { skipped: true, reason: "newer_assignment" };
    }

    const updated = await AffiliateAssignment.findOneAndUpdate(
        {
            _id: assignment._id,
            status: "active",
            expiresAt: assignment.expiresAt
        },
        {
            $set: {
                status: "expired",
                expiredAt: now,
                expirationReason: "ownership_period_elapsed"
            }
        },
        { new: true }
    );
    if (!updated) {
        return { skipped: true, reason: "already_transitioned" };
    }

    const state = await AffiliateOperationalState.findOne(
        { affiliateId }
    ).lean();

    if (state) {
        const isStillOwnedBySameSuper = state.ownership?.supervisorId
            && String(state.ownership.supervisorId) === String(assignment.supervisorId);

        if (isStillOwnedBySameSuper) {
            const newUsageStatus = deriveUsageStatusAfterExpiration(state);
            await AffiliateOperationalState.updateOne(
                {
                    affiliateId,
                    currentCheckJobId: null,
                    "ownership.supervisorId": assignment.supervisorId,
                    "ownership.expiresAt": assignment.expiresAt
                },
                {
                    $set: {
                        "ownership.supervisorId": null,
                        "ownership.teamId": null,
                        "ownership.assignedAt": null,
                        "ownership.expiresAt": null,
                        usageStatus: newUsageStatus,
                        calculatedAt: now
                    }
                }
            );
        }
    }

    logger.info(`[EXPIRATION] Expired assignment ${assignment._id} for affiliate ${affiliateId}`);
    return { expired: true };
}

async function expireStaleAssignments({ now = new Date(), limit = EXPIRATION_BATCH_SIZE } = {}) {
    const assignments = await AffiliateAssignment.find({
        status: "active",
        expiresAt: { $lte: now }
    })
        .sort({ expiresAt: 1 })
        .limit(limit)
        .lean();

    const stats = { scanned: assignments.length, expired: 0, skipped: 0, errors: 0 };

    for (const assignment of assignments) {
        try {
            const result = await expireAssignment(assignment, now);
            if (result.expired) stats.expired += 1;
            else stats.skipped += 1;
        } catch (error) {
            stats.errors += 1;
            logger.error(`[EXPIRATION] Error expiring assignment ${assignment._id}: ${error.message}`);
        }
    }

    if (stats.scanned > 0) {
        logger.info(`[EXPIRATION] Batch complete: scanned=${stats.scanned} expired=${stats.expired} skipped=${stats.skipped} errors=${stats.errors}`);
    }

    return stats;
}

module.exports = {
    ACTIVE_JOB_STATUSES,
    deriveUsageStatusAfterExpiration,
    expireAssignment,
    expireStaleAssignments,
    hasActiveCheckJob,
    hasNewerActiveAssignment
};
