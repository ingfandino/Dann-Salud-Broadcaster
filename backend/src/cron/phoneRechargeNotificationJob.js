/**
 * ============================================================
 * CRON JOB: NOTIFICACIÓN DE VENCIMIENTO DE RECARGAS
 * ============================================================
 * Ejecuta cada hora y verifica teléfonos cuya recarga vence
 * en las próximas 48 horas. Envía notificación a Gerencia.
 * 
 * Horario: Cada hora (minuto 0)
 * Timezone: America/Argentina/Buenos_Aires
 */

const cron = require('node-cron');
const Phone = require('../models/Phone');
const User = require('../models/User');
const { sendInternalNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * Función principal de notificación de vencimientos
 */
async function checkPhoneRechargeExpiration() {
    try {
        logger.info('📱 [CRON-PHONE] Iniciando verificación de vencimientos de recargas...');

        const now = new Date();
        const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        // Buscar teléfonos que vencen en las próximas 48 horas y no han sido notificados
        const phonesToNotify = await Phone.find({
            activo: true,
            proximoVencimiento: { $lte: in48Hours, $gt: now },
            notificacionEnviada: false
        })
            .populate('supervisor', 'nombre email numeroEquipo')
            .populate('asesorAsignado', 'nombre email');

        if (phonesToNotify.length === 0) {
            logger.info('📱 [CRON-PHONE] No hay teléfonos próximos a vencer.');
            return;
        }

        logger.info(`📱 [CRON-PHONE] Encontrados ${phonesToNotify.length} teléfono(s) próximos a vencer.`);

        // Obtener usuarios con rol Gerencia
        const gerenciaUsers = await User.find({
            role: 'gerencia',
            active: true
        }).select('_id');

        if (gerenciaUsers.length === 0) {
            logger.warn('⚠️ [CRON-PHONE] No hay usuarios de Gerencia activos para notificar.');
            return;
        }

        const gerenciaIds = gerenciaUsers.map(u => u._id);

        // Enviar notificación por cada teléfono
        for (const phone of phonesToNotify) {
            try {
                const fechaUltimaRecarga = phone.ultimaRecarga
                    ? new Date(phone.ultimaRecarga).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    })
                    : 'N/A';

                const fechaVencimiento = phone.proximoVencimiento
                    ? new Date(phone.proximoVencimiento).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    })
                    : 'N/A';

                const horasRestantes = Math.round(
                    (new Date(phone.proximoVencimiento) - now) / (1000 * 60 * 60)
                );

                const content = `
⚠️ VENCIMIENTO DE RECARGA PRÓXIMO

El siguiente teléfono corporativo tiene su renta próxima a vencer:

📱 Información del dispositivo:
• Modelo: ${phone.modelo}
• Número: ${phone.numeroTelefono}
• Supervisor: ${phone.supervisor?.nombre || 'N/A'}
• Equipo: ${phone.numeroEquipo || 'N/A'}
• Asesor asignado: ${phone.asesorAsignado?.nombre || 'Sin asignar'}

📅 Fechas:
• Última recarga: ${fechaUltimaRecarga}
• Fecha de vencimiento: ${fechaVencimiento}
• Horas restantes: ${horasRestantes} hrs

⏰ Por favor, realice la recarga correspondiente antes de la fecha de vencimiento.

Esta notificación es automática y no requiere respuesta.
                `.trim();

                await sendInternalNotification({
                    toUserIds: gerenciaIds,
                    subject: `📱 Vencimiento de recarga: ${phone.numeroTelefono}`,
                    content
                });

                // Marcar como notificado
                phone.notificacionEnviada = true;
                await phone.save();

                logger.info(`✅ [CRON-PHONE] Notificación enviada para teléfono ${phone.numeroTelefono}`);
            } catch (phoneError) {
                logger.error(`❌ [CRON-PHONE] Error procesando teléfono ${phone._id}:`, phoneError);
            }
        }

        logger.info(`✅ [CRON-PHONE] Verificación completada. ${phonesToNotify.length} notificación(es) enviada(s).`);
    } catch (error) {
        logger.error('❌ [CRON-PHONE] Error en verificación de vencimientos:', error);
    }
}

// Ejecutar cada hora (minuto 0)
// Formato: minuto hora día-del-mes mes día-de-semana
cron.schedule('0 * * * *', () => {
    checkPhoneRechargeExpiration();
}, {
    scheduled: true,
    timezone: 'America/Argentina/Buenos_Aires'
});

logger.info('📱 [CRON-PHONE] Job de notificación de vencimientos de recargas iniciado (cada hora)');

// Exportar función para uso manual si es necesario
module.exports = { checkPhoneRechargeExpiration };
