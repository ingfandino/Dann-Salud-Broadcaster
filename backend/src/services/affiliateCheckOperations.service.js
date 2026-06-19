"use strict";

const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Affiliate = require("../models/Affiliate");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const User = require("../models/User");

const ACTION_ROLES = new Set(["supervisor", "encargado", "gerencia", "desarrollador"]);
const DELETE_ROLES = new Set(["gerencia", "desarrollador"]);
const ACTIVE_STATUSES = new Set(["pending", "processing", "pausing", "retrying"]);
const TERMINAL_EXPORT_STATUSES = new Set(["completed", "completed_with_errors", "failed", "partially_cancelled"]);
const DELETE_STATUSES = new Set(["paused", "completed", "completed_with_errors", "failed", "stuck", "cancelled", "partially_cancelled"]);
const RETRY_STATUSES = new Set(["failed", "completed_with_errors", "stuck", "partially_cancelled"]);
const TERMINAL_STAGE_STATUSES = new Set(["done", "failed", "skipped", "not_required"]);
const PROCESSING_STAGE_PATHS = ["stages.arca.status", "stages.dateas.status", "stages.padron.status", "stages.finalization.status"];
const TERMINAL_ROW_STATUSES = ["eligible", "assigned", "rejected", "failed", "cancelled"];
const PENDING_TOO_LONG_MS = Number(process.env.AFFILIATE_CHECK_PENDING_TOO_LONG_MS || 10 * 60 * 1000);
const STUCK_AFTER_MS = Number(process.env.AFFILIATE_CHECK_STUCK_AFTER_MS || 15 * 60 * 1000);

class AffiliateCheckOperationError extends Error {
    constructor(message, statusCode = 400, code = "AFFILIATE_CHECK_OPERATION_ERROR") {
        super(message);
        this.name = "AffiliateCheckOperationError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

function normalizeRole(user) {
    return String(user?.role || "").trim().toLowerCase();
}

function assertActionRole(user) {
    const role = normalizeRole(user);
    if (!ACTION_ROLES.has(role)) {
        throw new AffiliateCheckOperationError("No tiene permisos para operar este trabajo", 403, "JOB_ACTION_FORBIDDEN");
    }
    return role;
}

function buildJobScope(user, jobId = null) {
    const role = assertActionRole(user);
    const filter = { isDeleted: { $ne: true } };
    if (jobId) filter._id = jobId;
    if (role === "supervisor") filter.requestedBy = user._id;
    return filter;
}

function latestDate(...values) {
    const dates = values.flat().filter(Boolean).map(value => new Date(value)).filter(value => !Number.isNaN(value.getTime()));
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map(value => value.getTime())));
}

function activeElapsedMs(job, now = new Date()) {
    const accumulated = Math.max(0, Number(job.accumulatedActiveMs || 0));
    if (!["pending", "processing", "pausing", "retrying"].includes(job.status)) {
        const terminalStart = job.activeStartedAt || job.startedAt;
        if (job.finishedAt && terminalStart) return accumulated + Math.max(0, new Date(job.finishedAt).getTime() - new Date(terminalStart).getTime());
        return accumulated;
    }
    const started = job.activeStartedAt || job.startedAt;
    if (!started) return accumulated;
    return accumulated + Math.max(0, now.getTime() - new Date(started).getTime());
}

