"use strict";

const mongoose = require("mongoose");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const { recordJobHeartbeat, recordJobProgress } = require("./affiliateCheckOperations.service");

const STAGES = ["arca", "dateas", "padron"];
const CLAIMABLE_JOB_STATUSES = ["pending", "processing", "retrying"];
const FINAL_ROW_STATUSES = ["eligible", "assigned", "rejected", "failed", "cancelled"];

function assertStage(stage) {
    if (!STAGES.includes(stage)) throw new Error(`Invalid affiliate check stage: ${stage}`);
}

function normalizeNow(now) {
    const value = now ? new Date(now) : new Date();
    if (Number.isNaN(value.getTime())) throw new Error("Invalid stage timestamp");
    return value;
}

function normalizeLeaseMs(leaseMs) {
    const value = Number(leaseMs);
    if (!Number.isFinite(value) || value <= 0) throw new Error("leaseMs must be greater than zero");
    return value;
}

function stageDefaults(status) {
    return {
        status,
        claimedBy: null,
        claimedAt: null,
        leaseUntil: null,
        heartbeatAt: null,
        attempts: 0,
        maxAttempts: 3,
        errorMessage: null,
        startedAt: null,
        finishedAt: null,
        result: null
    };
}

function initialStages() {
    return {
        arca: stageDefaults("pending"),
        dateas: stageDefaults("pending"),
        padron: stageDefaults("blocked"),
        finalization: { ...stageDefaults("pending"), finalizedAt: null }
    };
}

function plainValue(value) {
    return value && typeof value.toObject === "function" ? value.toObject() : value;
}

function initializeStagesForRow(rowOrPlainObject = {}) {
    const source = plainValue(rowOrPlainObject) || {};
    const sourceStages = plainValue(source.stages) || {};
    const defaults = initialStages();
    const stages = {
        arca: { ...defaults.arca, ...(plainValue(sourceStages.arca) || {}) },
        dateas: { ...defaults.dateas, ...(plainValue(sourceStages.dateas) || {}) },
        padron: { ...defaults.padron, ...(plainValue(sourceStages.padron) || {}) },
        finalization: { ...defaults.finalization, ...(plainValue(sourceStages.finalization) || {}) }
    };
    if (rowOrPlainObject && typeof rowOrPlainObject.set === "function") {
        rowOrPlainObject.set("stages", stages);
        return rowOrPlainObject;
    }
    return { ...source, stages };
}

async function initializeMissingStages(jobIds) {
    if (!jobIds.length) return;
    await AffiliateCheckRow.updateMany(
        { jobId: { $in: jobIds }, status: { $nin: FINAL_ROW_STATUSES }, stages: { $exists: false } },
        { $set: { stages: initialStages() } }
    );
}

async function claimAffiliateCheckStage({ stage, workerId, leaseMs, now = new Date() }) {
    assertStage(stage);
    if (!workerId) throw new Error("workerId is required");
    const claimedAt = normalizeNow(now);
    const leaseUntil = new Date(claimedAt.getTime() + normalizeLeaseMs(leaseMs));
    const jobs = await AffiliateCheckJob.find({ status: { $in: CLAIMABLE_JOB_STATUSES } })
        .sort({ createdAt: 1 }).select("_id").lean();
    const jobIds = jobs.map(job => job._id);
    if (!jobIds.length) return null;
    await initializeMissingStages(jobIds);

    const prefix = `stages.${stage}`;
    const row = await AffiliateCheckRow.findOneAndUpdate(
        {
            jobId: { $in: jobIds },
            status: { $nin: FINAL_ROW_STATUSES },
            $or: [
                { [`${prefix}.status`]: "pending" },
                { [`${prefix}.status`]: "processing", [`${prefix}.leaseUntil`]: { $lt: claimedAt } }
            ],
            $expr: {
                $lt: [
                    { $ifNull: [`$${prefix}.attempts`, 0] },
                    { $ifNull: [`$${prefix}.maxAttempts`, 3] }
                ]
            }
        },
        [{
            $set: {
                [`${prefix}.status`]: "processing",
                [`${prefix}.claimedBy`]: String(workerId),
                [`${prefix}.claimedAt`]: claimedAt,
                [`${prefix}.leaseUntil`]: leaseUntil,
                [`${prefix}.heartbeatAt`]: claimedAt,
                [`${prefix}.attempts`]: { $add: [{ $ifNull: [`$${prefix}.attempts`, 0] }, 1] },
                [`${prefix}.startedAt`]: { $ifNull: [`$${prefix}.startedAt`, claimedAt] },
                [`${prefix}.finishedAt`]: null
            }
        }],
        { new: true, sort: { createdAt: 1, _id: 1 } }
    );
    if (!row) return null;

    await AffiliateCheckJob.updateOne(
        { _id: row.jobId, status: "pending" },
        { $set: { status: "processing", startedAt: claimedAt, finishedAt: null, errorMessage: null } }
    );
    const parent = await AffiliateCheckJob.findById(row.jobId).select("status").lean();
    if (!parent || !CLAIMABLE_JOB_STATUSES.includes(parent.status)) {
        await AffiliateCheckRow.updateOne(
            { _id: row._id, [`${prefix}.status`]: "processing", [`${prefix}.claimedBy`]: String(workerId) },
            { $set: {
                [`${prefix}.status`]: "pending",
                [`${prefix}.claimedBy`]: null,
                [`${prefix}.claimedAt`]: null,
                [`${prefix}.leaseUntil`]: null,
                [`${prefix}.heartbeatAt`]: null
            } }
        );
        return null;
    }
    return row;
}

