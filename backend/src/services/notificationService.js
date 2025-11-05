// backend/src/services/notificationService.js

const InternalMessage = require("../models/InternalMessage");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Servicio de notificaciones automáticas para mensajería interna
 */

// 📧 Enviar mensaje interno automático
async function sendInternalNotification({ toUserIds, subject, content, metadata = {} }) {
    try {
        // Usuario del sistema (desde donde se envían notificaciones automáticas)
        const systemUser = await User.findOne({ email: "system@dann-salud.com" });
        
        // Si no existe usuario del sistema, usar el primer admin
        const fromUser = systemUser || await User.findOne({ role: "admin" });
        
        if (!fromUser) {
            logger.error("❌ No se encontró usuario del sistema para enviar notificaciones");
            return;
        }

        const messages = [];
        for (const toUserId of toUserIds) {
            const newMessage = new InternalMessage({
                from: fromUser._id,
                to: toUserId,
                subject,
                content,
                read: false,
                starred: false
            });
            
            await newMessage.save();
            messages.push(newMessage);
            
            logger.info(`📨 Notificación enviada a usuario ${toUserId}: ${subject}`);
        }

        // Emitir evento Socket.io para cada destinatario
        const io = global.io;
        if (io) {
            for (const toUserId of toUserIds) {
                io.to(`user_${toUserId}`).emit("new_message", {
                    subject,
                    content: content.substring(0, 100) + "...",
                    isSystemNotification: true
                });
            }
        }

        return messages;
    } catch (error) {
        logger.error("❌ Error enviando notificación interna:", error);
        throw error;
    }
}

// 🔔 1. Notificación cuando se elimina video-auditoría
async function notifyAuditDeleted({ audit, deletedBy }) {
    try {
        const recipients = [];
        
        // Obtener usuarios con rol 'gerencia'
        const gerenciaUsers = await User.find({ role: "gerencia", active: true }).select("_id");
        recipients.push(...gerenciaUsers.map(u => u._id));
        
        // Notificar al asesor que creó la auditoría
        if (audit.createdBy && audit.createdBy._id) {
            recipients.push(audit.createdBy._id);
        }
        
        // Notificar al supervisor del mismo equipo
        if (audit.createdBy && audit.createdBy.numeroEquipo) {
            const supervisors = await User.find({
                role: "supervisor",
                numeroEquipo: audit.createdBy.numeroEquipo,
                active: true
            }).select("_id");
            recipients.push(...supervisors.map(u => u._id));
        }
        
        // Eliminar duplicados
        const uniqueRecipients = [...new Set(recipients.map(r => r.toString()))];
        
        const content = `
🗑️ VIDEO-AUDITORÍA ELIMINADA

Se ha eliminado una video-auditoría del sistema:

📋 Detalles:
• CUIL: ${audit.cuil || "N/A"}
• Nombre: ${audit.nombre || "N/A"}
• Obra Social: ${audit.obraSocial || "N/A"}
• Fecha de turno: ${audit.fechaTurno ? new Date(audit.fechaTurno).toLocaleString("es-AR") : "N/A"}
• Creado por: ${audit.createdBy?.nombre || "N/A"} (${audit.createdBy?.email || "N/A"})
• Estado anterior: ${audit.status || "N/A"}

👤 Eliminado por: ${deletedBy.nombre} (${deletedBy.email})
🕐 Fecha de eliminación: ${new Date().toLocaleString("es-AR")}

Esta notificación es automática y no requiere respuesta.
        `.trim();

        await sendInternalNotification({
            toUserIds: uniqueRecipients,
            subject: "🗑️ Video-Auditoría Eliminada",
            content
        });
        
        logger.info(`✅ Notificación de eliminación enviada para auditoría CUIL: ${audit.cuil}`);
    } catch (error) {
        logger.error("❌ Error notificando eliminación de auditoría:", error);
    }
}