function formatProgressAggregate(job, aggregate, now = new Date()) {
    const selectedCount = Math.max(0, Number(job.selectedCount || aggregate?.rowCount || 0));
    const rowCount = Number(aggregate?.rowCount || 0);
    const terminalRows = Math.max(0, Number(aggregate?.terminalRows ?? job.processedCount ?? 0));
    const stageNames = ["arca", "dateas", "padron", "finalizer"];
    const stages = {};
    for (const stage of stageNames) {
        const source = aggregate?.stages?.[stage] || {};
        stages[stage] = {
            pending: Number(source.pending || 0),
            processing: Number(source.processing || 0),
            completed: Number(source.completed || 0),
            failed: Number(source.failed || 0),
            skipped: Number(source.skipped || 0)
        };
    }
    let percent = selectedCount > 0 ? (Math.min(terminalRows, selectedCount) / selectedCount) * 100 : 0;
    if (["completed", "completed_with_errors"].includes(job.status) && selectedCount > 0 && terminalRows >= selectedCount) percent = 100;
    percent = Math.min(100, Math.max(0, Number(percent.toFixed(2))));

    const activeStages = stageNames.filter(stage => stages[stage].processing > 0);
    const lastProgressAt = latestDate(job.lastProgressAt, aggregate?.lastProgressAt);
    const lastWorkerHeartbeatAt = latestDate(job.lastWorkerHeartbeatAt, aggregate?.lastWorkerHeartbeatAt);
    const activeClock = activeStages.length > 0 ? now : (latestDate(lastWorkerHeartbeatAt, lastProgressAt) || now);
    const elapsedActiveMs = activeElapsedMs(job, activeClock);
    let estimatedRemainingMs = null;
    if (percent >= 3 && percent < 100 && elapsedActiveMs >= 30_000 && !["paused", "pausing"].includes(job.status)) {
        estimatedRemainingMs = Math.max(0, Math.round(elapsedActiveMs * ((100 - percent) / percent)));
    }
    const pendingTooLong = job.status === "pending"
        && now.getTime() - new Date(job.createdAt).getTime() >= PENDING_TOO_LONG_MS
        && !lastProgressAt && !lastWorkerHeartbeatAt;
    const activityAt = latestDate(lastProgressAt, lastWorkerHeartbeatAt, job.startedAt, job.createdAt);
    const isStuck = ["processing", "retrying"].includes(job.status)
        && activityAt
        && now.getTime() - activityAt.getTime() >= STUCK_AFTER_MS
        && activeStages.length === 0;

    return {
        percent,
        rowCount,
        processedCount: terminalRows,
        selectedCount,
        remainingCount: Math.max(0, selectedCount - terminalRows),
        arcaCompleted: stages.arca.completed,
        dateasCompleted: stages.dateas.completed,
        padronCompleted: stages.padron.completed,
        finalizedCount: stages.finalizer.completed,
        stages,
        elapsedActiveMs,
        estimatedRemainingMs,
        activeStages,
        lastProgressAt,
        lastWorkerHeartbeatAt,
        pendingTooLong,
        isStuck,
        stuckReason: isStuck ? "Sin progreso ni workers activos durante el período de seguridad" : null
    };
}

function stageAccumulator(stagePath) {
    return {
        pending: { $sum: { $cond: [{ $in: [`$${stagePath}`, ["pending", "ready", "blocked"]] }, 1, 0] } },
        processing: { $sum: { $cond: [{ $eq: [`$${stagePath}`, "processing"] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $in: [`$${stagePath}`, Array.from(TERMINAL_STAGE_STATUSES)] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: [`$${stagePath}`, "failed"] }, 1, 0] } },
        skipped: { $sum: { $cond: [{ $in: [`$${stagePath}`, ["skipped", "not_required"]] }, 1, 0] } }
    };
}