async function heartbeatAffiliateCheckStage({ rowId, stage, workerId, leaseMs, now = new Date() }) {
    assertStage(stage);
    const heartbeatAt = normalizeNow(now);
    const leaseUntil = new Date(heartbeatAt.getTime() + normalizeLeaseMs(leaseMs));
    const prefix = `stages.${stage}`;
    const row = await AffiliateCheckRow.findOneAndUpdate(
        { _id: rowId, [`${prefix}.status`]: "processing", [`${prefix}.claimedBy`]: String(workerId) },
        { $set: { [`${prefix}.heartbeatAt`]: heartbeatAt, [`${prefix}.leaseUntil`]: leaseUntil } },
        { new: true }
    );
    if (row) await recordJobHeartbeat(row.jobId, heartbeatAt);
    return row;
}

async function completeAffiliateCheckStage({ rowId, stage, workerId, result = null, now = new Date() }) {
    assertStage(stage);
    const finishedAt = normalizeNow(now);
    const prefix = `stages.${stage}`;
    const row = await AffiliateCheckRow.findOneAndUpdate(
        { _id: rowId, [`${prefix}.status`]: "processing", [`${prefix}.claimedBy`]: String(workerId) },
        { $set: {
            [`${prefix}.status`]: "done",
            [`${prefix}.result`]: result,
            [`${prefix}.finishedAt`]: finishedAt,
            [`${prefix}.errorMessage`]: null,
            [`${prefix}.leaseUntil`]: null,
            [`${prefix}.heartbeatAt`]: finishedAt
        } },
        { new: true }
    );
    if (row) await recordJobProgress(row.jobId, finishedAt);
    return row;
}

async function failAffiliateCheckStage({ rowId, stage, workerId, errorMessage, retryable = false, now = new Date() }) {
    assertStage(stage);
    const failedAt = normalizeNow(now);
    const prefix = `stages.${stage}`;
    const row = await AffiliateCheckRow.findOne({
        _id: rowId,
        [`${prefix}.status`]: "processing",
        [`${prefix}.claimedBy`]: String(workerId)
    }).select(`${prefix}.attempts ${prefix}.maxAttempts`);
    if (!row) return null;

    const stageState = row.stages?.[stage];
    const shouldRetry = retryable && stageState.attempts < stageState.maxAttempts;
    const updated = await AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            [`${prefix}.status`]: "processing",
            [`${prefix}.claimedBy`]: String(workerId),
            [`${prefix}.attempts`]: stageState.attempts
        },
        { $set: {
            [`${prefix}.status`]: shouldRetry ? "pending" : "failed",
            [`${prefix}.errorMessage`]: String(errorMessage || "Stage failed"),
            [`${prefix}.leaseUntil`]: null,
            [`${prefix}.heartbeatAt`]: shouldRetry ? null : failedAt,
            [`${prefix}.finishedAt`]: shouldRetry ? null : failedAt
        } },
        { new: true }
    );
    if (updated) await recordJobProgress(updated.jobId, failedAt);
    return updated;
}

