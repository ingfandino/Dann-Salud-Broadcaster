// backend/src/routes/metricsRoutes.js

const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Contact = require("../models/Contact");
const { requireAuth } = require("../middlewares/authMiddleware");
const { getConnectedCount } = require("../config/connectedUsers");

// Ruta: GET /api/metrics/dashboard
router.get("/dashboard", requireAuth, async (req, res) => {
    try {
        // 🔹 Mensajes enviados hoy (solo salientes con status "enviado")
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const mensajesHoy = await Message.countDocuments({
            direction: "outbound",
            status: "enviado",
            createdAt: { $gte: startOfDay },
        });

        // 🔹 Usuarios conectados actualmente vía socket
        const usuariosActivos = getConnectedCount();

        // 🔹 Contactos cargados
        const contactosCargados = await Contact.countDocuments();

        res.json({ mensajesHoy, usuariosActivos, contactosCargados });
    } catch (error) {
        console.error("❌ Error en /api/metrics/dashboard:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;