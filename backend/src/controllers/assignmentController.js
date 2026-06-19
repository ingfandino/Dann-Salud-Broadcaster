/**
 * ============================================================
 * CONTROLADOR DE ASIGNACIONES (assignmentController)
 * ============================================================
 * Gestiona la asignación de leads a asesores y su seguimiento.
 * Usado en la interfaz "Datos del día" para contacto diario.
 * 
 * Funcionalidades:
 * - Asignar leads a asesores
 * - Actualizar estados de gestión
 * - Enviar WhatsApp directamente
 * - Reasignar leads entre usuarios
 * - Exportar reportes del día
 */

const assignmentService = require('../services/assignmentService');
const recyclingService = require('../services/recyclingService');

const LeadAssignment = require('../models/LeadAssignment');
const User = require('../models/User');
const AffiliateContribution = require('../models/AffiliateContribution');
const { isReady, sendMessage, getActiveEngine } = require('../services/whatsappUnified');
const { formatWhatsAppJid, maskJid } = require('../utils/whatsappJid');
const { recordWhatsAppSendAttempt } = require('../services/whatsappSendAttemptService');
const ExcelJS = require('exceljs');

const MANAGEMENT_READ_ROLES = new Set(['gerencia', 'auditor', 'desarrollador']);
const TEAM_READ_ROLES = new Set(['supervisor', 'encargado']);

function roleOf(user) {
    return String(user?.role || '').toLowerCase();
}

function leadAssignmentStatusValues() {
    return LeadAssignment.schema.path('status').enumValues;
}

function cleanIdempotencyKey(req) {
    const raw = req.get?.('Idempotency-Key') || req.body?.idempotencyKey;
    return raw ? String(raw).trim().slice(0, 120) : '';
}

async function buildAssignmentReadQuery(req, id) {
    const role = roleOf(req.user);
    const userId = req.user._id;

    if (MANAGEMENT_READ_ROLES.has(role)) {
        return { _id: id };
    }

    if (TEAM_READ_ROLES.has(role)) {
        const or = [
            { assignedTo: userId },
            { reassignedTo: userId },
            { supervisor: userId }
        ];

        if (req.user.numeroEquipo) {
            const teamMembers = await User.find({
                numeroEquipo: req.user.numeroEquipo,
                active: true
            }).select('_id').lean();
            const teamIds = teamMembers.map(member => member._id);
            if (teamIds.length > 0) {
                or.push({ assignedTo: { $in: teamIds } });
            }
        }

        return { _id: id, $or: or };
    }

    return {
        _id: id,
        $or: [
            { assignedTo: userId },
            { reassignedTo: userId }
        ]
    };
}

function buildAssignmentOutcomeQuery(req, id) {
    return {
        _id: id,
        $or: [
            { assignedTo: req.user._id },
            { reassignedTo: req.user._id }
        ]
    };
}

function populateAssignmentAudit(query) {
    return query
        .populate('affiliate', 'nombre telefono1 cuil obraSocial localidad')
        .populate('assignedTo', 'nombre email role numeroEquipo')
        .populate('assignedBy', 'nombre email role numeroEquipo')
        .populate('supervisor', 'nombre email role numeroEquipo')
        .populate('lastOutcomeBy', 'nombre email role numeroEquipo')
        .populate('sourceStockAssignment', 'source sourceJobId status assignedAt releasedAt releaseReason')
        .populate('operationalState', 'usageStatus saleStatus canSell availableForSale unavailableReason verificationStatus verificationExpiresAt ownership')
        .populate('sourceCheckJob', 'mode status createdAt completedAt ownership');
}

