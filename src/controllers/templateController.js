// src/controllers/templateController.js

const Template = require("../models/Template");
const Contact = require("../models/Contact");
const { parseSpintax } = require("../utils/spintax");
const { sendSingleMessage } = require("../services/sendMessageService");

// Crear plantilla
exports.createTemplate = async (req, res) => {
    try {
        const { nombre, contenido, ownerUser } = req.body;
        const template = new Template({ nombre, contenido, ownerUser });
        await template.save();
        res.status(201).json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Listar todas las plantillas de un usuario
exports.getTemplates = async (req, res) => {
    try {
        const { ownerUser } = req.query; // se puede pasar como filtro
        const filter = ownerUser ? { ownerUser } : {};
        const templates = await Template.find(filter).populate("ownerUser", "nombre email");
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener plantilla por ID
exports.getTemplateById = async (req, res) => {
    try {
        const template = await Template.findById(req.params.id).populate("ownerUser", "nombre email");
        if (!template) return res.status(404).json({ error: "Plantilla no encontrada" });
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Actualizar plantilla
exports.updateTemplate = async (req, res) => {
    try {
        const template = await Template.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!template) return res.status(404).json({ error: "Plantilla no encontrada" });
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar plantilla
exports.deleteTemplate = async (req, res) => {
    try {
        const template = await Template.findByIdAndDelete(req.params.id);
        if (!template) return res.status(404).json({ error: "Plantilla no encontrada" });
        res.json({ message: "Plantilla eliminada" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 🚀 Enviar plantilla a contactos seleccionados
exports.sendTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { contacts: contactIds, ownerUser } = req.body;

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
                    results.push({ contact: contact._id, telefono: contact.telefono, status: "success" });
                } else {
                    results.push({ contact: contact._id, status: "failed", error: result.error });
                }
            } catch (err) {
                results.push({ contact: contact._id, status: "failed", error: err.message });
            }
        }

        res.json({ summary: results });
    } catch (err) {
        console.error("❌ Error en sendTemplate:", err);
        res.status(500).json({ error: "Error interno enviando plantilla" });
    }
};