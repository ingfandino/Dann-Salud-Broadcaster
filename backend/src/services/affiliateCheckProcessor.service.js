"use strict";

const Affiliate = require("../models/Affiliate");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const { BrowserSession, scrapeCuilWithSession, ArcaSessionExpiredError } = require("./contributionScraper.service");
const { saveResult } = require("./contributionSync.service");
const { enrichAgeBatch } = require("./dateasBot.service");
const { evaluateNeedsPadronCheck, syncPadronBatch } = require("./padronSync.service");
const { upsertOperationalStateForAffiliate } = require("./affiliateOperationalState.service");
const {
    AffiliateCheckError,
    adjustAffiliateCheckJobQuota,
    getActiveCheckConfig,
    releaseAffiliateCheckJobReservations,
    stateSnapshot
} = require("./affiliateCheck.service");
const { evaluateCanSellStrict } = require("../utils/canSellUtils");
const logger = require("../utils/logger").getLogger("affiliate-check");

const PROCESSABLE_MODES = ["check_new", "check_reusable", "check_import"];
const ROW_FINAL_STATUSES = ["eligible", "assigned", "rejected", "failed", "cancelled"];
const FINAL_JOB_STATUSES = ["completed", "completed_with_errors", "failed", "cancelled"];
const STALE_PROCESSING_MS = Number(process.env.AFFILIATE_CHECK_STALE_PROCESSING_MS || 2 * 60 * 60 * 1000);

function executionId(job) {
    return `affiliate_check:${job._id}`;
}

function checkedBy(job) {
    return job.requestedBy ? String(job.requestedBy) : "affiliate_check_worker";
}

function isRecoverableSessionError(error) {
    const message = String(error?.message || error || "").toLowerCase();
    return error instanceof ArcaSessionExpiredError
        || error?.name === "ArcaSessionExpiredError"
        || message.includes("session-level playwright failure")
        || message.includes("session expired")
        || message.includes("target page, context or browser has been closed");
}

async function closeArcaSession(session) {
    if (!session) return;
    try {
        await session.close();
    } catch (error) {
        logger.warn(`[AFFILIATE-CHECK] Error cerrando sesión ARCA: ${error.message}`);
    }
}

async function scrapeWithRecovery(affiliate, session, job) {
    try {
        return {
            session,
            result: await scrapeCuilWithSession(affiliate.cuil, session, { executionId: executionId(job) })
        };
    } catch (error) {
        if (!isRecoverableSessionError(error)) throw error;
        await closeArcaSession(session);
        const rebuiltSession = typeof BrowserSession.createViaPublicPortal === "function"
            ? await BrowserSession.createViaPublicPortal()
            : await BrowserSession.create();
        return {
            session: rebuiltSession,
            result: await scrapeCuilWithSession(affiliate.cuil, rebuiltSession, { executionId: executionId(job) })
        };
    }
}

async function rebuildState(affiliateId) {
    await upsertOperationalStateForAffiliate(affiliateId);
    return AffiliateOperationalState.findOne({ affiliateId }).lean();
}

function resultState(state, extra = {}) {
    return { ...(state ? stateSnapshot(state) : {}), ...extra };
}

function arcaResultState(scraperResult) {
    if (!scraperResult) return null;
    return {
        status: scraperResult.ok === false ? "error" : scraperResult.status,
        trabaja: scraperResult.trabaja ?? null,
        ultimoAporte: scraperResult.lastContributionPeriod || null,
        inicioLaboral: scraperResult.inicioLaboral || null,
        trimPagos: typeof scraperResult.last3ClosedMonthsPaidCount === "number" ? scraperResult.last3ClosedMonthsPaidCount : null,
        errorMessage: scraperResult.errorMessage || null,
        checkedAt: scraperResult.checkedAt || new Date()
    };
}

function terminalStateFilter(row, state) {
    const filter = { _id: state._id };
    if (row.mode === "check_import") filter.currentCheckJobId = row.jobId;
    return filter;
}

