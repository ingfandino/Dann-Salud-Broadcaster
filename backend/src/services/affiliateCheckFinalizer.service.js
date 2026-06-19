"use strict";

const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const { getActiveCheckConfig, stateSnapshot } = require("./affiliateCheck.service");
const {
    isAffiliateCheckRowReadyForFinalization,
    initializeStagesForRow,
    markAffiliateCheckRowFinalizationReady,
    updateAffiliateCheckJobCounters
} = require("./affiliateCheckStage.service");
const { upsertOperationalStateForAffiliate } = require("./affiliateOperationalState.service");
const { computeAndUpdateCanSell, evaluateCanSellStrict } = require("../utils/canSellUtils");
const logger = require("../utils/logger").getLogger("affiliate-check-finalizer");
const { recordJobHeartbeat, recordJobProgress, reconcilePausedJob } = require("./affiliateCheckOperations.service");

const ACTIVE_JOB_STATUSES = ["pending", "processing", "retrying"];
const EXECUTING_JOB_STATUSES = ["pending", "processing", "retrying", "pausing"];
const TERMINAL_JOB_STATUSES = ["completed", "completed_with_errors", "failed", "cancelled", "paused", "stuck", "partially_cancelled"];
const TERMINAL_ROW_STATUSES = ["eligible", "assigned", "rejected", "failed", "cancelled"];
const SELLABLE_PADRON_STATUSES = new Set(["not_found", "found_expired"]);
const TECHNICAL_PADRON_STATUSES = new Set(["captcha_failed", "error", "timeout", "solver_unavailable"]);

function normalizeNow(now) {
    const value = now ? new Date(now) : new Date();
    if (Number.isNaN(value.getTime())) throw new Error("Invalid finalization timestamp");
    return value;
}

function normalizeLeaseMs(leaseMs) {
    const value = Number(leaseMs);
    if (!Number.isFinite(value) || value <= 0) throw new Error("leaseMs must be greater than zero");
    return value;
}

function plain(value) {
    return value && typeof value.toObject === "function" ? value.toObject() : value;
}

function stageResult(row, stage) {
    return plain(row?.stages?.[stage]?.result) || plain(row?.resultState?.[stage]) || {};
}

function finalResultState(state, row, extra = {}) {
    return {
        ...(state ? stateSnapshot(state) : {}),
        arca: stageResult(row, "arca"),
        dateas: stageResult(row, "dateas"),
        padron: stageResult(row, "padron"),
        ...extra
    };
}

function terminalStateFilter(row, state) {
    const filter = { _id: state._id };
    if (row.mode === "check_import") filter.currentCheckJobId = row.jobId;
    return filter;
}

async function rebuildState(affiliateId, now) {
    await upsertOperationalStateForAffiliate(affiliateId, { now });
    return AffiliateOperationalState.findOne({ affiliateId }).lean();
}

