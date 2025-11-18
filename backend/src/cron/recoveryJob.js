// backend/src/cron/recoveryJob.js
// ✅ VERDADERO CRON JOB - Se ejecuta UNA VEZ al día a las 23:01

const cron = require('node-cron');
const Audit = require('../models/Audit');
const logger = require('../utils/logger');

// Ejecutar a las 23:01 todos los días (hora de Argentina)
cron.schedule('1 23 * * *', async () => {
    try {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const currentDay = now.getDate();
        
        logger.info('🕐 [CRON-RECOVERY] Iniciando proceso automático de Recovery (23:01 hrs)');
        
        // ✅ PASO 1: Marcar auditorías con estados de recuperación
        const recoveryStates = [
            "Falta clave", 
            "Falta documentación",
            "Falta clave y documentación",
            "Pendiente"
        ];
        
        const resultRecovery = await Audit.updateMany(
            { 
                status: { $in: recoveryStates },
                isRecovery: { $ne: true } // Solo las que NO están ya en recuperación
            },
            { 
                $set: { 
                    isRecovery: true,
                    recoveryMovedAt: new Date(),
                    recoveryMonth: currentMonth
                }
            }
        );
        
        if (resultRecovery.modifiedCount > 0) {
            logger.info(`✅ [CRON-RECOVERY] ${resultRecovery.modifiedCount} auditorías marcadas para Recovery`);
        } else {
            logger.info(`ℹ️ [CRON-RECOVERY] No hay auditorías nuevas para marcar como Recovery`);
        }
        
        // ✅ PASO 2: Ocultar auditorías con "QR hecho" de Recovery (soft-delete)
        const resultQR = await Audit.updateMany(
            { 
                status: { $regex: /^QR hecho$/i }, // Case-insensitive
                isRecovery: true
            },
            { 
                $set: { 
                    isRecovery: false, // Quitar de Recovery
                    recoveryDeletedAt: new Date() // Timestamp del soft-delete
                }
            }
        );
        
        if (resultQR.modifiedCount > 0) {
            logger.info(`✅ [CRON-RECOVERY] ${resultQR.modifiedCount} auditorías con "QR hecho" removidas de Recovery`);
        }
        
        // ✅ PASO 3: Soft-delete mensual (último día del mes a las 23:01)
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        if (currentDay === lastDayOfMonth) {
            const resultMonthly = await Audit.updateMany(
                { 
                    recoveryMonth: currentMonth,
                    isRecovery: true
                },
                { 
                    $set: { 
                        isRecovery: false, // Soft-delete: ya no aparecerá en Recuperación
                        recoveryDeletedAt: new Date() // Timestamp
                    }
                }
            );
            
            if (resultMonthly.modifiedCount > 0) {
                logger.info(`🗑️ [CRON-RECOVERY] Soft-delete mensual: ${resultMonthly.modifiedCount} auditorías del mes ${currentMonth} ocultadas`);
            }
        }
        
        logger.info(`✅ [CRON-RECOVERY] Proceso completado exitosamente`);
        
    } catch (error) {
        logger.error('❌ [CRON-RECOVERY] Error en proceso automático:', error);
    }
}, {
    timezone: "America/Argentina/Buenos_Aires"
});

logger.info('✅ Cron job de Recovery registrado (se ejecutará diariamente a las 23:01 hrs)');

module.exports = {};