// 🔔 2. Notificación cuando se añade video-auditoría
async function notifyAuditCreated({ audit }) {
    try {
        // Obtener usuarios con rol 'auditor'
        const auditorUsers = await User.find({ role: "auditor", active: true }).select("_id");
        
        if (auditorUsers.length === 0) {
            logger.warn("⚠️ No hay auditores activos para notificar");
            return;
        }
        
        const recipients = auditorUsers.map(u => u._id);
        
        const content = `
📹 NUEVA VIDEO-AUDITORÍA DISPONIBLE

Se ha registrado una nueva video-auditoría en el sistema:

📋 Detalles:
• CUIL: ${audit.cuil || "N/A"}
• Nombre: ${audit.nombre || "N/A"}
• Obra Social: ${audit.obraSocial || "N/A"}
• Fecha de turno: ${audit.fechaTurno ? new Date(audit.fechaTurno).toLocaleString("es-AR") : "N/A"}
• Creado por: ${audit.createdBy?.nombre || "N/A"}
• Estado: ${audit.status || "Seleccione"}

⏰ La auditoría está pendiente de asignación. Por favor, revisa el panel de FollowUp para más detalles.

Esta notificación es automática y no requiere respuesta.
        `.trim();

        await sendInternalNotification({
            toUserIds: recipients,
            subject: "📹 Nueva Video-Auditoría Disponible",
            content
        });
        
        logger.info(`✅ Notificación de creación enviada a ${recipients.length} auditor(es) para CUIL: ${audit.cuil}`);
    } catch (error) {
        logger.error("❌ Error notificando creación de auditoría:", error);
    }
}

// 🔔 3. Recordatorio 5 minutos antes del turno
async function notifyAuditReminder({ audit }) {
    try {
        // Solo notificar si está en estado 'Seleccione' o sin asignar
        if (audit.status && audit.status !== "Seleccione" && audit.status !== "seleccione") {
            return;
        }
        
        // Obtener usuarios con rol 'auditor'
        const auditorUsers = await User.find({ role: "auditor", active: true }).select("_id");
        
        if (auditorUsers.length === 0) {
            logger.warn("⚠️ No hay auditores activos para recordatorio");
            return;
        }
        
        const recipients = auditorUsers.map(u => u._id);
        
        const content = `
⏰ RECORDATORIO URGENTE: VIDEO-AUDITORÍA EN 5 MINUTOS

🚨 IMPORTANTE: La siguiente video-auditoría comenzará en 5 minutos y AÚN NO HA SIDO ASIGNADA:

📋 Detalles:
• CUIL: ${audit.cuil || "N/A"}
• Nombre: ${audit.nombre || "N/A"}
• Obra Social: ${audit.obraSocial || "N/A"}
• Fecha de turno: ${audit.fechaTurno ? new Date(audit.fechaTurno).toLocaleString("es-AR") : "N/A"}
• Estado: ${audit.status || "Seleccione"} ❌

⚠️ POR FAVOR, TOMA ESTA AUDITORÍA INMEDIATAMENTE DESDE EL PANEL DE FOLLOWUP.

Es crucial que la auditoría se realice a tiempo para mantener la calidad del servicio.

Esta notificación es automática y no requiere respuesta.
        `.trim();

        await sendInternalNotification({
            toUserIds: recipients,
            subject: "⏰ URGENTE: Video-Auditoría en 5 minutos - SIN ASIGNAR",
            content
        });
        
        logger.info(`✅ Recordatorio enviado a ${recipients.length} auditor(es) para CUIL: ${audit.cuil}`);
    } catch (error) {
        logger.error("❌ Error enviando recordatorio de auditoría:", error);
    }
}

// 🔔 4. Notificación cuando auditoría pasa a estado 'Completa'
async function notifyAuditCompleted({ audit }) {
    try {
        // Obtener usuarios con rol 'admin'
        const adminUsers = await User.find({ role: "admin", active: true }).select("_id");
        
        if (adminUsers.length === 0) {
            logger.warn("⚠️ No hay admins activos para notificar");
            return;
        }
        
        const recipients = adminUsers.map(u => u._id);
        
        const content = `
✅ VIDEO-AUDITORÍA COMPLETADA - ACCIÓN REQUERIDA

Se ha completado una video-auditoría con toda la documentación:

📋 Detalles:
• CUIL: ${audit.cuil || "N/A"}
• Nombre: ${audit.nombre || "N/A"}
• Obra Social: ${audit.obraSocial || "N/A"}
• Fecha de turno: ${audit.fechaTurno ? new Date(audit.fechaTurno).toLocaleString("es-AR") : "N/A"}
• Auditor asignado: ${audit.auditor?.nombre || "N/A"}
• Completada el: ${new Date().toLocaleString("es-AR")}

📎 Documentación adjunta:
• Video: ✅
• DNI Frente: ✅
• DNI Dorso: ✅
• Audio Backup: ${audit.multimedia?.audioBackup ? "✅" : "⚠️ No disponible"}

🎯 ACCIÓN REQUERIDA:
Por favor, procede con la creación del código QR para esta auditoría.

Accede al panel de auditorías para revisar y procesar.

Esta notificación es automática y no requiere respuesta.
        `.trim();

        await sendInternalNotification({
            toUserIds: recipients,
            subject: "✅ Auditoría Completada - Crear QR",
            content
        });
        
        logger.info(`✅ Notificación de completitud enviada a ${recipients.length} admin(s) para CUIL: ${audit.cuil}`);
    } catch (error) {
        logger.error("❌ Error notificando completitud de auditoría:", error);
    }
}