async function claimAffiliateCheckFinalization({
    workerId,
    leaseMs = 5 * 60 * 1000,
    now = new Date()
}) {
    if (!workerId) throw new Error("workerId is required");
    const claimedAt = normalizeNow(now);
    const leaseUntil = new Date(claimedAt.getTime() + normalizeLeaseMs(leaseMs));
    const activeJobs = await AffiliateCheckJob.find({ status: { $in: ACTIVE_JOB_STATUSES } })
        .sort({ createdAt: 1 }).select("_id").lean();
    const jobIds = activeJobs.map(job => job._id);
    if (!jobIds.length) return null;

    await AffiliateCheckRow.updateMany(
        {
            jobId: { $in: jobIds },
            status: { $in: ["selected", "queued"] },
            "stages.finalization.status": { $exists: false }
        },
        { $set: { "stages.finalization": initializeStagesForRow({}).stages.finalization } }
    );

    const candidates = await AffiliateCheckRow.find({
        jobId: { $in: jobIds },
        $or: [
            {
                status: { $in: ["selected", "queued"] },
                "stages.finalization.status": { $in: ["pending", "ready"] }
            },
            {
                status: "processing",
                "stages.finalization.status": "processing",
                "stages.finalization.leaseUntil": { $lt: claimedAt }
            }
        ]
    }).sort({ createdAt: 1, _id: 1 }).limit(100).lean();

    for (const candidate of candidates) {
        if (!isAffiliateCheckRowReadyForFinalization(candidate)) continue;
        if (candidate.stages?.finalization?.status === "pending") {
            await markAffiliateCheckRowFinalizationReady({ rowId: candidate._id, now: claimedAt });
        }
        const claimed = await AffiliateCheckRow.findOneAndUpdate(
            {
                _id: candidate._id,
                jobId: { $in: jobIds },
                $or: [
                    {
                        status: { $in: ["selected", "queued"] },
                        "stages.finalization.status": "ready"
                    },
                    {
                        status: "processing",
                        "stages.finalization.status": "processing",
                        "stages.finalization.leaseUntil": { $lt: claimedAt }
                    }
                ],
                $expr: {
                    $lt: [
                        { $ifNull: ["$stages.finalization.attempts", 0] },
                        { $ifNull: ["$stages.finalization.maxAttempts", 3] }
                    ]
                }
            },
            [{
                $set: {
                    status: "processing",
                    "stages.finalization.status": "processing",
                    "stages.finalization.claimedBy": String(workerId),
                    "stages.finalization.claimedAt": claimedAt,
                    "stages.finalization.heartbeatAt": claimedAt,
                    "stages.finalization.leaseUntil": leaseUntil,
                    "stages.finalization.attempts": {
                        $add: [{ $ifNull: ["$stages.finalization.attempts", 0] }, 1]
                    },
                    "stages.finalization.maxAttempts": {
                        $ifNull: ["$stages.finalization.maxAttempts", 3]
                    },
                    "stages.finalization.startedAt": {
                        $ifNull: ["$stages.finalization.startedAt", claimedAt]
                    },
                    "stages.finalization.finishedAt": null,
                    "stages.finalization.finalizedAt": null,
                    "stages.finalization.errorMessage": null
                }
            }],
            { new: true }
        );
        if (!claimed) continue;

        await AffiliateCheckJob.updateOne(
            { _id: claimed.jobId, status: "pending" },
            { $set: { status: "processing", startedAt: claimedAt, finishedAt: null, errorMessage: null } }
        );
        const job = await AffiliateCheckJob.findById(claimed.jobId).select("status").lean();
        if (!job || !EXECUTING_JOB_STATUSES.includes(job.status)) {
            await AffiliateCheckRow.updateOne(
                {
                    _id: claimed._id,
                    "stages.finalization.status": "processing",
                    "stages.finalization.claimedBy": String(workerId)
                },
                { $set: {
                    status: "queued",
                    "stages.finalization.status": "ready",
                    "stages.finalization.claimedBy": null,
                    "stages.finalization.leaseUntil": null,
                    "stages.finalization.heartbeatAt": null
                } }
            );
            continue;
        }
        return claimed;
    }
    return null;
}

async function heartbeatAffiliateCheckFinalization({
    rowId,
    workerId,
    leaseMs,
    now = new Date()
}) {
    const heartbeatAt = normalizeNow(now);
    const leaseUntil = new Date(heartbeatAt.getTime() + normalizeLeaseMs(leaseMs));
    const row = await AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": String(workerId)
        },
        { $set: {
            "stages.finalization.heartbeatAt": heartbeatAt,
            "stages.finalization.leaseUntil": leaseUntil
        } },
        { new: true }
    );
    if (row) await recordJobHeartbeat(row.jobId, heartbeatAt);
    return row;
}

async function completeAffiliateCheckFinalization({ rowId, workerId, now = new Date() }) {
    const finishedAt = normalizeNow(now);
    const row = await AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": String(workerId)
        },
        { $set: {
            "stages.finalization.status": "done",
            "stages.finalization.finishedAt": finishedAt,
            "stages.finalization.finalizedAt": finishedAt,
            "stages.finalization.leaseUntil": null,
            "stages.finalization.heartbeatAt": finishedAt,
            "stages.finalization.errorMessage": null
        } },
        { new: true }
    );
    if (row) await recordJobProgress(row.jobId, finishedAt);
    return row;
}

