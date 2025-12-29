/**
 * ============================================================
 * SCHEDULER DE SEGUIMIENTO (auditFollowUpScheduler.js)
 * ============================================================
 * Notifica auditorías sin respuesta después de 12 horas.
 * Alerta a asesor y supervisor por mensajería interna.
 */

const Audit = require('../models/Audit');
const User = require('../models/User');
const InternalMessage = require('../models/InternalMessage');
const logger = require('../utils/logger');

/* ========== CONFIGURACIÓN ========== */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;
const FOLLOW_UP_THRESHOLD_MS = 12 * 60 * 60 * 1000;

/** Envía notificación de seguimiento */
async function sendFollowUpNotification(audit, asesor, supervisor) {
    try {
        // Obtener usuario del sistema para enviar
        let systemUser = await User.findOne({ email: "system@dann-salud.com" });
        
        // Si no existe usuario del sistema, buscar usuario de Gerencia
        if (!systemUser) {
            systemUser = await User.findOne({ role: "gerencia", active: true });
        }
        
        // Como último recurso, usar admin
        if (!systemUser) {
            const admins = await User.find({ role: "administrativo", active: true }).limit(1);
            systemUser = admins[0];
        }

        if (!systemUser) {
            logger.error("No se encontró usuario del sistema para enviar notificaciones");
            return;
        }

        const horasTranscurridas = Math.floor((Date.now() - new Date(audit.statusUpdatedAt).getTime()) / (1000 * 60 * 60));

        const messageContent = `🔔 RECORDATORIO DE SEGUIMIENTO

📋 Auditoría: ${audit.nombre}
📞 Teléfono: ${audit.telefono || 'N/A'}
📝 CUIL: ${audit.cuil || 'N/A'}
🏥 Obra Social: ${audit.obraSocialVendida || 'N/A'}

⚠️ Estado actual: ${audit.status}
⏰ Tiempo en este estado: ${horasTranscurridas} horas

Esta auditoría lleva más de 12 horas en estado "${audit.status}". 

Por favor, contacta al afiliado lo antes posible para:
${audit.status === 'Falta documentación' 
    ? '• Solicitar y recibir la documentación faltante\n• Actualizar el estado a "Completa" una vez recibida' 
    : '• Obtener la clave necesaria\n• Actualizar el estado correspondiente'}

💡 Recuerda: Un seguimiento ágil mejora la tasa de conversión y satisfacción del afiliado.

---
Este es un mensaje automático del sistema.`;

        const subject = `⚠️ Seguimiento urgente - ${audit.nombre} (${audit.status})`;

        // Enviar al asesor
        if (asesor && asesor._id) {
            const messageAsesor = new InternalMessage({
                from: systemUser._id,
                to: asesor._id,
                subject,
                content: messageContent,
                read: false
            });
            await messageAsesor.save();
            logger.info(`✅ Notificación de seguimiento enviada al asesor ${asesor.nombre} (${audit._id})`);

            // Emitir Socket.io si está disponible
            const io = global.io;
            if (io) {
                io.to(`user_${asesor._id}`).emit("new_message", {
                    _id: messageAsesor._id,
                    from: { nombre: systemUser.nombre, email: systemUser.email },
                    subject: messageAsesor.subject,
                    content: messageAsesor.content.substring(0, 100) + "...",
                    createdAt: messageAsesor.createdAt,
                    hasAttachments: false
                });
            }
        }

        // Enviar al supervisor
        if (supervisor && supervisor._id) {
            const messageSupervisor = new InternalMessage({
                from: systemUser._id,
                to: supervisor._id,
                subject,
                content: messageContent + `

📌 Nota para Supervisor: Tu asesor ${asesor?.nombre || 'desconocido'} necesita seguimiento con este caso.`,
                read: false
            });
            await messageSupervisor.save();
            logger.info(`✅ Notificación de seguimiento enviada al supervisor ${supervisor.nombre} (${audit._id})`);

            // Emitir Socket.io
            const io = global.io;
            if (io) {
                io.to(`user_${supervisor._id}`).emit("new_message", {
                    _id: messageSupervisor._id,
                    from: { nombre: systemUser.nombre, email: systemUser.email },
                    subject: messageSupervisor.subject,
                    content: messageSupervisor.content.substring(0, 100) + "...",
                    createdAt: messageSupervisor.createdAt,
                    hasAttachments: false
                });
            }
        }

        // Marcar que ya se envió la notificación
        await Audit.findByIdAndUpdate(audit._id, {
            $set: { followUpNotificationSent: true }
        });

    } catch (error) {
        logger.error(`Error enviando notificación de seguimiento para ${audit._id}:`, error);
    }
}