async function markRejected(row, state, reason, extra = {}) {
    let finalState = state;
    if (state?._id) {
        await AffiliateOperationalState.updateOne(
            terminalStateFilter(row, state),
            {
                $set: {
                    availableForSale: false,
                    unavailableReason: reason,
                    ownership: {},
                    calculatedAt: new Date()
                },
                $unset: { currentCheckJobId: "", currentCheckStartedAt: "" }
            }
        );
        finalState = await AffiliateOperationalState.findById(state._id).lean();
    }
    await AffiliateCheckRow.updateOne(
        { _id: row._id, status: "processing" },
        { $set: { status: "rejected", canSell: false, rejectionReason: reason, resultState: resultState(finalState, { ...extra, rejectionReason: reason }) } }
    );
}

async function markFailed(row, state, message, extra = {}) {
    let finalState = state;
    if (state?._id) {
        await AffiliateOperationalState.updateOne(
            terminalStateFilter(row, state),
            {
                $set: {
                    availableForSale: false,
                    unavailableReason: "check_failed",
                    ownership: {},
                    calculatedAt: new Date()
                },
                $unset: { currentCheckJobId: "", currentCheckStartedAt: "" }
            }
        );
        finalState = await AffiliateOperationalState.findById(state._id).lean();
    }
    await AffiliateCheckRow.updateOne(
        { _id: row._id, status: "processing" },
        { $set: { status: "failed", canSell: false, errorMessage: message, resultState: resultState(finalState, { ...extra, errorMessage: message }) } }
    );
}

async function makeGeneralStock(row, state, extra = {}) {
    let finalState = state;
    if (state?._id) {
        await AffiliateOperationalState.updateOne(
            terminalStateFilter(row, state),
            {
                $set: {
                    usageStatus: "available",
                    availableForSale: true,
                    unavailableReason: null,
                    ownership: {},
                    calculatedAt: new Date()
                },
                $unset: { currentCheckJobId: "", currentCheckStartedAt: "" }
            }
        );
        finalState = await AffiliateOperationalState.findById(state._id).lean();
    }
    await AffiliateCheckRow.updateOne(
        { _id: row._id, status: "processing" },
        { $set: { status: "eligible", canSell: true, resultState: resultState(finalState, extra) } }
    );
}

async function assignToSupervisor(row, state, job, config, extra = {}) {
    const supervisorId = job.ownership?.supervisorId;
    const activeAssignment = await AffiliateAssignment.findOne({ affiliateId: row.affiliateId, status: "active" }).select("_id").lean();
    if (activeAssignment) {
        await markRejected(row, state, "active_assignment_exists", extra);
        return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.ownershipDays * 24 * 60 * 60 * 1000);
    const assignment = await AffiliateAssignment.create({
        affiliateId: row.affiliateId,
        operationalStateId: state?._id || row.operationalStateId || null,
        supervisorId,
        assignedBy: job.requestedBy,
        source: "check_job",
        sourceJobId: job._id,
        assignedAt: now,
        expiresAt
    });

    const stateUpdate = await AffiliateOperationalState.updateOne(
        terminalStateFilter(row, state),
        {
            $set: {
                usageStatus: "assigned",
                availableForSale: false,
                unavailableReason: "assigned_to_supervisor",
                "ownership.supervisorId": supervisorId,
                "ownership.assignedAt": now,
                "ownership.expiresAt": expiresAt,
                "ownership.source": "check_job",
                lastUsedAt: now,
                reusableAfter: expiresAt,
                calculatedAt: now
            },
            $unset: { currentCheckJobId: "", currentCheckStartedAt: "" }
        }
    );
    if (row.mode === "check_import" && !stateUpdate.modifiedCount) {
        await AffiliateAssignment.updateOne(
            { _id: assignment._id, status: "active" },
            { $set: { status: "cancelled", releasedAt: new Date(), releaseReason: "check_import_reservation_lost" } }
        );
        throw new AffiliateCheckError("La reserva del afiliado ya no pertenece a este trabajo", 409, "CHECK_RESERVATION_LOST");
    }
    const finalState = await AffiliateOperationalState.findById(state._id).lean();
    await AffiliateCheckRow.updateOne(
        { _id: row._id, status: "processing" },
        {
            $set: {
                status: "assigned",
                canSell: true,
                assignedToSupervisor: supervisorId,
                ownershipUntil: expiresAt,
                resultState: resultState(finalState, { ...extra, assignmentId: assignment._id })
            }
        }
    );
}