async function failAffiliateCheckFinalization({
    rowId,
    workerId,
    errorMessage,
    retryable = false,
    now = new Date()
}) {
    const failedAt = normalizeNow(now);
    const row = await AffiliateCheckRow.findOne({
        _id: rowId,
        "stages.finalization.status": "processing",
        "stages.finalization.claimedBy": String(workerId)
    }).select("stages.finalization.attempts stages.finalization.maxAttempts");
    if (!row) return null;

    const attempts = Number(row.stages?.finalization?.attempts || 0);
    const maxAttempts = Number(row.stages?.finalization?.maxAttempts || 3);
    const shouldRetry = retryable && attempts < maxAttempts;
    return AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": String(workerId),
            "stages.finalization.attempts": attempts
        },
        { $set: {
            status: shouldRetry ? "queued" : "failed",
            canSell: shouldRetry ? null : false,
            errorMessage: shouldRetry ? null : String(errorMessage || "Finalization failed"),
            "stages.finalization.status": shouldRetry ? "ready" : "failed",
            "stages.finalization.errorMessage": String(errorMessage || "Finalization failed"),
            "stages.finalization.leaseUntil": null,
            "stages.finalization.heartbeatAt": shouldRetry ? null : failedAt,
            "stages.finalization.finishedAt": shouldRetry ? null : failedAt
        } },
        { new: true }
    );
}

async function releaseExpiredAffiliateCheckFinalizations({ now = new Date(), limit = 100 }) {
    const releasedAt = normalizeNow(now);
    const safeLimit = Math.max(1, Number(limit) || 100);
    const activeJobs = await AffiliateCheckJob.find({ status: { $in: ACTIVE_JOB_STATUSES } })
        .select("_id").lean();
    const jobIds = activeJobs.map(job => job._id);
    if (!jobIds.length) return { released: 0, failed: 0 };

    const rows = await AffiliateCheckRow.find({
        jobId: { $in: jobIds },
        status: { $nin: TERMINAL_ROW_STATUSES },
        "stages.finalization.status": "processing",
        "stages.finalization.leaseUntil": { $lt: releasedAt }
    }).sort({ "stages.finalization.leaseUntil": 1, _id: 1 }).limit(safeLimit)
        .select("jobId stages.finalization.attempts stages.finalization.maxAttempts").lean();

    let released = 0;
    let failed = 0;
    const touchedJobIds = new Set();
    for (const row of rows) {
        const attempts = Number(row.stages?.finalization?.attempts || 0);
        const maxAttempts = Number(row.stages?.finalization?.maxAttempts || 3);
        const exhausted = attempts >= maxAttempts;
        const result = await AffiliateCheckRow.updateOne(
            {
                _id: row._id,
                status: { $nin: TERMINAL_ROW_STATUSES },
                "stages.finalization.status": "processing",
                "stages.finalization.leaseUntil": { $lt: releasedAt },
                "stages.finalization.attempts": attempts
            },
            { $set: {
                status: exhausted ? "failed" : "queued",
                canSell: exhausted ? false : null,
                errorMessage: exhausted ? "Finalization lease expired after max attempts" : null,
                "stages.finalization.status": exhausted ? "failed" : "ready",
                "stages.finalization.claimedBy": null,
                "stages.finalization.leaseUntil": null,
                "stages.finalization.heartbeatAt": null,
                "stages.finalization.errorMessage": exhausted
                    ? "Finalization lease expired after max attempts"
                    : "Finalization lease expired",
                "stages.finalization.finishedAt": exhausted ? releasedAt : null
            } }
        );
        if (!result.modifiedCount) continue;
        touchedJobIds.add(String(row.jobId));
        if (exhausted) failed += 1;
        else released += 1;
    }
    for (const jobId of touchedJobIds) {
        await updateAffiliateCheckJobCounters({ jobId });
        await finalizeAffiliateCheckJobIfComplete({ jobId, now: releasedAt });
    }
    return { released, failed };
}

