const cron = require('node-cron');
const recyclingService = require('../services/recyclingService');
const logger = require('../utils/logger');

const initScheduledJobs = () => {
    // Ejecutar todos los días a las 04:00 AM
    cron.schedule('0 4 * * *', async () => {
        logger.info('🔄 Ejecutando reciclaje automático de leads...');
        try {
            // Umbral de 1 día (24hs) según solicitud del usuario
            const result = await recyclingService.recycleLeads(1);
            logger.info(`✅ Reciclaje completado. Leads reciclados: ${result.count}`);
        } catch (error) {
            logger.error('❌ Error en reciclaje automático:', error);
        }
    });

    logger.info('🕒 Tareas programadas inicializadas (Reciclaje: 04:00 AM)');
};

module.exports = initScheduledJobs;