// Enviar WhatsApp (Asesor)
exports.sendWhatsApp = async (req, res) => {
    const userId = req.user?._id;
    const engine = getActiveEngine();

    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!message || !String(message).trim()) {
            return res.status(400).json({
                success: false,
                sendStatus: "failed",
                code: "WHATSAPP_EMPTY_MESSAGE",
                message: "El mensaje de WhatsApp está vacío."
            });
        }

        if (!isReady(userId)) {
            await recordWhatsAppSendAttempt({
                flow: "assignment",
                userId,
                sourceId: id,
                engine,
                sendStatus: "not_connected"
            });
            return res.status(503).json({
                success: false,
                sendStatus: "not_connected",
                code: "WHATSAPP_NOT_CONNECTED",
                message: "Tu WhatsApp no está conectado."
            });
        }

        const assignment = await LeadAssignment.findOne({
            _id: id,
            assignedTo: userId
        }).populate("affiliate");

        if (!assignment) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        if (!assignment.affiliate || !assignment.affiliate.telefono1) {
            return res.status(400).json({ error: "El afiliado no tiene teléfono registrado" });
        }

        let chatId;
        try {
            chatId = formatWhatsAppJid(assignment.affiliate.telefono1, engine);
        } catch (jidError) {
            await recordWhatsAppSendAttempt({
                flow: "assignment",
                userId,
                sourceId: id,
                engine,
                recipient: assignment.affiliate.telefono1,
                sendStatus: "failed",
                errorCode: jidError.code || "INVALID_WHATSAPP_PHONE",
                errorMessage: jidError.message
            });
            return res.status(400).json({
                success: false,
                sendStatus: "failed",
                code: jidError.code || "INVALID_WHATSAPP_PHONE",
                message: "El teléfono del afiliado no es válido para WhatsApp."
            });
        }

        let sendResult;
        try {
            await recordWhatsAppSendAttempt({
                flow: "assignment",
                userId,
                sourceId: id,
                engine,
                jid: chatId,
                recipient: assignment.affiliate.telefono1,
                sendStatus: "queued"
            });
            sendResult = await sendMessage(userId, chatId, message);
        } catch (sendError) {
            const sendStatus = sendError.status || (sendError.code === "WHATSAPP_SEND_UNAVAILABLE" ? "unavailable" : "failed");
            await recordWhatsAppSendAttempt({
                flow: "assignment",
                userId,
                sourceId: id,
                engine: sendError.engine || engine,
                jid: chatId,
                recipient: assignment.affiliate.telefono1,
                sendStatus,
                errorCode: sendError.code || "WHATSAPP_SEND_FAILED",
                errorMessage: sendError.message
            });

            return res.status(sendStatus === "not_connected" ? 503 : 502).json({
                success: false,
                sendStatus,
                code: sendError.code || "WHATSAPP_SEND_FAILED",
                message: sendStatus === "unavailable"
                    ? "El servicio de WhatsApp no está disponible para esta sesión."
                    : "No se pudo enviar el mensaje por WhatsApp."
            });
        }

        if (!sendResult?.success || sendResult?.status !== "accepted") {
            await recordWhatsAppSendAttempt({
                flow: "assignment",
                userId,
                sourceId: id,
                engine: sendResult?.engine || engine,
                jid: chatId,
                recipient: assignment.affiliate.telefono1,
                sendStatus: sendResult?.status || "failed",
                errorCode: sendResult?.code || "WHATSAPP_SEND_FAILED",
                errorMessage: sendResult?.message || "No se pudo enviar el mensaje por WhatsApp."
            });
            return res.status(502).json({
                success: false,
                sendStatus: sendResult?.status || "failed",
                code: sendResult?.code || "WHATSAPP_SEND_FAILED",
                message: "No se pudo enviar el mensaje por WhatsApp."
            });
        }

        await recordWhatsAppSendAttempt({
            flow: "assignment",
            userId,
            sourceId: id,
            engine: sendResult.engine || engine,
            jid: chatId,
            recipient: assignment.affiliate.telefono1,
            sendStatus: "accepted",
            messageId: sendResult.messageId || null
        });

        assignment.status = "Llamando";
        assignment.interactions.push({
            type: "WhatsApp",
            note: "Mensaje aceptado por WhatsApp. Entrega no confirmada.",
            performedBy: userId,
            timestamp: new Date()
        });

        await assignment.save();
        return res.json({
            success: true,
            sendStatus: "accepted",
            message: "Mensaje enviado a WhatsApp. No pudimos confirmar entrega.",
            engine: sendResult.engine || engine,
            messageId: sendResult.messageId || null,
            jid: maskJid(chatId)
        });

    } catch (error) {
        console.error("Error enviando WhatsApp:", error);
        return res.status(500).json({
            success: false,
            sendStatus: "failed",
            code: "WHATSAPP_SEND_FAILED",
            message: "Error al enviar mensaje de WhatsApp"
        });
    }
};