async function releaseExpiredAffiliateCheckStages({ stage, now = new Date(), limit = 100 }) {
    assertStage(stage);
    const releasedAt = normalizeNow(now);
    const safeLimit = Math.max(1, Number(limit) || 100);
    const prefix = `stages.${stage}`;
    const activeJobs = await AffiliateCheckJob.find({ status: { $in: CLAIMABLE_JOB_STATUSES } }).select("_id").lean();
    const jobIds = activeJobs.map(job => job._id);
    if (!jobIds.length) return { released: 0, failed: 0 };

    const rows = await AffiliateCheckRow.find({
        jobId: { $in: jobIds },
        status: { $nin: FINAL_ROW_STATUSES },
        [`${prefix}.status`]: "processing",
        [`${prefix}.leaseUntil`]: { $lt: releasedAt }
    }).sort({ [`${prefix}.leaseUntil`]: 1, _id: 1 }).limit(safeLimit)
        .select(`${prefix}.attempts ${prefix}.maxAttempts`).lean();

    let released = 0;
    let failed = 0;
    for (const row of rows) {
        const stageState = row.stages?.[stage] || {};
        const exhausted = Number(stageState.attempts || 0) >= Number(stageState.maxAttempts || 3);
        const result = await AffiliateCheckRow.updateOne(
            {
                _id: row._id,
                [`${prefix}.status`]: "processing",
                [`${prefix}.leaseUntil`]: { $lt: releasedAt },
                [`${prefix}.attempts`]: stageState.attempts
            },
            { $set: {
                [`${prefix}.status`]: exhausted ? "failed" : "pending",
                [`${prefix}.claimedBy`]: null,
                [`${prefix}.leaseUntil`]: null,
                [`${prefix}.heartbeatAt`]: null,
                [`${prefix}.errorMessage`]: exhausted
                    ? "Stage lease expired after max attempts"
                    : "Stage lease expired",
                [`${prefix}.finishedAt`]: exhausted ? releasedAt : null
            } }
        );
        if (!result.modifiedCount) continue;
        if (exhausted) failed += 1;
        else released += 1;
    }
    return { released, failed };
}

async function updateAffiliateCheckJobCounters({ jobId, extraSet = {} }) {
    if (!mongoose.isValidObjectId(jobId)) throw new Error("Invalid affiliate check job id");
    const rows = await AffiliateCheckRow.aggregate([
        { $match: { jobId: new mongoose.Types.ObjectId(jobId) } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const counts = Object.fromEntries(rows.map(row => [row._id, row.count]));
    const processedCount = ["eligible", "assigned", "rejected", "failed", "cancelled"]
        .reduce((sum, status) => sum + (counts[status] || 0), 0);
    const values = {
        processedCount,
        eligibleCount: counts.eligible || 0,
        assignedCount: counts.assigned || 0,
        rejectedCount: counts.rejected || 0,
        failedCount: counts.failed || 0,
        ...extraSet
    };
    await AffiliateCheckJob.updateOne({ _id: jobId }, { $set: values });
    return values;
}

function padronBlockedIsTerminal(arca) {
    if (arca.status === "failed") return true;
    if (arca.status !== "done") return false;
    const result = plainValue(arca.result) || {};
    if (result.needsPadron === false) return true;
    const paidCount = result.last3ClosedMonthsPaidCount ?? result.trimPagos;
    return typeof paidCount === "number" && paidCount <= 0;
}

function isAffiliateCheckRowReadyForFinalization(row) {
    const source = row && typeof row.toObject === "function" ? row.toObject() : row;
    const normalized = initializeStagesForRow(source);
    if (!normalized || FINAL_ROW_STATUSES.includes(normalized.status)) return false;
    const { arca, dateas, padron } = normalized.stages;
    const arcaReady = ["done", "failed"].includes(arca.status);
    const dateasReady = ["done", "failed", "skipped"].includes(dateas.status);
    const padronReady = ["done", "failed", "skipped"].includes(padron.status)
        || (padron.status === "blocked" && padronBlockedIsTerminal(arca));
    return arcaReady && dateasReady && padronReady;
}

async function markAffiliateCheckRowFinalizationReady({ rowId, now = new Date() }) {
    normalizeNow(now);
    const row = await AffiliateCheckRow.findById(rowId).lean();
    if (!row || !isAffiliateCheckRowReadyForFinalization(row)) return null;
    return AffiliateCheckRow.findOneAndUpdate(
        { _id: rowId, status: { $nin: FINAL_ROW_STATUSES }, "stages.finalization.status": "pending" },
        { $set: { "stages.finalization.status": "ready", "stages.finalization.errorMessage": null } },
        { new: true }
    );
}

module.exports = {
    completeAffiliateCheckStage,
    claimAffiliateCheckStage,
    failAffiliateCheckStage,
    heartbeatAffiliateCheckStage,
    initializeStagesForRow,
    isAffiliateCheckRowReadyForFinalization,
    markAffiliateCheckRowFinalizationReady,
    releaseExpiredAffiliateCheckStages,
    updateAffiliateCheckJobCounters
};