async function aggregateJobProgress(jobIds) {
    if (!jobIds.length) return new Map();
    const ids = jobIds.map(id => new mongoose.Types.ObjectId(id));
    const rows = await AffiliateCheckRow.aggregate([
        { $match: { jobId: { $in: ids } } },
        { $group: {
            _id: "$jobId",
            rowCount: { $sum: 1 },
            arcaPending: stageAccumulator("stages.arca.status").pending,
            arcaProcessing: stageAccumulator("stages.arca.status").processing,
            arcaCompleted: stageAccumulator("stages.arca.status").completed,
            arcaFailed: stageAccumulator("stages.arca.status").failed,
            arcaSkipped: stageAccumulator("stages.arca.status").skipped,
            dateasPending: stageAccumulator("stages.dateas.status").pending,
            dateasProcessing: stageAccumulator("stages.dateas.status").processing,
            dateasCompleted: stageAccumulator("stages.dateas.status").completed,
            dateasFailed: stageAccumulator("stages.dateas.status").failed,
            dateasSkipped: stageAccumulator("stages.dateas.status").skipped,
            padronPending: stageAccumulator("stages.padron.status").pending,
            padronProcessing: stageAccumulator("stages.padron.status").processing,
            padronCompleted: stageAccumulator("stages.padron.status").completed,
            padronFailed: stageAccumulator("stages.padron.status").failed,
            padronSkipped: stageAccumulator("stages.padron.status").skipped,
            finalizerPending: stageAccumulator("stages.finalization.status").pending,
            finalizerProcessing: stageAccumulator("stages.finalization.status").processing,
            finalizerCompleted: stageAccumulator("stages.finalization.status").completed,
            finalizerFailed: stageAccumulator("stages.finalization.status").failed,
            finalizerSkipped: stageAccumulator("stages.finalization.status").skipped,
            terminalRows: { $sum: { $cond: [{ $in: ["$status", TERMINAL_ROW_STATUSES] }, 1, 0] } },
            lastProgressAt: { $max: { $max: ["$stages.arca.finishedAt", "$stages.dateas.finishedAt", "$stages.padron.finishedAt", "$stages.finalization.finishedAt"] } },
            lastWorkerHeartbeatAt: { $max: { $max: ["$stages.arca.heartbeatAt", "$stages.dateas.heartbeatAt", "$stages.padron.heartbeatAt", "$stages.finalization.heartbeatAt"] } }
        } }
    ]);
    return new Map(rows.map(row => [String(row._id), {
        rowCount: row.rowCount,
        terminalRows: row.terminalRows,
        lastProgressAt: row.lastProgressAt,
        lastWorkerHeartbeatAt: row.lastWorkerHeartbeatAt,
        stages: {
            arca: { pending: row.arcaPending, processing: row.arcaProcessing, completed: row.arcaCompleted, failed: row.arcaFailed, skipped: row.arcaSkipped },
            dateas: { pending: row.dateasPending, processing: row.dateasProcessing, completed: row.dateasCompleted, failed: row.dateasFailed, skipped: row.dateasSkipped },
            padron: { pending: row.padronPending, processing: row.padronProcessing, completed: row.padronCompleted, failed: row.padronFailed, skipped: row.padronSkipped },
            finalizer: { pending: row.finalizerPending, processing: row.finalizerProcessing, completed: row.finalizerCompleted, failed: row.finalizerFailed, skipped: row.finalizerSkipped }
        }
    }]));
}

async function aggregateJobResultCounters(jobIds) {
    if (!jobIds.length) return new Map();
    const ids = jobIds.map(id => new mongoose.Types.ObjectId(id));
    const [rows, assignments] = await Promise.all([
        AffiliateCheckRow.aggregate([
            { $match: { jobId: { $in: ids } } },
            { $group: {
                _id: "$jobId",
                processedCount: { $sum: { $cond: [{ $in: ["$status", TERMINAL_ROW_STATUSES] }, 1, 0] } },
                eligibleCount: { $sum: { $cond: [{ $eq: ["$canSell", true] }, 1, 0] } },
                assignedRowsCount: { $sum: { $cond: [{ $eq: ["$status", "assigned"] }, 1, 0] } },
                generalStockCount: { $sum: { $cond: [{ $eq: ["$status", "eligible"] }, 1, 0] } },
                rejectedCount: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
                failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } }
            } }
        ]),
        AffiliateAssignment.aggregate([
            { $match: { sourceJobId: { $in: ids }, status: "active" } },
            { $group: { _id: "$sourceJobId", assignedToStockCount: { $sum: 1 } } }
        ])
    ]);
    const byJob = new Map(rows.map(row => [String(row._id), {
        processedCount: row.processedCount || 0,
        eligibleCount: row.eligibleCount || 0,
        assignedRowsCount: row.assignedRowsCount || 0,
        assignedToStockCount: 0,
        generalStockCount: row.generalStockCount || 0,
        rejectedCount: row.rejectedCount || 0,
        failedCount: row.failedCount || 0
    }]));
    for (const row of assignments) {
        const key = String(row._id);
        const current = byJob.get(key) || {
            processedCount: 0,
            eligibleCount: 0,
            assignedRowsCount: 0,
            assignedToStockCount: 0,
            generalStockCount: 0,
            rejectedCount: 0,
            failedCount: 0
        };
        current.assignedToStockCount = row.assignedToStockCount || 0;
        byJob.set(key, current);
    }
    return byJob;
}

function permissionsForJob(job, user, progress) {
    const role = normalizeRole(user);
    const allowed = ACTION_ROLES.has(role);
    const owned = role !== "supervisor" || String(job.requestedBy) === String(user?._id);
    const canControl = allowed && owned;
    const canDownloadResult = TERMINAL_EXPORT_STATUSES.has(job.status)
        && (["gerencia", "desarrollador"].includes(role) || (role === "supervisor" && owned && job.mode === "check_import"));
    const retryable = RETRY_STATUSES.has(job.status) || progress.pendingTooLong || progress.isStuck;
    return {
        canPause: canControl && !progress.isStuck && ["pending", "processing", "retrying"].includes(job.status),
        canResume: canControl && job.status === "paused",
        canRetry: canControl && retryable && job.status !== "paused",
        canExport: canDownloadResult,
        canDelete: DELETE_ROLES.has(role) && DELETE_STATUSES.has(job.status)
    };
}