// Reprogramar (Asesor)
exports.reschedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, note } = req.body; // date es ISO string

        const assignment = await LeadAssignment.findOne({
            _id: id,
            assignedTo: req.user._id
        });

        if (!assignment) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        assignment.dueDate = new Date(date);
        assignment.subStatus = 'Reprogramado';

        // Si estaba pendiente, pasar a gestión con el estado existente del modelo.
        if (assignment.status === 'Pendiente') {
            assignment.status = 'Llamando';
        }

        assignment.interactions.push({
            type: 'Nota',
            note: `Reprogramado para: ${new Date(date).toLocaleString()} - ${note || ''}`,
            performedBy: req.user._id,
            timestamp: new Date()
        });

        await assignment.save();
        res.json({ success: true, message: "Reprogramado exitosamente" });

    } catch (error) {
        console.error("Error reprogramando:", error);
        res.status(500).json({ error: "Error al reprogramar" });
    }
};

// ✅ Reasignar a supervisor (Asesor/Supervisor/Gerencia/Auditor)
exports.reassign = async (req, res) => {
    try {
        const { id } = req.params;
        const { supervisorId, note, scheduledHour } = req.body;

        if (!supervisorId) {
            return res.status(400).json({ error: "Debe seleccionar un supervisor" });
        }

        // Verificar que el supervisor existe y tiene rol supervisor
        const supervisor = await User.findOne({ _id: supervisorId, role: { $in: ['supervisor', 'supervisor_reventa', 'encargado'] }, active: true });
        if (!supervisor) {
            return res.status(404).json({ error: "Supervisor no encontrado o inactivo" });
        }

        // Buscar la asignación con affiliate poblado
        const assignment = await LeadAssignment.findById(id).populate('affiliate');
        if (!assignment) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        // Guardar historial de quién tenía el lead antes
        const previousAssignee = assignment.assignedTo;

        // ✅ Reasignar al supervisor (se guarda en reassignedTo para que aparezca en su lista)
        assignment.reassignedTo = supervisorId;
        assignment.status = 'Pendiente'; // Reset a pendiente
        assignment.subStatus = 'Reasignado';
        assignment.scheduledHour = scheduledHour || null; // ✅ Guardar hora programada
        assignment.isPriority = true; // ✅ Marcar como prioritario

        assignment.interactions.push({
            type: 'Reasignación',
            note: `Reasignado a supervisor: ${supervisor.nombre}${scheduledHour ? ` (Llamar a las ${scheduledHour})` : ''}${note ? ` - ${note}` : ''}`,
            performedBy: req.user._id,
            timestamp: new Date(),
            metadata: {
                from: previousAssignee,
                to: supervisorId,
                scheduledHour: scheduledHour || null
            }
        });

        await assignment.save();

        // ✅ Enviar mensaje interno al supervisor notificándole
        try {
            const InternalMessage = require('../models/InternalMessage');
            const affiliateName = assignment.affiliate?.nombre || 'Sin nombre';
            const affiliatePhone = assignment.affiliate?.telefono1 || 'Sin teléfono';
            
            await InternalMessage.create({
                from: req.user._id,
                to: [supervisorId],
                subject: `🔔 Lead reasignado: ${affiliateName}`,
                body: `
Se te ha reasignado un lead que requiere atención:

📋 **Cliente:** ${affiliateName}
📞 **Teléfono:** ${affiliatePhone}
${scheduledHour ? `⏰ **Hora sugerida para llamar:** ${scheduledHour}` : ''}
${note ? `📝 **Nota:** ${note}` : ''}

Este lead ha sido marcado como **prioritario** en tu lista de Datos del Día.

_Reasignado por: ${req.user.nombre || req.user.email}_
                `.trim(),
                isSystemMessage: true
            });
        } catch (msgError) {
            console.error("Error enviando notificación interna:", msgError);
            // No fallar la reasignación si el mensaje no se envía
        }

        res.json({ success: true, message: `Reasignado exitosamente a ${supervisor.nombre}` });

    } catch (error) {
        console.error("Error reasignando:", error);
        res.status(500).json({ error: "Error al reasignar" });
    }
};

