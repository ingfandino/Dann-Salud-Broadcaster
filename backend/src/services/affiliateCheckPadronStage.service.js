"use strict";

const Affiliate = require("../models/Affiliate");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const AffiliateContribution = require("../models/AffiliateContribution");
const { SSSaludSession, scrapeCuilWithSession } = require("./sssaludScraper.service");
const { savePadronResult } = require("./padronSync.service");
const {
    claimAffiliateCheckStage,
    completeAffiliateCheckStage,
    failAffiliateCheckStage,
    heartbeatAffiliateCheckStage
} = require("./affiliateCheckStage.service");
const logger = require("../utils/logger").getLogger("affiliate-check-padron");

const PADRON_STAGE = "padron";
const SUCCESS_STATUSES = new Set(["not_found", "found_expired", "found_active"]);
const RETRYABLE_STATUSES = new Set(["captcha_failed", "error", "solver_unavailable", "timeout"]);

function normalizeCuil(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 ? digits : null;
}

function canonicalPadronStatus(status) {
    return status === "solver_unavailable" || status === "timeout" ? "error" : status;
}

function normalizePadronStageResult(scraperResult, now = new Date()) {
    const data = scraperResult?.data || {};
    return {
        status: canonicalPadronStatus(scraperResult?.status || "error"),
        sourceStatus: scraperResult?.status || "error",
        found: scraperResult?.found === true,
        obraSocial: data.obraSocial || null,
        periodoDesde: data.periodoDesde || null,
        nextChangeDate: data.nextChangeDate || null,
        monthsElapsed: data.monthsElapsed ?? null,
        estado: data.estado || null,
        canSell: scraperResult?.canSell ?? data.canSell ?? null,
        errorMessage: scraperResult?.errorMessage || null,
        checkedAt: scraperResult?.checkedAt || now
    };
}

function errorPadronStageResult(errorMessage, now = new Date()) {
    return normalizePadronStageResult({
        ok: false,
        status: "error",
        found: false,
        data: null,
        errorMessage,
        checkedAt: now
    }, now);
}

function isRetryablePadronResult(scraperResult) {
    return RETRYABLE_STATUSES.has(scraperResult?.status);
}

function isRetryablePadronError(error) {
    return error?.retryable !== false;
}

function toCanonicalScraperResult(scraperResult, now = new Date()) {
    return {
        ...scraperResult,
        status: canonicalPadronStatus(scraperResult?.status || "error"),
        canSell: scraperResult?.canSell ?? scraperResult?.data?.canSell ?? null,
        checkedAt: scraperResult?.checkedAt || now,
        errorMessage: scraperResult?.errorMessage || null
    };
}

function startHeartbeat({ rowId, workerId, leaseMs }) {
    const intervalMs = Math.max(1000, Math.floor(Number(leaseMs) / 3));
    const timer = setInterval(() => {
        heartbeatAffiliateCheckStage({
            rowId,
            stage: PADRON_STAGE,
            workerId,
            leaseMs,
            now: new Date()
        }).catch(error => {
            logger.warn(`[AFFILIATE-CHECK-PADRON] Heartbeat falló para row=${rowId}: ${error.message}`);
        });
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return timer;
}

async function updateRowPadronMetadata({ rowId, workerId, padronResult }) {
    return AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            "stages.padron.status": "processing",
            "stages.padron.claimedBy": String(workerId)
        },
        {
            $set: {
                "stages.padron.result": padronResult,
                "resultState.padron": padronResult
            }
        },
        { new: true }
    );
}

async function failClaimedPadronStage({
    row,
    workerId,
    errorMessage,
    retryable,
    result,
    now
}) {
    const padronResult = result || errorPadronStageResult(errorMessage, now);
    await updateRowPadronMetadata({
        rowId: row._id,
        workerId,
        padronResult
    });
    const failed = await failAffiliateCheckStage({
        rowId: row._id,
        stage: PADRON_STAGE,
        workerId,
        errorMessage,
        retryable,
        now
    });
    return { row: failed, result: padronResult, retryable, success: false };
}

