// src/controllers/messageController.js

const Message = require("../models/Message");

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