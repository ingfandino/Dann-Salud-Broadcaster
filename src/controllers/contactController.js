// src/controllers/contactController.js

const Contact = require("../models/Contact");

// Crear contacto
exports.createContact = async (req, res) => {
    try {
        const { nombre, telefono, cuil, ...extraData } = req.body;

        if (!nombre || !telefono || !cuil) {
            return res.status(400).json({ message: "Faltan campos obligatorios" });
        }

        const contact = new Contact({
            nombre,
            telefono,
            cuil,
            ownerUser: req.body.ownerUser || null,
            extraData
        });

        await contact.save();
        res.status(201).json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener todos los contactos
exports.getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find();
        res.json(contacts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener un contacto por ID
exports.getContactById = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);
        if (!contact) return res.status(404).json({ message: "Contacto no encontrado" });
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar un contacto
exports.updateContact = async (req, res) => {
    try {
        const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
            new: true
        });
        if (!contact) return res.status(404).json({ message: "Contacto no encontrado" });
        res.json(contact);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar un contacto
exports.deleteContact = async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);
        if (!contact) return res.status(404).json({ message: "Contacto no encontrado" });
        res.json({ message: "Contacto eliminado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};