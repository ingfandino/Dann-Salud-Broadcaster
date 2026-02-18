/**
 * ============================================================
 * CONTROLADOR DE PLANTILLAS (templateController)
 * ============================================================
 * Gestiona las plantillas de mensajes reutilizables.
 * 
 * Las plantillas pueden contener:
 * - Variables: {{nombre}}, {{telefono}} - Se reemplazan con datos del contacto
 * - Spintax: {opcion1|opcion2|opcion3} - Se selecciona aleatoriamente
 * 
 * Permisos de visibilidad:
 * - Gerencia/Admin: todas las plantillas
 * - Supervisor: plantillas de su equipo + gerencia
 * - Asesor: propias + de supervisores de su equipo + gerencia
 */

const Template = require("../models/Template");
const Contact = require("../models/Contact");
const User = require("../models/User");

const { parseSpintax } = require("../utils/spintax");
const { sendSingleMessage } = require("../services/sendMessageService");
const logger = require("../utils/logger");

/** Crea una nueva plantilla */
exports.createTemplate = async (req, res) => {
    try {
        const { nombre, contenido } = req.body;
        const createdBy = req.user?._id;
        const template = new Template({ nombre, contenido, createdBy });
        await template.save();
        res.status(201).json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Listar todas las plantillas de un usuario
exports.getTemplates = async (req, res) => {
    try {
        const role = String(req.user?.role || '').toLowerCase();
        const userId = req.user?._id;
        const equipo = req.user?.numeroEquipo || null;

        let filter = {};
        if (["admin","gerencia"].includes(role)) {
            filter = {};
        } else if (role === "supervisor" || role === "encargado") {
            // ver plantillas de todos los usuarios de su equipo (mismo numeroEquipo)
            const teamUsers = await User.find({ numeroEquipo: equipo }).select("_id");
            const gerencias = await User.find({ role: "gerencia" }).select("_id");
            const admins = await User.find({ role: "administrativo" }).select("_id");
            const allowed = [
                ...teamUsers.map(u => u._id),
                ...gerencias.map(u => u._id),
                ...admins.map(u => u._id)
            ];
            filter = { createdBy: { $in: allowed } };
        } else if (role === "asesor" || role === "auditor") {
            // ✅ ver propias + de supervisores del mismo equipo + gerencia + admin
            const supervisors = await User.find({ role: { $in: ["supervisor", "supervisor_reventa", "encargado"] }, numeroEquipo: equipo }).select("_id");
            const gerencias = await User.find({ role: "gerencia" }).select("_id");
            const admins = await User.find({ role: "administrativo" }).select("_id");
            const allowed = [
                userId,
                ...supervisors.map(u => u._id),
                ...gerencias.map(u => u._id),
                ...admins.map(u => u._id)
            ];
            filter = { createdBy: { $in: allowed } };
        } else {
            filter = { createdBy: userId };
        }

        const templates = await Template.find(filter)
            .populate("createdBy", "nombre email numeroEquipo role")
            .sort({ updatedAt: -1, createdAt: -1 });
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener plantilla por ID
exports.getTemplateById = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id).populate("createdBy", "nombre email");
        if (!template) return res.status(404).json({ error: "Plantilla no encontrada" });
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Actualizar plantilla
exports.updateTemplate = async (req, res) => {
    try {
        const tpl = await Template.findById(req.params.id).populate("createdBy", "_id role numeroEquipo");
        if (!tpl) return res.status(404).json({ error: "Plantilla no encontrada" });
        
        const role = String(req.user?.role || '').toLowerCase();
        const userId = req.user?._id;
        const equipo = req.user?.numeroEquipo || null;
        const isOwner = tpl.createdBy && tpl.createdBy._id.equals(userId);
        const isPrivileged = ["admin", "administrativo", "gerencia"].includes(role);
        
        // Verificar si puede editar según la misma lógica de visibilidad
        let canEdit = isOwner || isPrivileged;
        
        if (!canEdit && (role === "supervisor" || role === "supervisor_reventa" || role === "encargado")) {
            // Supervisores/Encargados pueden editar plantillas de su equipo + gerencia + admin
            const creatorRole = String(tpl.createdBy?.role || '').toLowerCase();
            const creatorEquipo = tpl.createdBy?.numeroEquipo;
            canEdit = creatorEquipo === equipo || ["gerencia", "admin", "administrativo"].includes(creatorRole);
        }
        
        if (!canEdit && (role === "asesor" || role === "auditor")) {
            // Asesores pueden editar plantillas propias + de supervisores de su equipo + gerencia + admin
            const creatorRole = String(tpl.createdBy?.role || '').toLowerCase();
            const creatorEquipo = tpl.createdBy?.numeroEquipo;
            const isSupervisorDelEquipo = ["supervisor", "supervisor_reventa", "encargado"].includes(creatorRole) && creatorEquipo === equipo;
            const isGerenciaOrAdmin = ["gerencia", "admin", "administrativo"].includes(creatorRole);
            canEdit = isSupervisorDelEquipo || isGerenciaOrAdmin;
        }
        
        if (!canEdit) return res.status(403).json({ error: "No autorizado" });
        
        if (req.body.createdBy) delete req.body.createdBy;
        const updated = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar plantilla
exports.deleteTemplate = async (req, res) => {
    try {
        const tpl = await Template.findById(req.params.id).populate("createdBy", "_id role numeroEquipo");
        if (!tpl) return res.status(404).json({ error: "Plantilla no encontrada" });
        
        const role = String(req.user?.role || '').toLowerCase();
        const userId = req.user?._id;
        const equipo = req.user?.numeroEquipo || null;
        const isOwner = tpl.createdBy && tpl.createdBy._id.equals(userId);
        const isPrivileged = ["admin", "administrativo", "gerencia"].includes(role);
        
        // Verificar si puede eliminar según la misma lógica de visibilidad
        let canDelete = isOwner || isPrivileged;
        
        if (!canDelete && (role === "supervisor" || role === "supervisor_reventa" || role === "encargado")) {
            // Supervisores/Encargados pueden eliminar plantillas de su equipo + gerencia + admin
            const creatorRole = String(tpl.createdBy?.role || '').toLowerCase();
            const creatorEquipo = tpl.createdBy?.numeroEquipo;
            canDelete = creatorEquipo === equipo || ["gerencia", "admin", "administrativo"].includes(creatorRole);
        }
        
        if (!canDelete && (role === "asesor" || role === "auditor")) {
            // Asesores pueden eliminar plantillas propias + de supervisores de su equipo + gerencia + admin
            const creatorRole = String(tpl.createdBy?.role || '').toLowerCase();
            const creatorEquipo = tpl.createdBy?.numeroEquipo;
            const isSupervisorDelEquipo = ["supervisor", "supervisor_reventa", "encargado"].includes(creatorRole) && creatorEquipo === equipo;
            const isGerenciaOrAdmin = ["gerencia", "admin", "administrativo"].includes(creatorRole);
            canDelete = isSupervisorDelEquipo || isGerenciaOrAdmin;
        }
        
        if (!canDelete) return res.status(403).json({ error: "No autorizado" });
        
        await Template.findByIdAndDelete(req.params.id);
        res.json({ message: "Plantilla eliminada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Enviar plantilla a contactos seleccionados
exports.sendTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { contacts: contactIds, createdBy } = req.body;

        // 1. Buscar plantilla
        const template = await Template.findById(id);
        if (!template) {
            return res.status(404).json({ error: "Plantilla no encontrada" });
        }

        // 2. Buscar contactos
        const contacts = await Contact.find({ _id: { $in: contactIds } });
        if (!contacts.length) {
            return res.status(400).json({ error: "No se encontraron contactos válidos" });
        }

        // 3. Procesar y enviar
        const results = [];
        for (const contact of contacts) {
            let rendered = template.contenido.replace(/{{(.*?)}}/g, (match, key) => {
                const cleanKey = key.trim();
                return contact[cleanKey] !== undefined ? contact[cleanKey] : match;
            });

            rendered = parseSpintax(rendered);

            try {
                const result = await sendSingleMessage(contact.telefono, rendered);
                if (result.success) {
                    results.push({ contact: contact._id, telefono: contact.telefono, status: "exitoso" });
                } else {
                    results.push({ contact: contact._id, status: "fallido", error: result.error });
                }
            } catch (err) {
                results.push({ contact: contact._id, status: "fallido", error: err.message });
            }
        }

        res.json({ summary: results });
    } catch (err) {
        logger.error("❌ Error en sendTemplate:", err);
        res.status(500).json({ error: "Error interno enviando plantilla" });
    }
};