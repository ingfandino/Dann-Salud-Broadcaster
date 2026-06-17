/**
 * ============================================================
 * PADRON SYNC SERVICE
 * ============================================================
 * Orquesta la consulta al Padrón de SSSalud para afiliados elegibles.
 * Persiste resultados en AffiliateContribution.padron.
 * Recalcula CanSell en tiempo real tras cada resultado de Padrón.
 *
 * Regla de elegibilidad (evaluateNeedsPadronCheck):
 *   - Trim. pagos > 0  (last3ClosedMonthsPaidCount > 0) → revisar
 *   - Trim. pagos = 0 o null → NO revisar
 */

"use strict";

const AffiliateContribution = require("../models/AffiliateContribution");
const { SSSaludSession, scrapeCuilWithSession, isSolverAvailable } = require("./sssaludScraper.service");
const { computeAndUpdateCanSell } = require("../utils/canSellUtils");
const logger = require("../utils/logger").getLogger("padron");

// ─────────────────────────────────────────────────────────────
// Helpers de fecha
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve el período del mes anterior al actual en formato "MM/YYYY".
 */
function getPrevMonthPeriod() {
    const now = new Date();
    let m = now.getMonth(); // 0-indexed → mes anterior
    let y = now.getFullYear();
    if (m === 0) { m = 12; y -= 1; }
    return `${String(m).padStart(2, "0")}/${y}`;
}

/**
 * Devuelve el período del mes actual en formato "MM/YYYY".
 */
function getCurrentMonthPeriod() {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

// ─────────────────────────────────────────────────────────────
// Lógica de elegibilidad
// ─────────────────────────────────────────────────────────────

/**
 * Determina si un afiliado necesita consulta al Padrón de SSSalud.
 *
 * Nueva regla: revisar todo registro con al menos 1 aporte pagado en el trimestre.
 *
 * @param {number|null} last3  - Trim. pagos (0-3)
 * @returns {boolean}
 */
function evaluateNeedsPadronCheck(last3) {
    return last3 != null && last3 > 0;
}

// ─────────────────────────────────────────────────────────────
// Persistencia
// ─────────────────────────────────────────────────────────────

/**
 * Guarda el resultado del scraper SSSalud en AffiliateContribution.padron.
 *
 * @param {string} affiliateId
 * @param {object} scraperResult  - Resultado de scrapeCuilWithSession
 */
async function savePadronResult(affiliateId, scraperResult) {
    const padronData = {
        status:         scraperResult.status,
        checkedAt:      scraperResult.checkedAt || new Date(),
        canSell:        scraperResult.canSell   ?? null,
        periodoDesde:   scraperResult.data?.periodoDesde   ?? null,
        nextChangeDate: scraperResult.data?.nextChangeDate ?? null,
        monthsElapsed:  scraperResult.data?.monthsElapsed  ?? null,
        obraSocial:     scraperResult.data?.obraSocial     ?? null,
        estado:         scraperResult.data?.estado         ?? null,
    };

    const updated = await AffiliateContribution.findOneAndUpdate(
        { affiliateId },
        { $set: { padron: padronData } },
        { new: true }
    );

    if (!updated) {
        logger.warn(`⚠️ [PADRON-SYNC] AffiliateContribution no encontrado para affiliateId=${affiliateId} — se omite guardado`);
        return;
    }

    // 🔁 RECOMPUTE CanSell after every Padrón update
    const canSellResult = await computeAndUpdateCanSell(affiliateId);
    
    if (!canSellResult.success) {
        logger.error(
            `❌ [PADRON-SYNC] CanSell computation failed | affiliateId=${affiliateId} | ` +
            `padronStatus=${padronData.status} | error=${canSellResult.error}`
        );
        // Track the failure - rethrow or return info for batch tracking
        throw new Error(`CanSell computation failed: ${canSellResult.error}`);
    }
    
    logger.info(
        `[PADRON-SYNC] CanSell updated | affiliateId=${affiliateId} | ` +
        `padron=${padronData.status} | canSell=${canSellResult.canSell}`
    );
}

// ─────────────────────────────────────────────────────────────
// Batch principal
// ─────────────────────────────────────────────────────────────

/**
 * Consulta el padrón SSSalud para una lista de afiliados usando una sesión
 * Playwright compartida. Persiste cada resultado inmediatamente.
 *
 * @param {Array<{ _id: string|ObjectId, cuil: string }>} affiliates
 * @param {SSSaludSession} [existingSession]  - Sesión externa (opcional; si no se pasa, se crea una)
 * @returns {Promise<{ processed, not_found, found_expired, found_active, captcha_failed, error }>}
 */
async function syncPadronBatch(affiliates, existingSession = null) {
    const stats = { processed: 0, not_found: 0, found_expired: 0, found_active: 0, captcha_failed: 0, error: 0 };

    if (!affiliates || affiliates.length === 0) {
        logger.info("📦 [PADRON-SYNC] Batch vacío, nada que procesar");
        return stats;
    }

    const available = await isSolverAvailable();
    if (!available) {
        logger.warn(`⚠️ [PADRON-SYNC] Microservicio CAPTCHA no disponible — batch abortado`);
        return stats;
    }

    const ownsSession = !existingSession;
    let session = existingSession;

    try {
        if (ownsSession) {
            session = await SSSaludSession.create();
        }
        logger.info(`🚀 [PADRON-SYNC] Batch iniciado | total=${affiliates.length}`);

        for (const affiliate of affiliates) {
            if (stats.processed > 0) {
                const delay = 800 + Math.floor(Math.random() * 400);
                await new Promise(r => setTimeout(r, delay));
            }

            try {
                const result = await scrapeCuilWithSession(affiliate.cuil, session);
                await savePadronResult(String(affiliate._id), result);

                stats.processed++;
                const key = result.status;
                if (key in stats) stats[key]++;
                else stats.error++;

                logger.info(`✅ [PADRON-SYNC] ${affiliate.cuil} → ${result.status}${result.data?.nextChangeDate ? ` | libera: ${result.data.nextChangeDate}` : ""}`);
            } catch (err) {
                logger.error(`❌ [PADRON-SYNC] Error CUIL ${affiliate.cuil}: ${err.message}`);
                stats.error++;
                stats.processed++;
            }
        }
    } finally {
        if (ownsSession && session) await session.close();
        logger.info(`📦 [PADRON-SYNC] Batch finalizado | ${JSON.stringify(stats)}`);
    }

    return stats;
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
    evaluateNeedsPadronCheck,
    savePadronResult,
    syncPadronBatch,
    getPrevMonthPeriod,
    getCurrentMonthPeriod,
};