function startFinalizationHeartbeat({ rowId, workerId, leaseMs }) {
    const intervalMs = Math.max(1000, Math.floor(Number(leaseMs) / 3));
    const timer = setInterval(() => {
        heartbeatAffiliateCheckFinalization({
            rowId,
            workerId,
            leaseMs,
            now: new Date()
        }).catch(error => {
            logger.warn(`[AFFILIATE-CHECK-FINALIZER] Heartbeat falló para row=${rowId}: ${error.message}`);
        });
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return timer;
}

async function writeTerminalRow({ row, workerId, status, state, now, reason = null, assignment = null }) {
    const extra = {};
    if (reason && status === "rejected") extra.rejectionReason = reason;
    if (reason && status === "failed") extra.errorMessage = reason;
    if (assignment) extra.assignmentId = assignment._id;

    const set = {
        status,
        canSell: status === "eligible" || status === "assigned",
        resultState: finalResultState(state, row, extra),
        "stages.finalization.status": "done",
        "stages.finalization.finishedAt": now,
        "stages.finalization.finalizedAt": now,
        "stages.finalization.leaseUntil": null,
        "stages.finalization.heartbeatAt": now,
        "stages.finalization.errorMessage": null
    };
    if (status === "rejected") set.rejectionReason = reason;
    if (status === "failed") set.errorMessage = reason;
    if (assignment) {
        set.assignedToSupervisor = assignment.supervisorId;
        set.ownershipUntil = assignment.expiresAt;
    }

    return AffiliateCheckRow.findOneAndUpdate(
        {
            _id: row._id,
            status: "processing",
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": String(workerId)
        },
        { $set: set },
        { new: true }
    );
}

async function rejectRow({ row, workerId, state, reason, now }) {
    let finalState = state;
    if (state?._id) {
        await AffiliateOperationalState.updateOne(
            terminalStateFilter(row, state),
            { $set: {
                availableForSale: false,
                unavailableReason: reason,
                ownership: {},
                calculatedAt: now
            }, $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } }
        );
        finalState = await AffiliateOperationalState.findById(state._id).lean();
    }
    return writeTerminalRow({ row, workerId, status: "rejected", state: finalState, reason, now });
}

async function failRow({ row, workerId, state, reason, now }) {
    let finalState = state;
    if (state?._id) {
        await AffiliateOperationalState.updateOne(
            terminalStateFilter(row, state),
            { $set: {
                availableForSale: false,
                unavailableReason: "check_failed",
                ownership: {},
                calculatedAt: now
            }, $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } }
        );
        finalState = await AffiliateOperationalState.findById(state._id).lean();
    }
    return writeTerminalRow({ row, workerId, status: "failed", state: finalState, reason, now });
}

async function makeGeneralStock({ row, workerId, state, now }) {
    await AffiliateOperationalState.updateOne(
        terminalStateFilter(row, state),
        { $set: {
            usageStatus: "available",
            availableForSale: true,
            unavailableReason: null,
            ownership: {},
            calculatedAt: now
        }, $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } }
    );
    const finalState = await AffiliateOperationalState.findById(state._id).lean();
    return writeTerminalRow({ row, workerId, status: "eligible", state: finalState, now });
}