/**
 * Verificar auditorías que necesitan seguimiento
 */
async function checkAuditsForFollowUp() {
    try {
        const now = new Date();
        const threshold = new Date(now.getTime() - FOLLOW_UP_THRESHOLD_MS);

        // Buscar auditorías en estados problemáticos que llevan más de 12 horas
        // y que no han recibido notificación de seguimiento
        const followUpStates = [
            'Falta documentación', 
            'Falta clave',
            'No atendió',
            'Tiene dudas',
            'Falta clave y documentación',
            'No le llegan los mensajes',
            'Cortó'
        ];
        
        const auditsNeedingFollowUp = await Audit.find({
            status: { $in: followUpStates },
            statusUpdatedAt: { $lte: threshold },
            followUpNotificationSent: { $ne: true }
        })
        .populate('asesor', 'nombre email _id numeroEquipo groupId')
        .populate('groupId', 'nombre name')
        .lean();

        if (auditsNeedingFollowUp.length === 0) {
            logger.info('ℹ️ No hay auditorías que necesiten seguimiento en este momento');
            return;
        }

        logger.info(`📋 Encontradas ${auditsNeedingFollowUp.length} auditorías que necesitan seguimiento`);

        for (const audit of auditsNeedingFollowUp) {
            try {
                // Obtener asesor
                const asesor = audit.asesor;

                if (!asesor) {
                    logger.warn(`⚠️ Auditoría ${audit._id} no tiene asesor asignado`);
                    continue;
                }

                // Obtener supervisor del grupo del asesor
                let supervisor = null;
                const numeroEquipo = asesor.numeroEquipo;
                
                if (numeroEquipo) {
                    supervisor = await User.findOne({
                        role: 'supervisor',
                        numeroEquipo: numeroEquipo,
                        active: true
                    }).lean();
                }

                // Si no se encontró por numeroEquipo, buscar por groupId
                if (!supervisor && asesor.groupId) {
                    const groupId = typeof asesor.groupId === 'object' ? asesor.groupId._id : asesor.groupId;
                    supervisor = await User.findOne({
                        role: 'supervisor',
                        groupId: groupId,
                        active: true
                    }).lean();
                }

                if (!supervisor) {
                    logger.warn(`⚠️ No se encontró supervisor para el asesor ${asesor.nombre}`);
                }

                // Enviar notificaciones
                await sendFollowUpNotification(audit, asesor, supervisor);

            } catch (error) {
                logger.error(`Error procesando auditoría ${audit._id}:`, error);
            }
        }

        logger.info(`✅ Proceso de seguimiento completado: ${auditsNeedingFollowUp.length} notificaciones enviadas`);

    } catch (error) {
        logger.error('❌ Error en checkAuditsForFollowUp:', error);
    }
}

/**
 * Iniciar el scheduler de seguimiento
 */
function startAuditFollowUpScheduler(intervalMs = CHECK_INTERVAL_MS) {
    if (process.env.NODE_ENV === 'test') {
        logger.info('⏸️ AuditFollowUpScheduler no se inicia en modo test');
        return;
    }

    logger.info(`⏰ AuditFollowUpScheduler iniciado (verificando cada ${intervalMs / 60000} minutos)`);

    // Ejecución inicial después de 1 minuto (para no sobrecargar el inicio)
    setTimeout(() => {
        checkAuditsForFollowUp().catch(err => 
            logger.error("AuditFollowUpScheduler error (initial run)", err)
        );
    }, 60000);

    // Intervalo regular
    setInterval(() => {
        checkAuditsForFollowUp().catch(err => 
            logger.error("AuditFollowUpScheduler error (interval)", err)
        );
    }, intervalMs);
}

module.exports = { 
    startAuditFollowUpScheduler, 
    checkAuditsForFollowUp 
};
