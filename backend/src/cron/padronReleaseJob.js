// backend/src/cron/padronReleaseJob.js
// ============================================================
// CRON JOB - LIBERACIÓN AUTOMÁTICA DE PADRÓN
// ============================================================
// Se ejecuta el PRIMER DÍA de cada mes a las 00:01 (hora Argentina)
// Marca como disponibleParaVenta = true todas las auditorías
// cuyo mesPadron coincida con el mes actual.

const cron = require('node-cron');
const Audit = require('../models/Audit');
const logger = require('../utils/logger');
const { notifyPadronRelease } = require('../services/notificationService');

/**
 * Obtiene el mes actual en formato YYYY-MM
 * @returns {string} Mes actual, ej: "2027-02"
 */
function getCurrentMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

// Ejecutar el primer día de cada mes a las 00:01 (hora de Argentina)
// Formato cron: minuto hora día-del-mes mes día-de-la-semana
// '1 0 1 * *' = minuto 1, hora 0, día 1, cualquier mes, cualquier día de la semana
cron.schedule('1 0 1 * *', async () => {
    try {
        const currentMonth = getCurrentMonth();

        logger.info(`🗓️ [CRON-PADRON] Iniciando proceso de liberación de Padrón para ${currentMonth}`);

        // Buscar y actualizar todas las auditorías con mesPadron igual al mes actual
        const result = await Audit.updateMany(
            { mesPadron: currentMonth },
            { $set: { disponibleParaVenta: true } }
        );

        if (result.modifiedCount > 0) {
            logger.info(`✅ [CRON-PADRON] ${result.modifiedCount} auditoría(s) liberadas para venta (mes: ${currentMonth})`);

            // Notificar a los Recuperadores
            try {
                await notifyPadronRelease({
                    count: result.modifiedCount,
                    month: currentMonth
                });
            } catch (notifyError) {
                logger.error('❌ [CRON-PADRON] Error enviando notificación:', notifyError);
            }
        } else {
            logger.info(`ℹ️ [CRON-PADRON] No hay auditorías para liberar este mes (${currentMonth})`);
        }

        logger.info(`✅ [CRON-PADRON] Proceso completado`);

    } catch (error) {
        logger.error('❌ [CRON-PADRON] Error en proceso de liberación:', error);
    }
}, {
    timezone: "America/Argentina/Buenos_Aires"
});

logger.info('✅ Cron job de Liberación de Padrón registrado (se ejecutará el 1° de cada mes a las 00:01 hrs)');

module.exports = {};