async function decorateJobs(jobs, user, now = new Date()) {
    const jobIds = jobs.map(job => job._id);
    const [aggregates, resultCounters] = await Promise.all([
        aggregateJobProgress(jobIds),
        aggregateJobResultCounters(jobIds)
    ]);
    return jobs.map(job => {
        const progress = formatProgressAggregate(job, aggregates.get(String(job._id)), now);
        const counters = resultCounters.get(String(job._id)) || {};
        const canonical = {
            processedCount: counters.processedCount ?? Number(job.processedCount || 0),
            eligibleCount: counters.eligibleCount ?? Number(job.eligibleCount || 0),
            assignedCount: counters.assignedToStockCount ?? Number(job.assignedCount || 0),
            assignedToStockCount: counters.assignedToStockCount ?? Number(job.assignedCount || 0),
            assignedRowsCount: counters.assignedRowsCount ?? Number(job.assignedCount || 0),
            generalStockCount: counters.generalStockCount ?? 0,
            rejectedCount: counters.rejectedCount ?? Number(job.rejectedCount || 0),
            failedCount: counters.failedCount ?? Number(job.failedCount || 0)
        };
        canonical.assignedCount = Math.min(canonical.assignedCount, canonical.eligibleCount);
        canonical.assignedToStockCount = Math.min(canonical.assignedToStockCount, canonical.eligibleCount);
        return {
            ...job,
            ...canonical,
            resultCounters: canonical,
            progress: { ...progress, processedCount: canonical.processedCount },
            isStuck: progress.isStuck,
            pendingTooLong: progress.pendingTooLong,
            permissions: permissionsForJob({ ...job, ...canonical }, user, progress)
        };
    });
}

async function findScopedJob(user, jobId) {
    if (!mongoose.isValidObjectId(jobId)) throw new AffiliateCheckOperationError("ID de trabajo inválido");
    const job = await AffiliateCheckJob.findOne(buildJobScope(user, jobId));
    if (!job) throw new AffiliateCheckOperationError("Trabajo no encontrado", 404, "JOB_NOT_FOUND");
    return job;
}

async function countActiveStages(jobId) {
    return AffiliateCheckRow.countDocuments({
        jobId,
        $or: PROCESSING_STAGE_PATHS.map(path => ({ [path]: "processing" }))
    });
}

async function reconcilePausedJob(jobId, now = new Date()) {
    const job = await AffiliateCheckJob.findOne({ _id: jobId, status: "pausing" });
    if (!job) return null;
    if (await countActiveStages(jobId)) return job.toObject();
    const activeMs = activeElapsedMs(job, now);
    const updated = await AffiliateCheckJob.findOneAndUpdate(
        { _id: jobId, status: "pausing" },
        { $set: { status: "paused", pausedAt: now, pausedBy: job.pauseRequestedBy, accumulatedActiveMs: activeMs, activeStartedAt: null } },
        { new: true }
    ).lean();
    return updated;
}

async function pauseAffiliateCheckJob({ user, jobId, reason = "Pausa solicitada por el usuario", now = new Date() }) {
    const job = await findScopedJob(user, jobId);
    if (!["pending", "processing", "retrying"].includes(job.status)) {
        throw new AffiliateCheckOperationError("Este trabajo no puede pausarse en su estado actual", 409, "JOB_CANNOT_PAUSE");
    }
    await AffiliateCheckJob.updateOne({ _id: job._id, status: job.status }, { $set: {
        status: "pausing", pauseRequestedAt: now, pauseRequestedBy: user._id, pauseReason: reason,
        activeStartedAt: job.activeStartedAt || job.startedAt || now
    } });
    return reconcilePausedJob(job._id, now) || AffiliateCheckJob.findById(job._id).lean();
}

async function resumeAffiliateCheckJob({ user, jobId, now = new Date() }) {
    const job = await findScopedJob(user, jobId);
    if (job.status !== "paused") throw new AffiliateCheckOperationError("Solo puede reanudarse un trabajo pausado", 409, "JOB_CANNOT_RESUME");
    return AffiliateCheckJob.findOneAndUpdate(
        { _id: job._id, status: "paused" },
        { $set: { status: "processing", activeStartedAt: now, lastResumedAt: now, lastResumedBy: user._id, finishedAt: null, errorMessage: null }, $inc: { resumeCount: 1 } },
        { new: true }
    ).lean();
}

