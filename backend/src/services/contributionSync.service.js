/**
 * ============================================================
 * CONTRIBUTION SYNC SERVICE
 * ============================================================
 * Orquesta la verificación de aportes para uno o varios afiliados.
 * Interactúa con el scraper y persiste resultados en AffiliateContribution.
 */

const AffiliateContribution = require("../models/AffiliateContribution");
const Affiliate = require("../models/Affiliate");
const { scrapeCuil, scrapeCuilWithSession, BrowserSession, randomDelay } = require("./contributionScraper.service");
const logger = require("../utils/logger");
const { computeAndUpdateCanSell } = require("../utils/canSellUtils");

/**
 * Guarda o actualiza el resultado de verificación para un afiliado.
 *
 * @param {string} affiliateId
 * @param {string} cuil
 * @param {object} scraperResult - resultado de scrapeCuil()
 * @param {object} options - { executionType, executionId, checkedBy }
 */
async function saveResult(affiliateId, cuil, scraperResult, options = {}) {
    const { executionType = "cron", executionId = null, checkedBy = "system" } = options;

    const verificationData = {
        status: scraperResult.status,
        checkedAt: scraperResult.checkedAt,
        checkedBy,
        executionType,
        executionId,
        source: "arca_mis_aportes",
        errorMessage: scraperResult.errorMessage || null,
    };

    await AffiliateContribution.findOneAndUpdate(
        { affiliateId },
        {
            $set: {
                cuil,
                lastContributionPeriod: scraperResult.lastContributionPeriod,
                last3ClosedMonthsPaidCount: scraperResult.last3ClosedMonthsPaidCount ?? null,
                verification: verificationData,
            },
        },
        { upsert: true, new: true }
    );

    const canSellResult = await computeAndUpdateCanSell(String(affiliateId));
    if (!canSellResult.success) {
        logger.error(
            `[CONTRIBUTION-SYNC] CanSell computation failed | affiliateId=${affiliateId} | `
            + `arcaStatus=${scraperResult.status} | error=${canSellResult.error}`
        );
        return { canSellError: canSellResult.error, canSellSuccess: false };
    }

    return { canSell: canSellResult.canSell, canSellSuccess: true };
}

/**
 * Verifica un único afiliado por su ObjectId.
 *
 * @param {string|ObjectId} affiliateId
 * @param {object} options - { executionType, executionId, checkedBy }
 * @returns {Promise<object>} resultado del scraper
 */
async function verifyAffiliate(affiliateId, options = {}) {
    const affiliate = await Affiliate.findById(affiliateId).lean();
    if (!affiliate) {
        logger.warn(`⚠️ [CONTRIBUTION-SYNC] Afiliado no encontrado: ${affiliateId}`);
        return { status: "error", errorMessage: "Afiliado no encontrado" };
    }

    const result = await scrapeCuil(affiliate.cuil, { executionId: options.executionId || "manual" });
    await saveResult(String(affiliateId), affiliate.cuil, result, options);
    return result;
}

/**
 * Verifica una lista de afiliados en secuencia usando una BrowserSession compartida.
 * Aplica delays aleatorios entre cada CUIL y detiene el batch al detectar CAPTCHA.
 *
 * @param {Array<{ _id: string, cuil: string }>} affiliates
 * @param {object} options - { executionType, executionId, checkedBy, minDelayMs, maxDelayMs }
 * @returns {Promise<{ processed: number, success: number, no_data: number, captcha: number, error: number, captchaDetected: boolean, captchaPausedAt: number }>}
 */
async function verifyBatch(affiliates, options = {}) {
    const { minDelayMs = 2000, maxDelayMs = 5000 } = options;
    const stats = { processed: 0, success: 0, no_data: 0, captcha: 0, error: 0, captchaDetected: false, captchaPausedAt: null };

    logger.info(`📦 [CONTRIBUTION-SYNC] Batch iniciado | total=${affiliates.length}`);

    let session = null;
    try {
        session = await BrowserSession.create();
        logger.info(`♻️ [CONTRIBUTION-SYNC] Sesión de browser compartida creada`);

        for (const affiliate of affiliates) {
            if (stats.processed > 0) {
                const delayMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
                logger.info(`⏱️ [CONTRIBUTION-SYNC] Delay ${delayMs}ms antes de CUIL ${affiliate.cuil}`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

            try {
                const result = await scrapeCuilWithSession(affiliate.cuil, session, { executionId: options.executionId || "batch" });
                await saveResult(String(affiliate._id), affiliate.cuil, result, options);
                stats.processed++;
                stats[result.status] = (stats[result.status] || 0) + 1;

                if (result.status === "captcha") {
                    logger.warn(`⚠️ [CONTRIBUTION-SYNC] CAPTCHA detectado. Pausando batch | procesados=${stats.processed} | restantes=${affiliates.length - stats.processed}`);
                    stats.captchaDetected = true;
                    stats.captchaPausedAt = stats.processed;
                    break;
                }
            } catch (err) {
                logger.error(`❌ [CONTRIBUTION-SYNC] Error procesando CUIL ${affiliate.cuil}: ${err.message}`);
                stats.error++;
                stats.processed++;
            }
        }
    } finally {
        if (session) await session.close();
        logger.info(`📦 [CONTRIBUTION-SYNC] Batch finalizado | ${JSON.stringify(stats)}`);
    }

    return stats;
}

/**
 * Obtiene los afiliados que deben ser verificados según la lógica semanal:
 * - Sin documento AffiliateContribution
 * - verification.status en: pending | captcha | error
 * - verification.checkedAt older than 7 days
 *
 * @returns {Promise<Array<{ _id: string, cuil: string }>>}
 */
async function getPendingAffiliates() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Obtener IDs que YA tienen documento
    const existing = await AffiliateContribution.find({}, { affiliateId: 1, "verification.status": 1, "verification.checkedAt": 1 }).lean();

    const toRetry = new Set(
        existing
            .filter((doc) => {
                const { status, checkedAt } = doc.verification || {};
                if (["pending", "captcha", "error"].includes(status)) return true;
                if (checkedAt && new Date(checkedAt) < sevenDaysAgo) return true;
                return false;
            })
            .map((doc) => String(doc.affiliateId))
    );

    const existingIds = new Set(existing.map((doc) => String(doc.affiliateId)));

    // Afiliados activos
    const allAffiliates = await Affiliate.find({ active: true }, { _id: 1, cuil: 1 }).lean();

    return allAffiliates.filter((a) => {
        const id = String(a._id);
        return !existingIds.has(id) || toRetry.has(id);
    });
}

module.exports = { verifyAffiliate, verifyBatch, getPendingAffiliates, saveResult };
