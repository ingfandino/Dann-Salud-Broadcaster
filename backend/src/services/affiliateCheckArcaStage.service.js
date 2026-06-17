"use strict";

const Affiliate = require("../models/Affiliate");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const { BrowserSession, scrapeCuilWithSession } = require("./contributionScraper.service");
const { saveResult } = require("./contributionSync.service");
const {
    claimAffiliateCheckStage,
    completeAffiliateCheckStage,
    failAffiliateCheckStage,
    heartbeatAffiliateCheckStage
} = require("./affiliateCheckStage.service");
const logger = require("../utils/logger").getLogger("affiliate-check-arca");

const ARCA_STAGE = "arca";
const RETRYABLE_RESULT_STATUSES = new Set(["captcha", "error"]);

// Future Padrón recovery must combine positive trimPagos, trabaja=true, a technical
// Padrón failure, no active ownership, and return successful recovery to general stock.

function executionId(jobId) {
    return `affiliate_check:${jobId}`;
}

function normalizeArcaStageResult(scraperResult, now = new Date()) {
    const trimPagos = typeof scraperResult?.last3ClosedMonthsPaidCount === "number"
        ? scraperResult.last3ClosedMonthsPaidCount
        : null;
    const trabaja = scraperResult?.trabaja ?? null;
    const success = scraperResult?.status === "success" && scraperResult?.ok !== false;
    const needsPadron = success ? trimPagos > 0 && trabaja === true : false;

    return {
        status: scraperResult?.status || "error",
        verificationStatus: scraperResult?.status || "error",
        trabaja,
        ultimoAporte: scraperResult?.lastContributionPeriod || null,
        inicioLaboral: scraperResult?.inicioLaboral || null,
        trimPagos,
        last3ClosedMonthsPaidCount: trimPagos,
        needsPadron,
        errorMessage: scraperResult?.errorMessage || null,
        checkedAt: scraperResult?.checkedAt || now
    };
}

function isRetryableArcaError(error) {
    if (error?.retryable === false) return false;
    return true;
}

function isRetryableArcaResult(scraperResult) {
    return RETRYABLE_RESULT_STATUSES.has(scraperResult?.status);
}

async function updateRowArcaMetadata({ rowId, workerId, arcaResult, padronStatus }) {
    return AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            "stages.arca.status": "processing",
            "stages.arca.claimedBy": String(workerId)
        },
        {
            $set: {
                "stages.arca.result": arcaResult,
                "resultState.arca": arcaResult,
                "stages.padron.status": padronStatus,
                "stages.padron.errorMessage": null,
                "stages.padron.claimedBy": null,
                "stages.padron.claimedAt": null,
                "stages.padron.leaseUntil": null,
                "stages.padron.heartbeatAt": null,
                "stages.padron.finishedAt": padronStatus === "skipped" ? arcaResult.checkedAt : null
            }
        },
        { new: true }
    );
}

