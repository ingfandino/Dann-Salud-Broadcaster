/**
 * ============================================================
 * AFFILIATE CONTRIBUTION CRON JOB
 * ============================================================
 * Ejecuta verificación semanal de aportes ARCA para afiliados que:
 *   - No tienen documento AffiliateContribution
 *   - verification.status: pending | captcha | error
 *   - verification.checkedAt > 7 días de antigüedad
 *
 * Horario: Todos los lunes a las 03:00 (hora Argentina)
 */

const cron = require("node-cron");
const { v4: uuidv4 } = require("uuid");
const { getPendingAffiliates, verifyBatch } = require("../services/contributionSync.service");
const logger = require("../utils/logger");

// Todos los lunes a las 03:00 (Argentina)
cron.schedule(
    "0 3 * * 1",
    async () => {
        const executionId = uuidv4();
        logger.info(`🕐 [CRON-CONTRIBUTION] Iniciando verificación semanal de aportes. ID: ${executionId}`);

        try {
            const affiliates = await getPendingAffiliates();

            if (!affiliates.length) {
                logger.info("ℹ️ [CRON-CONTRIBUTION] No hay afiliados pendientes de verificación");
                return;
            }

            logger.info(`📊 [CRON-CONTRIBUTION] Afiliados a verificar: ${affiliates.length}`);

            const stats = await verifyBatch(affiliates, {
                executionType: "cron",
                executionId,
                checkedBy: "system",
                delayMs: 2500,
            });

            logger.info(
                `✅ [CRON-CONTRIBUTION] Verificación completada. ` +
                `Procesados: ${stats.processed}, ` +
                `Éxito: ${stats.success || 0}, ` +
                `Sin datos: ${stats.no_data || 0}, ` +
                `Captcha: ${stats.captcha || 0}, ` +
                `Error: ${stats.error || 0}`
            );
        } catch (err) {
            logger.error(`❌ [CRON-CONTRIBUTION] Error en verificación semanal: ${err.message}`);
        }
    },
    {
        timezone: "America/Argentina/Buenos_Aires",
    }
);

logger.info("✅ Cron job de verificación de aportes ARCA registrado (lunes 03:00 hs)");

module.exports = {};