async function finalizeRow(row, job, config, extra = {}) {
    const contribution = await AffiliateContribution.findOne({ affiliateId: row.affiliateId }).lean();
    const evaluation = await evaluateCanSellStrict(row.affiliateId);
    const state = await rebuildState(row.affiliateId);

    if (contribution?.canSell !== true || evaluation?.canSell !== true) {
        const reason = evaluation?.failedReasons?.length ? evaluation.failedReasons.join("; ") : "canSell_false";
        await markRejected(row, state, reason, extra);
        return;
    }

    if (job.ownership?.supervisorId) {
        await assignToSupervisor(row, state, job, config, extra);
    } else {
        await makeGeneralStock(row, state, extra);
    }
}

async function updateJobCounts(jobId, extraSet = {}) {
    const rows = await AffiliateCheckRow.find({ jobId }).select("status").lean();
    const counts = rows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
    const processedCount = ROW_FINAL_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0);
    const eligibleCount = counts.eligible || 0;
    const assignedCount = counts.assigned || 0;
    const rejectedCount = counts.rejected || 0;
    const failedCount = counts.failed || 0;
    await AffiliateCheckJob.updateOne(
        { _id: jobId },
        { $set: { processedCount, eligibleCount, assignedCount, rejectedCount, failedCount, ...extraSet } }
    );
    return { processedCount, eligibleCount, assignedCount, rejectedCount, failedCount };
}

async function claimAffiliateCheckJob(jobId) {
    const job = await AffiliateCheckJob.findOneAndUpdate(
        { _id: jobId, status: "pending", mode: { $in: PROCESSABLE_MODES } },
        { $set: { status: "processing", startedAt: new Date(), finishedAt: null, errorMessage: null } },
        { new: true }
    );
    if (job) return job;

    const existing = await AffiliateCheckJob.findById(jobId);
    if (!existing) throw new AffiliateCheckError("Trabajo de chequeo no encontrado", 404, "JOB_NOT_FOUND");
    if (!PROCESSABLE_MODES.includes(existing.mode)) {
        throw new AffiliateCheckError("Modo no procesable por este worker", 400, "JOB_MODE_NOT_PROCESSABLE");
    }
    if (FINAL_JOB_STATUSES.includes(existing.status)) {
        const error = new AffiliateCheckError("Este job ya fue procesado y no puede ejecutarse nuevamente.", 409, "JOB_ALREADY_FINALIZED");
        error.jobStatus = existing.status;
        throw error;
    }
    if (existing.status === "processing") {
        const error = new AffiliateCheckError("Este job ya se encuentra en procesamiento.", 409, "JOB_ALREADY_PROCESSING");
        error.jobStatus = existing.status;
        throw error;
    }
    const error = new AffiliateCheckError(`El trabajo no está pendiente (status=${existing.status})`, 409, "JOB_NOT_PENDING");
    error.jobStatus = existing.status;
    throw error;
}