async function assignToSupervisor({ row, workerId, state, job, config, now }) {
    const supervisorId = job.ownership?.supervisorId;
    let activeAssignment = await AffiliateAssignment.findOne({
        affiliateId: row.affiliateId,
        status: "active"
    }).select("_id sourceJobId supervisorId").lean();

    if (activeAssignment) {
        if (String(activeAssignment.sourceJobId) === String(job._id) && String(activeAssignment.supervisorId) === String(supervisorId)) {
            logger.info(`[AFFILIATE-CHECK-FINALIZER] Reusing existing assignment ${activeAssignment._id} for row=${row._id}`);
        } else {
            return rejectRow({ row, workerId, state, reason: "active_assignment_exists", now });
        }
    }

    const expiresAt = new Date(now.getTime() + Number(config.ownershipDays || 30) * 24 * 60 * 60 * 1000);
    let assignment = activeAssignment;

    if (!assignment) {
        try {
            assignment = await AffiliateAssignment.create({
                affiliateId: row.affiliateId,
                operationalStateId: state?._id || row.operationalStateId || null,
                supervisorId,
                assignedBy: job.requestedBy,
                source: "check_job",
                sourceJobId: job._id,
                assignedAt: now,
                expiresAt
            });
        } catch (error) {
            if (error?.code === 11000) {
                return rejectRow({ row, workerId, state, reason: "active_assignment_exists", now });
            }
            throw error;
        }
    }

    try {
        const stateUpdate = await AffiliateOperationalState.updateOne(
            terminalStateFilter(row, state),
            { $set: {
                usageStatus: "assigned",
                availableForSale: false,
                unavailableReason: "assigned_to_supervisor",
                "ownership.supervisorId": supervisorId,
                "ownership.teamId": null,
                "ownership.assignedAt": now,
                "ownership.expiresAt": expiresAt,
                "ownership.source": "check_job",
                lastUsedAt: now,
                reusableAfter: expiresAt,
                calculatedAt: now
            }, $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } }
        );
        if (row.mode === "check_import" && !stateUpdate.modifiedCount) {
            throw new Error("La reserva del afiliado ya no pertenece a este trabajo");
        }
        const finalState = await AffiliateOperationalState.findById(state._id).lean();
        return writeTerminalRow({ row, workerId, status: "assigned", state: finalState, assignment, now });
    } catch (error) {
        await AffiliateAssignment.updateOne(
            { _id: assignment._id, status: "active" },
            { $set: { status: "cancelled", releasedAt: now, releaseReason: "finalization_failed" } }
        );
        throw error;
    }
}

function arcaIneligibleReason(arca) {
    const paidCount = arca.last3ClosedMonthsPaidCount ?? arca.trimPagos;
    if (typeof paidCount === "number" && paidCount <= 0) return "Trimestre sin pagos";
    if (arca.trabaja !== true) return "ARCA: No trabaja";
    return null;
}

function padronTechnicalFailure(row, padron) {
    if (row.stages?.padron?.status !== "failed") return false;
    return TECHNICAL_PADRON_STATUSES.has(padron.sourceStatus || padron.status)
        || Boolean(row.stages?.padron?.errorMessage || padron.errorMessage);
}

async function finalizeClaimedAffiliateCheckRow({ row, workerId, now = new Date() }) {
    const job = await AffiliateCheckJob.findById(row.jobId).lean();
    if (!job || !EXECUTING_JOB_STATUSES.includes(job.status)) return null;
    if (row.stages?.finalization?.status !== "processing") return null;
    if (String(row.stages?.finalization?.claimedBy || "") !== String(workerId)) return null;

    const arca = stageResult(row, "arca");
    const padron = stageResult(row, "padron");
    let state = await rebuildState(row.affiliateId, now);
    if (!state) {
        return failRow({ row, workerId, state: null, reason: "No se pudo reconstruir AffiliateOperationalState", now });
    }

    if (row.stages?.arca?.status === "failed") {
        return failRow({
            row,
            workerId,
            state,
            reason: arca.errorMessage || row.stages.arca.errorMessage || "ARCA: Fallo técnico",
            now
        });
    }

    const ineligibleReason = arcaIneligibleReason(arca);
    if (ineligibleReason) return rejectRow({ row, workerId, state, reason: ineligibleReason, now });

    if (padronTechnicalFailure(row, padron)) {
        return failRow({
            row,
            workerId,
            state,
            reason: padron.errorMessage || row.stages.padron.errorMessage || `Padrón: ${padron.status || "error"}`,
            now
        });
    }

    if (padron.status === "found_active") {
        return rejectRow({ row, workerId, state, reason: "Padrón: Afiliado activo", now });
    }

    if (!SELLABLE_PADRON_STATUSES.has(padron.status)) {
        return rejectRow({ row, workerId, state, reason: `Padrón: ${padron.status || "Sin verificar"}`, now });
    }

    await computeAndUpdateCanSell(row.affiliateId);
    const [contribution, evaluation] = await Promise.all([
        AffiliateContribution.findOne({ affiliateId: row.affiliateId }).lean(),
        evaluateCanSellStrict(row.affiliateId)
    ]);
    state = await rebuildState(row.affiliateId, now);
    if (contribution?.canSell !== true || evaluation?.canSell !== true) {
        const reason = evaluation?.failedReasons?.length
            ? evaluation.failedReasons.join("; ")
            : "canSell_false";
        return rejectRow({ row, workerId, state, reason, now });
    }

    if (job.ownership?.supervisorId) {
        const config = await getActiveCheckConfig();
        return assignToSupervisor({ row, workerId, state, job, config, now });
    }
    return makeGeneralStock({ row, workerId, state, now });
}