function resetStageSet(stage, status) {
    const prefix = `stages.${stage}`;
    return {
        [`${prefix}.status`]: status,
        [`${prefix}.attempts`]: 0,
        [`${prefix}.claimedBy`]: null,
        [`${prefix}.claimedAt`]: null,
        [`${prefix}.leaseUntil`]: null,
        [`${prefix}.heartbeatAt`]: null,
        [`${prefix}.errorMessage`]: null,
        [`${prefix}.finishedAt`]: null
    };
}

async function reserveImportRetryRow(job, row, now) {
    const state = await AffiliateOperationalState.findOneAndUpdate(
        {
            affiliateId: row.affiliateId,
            currentCheckJobId: null,
            verificationStatus: { $ne: "checking" },
            usageStatus: { $nin: ["assigned", "blocked"] },
            saleStatus: "none",
            $or: [{ "ownership.supervisorId": null }, { "ownership.expiresAt": { $lt: now } }]
        },
        { $set: { currentCheckJobId: job._id, currentCheckStartedAt: now, verificationStatus: "checking", availableForSale: false, unavailableReason: "checking_in_progress" } },
        { new: true }
    ).lean();
    if (!state) return false;
    const assignment = await AffiliateAssignment.findOne({ affiliateId: row.affiliateId, status: "active" }).select("_id").lean();
    if (!assignment) return true;
    await AffiliateOperationalState.updateOne({ _id: state._id, currentCheckJobId: job._id }, { $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } });
    return false;
}

async function retryAffiliateCheckJob({ user, jobId, reason = "Reintento solicitado por el usuario", now = new Date() }) {
    const job = await findScopedJob(user, jobId);
    const [decorated] = await decorateJobs([job.toObject()], user, now);
    if (!(RETRY_STATUSES.has(job.status) || decorated.pendingTooLong || decorated.isStuck)) {
        throw new AffiliateCheckOperationError("Este trabajo no tiene tareas reintentables", 409, "JOB_CANNOT_RETRY");
    }
    const previousStatus = job.status;
    await AffiliateCheckJob.updateOne({ _id: job._id, status: previousStatus }, { $set: { status: "retrying", previousStatus, retryReason: reason, lastRetriedAt: now, lastRetriedBy: user._id, accumulatedActiveMs: 0, activeStartedAt: now, finishedAt: null, errorMessage: null }, $inc: { retryCount: 1 } });

    const rows = await AffiliateCheckRow.find({ jobId: job._id }).lean();
    let reopened = 0;
    let retryableWork = false;
    for (const row of rows) {
        const set = {};
        const stageStates = ["arca", "dateas", "padron", "finalization"].map(stage => row.stages?.[stage]?.status);
        const hasPendingStage = stageStates.some(status => ["pending", "ready", "blocked"].includes(status));
        const hasExpiredStage = ["arca", "dateas", "padron", "finalization"].some(stage => {
            const state = row.stages?.[stage];
            return state?.status === "processing" && state.leaseUntil && new Date(state.leaseUntil) < now;
        });
        const hasPotentialWork = hasPendingStage || hasExpiredStage || row.status === "failed" || stageStates.includes("failed");
        if (job.mode === "check_import" && hasPotentialWork) {
            const operationalState = await AffiliateOperationalState.findOne({ affiliateId: row.affiliateId }).lean();
            const ownsReservation = String(operationalState?.currentCheckJobId || "") === String(job._id);
            if (!operationalState || (!ownsReservation && !(await reserveImportRetryRow(job, row, now)))) continue;
        }
        if (hasPendingStage) retryableWork = true;
        let upstreamReopened = false;
        for (const stage of ["arca", "dateas", "padron"]) {
            const state = row.stages?.[stage] || {};
            if (state.status === "failed" || (state.status === "processing" && state.leaseUntil && new Date(state.leaseUntil) < now)) {
                Object.assign(set, resetStageSet(stage, stage === "padron" && row.stages?.arca?.status !== "done" ? "blocked" : "pending"));
                upstreamReopened = true;
                retryableWork = true;
            }
        }
        const finalization = row.stages?.finalization || {};
        if (upstreamReopened || finalization.status === "failed" || (finalization.status === "processing" && finalization.leaseUntil && new Date(finalization.leaseUntil) < now)) {
            Object.assign(set, resetStageSet("finalization", "pending"));
            set["stages.finalization.finalizedAt"] = null;
        }
        if (row.status === "failed") {
            set.status = "queued";
            set.canSell = null;
            set.errorMessage = null;
            set.rejectionReason = null;
            if (!Object.keys(set).some(key => key.startsWith("stages."))) {
                Object.assign(set, resetStageSet("finalization", "pending"));
                set["stages.finalization.finalizedAt"] = null;
            }
        }
        if (!Object.keys(set).length) continue;
        const result = await AffiliateCheckRow.updateOne({ _id: row._id, jobId: job._id }, { $set: set });
        reopened += result.modifiedCount || 0;
    }
    if (!reopened && !retryableWork) {
        await AffiliateCheckJob.updateOne({ _id: job._id, status: "retrying" }, { $set: { status: previousStatus, activeStartedAt: null } });
        throw new AffiliateCheckOperationError("No hay etapas pendientes o fallidas para reintentar", 422, "NO_RETRYABLE_WORK");
    }
    await AffiliateCheckJob.updateOne({ _id: job._id, status: "retrying" }, { $set: { status: "processing", lastProgressAt: now }, $setOnInsert: {} });
    return AffiliateCheckJob.findById(job._id).lean();
}

