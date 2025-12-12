const assignmentService = require('../services/assignmentService');
const recyclingService = require('../services/recyclingService');

const LeadAssignment = require('../models/LeadAssignment');
const User = require('../models/User');
const { getWhatsappClient, isReady } = require('../config/whatsapp');
const ExcelJS = require('exceljs');

// Helper para formatear número a ID de WhatsApp (Argentina)
const formatPhoneToId = (phone) => {
    let number = phone.replace(/\D/g, ''); // Eliminar no-dígitos
    if (number.startsWith('549')) {
        // Ya tiene formato
    } else if (number.startsWith('54')) {
        number = '549' + number.substring(2);
    } else if (number.startsWith('15')) {
        number = '549' + number.substring(2);
    } else {
        // Asumir local sin prefijo internacional
        number = '549' + number;
    }
    return `${number}@c.us`;
};

// Enviar WhatsApp (Asesor)
exports.sendWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, templateId } = req.body;

        if (!isReady()) {
            return res.status(503).json({ error: "El servicio de WhatsApp no está conectado" });
        }

        const assignment = await LeadAssignment.findOne({
            _id: id,
            assignedTo: req.user._id
        }).populate('affiliate');

        if (!assignment) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        if (!assignment.affiliate || !assignment.affiliate.telefono1) {
            return res.status(400).json({ error: "El afiliado no tiene teléfono registrado" });
        }

        const client = getWhatsappClient();
        const chatId = formatPhoneToId(assignment.affiliate.telefono1);

        // Enviar mensaje
        await client.sendMessage(chatId, message);

        // Actualizar estado e historial
        assignment.status = 'En Gestión'; // Automáticamente pasa a gestión
        assignment.interactions.push({
            type: 'WhatsApp',
            note: `Mensaje enviado: ${message.substring(0, 50)}...`,
            performedBy: req.user._id,
            timestamp: new Date()
        });

        await assignment.save();
        res.json({ success: true, message: "Mensaje enviado" });

    } catch (error) {
        console.error("Error enviando WhatsApp:", error);
        res.status(500).json({ error: "Error al enviar mensaje de WhatsApp" });
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

        // Si estaba pendiente, pasar a 'En Gestión'
        if (assignment.status === 'Pendiente') {
            assignment.status = 'En Gestión';
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

// Exportar mis leads a Excel (Asesor)
exports.exportMyLeads = async (req, res) => {
    try {
        const assignments = await LeadAssignment.find({
            assignedTo: req.user._id,
            active: true
        }).populate('affiliate');

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Mis Leads');

        // Columnas requeridas: telefono, nombre, cuil, obra_social, localidad
        worksheet.columns = [
            { header: 'telefono', key: 'telefono', width: 20 },
            { header: 'nombre', key: 'nombre', width: 30 },
            { header: 'cuil', key: 'cuil', width: 15 },
            { header: 'obra_social', key: 'obra_social', width: 20 },
            { header: 'localidad', key: 'localidad', width: 20 },
        ];

        assignments.forEach(assign => {
            if (assign.affiliate) {
                worksheet.addRow({
                    telefono: assign.affiliate.telefono1 || '',
                    nombre: assign.affiliate.nombre || '',
                    cuil: assign.affiliate.cuil || '',
                    obra_social: assign.affiliate.obraSocial || '',
                    localidad: assign.affiliate.localidad || ''
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
        res.json({ message: "Distribución completada", result });

    } catch (error) {
        console.error("Error en distribución:", error);
        res.status(500).json({ error: "Error al distribuir leads" });
    }
};

// Obtener mis leads (Asesor)
exports.getMyLeads = async (req, res) => {
    try {
        const leads = await assignmentService.getDailyAssignments(req.user._id);
        res.json(leads);
    } catch (error) {
        console.error("Error obteniendo leads:", error);
        res.status(500).json({ error: "Error al obtener leads" });
    }
};

// Actualizar estado de un lead
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, subStatus, note } = req.body;

        const assignment = await LeadAssignment.findOne({
            _id: id,
            assignedTo: req.user._id // Seguridad: solo el asignado puede editar
        });

        if (!assignment) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        assignment.status = status;
        if (subStatus) assignment.subStatus = subStatus;

        // Registrar interacción
        assignment.interactions.push({
            type: 'Cambio Estado',
            note: note || `Cambio a ${status}`,
            performedBy: req.user._id,
            timestamp: new Date()
        });

        await assignment.save();
        res.json(assignment);

    } catch (error) {
        console.error("Error actualizando estado:", error);
        res.status(500).json({ error: "Error al actualizar estado" });
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
            assignment.status = 'En Gestión';
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
