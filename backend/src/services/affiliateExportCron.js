// backend/src/services/affiliateExportCron.js

const cron = require("node-cron");
const logger = require("../utils/logger");
const { generateAndSendAffiliateCSVs } = require("./affiliateExportService");

let cronJob = null;

/**
 * Iniciar cron job para exportación programada de afiliados
 * Se ejecuta cada minuto para verificar si es hora de enviar
 */
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