// Exportar mis leads a Excel (Asesor)
exports.exportMyLeads = async (req, res) => {
    try {
        const assignments = await LeadAssignment.find({
            assignedTo: req.user._id,
            active: true
        }).populate('affiliate');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Mis Leads');

        // Enrich with contribution data
        const exportAffiliateIds = assignments.map(a => a.affiliate?._id).filter(Boolean);
        const exportContribMap = {};
        if (exportAffiliateIds.length > 0) {
            const contribs = await AffiliateContribution.find(
                { affiliateId: { $in: exportAffiliateIds } },
                { affiliateId: 1, last3ClosedMonthsPaidCount: 1 }
            ).lean();
            for (const c of contribs) {
                exportContribMap[String(c.affiliateId)] = c.last3ClosedMonthsPaidCount;
            }
        }

        worksheet.columns = [
            { header: 'telefono', key: 'telefono', width: 20 },
            { header: 'nombre', key: 'nombre', width: 30 },
            { header: 'cuil', key: 'cuil', width: 15 },
            { header: 'obra_social', key: 'obra_social', width: 20 },
            { header: 'localidad', key: 'localidad', width: 20 },
            { header: 'trim_pagos', key: 'trim_pagos', width: 15 },
        ];

        assignments.forEach(assign => {
            if (assign.affiliate) {
                const trimPagos = exportContribMap[String(assign.affiliate._id)];
                worksheet.addRow({
                    telefono: assign.affiliate.telefono1 || '',
                    nombre: assign.affiliate.nombre || '',
                    cuil: assign.affiliate.cuil || '',
                    obra_social: assign.affiliate.obraSocial || '',
                    localidad: assign.affiliate.localidad || '',
                    trim_pagos: trimPagos != null ? trimPagos : ''
                });
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=mis_leads_dia.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error exportando leads:", error);
        res.status(500).json({ error: "Error al exportar leads" });
    }
};

// Distribuir leads (Supervisor)
exports.distribute = async (req, res) => {
    try {
        const { distribution } = req.body; // Array [{ asesorId, quantity, mix }]

        if (!distribution || !Array.isArray(distribution)) {
            return res.status(400).json({ error: "Formato de distribución inválido" });
        }

        const result = await assignmentService.distributeLeads({ distribution }, req.user._id);
        const message = result.message || "Distribución completada";
        const statusCode = result.totalAssigned === 0 && result.requestedTotal > 0
            ? 409
            : result.partial
                ? 207
                : 200;

        res.status(statusCode).json({ message, result });

    } catch (error) {
        console.error("Error en distribución:", error);
        res.status(500).json({ error: "Error al distribuir leads" });
    }
};

// Obtener mis leads (Asesor)
exports.getMyLeads = async (req, res) => {
    try {
        const leads = await assignmentService.getDailyAssignments(req.user._id);

        // Enrich with last3ClosedMonthsPaidCount from AffiliateContribution
        const affiliateIds = leads
            .map(l => l.affiliate?._id)
            .filter(Boolean);

        const contribMap = {};
        if (affiliateIds.length > 0) {
            const contribs = await AffiliateContribution.find(
                { affiliateId: { $in: affiliateIds } },
                { affiliateId: 1, last3ClosedMonthsPaidCount: 1 }
            ).lean();
            for (const c of contribs) {
                contribMap[String(c.affiliateId)] = c.last3ClosedMonthsPaidCount;
            }
        }

        const enriched = leads.map(l => {
            const obj = l.toObject ? l.toObject() : l;
            if (obj.affiliate) {
                const key = String(obj.affiliate._id);
                obj.affiliate.last3ClosedMonthsPaidCount = contribMap[key] ?? null;
            }
            return obj;
        });

        res.json(enriched);
    } catch (error) {
        console.error("Error obteniendo leads:", error);
        res.status(500).json({ error: "Error al obtener leads" });
    }
};

// Obtener detalle auditable de una asignación
exports.getAssignmentDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const query = await buildAssignmentReadQuery(req, id);
        const assignment = await populateAssignmentAudit(LeadAssignment.findOne(query));

        if (!assignment) {
            return res.status(404).json({ success: false, error: "Asignación no encontrada o sin permiso" });
        }

        return res.json({ success: true, assignment });
    } catch (error) {
        console.error("[getAssignmentDetail] Error:", error.message);
        return res.status(500).json({ success: false, error: "Error al obtener asignación" });
    }
};

// Actualizar estado de un lead
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, subStatus, note } = req.body;

        if (!leadAssignmentStatusValues().includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Estado inválido",
                validStatuses: leadAssignmentStatusValues()
            });
        }

        const outcomeQuery = buildAssignmentOutcomeQuery(req, id);
        const assignment = await LeadAssignment.findOne(outcomeQuery);

        if (!assignment) {
            return res.status(404).json({ success: false, error: "Asignación no encontrada o sin permiso" });
        }

        const idempotencyKey = cleanIdempotencyKey(req);
        const previousStatus = assignment.status;
        const now = new Date();
        const update = {
            $set: {
                status,
                lastOutcomeAt: now,
                lastOutcomeBy: req.user._id,
                lastOutcomeNote: note || ''
            },
            $push: {
                interactions: {
                    type: 'Cambio Estado',
                    note: note || `Cambio a ${status}`,
                    statusFrom: previousStatus,
                    statusTo: status,
                    idempotencyKey: idempotencyKey || undefined,
                    performedBy: req.user._id,
                    timestamp: now
                }
            }
        };

        if (subStatus !== undefined) {
            update.$set.subStatus = subStatus;
        }

        const atomicQuery = {
            ...outcomeQuery,
            ...(idempotencyKey ? { 'interactions.idempotencyKey': { $ne: idempotencyKey } } : {})
        };

        const updated = await populateAssignmentAudit(
            LeadAssignment.findOneAndUpdate(atomicQuery, update, {
                new: true,
                runValidators: true
            })
        );

        if (!updated && idempotencyKey) {
            const existing = await populateAssignmentAudit(LeadAssignment.findOne(outcomeQuery));
            const previous = existing?.interactions?.find(item => item.idempotencyKey === idempotencyKey);
            if (previous && previous.statusTo !== status) {
                return res.status(409).json({
                    success: false,
                    error: "La clave de idempotencia ya fue usada con otro estado"
                });
            }
            return res.json({ success: true, idempotent: true, assignment: existing });
        }

        if (!updated) {
            return res.status(404).json({ success: false, error: "Asignación no encontrada o sin permiso" });
        }

        return res.json({ success: true, idempotent: false, assignment: updated });

    } catch (error) {
        console.error("[updateStatus] ❌ Error:", error.message);
        console.error("[updateStatus] Stack:", error.stack);
        res.status(500).json({ success: false, error: "Error al actualizar estado", details: error.message });
    }
};

// Registrar interacción (WhatsApp/Llamada)
exports.logInteraction = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, note } = req.body;

        const assignment = await LeadAssignment.findOne({
            _id: id,
            assignedTo: req.user._id
        });

        if (!assignment) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        assignment.interactions.push({
            type,
            note,
            performedBy: req.user._id,
            timestamp: new Date()
        });

        // Si estaba pendiente, pasar a 'En Gestión' automáticamente
        if (assignment.status === 'Pendiente') {
            assignment.status = 'Llamando';
        }

        await assignment.save();
        res.json(assignment);

    } catch (error) {
        console.error("Error registrando interacción:", error);
        res.status(500).json({ error: "Error al registrar interacción" });
    }
};

// Ejecutar reciclaje (Gerencia)
exports.recycle = async (req, res) => {
    try {
        const { days } = req.body;
        const result = await recyclingService.recycleLeads(days || 3);
        res.json({ success: true, message: `Se reciclaron ${result.count} leads.` });
    } catch (error) {
        console.error("Error en reciclaje:", error);
        res.status(500).json({ error: "Error al ejecutar reciclaje" });
    }
};