// 🔔 5. Notificación cuando auditoría pasa a Recovery
async function notifyAuditRecovery({ audit }) {
    try {
        // Obtener usuarios con rol 'revendedor'
        const revendedorUsers = await User.find({ role: "revendedor", active: true }).select("_id");
        
        if (revendedorUsers.length === 0) {
            logger.warn("⚠️ No hay revendedores activos para notificar");
            return;
        }
        
        const recipients = revendedorUsers.map(u => u._id);
        
        const content = `
🔄 VIDEO-AUDITORÍA REQUIERE RECUPERACIÓN

Una video-auditoría ha pasado más de 24 horas en estado problemático y requiere recuperación:

📋 Detalles:
• CUIL: ${audit.cuil || "N/A"}
• Nombre: ${audit.nombre || "N/A"}
• Obra Social: ${audit.obraSocial || "N/A"}
• Fecha de turno: ${audit.fechaTurno ? new Date(audit.fechaTurno).toLocaleString("es-AR") : "N/A"}
• Estado actual: ${audit.status || "N/A"}
• Creado por: ${audit.createdBy?.nombre || "N/A"}

⚠️ Motivo del envío a recuperación:
La auditoría ha permanecido más de 24 horas en estado "${audit.status}" sin resolverse.

🎯 ACCIÓN REQUERIDA:
Por favor, revisa la lista de Recovery y contacta al cliente para recuperar esta auditoría.

Esta notificación es automática y no requiere respuesta.
        `.trim();

        await sendInternalNotification({
            toUserIds: recipients,
            subject: "🔄 Video-Auditoría en Recovery - Acción Requerida",
            content
        });
        
        logger.info(`✅ Notificación de recovery enviada a ${recipients.length} revendedor(es) para CUIL: ${audit.cuil}`);
    } catch (error) {
        logger.error("❌ Error notificando recovery de auditoría:", error);
    }
}

// 🔔 6. Notificación cuando auditoría pasa a 'QR Hecho'
async function notifyAuditQRDone({ audit }) {
    try {
        const recipients = [];
        
        // Notificar al asesor que creó la auditoría
        if (audit.createdBy && audit.createdBy._id) {
            recipients.push(audit.createdBy._id);
        }
        
        // Notificar al supervisor del mismo equipo
        if (audit.createdBy && audit.createdBy.numeroEquipo) {
            const supervisors = await User.find({
                role: "supervisor",
                numeroEquipo: audit.createdBy.numeroEquipo,
                active: true
            }).select("_id");
            recipients.push(...supervisors.map(u => u._id));
        }
        
        // Eliminar duplicados
        const uniqueRecipients = [...new Set(recipients.map(r => r.toString()))];
        
        if (uniqueRecipients.length === 0) {
            logger.warn("⚠️ No hay destinatarios para notificación de QR hecho");
            return;
        }
        
        const content = `
🎉 CÓDIGO QR GENERADO - VIDEO-AUDITORÍA FINALIZADA

¡Buenas noticias! El código QR ha sido generado exitosamente para la siguiente auditoría:

📋 Detalles:
• CUIL: ${audit.cuil || "N/A"}
• Nombre: ${audit.nombre || "N/A"}
• Obra Social: ${audit.obraSocial || "N/A"}
• Fecha de turno: ${audit.fechaTurno ? new Date(audit.fechaTurno).toLocaleString("es-AR") : "N/A"}
• Creado por: ${audit.createdBy?.nombre || "N/A"}
• Auditor: ${audit.auditor?.nombre || "N/A"}

✅ Estado: QR Hecho
📅 Finalizada el: ${new Date().toLocaleString("es-AR")}

El proceso de auditoría ha sido completado exitosamente. El código QR está listo para ser entregado al afiliado.

Esta notificación es automática y no requiere respuesta.
        `.trim();

        await sendInternalNotification({
            toUserIds: uniqueRecipients,
            subject: "🎉 Código QR Generado - Auditoría Finalizada",
            content
        });
        
        logger.info(`✅ Notificación de QR hecho enviada a ${uniqueRecipients.length} usuario(s) para CUIL: ${audit.cuil}`);
    } catch (error) {
        logger.error("❌ Error notificando QR hecho:", error);
    }
}

module.exports = {
    sendInternalNotification,
    notifyAuditDeleted,
    notifyAuditCreated,
    notifyAuditReminder,
    notifyAuditCompleted,
    notifyAuditRecovery,
    notifyAuditQRDone
};