function startHeartbeat({ rowId, workerId, leaseMs }) {
    const intervalMs = Math.max(1000, Math.floor(Number(leaseMs) / 3));
    const timer = setInterval(() => {
        heartbeatAffiliateCheckStage({
            rowId,
            stage: ARCA_STAGE,
            workerId,
            leaseMs,
            now: new Date()
        }).catch(error => {
            logger.warn(`[AFFILIATE-CHECK-ARCA] Heartbeat falló para row=${rowId}: ${error.message}`);
        });
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return timer;
}

async function persistCanonicalArcaResult({ row, job, affiliate, scraperResult, workerId }) {
    return saveResult(String(affiliate._id), affiliate.cuil, scraperResult, {
        executionType: "affiliate_check",
        executionId: executionId(job._id),
        checkedBy: job.requestedBy ? String(job.requestedBy) : String(workerId)
    });
}

async function failClaimedArcaStage({ row, workerId, errorMessage, retryable, result, now }) {
    const arcaResult = result || {
        status: "error",
        verificationStatus: "error",
        trabaja: null,
        ultimoAporte: null,
        inicioLaboral: null,
        trimPagos: null,
        last3ClosedMonthsPaidCount: null,
        needsPadron: false,
        errorMessage,
        checkedAt: now
    };

    await updateRowArcaMetadata({
        rowId: row._id,
        workerId,
        arcaResult,
        padronStatus: retryable ? "blocked" : "skipped"
    });

    const failed = await failAffiliateCheckStage({
        rowId: row._id,
        stage: ARCA_STAGE,
        workerId,
        errorMessage,
        retryable,
        now
    });
    return { row: failed, result: arcaResult, retryable, success: false };
}

async function processClaimedAffiliateCheckArcaStage({
    row,
    workerId,
    leaseMs,
    session,
    now = new Date()
}) {
    const job = await AffiliateCheckJob.findById(row.jobId).lean();
    if (!job || !["pending", "processing", "pausing", "retrying"].includes(job.status)) {
        return failClaimedArcaStage({
            row,
            workerId,
            errorMessage: "Affiliate Check job is no longer active",
            retryable: false,
            now
        });
    }

    const affiliate = await Affiliate.findById(row.affiliateId).lean();
    if (!affiliate) {
        return failClaimedArcaStage({
            row,
            workerId,
            errorMessage: "Afiliado no encontrado",
            retryable: false,
            now
        });
    }
    if (!affiliate.cuil || String(affiliate.cuil).replace(/\D/g, "").length < 10) {
        return failClaimedArcaStage({
            row,
            workerId,
            errorMessage: "CUIL inválido o ausente",
            retryable: false,
            now
        });
    }

    let ownedSession = null;
    const activeSession = session || await BrowserSession.create();
    if (!session) ownedSession = activeSession;
    const heartbeat = startHeartbeat({ rowId: row._id, workerId, leaseMs });

    try {
        const scraperResult = await scrapeCuilWithSession(affiliate.cuil, activeSession, {
            executionId: executionId(job._id)
        });
        await persistCanonicalArcaResult({ row, job, affiliate, scraperResult, workerId });

        const arcaResult = normalizeArcaStageResult(scraperResult, now);
        if (scraperResult.status !== "success" || scraperResult.ok === false) {
            return failClaimedArcaStage({
                row,
                workerId,
                errorMessage: scraperResult.errorMessage || `ARCA: ${scraperResult.status}`,
                retryable: isRetryableArcaResult(scraperResult),
                result: arcaResult,
                now
            });
        }

        const padronStatus = arcaResult.needsPadron ? "pending" : "skipped";
        const metadataRow = await updateRowArcaMetadata({
            rowId: row._id,
            workerId,
            arcaResult,
            padronStatus
        });
        if (!metadataRow) {
            return { row: null, result: arcaResult, success: false, lostLease: true };
        }

        const completed = await completeAffiliateCheckStage({
            rowId: row._id,
            stage: ARCA_STAGE,
            workerId,
            result: arcaResult,
            now
        });
        return { row: completed, result: arcaResult, success: Boolean(completed), retryable: false };
    } catch (error) {
        const errorResult = {
            status: "error",
            checkedAt: now,
            lastContributionPeriod: null,
            last3ClosedMonthsPaidCount: null,
            trabaja: null,
            inicioLaboral: null,
            errorMessage: error.message
        };
        await persistCanonicalArcaResult({ row, job, affiliate, scraperResult: errorResult, workerId })
            .catch(saveError => logger.warn(`[AFFILIATE-CHECK-ARCA] No se pudo persistir error ARCA: ${saveError.message}`));
        return failClaimedArcaStage({
            row,
            workerId,
            errorMessage: error.message,
            retryable: isRetryableArcaError(error),
            result: normalizeArcaStageResult(errorResult, now),
            now
        });
    } finally {
        clearInterval(heartbeat);
        if (ownedSession) {
            try {
                await ownedSession.close();
            } catch (error) {
                logger.warn(`[AFFILIATE-CHECK-ARCA] Error cerrando sesión: ${error.message}`);
            }
        }
    }
}

async function processNextAffiliateCheckArcaStage({
    workerId,
    leaseMs = 5 * 60 * 1000,
    session = null,
    now = new Date()
}) {
    const row = await claimAffiliateCheckStage({
        stage: ARCA_STAGE,
        workerId,
        leaseMs,
        now
    });
    if (!row) return null;
    return processClaimedAffiliateCheckArcaStage({ row, workerId, leaseMs, session, now });
}

module.exports = {
    isRetryableArcaError,
    isRetryableArcaResult,
    normalizeArcaStageResult,
    processClaimedAffiliateCheckArcaStage,
    processNextAffiliateCheckArcaStage
};
