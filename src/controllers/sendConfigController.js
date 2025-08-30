// src/controllers/sendConfigController.js

const SendConfig = require("../models/SendConfig");

// Obtener configuración actual (si no existe, crear con defaults)
exports.getConfig = async (_req, res) => {
    try {
        let config = await SendConfig.findOne();
        if (!config) {
            config = new SendConfig();
            await config.save();
        }
        res.json(config);
    } catch (err) {
        console.error("❌ Error obteniendo configuración:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Actualizar configuración
exports.updateConfig = async (req, res) => {
    try {
        let config = await SendConfig.findOne();
        if (!config) {
            config = new SendConfig(req.body);
        } else {
            Object.assign(config, req.body);
        }
        await config.save();
        res.json(config);
    } catch (err) {
        console.error("❌ Error actualizando configuración:", err);
        res.status(500).json({ error: "Error interno" });
    }
};