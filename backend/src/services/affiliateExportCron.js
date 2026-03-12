/**
 * ============================================================
 * CRON DE EXPORTACIÓN DE AFILIADOS (affiliateExportCron.js)
 * ============================================================
 * Ejecuta exportaciones programadas de afiliados.
 * Verifica cada minuto si es hora de exportar.
 */

const cron = require("node-cron");
const logger = require("../utils/logger");
const { generateAndSendAffiliateCSVs } = require("./affiliateExportService");

let cronJob = null;

/** Inicia el cron job de exportación */
function startAffiliateExportCron() {
    if (cronJob) {
        logger.warn("⚠️ Cron de exportación de afiliados ya está activo");
        return;
    }

    // Ejecutar cada minuto
    cronJob = cron.schedule("* * * * *", async () => {
        try {
            await generateAndSendAffiliateCSVs();
        } catch (error) {
            logger.error("❌ Error en cron de exportación de afiliados:", error);
        }
    });

    logger.info("✅ Cron de exportación programada de afiliados iniciado (cada minuto)");
}

/**
 * Detener cron job
 */
function stopAffiliateExportCron() {
    if (cronJob) {
        cronJob.stop();
        cronJob = null;
        logger.info("🛑 Cron de exportación de afiliados detenido");
    }
}

module.exports = {
    startAffiliateExportCron,
    stopAffiliateExportCron
};
