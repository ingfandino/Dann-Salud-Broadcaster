"use strict";

const { chromium } = require("playwright");
const Affiliate = require("../models/Affiliate");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const { scrapeDataeas } = require("./dateasBot.service");
const {
    claimAffiliateCheckStage,
    completeAffiliateCheckStage,
    failAffiliateCheckStage,
    heartbeatAffiliateCheckStage
} = require("./affiliateCheckStage.service");
const logger = require("../utils/logger").getLogger("affiliate-check-dateas");

const DATEAS_STAGE = "dateas";
const NAV_TIMEOUT = 30_000;
const ACTION_TIMEOUT = 15_000;

function normalizeDateasStageResult(scraperResult, now = new Date()) {
    return {
        status: "success",
        nombre: scraperResult?.nombre || null,
        edad: Number.isInteger(scraperResult?.edad) && scraperResult.edad > 0
            ? scraperResult.edad
            : null,
        provincia: scraperResult?.provincia || null,
        localidad: scraperResult?.localidad || null,
        errorMessage: null,
        checkedAt: now
    };
}

function errorDateasStageResult(errorMessage, now = new Date()) {
    return {
        status: "error",
        nombre: null,
        edad: null,
        provincia: null,
        localidad: null,
        errorMessage,
        checkedAt: now
    };
}

function hasUsableDateasData(result) {
    return Boolean(
        result
        && (result.nombre || result.edad !== null || result.provincia || result.localidad)
    );
}

function isRetryableDateasError(error) {
    return error?.retryable !== false;
}

async function createDateasSession() {
    const browser = await chromium.launch({
        headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        locale: "es-AR"
    });
    const page = await context.newPage();
    page.setDefaultTimeout(ACTION_TIMEOUT);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);
    return {
        page,
        async close() {
            try {
                await context.close();
            } finally {
                await browser.close();
            }
        }
    };
}

function startHeartbeat({ rowId, workerId, leaseMs }) {
    const intervalMs = Math.max(1000, Math.floor(Number(leaseMs) / 3));
    const timer = setInterval(() => {
        heartbeatAffiliateCheckStage({
            rowId,
            stage: DATEAS_STAGE,
            workerId,
            leaseMs,
            now: new Date()
        }).catch(error => {
            logger.warn(`[AFFILIATE-CHECK-DATEAS] Heartbeat falló para row=${rowId}: ${error.message}`);
        });
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return timer;
}

async function updateRowDateasMetadata({ rowId, workerId, dateasResult }) {
    return AffiliateCheckRow.findOneAndUpdate(
        {
            _id: rowId,
            "stages.dateas.status": "processing",
            "stages.dateas.claimedBy": String(workerId)
        },
        {
            $set: {
                "stages.dateas.result": dateasResult,
                "resultState.dateas": dateasResult
            }
        },
        { new: true }
    );
}

async function enrichAffiliateFromDateas(affiliateId, dateasResult) {
    const set = {};
    if (dateasResult.edad !== null) set.edad = dateasResult.edad;
    if (dateasResult.localidad) set.localidad = dateasResult.localidad;
    if (!Object.keys(set).length) return null;
    return Affiliate.findByIdAndUpdate(affiliateId, { $set: set }, { new: true });
}

async function failClaimedDateasStage({
    row,
    workerId,
    errorMessage,
    retryable,
    result,
    now
}) {
    const dateasResult = result || errorDateasStageResult(errorMessage, now);
    await updateRowDateasMetadata({
        rowId: row._id,
        workerId,
        dateasResult
    });
    const failed = await failAffiliateCheckStage({
        rowId: row._id,
        stage: DATEAS_STAGE,
        workerId,
        errorMessage,
        retryable,
        now
    });
    return { row: failed, result: dateasResult, retryable, success: false };
}

async function processClaimedAffiliateCheckDateasStage({
    row,
    workerId,
    leaseMs,
    session,
    now = new Date()
}) {
    const job = await AffiliateCheckJob.findById(row.jobId).lean();
    if (!job || !["pending", "processing", "pausing", "retrying"].includes(job.status)) {
        return failClaimedDateasStage({
            row,
            workerId,
            errorMessage: "Affiliate Check job is no longer active",
            retryable: false,
            now
        });
    }

    const affiliate = await Affiliate.findById(row.affiliateId).lean();
    if (!affiliate) {
        return failClaimedDateasStage({
            row,
            workerId,
            errorMessage: "Afiliado no encontrado",
            retryable: false,
            now
        });
    }
    if (!affiliate.cuil || String(affiliate.cuil).replace(/\D/g, "").length < 10) {
        return failClaimedDateasStage({
            row,
            workerId,
            errorMessage: "CUIL inválido o ausente",
            retryable: false,
            now
        });
    }

    let ownedSession = null;
    const activeSession = session || await createDateasSession();
    if (!session) ownedSession = activeSession;
    const heartbeat = startHeartbeat({ rowId: row._id, workerId, leaseMs });

    try {
        const scraperResult = await scrapeDataeas(activeSession.page, affiliate.cuil);
        if (!scraperResult) {
            return failClaimedDateasStage({
                row,
                workerId,
                errorMessage: "Sin resultados en DATEAS",
                retryable: false,
                now
            });
        }

        const dateasResult = normalizeDateasStageResult(scraperResult, now);
        if (!hasUsableDateasData(dateasResult)) {
            return failClaimedDateasStage({
                row,
                workerId,
                errorMessage: "DATEAS no devolvió datos utilizables",
                retryable: false,
                result: errorDateasStageResult("DATEAS no devolvió datos utilizables", now),
                now
            });
        }

        const metadataRow = await updateRowDateasMetadata({
            rowId: row._id,
            workerId,
            dateasResult
        });
        if (!metadataRow) {
            return { row: null, result: dateasResult, success: false, lostLease: true };
        }

        await enrichAffiliateFromDateas(affiliate._id, dateasResult);
        const completed = await completeAffiliateCheckStage({
            rowId: row._id,
            stage: DATEAS_STAGE,
            workerId,
            result: dateasResult,
            now
        });
        return { row: completed, result: dateasResult, success: Boolean(completed), retryable: false };
    } catch (error) {
        return failClaimedDateasStage({
            row,
            workerId,
            errorMessage: error.message,
            retryable: isRetryableDateasError(error),
            result: errorDateasStageResult(error.message, now),
            now
        });
    } finally {
        clearInterval(heartbeat);
        if (ownedSession) {
            try {
                await ownedSession.close();
            } catch (error) {
                logger.warn(`[AFFILIATE-CHECK-DATEAS] Error cerrando sesión: ${error.message}`);
            }
        }
    }
}

async function processNextAffiliateCheckDateasStage({
    workerId,
    leaseMs = 5 * 60 * 1000,
    session = null,
    now = new Date()
}) {
    const row = await claimAffiliateCheckStage({
        stage: DATEAS_STAGE,
        workerId,
        leaseMs,
        now
    });
    if (!row) return null;
    return processClaimedAffiliateCheckDateasStage({ row, workerId, leaseMs, session, now });
}

module.exports = {
    createDateasSession,
    hasUsableDateasData,
    isRetryableDateasError,
    normalizeDateasStageResult,
    processClaimedAffiliateCheckDateasStage,
    processNextAffiliateCheckDateasStage
};