function padronLabel(status) {
    return ({ found_active: "Vigente", found_expired: "Expirado", not_found: "No registra", pending: "Pendiente", blocked: "Pendiente", captcha_failed: "Error de consulta", error: "Error de consulta" })[status] || "Pendiente";
}

function yesNo(value) {
    if (value === true) return "Sí";
    if (value === false) return "No";
    return "";
}

async function exportAffiliateCheckJob({ user, jobId }) {
    const job = await findScopedJob(user, jobId);
    const progress = formatProgressAggregate(job.toObject(), (await aggregateJobProgress([job._id])).get(String(job._id)));
    if (!permissionsForJob(job.toObject(), user, progress).canExport) {
        throw new AffiliateCheckOperationError("Este trabajo no está disponible para exportar", 409, "JOB_CANNOT_EXPORT");
    }
    const rows = await AffiliateCheckRow.find({ jobId: job._id }).sort({ createdAt: 1, _id: 1 }).lean();
    if (!rows.length) throw new AffiliateCheckOperationError("El trabajo no tiene resultados para exportar", 422, "NO_EXPORT_ROWS");
    const affiliateIds = rows.map(row => row.affiliateId);
    const [affiliates, contributions, states, requester, owner, assignments] = await Promise.all([
        Affiliate.find({ _id: { $in: affiliateIds } }).lean(),
        AffiliateContribution.find({ affiliateId: { $in: affiliateIds } }).lean(),
        AffiliateOperationalState.find({ affiliateId: { $in: affiliateIds } }).lean(),
        User.findById(job.requestedBy).select("nombre email role").lean(),
        job.ownership?.supervisorId ? User.findById(job.ownership.supervisorId).select("nombre email role").lean() : Promise.resolve(null),
        AffiliateAssignment.find({ sourceJobId: job._id }).select("affiliateId supervisorId status").populate("supervisorId", "nombre email role").lean()
    ]);
    const byId = list => new Map(list.map(item => [String(item.affiliateId || item._id), item]));
    const affiliateById = byId(affiliates);
    const contributionById = byId(contributions);
    const stateById = byId(states);
    const assignmentByAffiliate = new Map(assignments.map(item => [String(item.affiliateId), item]));
    const data = rows.map(row => {
        const id = String(row.affiliateId);
        const affiliate = affiliateById.get(id) || {};
        const contribution = contributionById.get(id) || {};
        const state = stateById.get(id) || {};
        const arca = row.stages?.arca?.result || row.resultState?.arca || {};
        const dateas = row.stages?.dateas?.result || row.resultState?.dateas || {};
        const padron = row.stages?.padron?.result || row.resultState?.padron || contribution.padron || {};
        const assignment = assignmentByAffiliate.get(id);
        const assignedToStock = assignment?.status === "active" && row.status === "assigned";
        const stockGeneral = row.status === "eligible" && row.canSell === true && !assignment;
        return {
            "Job ID": String(job._id),
            Modo: job.mode,
            "Fecha de creación": job.createdAt ? new Date(job.createdAt).toISOString() : "",
            "Fecha de finalización": job.finishedAt ? new Date(job.finishedAt).toISOString() : "",
            "Solicitado por": requester?.nombre || requester?.email || "",
            "Supervisor propietario": owner?.nombre || owner?.email || "",
            CUIL: affiliate.cuil || row.cuilNormalized || "",
            Nombre: affiliate.nombre || "",
            "Obra Social almacenada": affiliate.obraSocial || state.obraSocial || "",
            "Código canónico de Obra Social": padron.canonicalCode || padron.codigoObraSocial || "",
            "Nombre canónico de Obra Social": padron.canonicalName || padron.nombreObraSocial || "",
            Clasificación: state.freshness || state.dataSource || row.mode || "",
            "Estado de fila": row.status || "",
            "Estado ARCA": row.stages?.arca?.status || "",
            "Resultado ARCA": arca.status || arca.result || "",
            "Último período de aporte": arca.ultimoAporte || arca.lastContributionPeriod || contribution.lastContributionPeriod || "",
            "Trimestres pagos": arca.last3ClosedMonthsPaidCount ?? arca.trimPagos ?? contribution.last3ClosedMonthsPaidCount ?? "",
            "Estado DATEAS": row.stages?.dateas?.status || "",
            "Resultado DATEAS": dateas.status || dateas.result || "",
            Edad: dateas.edad ?? affiliate.edad ?? "",
            Provincia: dateas.provincia || "",
            Localidad: dateas.localidad || affiliate.localidad || "",
            "Estado Padrón": padronLabel(padron.status || row.stages?.padron?.status),
            "Fecha alta OS": padron.fechaAlta || padron.fechaAltaOs || "",
            "Estado final": row.status || "",
            Apto: yesNo(row.canSell === true),
            "Motivo de no aptitud": row.rejectionReason || "",
            "Asignado al stock": yesNo(assignedToStock),
            "Supervisor asignado": assignment?.supervisorId?.nombre || "",
            "Stock general": yesNo(stockGeneral),
            "Error final": row.errorMessage || row.stages?.finalization?.errorMessage || ""
        };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Resultados");
    return {
        buffer: XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
        filename: `chequeo_resultado_${job.mode}_${job._id}.xlsx`
    };
}

async function softDeleteAffiliateCheckJob({ user, jobId, reason = "Eliminado del historial", now = new Date() }) {
    const role = normalizeRole(user);
    if (!DELETE_ROLES.has(role)) throw new AffiliateCheckOperationError("No tiene permisos para eliminar trabajos del historial", 403, "JOB_DELETE_FORBIDDEN");
    const job = await AffiliateCheckJob.findOne({ _id: jobId, isDeleted: { $ne: true } });
    if (!job) throw new AffiliateCheckOperationError("Trabajo no encontrado", 404, "JOB_NOT_FOUND");
    if (!DELETE_STATUSES.has(job.status)) throw new AffiliateCheckOperationError("No puede eliminarse un trabajo activo", 409, "JOB_CANNOT_DELETE");
    return AffiliateCheckJob.findOneAndUpdate({ _id: job._id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, deletedAt: now, deletedBy: user._id, deleteReason: reason, deletedPreviousStatus: job.status } }, { new: true }).lean();
}

async function recordJobHeartbeat(jobId, now = new Date()) {
    return AffiliateCheckJob.updateOne({ _id: jobId }, { $set: { lastWorkerHeartbeatAt: now } });
}

async function recordJobProgress(jobId, now = new Date()) {
    await AffiliateCheckJob.updateOne({ _id: jobId }, { $set: { lastProgressAt: now, lastWorkerHeartbeatAt: now } });
    return reconcilePausedJob(jobId, now);
}

module.exports = {
    AffiliateCheckOperationError,
    ACTION_ROLES,
    DELETE_ROLES,
    PENDING_TOO_LONG_MS,
    STUCK_AFTER_MS,
    aggregateJobProgress,
    aggregateJobResultCounters,
    buildJobScope,
    decorateJobs,
    exportAffiliateCheckJob,
    findScopedJob,
    formatProgressAggregate,
    pauseAffiliateCheckJob,
    permissionsForJob,
    reconcilePausedJob,
    recordJobHeartbeat,
    recordJobProgress,
    resumeAffiliateCheckJob,
    retryAffiliateCheckJob,
    softDeleteAffiliateCheckJob
};
