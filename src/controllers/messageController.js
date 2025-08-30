// src/controllers/messageController.js

const Message = require("../models/Message");
const Contact = require("../models/Contact");
const { parseSpintax } = require("../utils/spintax");

// Crear mensaje
exports.createMessage = async (req, res) => {
    try {
        const { contact, ownerUser, contenido } = req.body;
        const newMessage = new Message({ contact, ownerUser, contenido });
        await newMessage.save();
        res.status(201).json(newMessage);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener todos los mensajes
exports.getMessages = async (req, res) => {
    try {
        const messages = await Message.find()
            .populate("contact", "nombre telefono")
            .populate("ownerUser", "nombre email");
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener mensaje por ID
exports.getMessageById = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id)
            .populate("contact", "nombre telefono")
            .populate("ownerUser", "nombre email");
        if (!message) return res.status(404).json({ error: "Mensaje no encontrado" });
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Actualizar mensaje
exports.updateMessage = async (req, res) => {
    try {
        const message = await Message.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        });
        if (!message) return res.status(404).json({ error: "Mensaje no encontrado" });
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar mensaje
exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.id);
        if (!message) return res.status(404).json({ error: "Mensaje no encontrado" });
        res.json({ message: "Mensaje eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Vista previa con placeholders + spintax
exports.previewMessage = async (req, res) => {
    try {
        const { template, contact } = req.body;
        console.log("📩 Preview recibido:", req.body);

        if (!template || !contact) {
            return res.status(400).json({ error: "Debes enviar 'template' y 'contact'" });
        }
        if (!template || template.trim() === "") {
            return res.status(400).json({ error: "El cuadro de texto está vacío" });
        }
        let rendered = template.replace(/{{(.*?)}}/g, (match, key) => {
            const cleanKey = key.trim();
            return contact[cleanKey] !== undefined ? contact[cleanKey] : match;
        });

        console.log("📝 Después de placeholders:", rendered);

        if (typeof parseSpintax === "function") {
            rendered = parseSpintax(rendered);
            console.log("🎲 Después de spintax:", rendered);
        } else {
            console.warn("⚠️ parseSpintax no es función:", typeof parseSpintax);
        }

        res.json({ rendered });
    } catch (err) {
        console.error("❌ Error en previewMessage:", err.stack); // <--- stack real
        res.status(500).json({ error: "Error interno en preview" });
    }
};

// 🔹 Vista previa automática desde primer contacto importado
exports.previewMessageFromImport = async (req, res) => {
    try {
        const { template } = req.body;
        if (!template) {
            return res.status(400).json({ error: "Debes enviar 'template'" });
        }

        const firstContact = await Contact.findOne();
        if (!firstContact) {
            return res.status(404).json({ error: "No hay contactos importados en la base de datos" });
        }
        if (!template || template.trim() === "") {
            return res.status(400).json({ error: "El cuadro de texto está vacío" });
        }

        let rendered = template.replace(/{{(.*?)}}/g, (match, key) => {
            const cleanKey = key.trim();
            return firstContact[cleanKey] !== undefined ? firstContact[cleanKey] : match;
        });

        try {
            rendered = parseSpintax ? parseSpintax(rendered) : rendered;
        } catch (err) {
            console.warn("⚠️ Error procesando spintax:", err.message);
        }

        res.json({ rendered, contactUsed: firstContact });
    } catch (err) {
        console.error("❌ Error en previewMessageFromImport:", err);
        res.status(500).json({ error: "Error interno en previewFromImport" });
    }
};