async function finalizeAffiliateCheckJobIfComplete({ jobId, now = new Date() }) {
    const job = await AffiliateCheckJob.findById(jobId).lean();
    if (!job || TERMINAL_JOB_STATUSES.includes(job.status)) return job;

    const counters = await updateAffiliateCheckJobCounters({ jobId });
    const totalRows = await AffiliateCheckRow.countDocuments({ jobId });
    const terminalRows = await AffiliateCheckRow.countDocuments({
        jobId,
        status: { $in: TERMINAL_ROW_STATUSES }
    });
    const nonterminalRows = Math.max(0, totalRows - terminalRows);
    const selectedCount = Number(job.selectedCount || 0);
    const complete = totalRows === terminalRows && selectedCount === terminalRows;
    logger.info("[AFFILIATE-CHECK-FINALIZER] finalizationDecision", {
        jobId: String(jobId),
        mode: job.mode,
        selectedCount,
        totalRows,
        terminalRows,
        nonterminalRows,
        decision: complete ? "complete" : "wait"
    });
    if (!complete) return AffiliateCheckJob.findById(jobId).lean();

    const status = counters.failedCount > 0 ? "completed_with_errors" : "completed";
    await AffiliateCheckJob.updateOne(
        { _id: jobId, status: { $in: ACTIVE_JOB_STATUSES } },
        { $set: { status, finishedAt: now, errorMessage: null } }
    );
    return AffiliateCheckJob.findById(jobId).lean();
}

async function processNextAffiliateCheckFinalization({
    workerId,
    leaseMs = 5 * 60 * 1000,
    now = new Date()
}) {
    const row = await claimAffiliateCheckFinalization({ workerId, leaseMs, now });
    if (!row) return null;
    const heartbeat = startFinalizationHeartbeat({ rowId: row._id, workerId, leaseMs });
    try {
        const finalizedRow = await finalizeClaimedAffiliateCheckRow({ row, workerId, now });
        const job = await finalizeAffiliateCheckJobIfComplete({ jobId: row.jobId, now });
        await recordJobProgress(row.jobId, now);
        await reconcilePausedJob(row.jobId, now);
        return { row: finalizedRow, job };
    } catch (error) {
        logger.error(`[AFFILIATE-CHECK-FINALIZER] Error row=${row._id}: ${error.stack || error.message}`);
        const state = await rebuildState(row.affiliateId, now).catch(() => null);
        const failedRow = await failRow({ row, workerId, state, reason: error.message, now });
        const job = await finalizeAffiliateCheckJobIfComplete({ jobId: row.jobId, now });
        await recordJobProgress(row.jobId, now);
        await reconcilePausedJob(row.jobId, now);
        return { row: failedRow, job, error: error.message };
    } finally {
        clearInterval(heartbeat);
    }
}

module.exports = {
    arcaIneligibleReason,
    claimAffiliateCheckFinalization,
    completeAffiliateCheckFinalization,
    failAffiliateCheckFinalization,
    finalizeAffiliateCheckJobIfComplete,
    finalizeClaimedAffiliateCheckRow,
    heartbeatAffiliateCheckFinalization,
    padronTechnicalFailure,
    processNextAffiliateCheckFinalization,
    releaseExpiredAffiliateCheckFinalizations
};