async function processClaimedAffiliateCheckPadronStage({
    row,
    workerId,
    leaseMs,
    session,
    now = new Date()
}) {
    const job = await AffiliateCheckJob.findById(row.jobId).lean();
    if (!job || !["pending", "processing", "pausing", "retrying"].includes(job.status)) {
        return failClaimedPadronStage({
            row,
            workerId,
            errorMessage: "Affiliate Check job is no longer active",
            retryable: false,
            now
        });
    }

    const [affiliate, contribution] = await Promise.all([
        Affiliate.findById(row.affiliateId).lean(),
        AffiliateContribution.findOne({ affiliateId: row.affiliateId }).lean()
    ]);
    if (!affiliate) {
        return failClaimedPadronStage({
            row,
            workerId,
            errorMessage: "Afiliado no encontrado",
            retryable: false,
            now
        });
    }
    if (!contribution) {
        return failClaimedPadronStage({
            row,
            workerId,
            errorMessage: "AffiliateContribution no encontrado para Padrón",
            retryable: false,
            now
        });
    }

    const cuil = normalizeCuil(row.cuilNormalized)
        || normalizeCuil(affiliate.cuil)
        || normalizeCuil(contribution.cuil);
    if (!cuil) {
        return failClaimedPadronStage({
            row,
            workerId,
            errorMessage: "CUIL inválido o ausente para Padrón",
            retryable: false,
            now
        });
    }

    let ownedSession = null;
    const activeSession = session || await SSSaludSession.create();
    if (!session) ownedSession = activeSession;
    const heartbeat = startHeartbeat({ rowId: row._id, workerId, leaseMs });

    try {
        const scraperResult = await scrapeCuilWithSession(cuil, activeSession);
        const padronResult = normalizePadronStageResult(scraperResult, now);
        await savePadronResult(String(row.affiliateId), toCanonicalScraperResult(scraperResult, now));

        if (isRetryablePadronResult(scraperResult)) {
            return failClaimedPadronStage({
                row,
                workerId,
                errorMessage: padronResult.errorMessage || `Padrón: ${scraperResult.status}`,
                retryable: true,
                result: padronResult,
                now
            });
        }

        if (!SUCCESS_STATUSES.has(padronResult.status)) {
            return failClaimedPadronStage({
                row,
                workerId,
                errorMessage: padronResult.errorMessage || `Estado Padrón no soportado: ${padronResult.sourceStatus}`,
                retryable: false,
                result: padronResult,
                now
            });
        }

        const metadataRow = await updateRowPadronMetadata({
            rowId: row._id,
            workerId,
            padronResult
        });
        if (!metadataRow) {
            return { row: null, result: padronResult, success: false, lostLease: true };
        }

        const completed = await completeAffiliateCheckStage({
            rowId: row._id,
            stage: PADRON_STAGE,
            workerId,
            result: padronResult,
            now
        });
        return { row: completed, result: padronResult, success: Boolean(completed), retryable: false };
    } catch (error) {
        return failClaimedPadronStage({
            row,
            workerId,
            errorMessage: error.message,
            retryable: isRetryablePadronError(error),
            result: errorPadronStageResult(error.message, now),
            now
        });
    } finally {
        clearInterval(heartbeat);
        if (ownedSession) {
            try {
                await ownedSession.close();
            } catch (error) {
                logger.warn(`[AFFILIATE-CHECK-PADRON] Error cerrando sesión: ${error.message}`);
            }
        }
    }
}

async function processNextAffiliateCheckPadronStage({
    workerId,
    leaseMs = 5 * 60 * 1000,
    session = null,
    now = new Date()
}) {
    const row = await claimAffiliateCheckStage({
        stage: PADRON_STAGE,
        workerId,
        leaseMs,
        now
    });
    if (!row) return null;
    return processClaimedAffiliateCheckPadronStage({ row, workerId, leaseMs, session, now });
}

module.exports = {
    canonicalPadronStatus,
    isRetryablePadronError,
    isRetryablePadronResult,
    normalizeCuil,
    normalizePadronStageResult,
    processClaimedAffiliateCheckPadronStage,
    processNextAffiliateCheckPadronStage
};