// Legacy monolithic processor retained for historical tests and emergency analysis.
// The HTTP route is disabled while staged ARCA/DATEAS/Padron/finalizer workers are active.
async function processAffiliateCheckJob(jobId) {
    let job = await claimAffiliateCheckJob(jobId);

    const config = await getActiveCheckConfig();
    const rows = await AffiliateCheckRow.find({ jobId: job._id, status: { $in: ["selected", "queued"] } }).sort({ createdAt: 1, _id: 1 });
    let session = null;

    try {
        session = await BrowserSession.create();
        for (const queuedRow of rows) {
            job = await AffiliateCheckJob.findById(job._id);
            if (!job || job.status === "cancelled") break;

            const row = await AffiliateCheckRow.findOneAndUpdate(
                { _id: queuedRow._id, status: { $in: ["selected", "queued"] } },
                { $set: { status: "processing" } },
                { new: true }
            );
            if (!row) continue;

            const affiliate = await Affiliate.findById(row.affiliateId).lean();
            if (!affiliate) {
                await markFailed(row, null, "Afiliado no encontrado");
                await updateJobCounts(job._id);
                continue;
            }

            try {
                const scraped = await scrapeWithRecovery(affiliate, session, job);
                session = scraped.session;
                const arca = arcaResultState(scraped.result);
                await saveResult(String(affiliate._id), affiliate.cuil, scraped.result, {
                    executionType: "affiliate_check",
                    executionId: executionId(job),
                    checkedBy: checkedBy(job)
                });

                if (scraped.result.status !== "success") {
                    const state = await rebuildState(affiliate._id);
                    if (["captcha", "error"].includes(scraped.result.status)) {
                        await markFailed(row, state, scraped.result.errorMessage || `ARCA: ${scraped.result.status}`, { arca });
                    } else {
                        await markRejected(row, state, scraped.result.status === "no_data" ? "ARCA: Sin datos" : `ARCA: ${scraped.result.status}`, { arca });
                    }
                } else if (!evaluateNeedsPadronCheck(scraped.result.last3ClosedMonthsPaidCount)) {
                    const state = await rebuildState(affiliate._id);
                    await markRejected(row, state, "Trimestre sin pagos", { arca });
                } else {
                    await enrichAgeBatch([{ _id: affiliate._id, cuil: affiliate.cuil }]).catch(error => {
                        logger.warn(`[AFFILIATE-CHECK] DATEAS falló para ${affiliate.cuil}; Padrón continúa: ${error.message}`);
                    });
                    await syncPadronBatch([{ _id: affiliate._id, cuil: affiliate.cuil }]);
                    await finalizeRow(row, job, config, { arca });
                }
            } catch (error) {
                const errorResult = {
                    status: "error",
                    checkedAt: new Date(),
                    lastContributionPeriod: null,
                    last3ClosedMonthsPaidCount: null,
                    errorMessage: error.message
                };
                await saveResult(String(affiliate._id), affiliate.cuil, errorResult, {
                    executionType: "affiliate_check",
                    executionId: executionId(job),
                    checkedBy: checkedBy(job)
                }).catch(saveError => logger.warn(`[AFFILIATE-CHECK] No se pudo guardar error ARCA: ${saveError.message}`));
                const state = await rebuildState(affiliate._id).catch(() => null);
                await markFailed(row, state, error.message, { arca: arcaResultState(errorResult) });
            }
            await updateJobCounts(job._id);
        }

        const summary = await updateJobCounts(job._id);
        const finalStatus = summary.failedCount === 0 ? "completed" : "completed_with_errors";
        await AffiliateCheckJob.updateOne(
            { _id: job._id, status: "processing" },
            { $set: { status: finalStatus, finishedAt: new Date() } }
        );
        return AffiliateCheckJob.findById(job._id).lean();
    } catch (error) {
        logger.error(`[AFFILIATE-CHECK] Error fatal procesando job ${job._id}: ${error.stack || error.message}`);
        await adjustAffiliateCheckJobQuota({ jobId: job._id, reason: "affiliate_check_failed" });
        await AffiliateCheckJob.updateOne(
            { _id: job._id },
            { $set: { status: "failed", errorMessage: error.message, finishedAt: new Date() } }
        );
        await releaseAffiliateCheckJobReservations({ jobId: job._id, reason: "affiliate_check_failed" });
        throw error;
    } finally {
        await closeArcaSession(session);
    }
}

async function claimAndProcessNextAffiliateCheckJob() {
    const job = await AffiliateCheckJob.findOne({ status: "pending", mode: { $in: PROCESSABLE_MODES } }).sort({ createdAt: 1 }).select("_id").lean();
    if (!job) return null;
    return processAffiliateCheckJob(job._id);
}

async function failStaleProcessingAffiliateCheckJobs() {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const staleJobs = await AffiliateCheckJob.find({ status: "processing", mode: { $in: PROCESSABLE_MODES }, startedAt: { $lt: staleBefore } }).select("_id").lean();
    for (const job of staleJobs) {
        await adjustAffiliateCheckJobQuota({ jobId: job._id, reason: "affiliate_check_stale_processing" });
        await AffiliateCheckJob.updateOne(
            { _id: job._id, status: "processing" },
            { $set: { status: "failed", errorMessage: "Procesamiento interrumpido por timeout", finishedAt: new Date() } }
        );
        await releaseAffiliateCheckJobReservations({ jobId: job._id, reason: "affiliate_check_stale_processing" });
    }
    return { modifiedCount: staleJobs.length };
}

module.exports = {
    PROCESSABLE_MODES,
    processAffiliateCheckJob,
    claimAndProcessNextAffiliateCheckJob,
    failStaleProcessingAffiliateCheckJobs
};
