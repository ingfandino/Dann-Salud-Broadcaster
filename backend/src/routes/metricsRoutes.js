// backend/src/routes/metricsRoutes.js

const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const Contact = require("../models/Contact");
const User = require("../models/User");

const { requireAuth } = require("../middlewares/authMiddleware");
const { getConnectedCount } = require("../config/connectedUsers");

// Ruta: GET /api/metrics/dashboard
router.get("/dashboard", requireAuth, async (req, res) => {
    try {
        // Ventana del día en curso (local)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setDate(endOfDay.getDate() + 1);

        // 🔹 Mensajes enviados hoy (solo salientes con status "enviado")
        const mensajesHoy = await Message.countDocuments({
            direction: "outbound",
            status: "enviado",
            createdAt: { $gte: startOfDay, $lt: endOfDay },
        });

        // 🔹 Usuarios conectados actualmente vía socket
        const usuariosActivos = getConnectedCount();

        // 🔹 Contactos cargados hoy, por rol
        const role = (req.user.role || '').toLowerCase();
        let contactosQuery = { createdAt: { $gte: startOfDay, $lt: endOfDay } };

        if (role === 'asesor' || role === 'auditor') {
            contactosQuery.createdBy = req.user._id;
        } else if (role === 'supervisor') {
            const myGroup = req.user.numeroEquipo;
            if (myGroup !== undefined && myGroup !== null && myGroup !== '') {
                const teamUsers = await User.find({ numeroEquipo: String(myGroup) }).select('_id').lean();
                const teamIds = teamUsers.map(u => u._id);
                contactosQuery.createdBy = { $in: teamIds.length ? teamIds : [req.user._id] };
            } else {
                // Si el supervisor no tiene numeroEquipo, al menos contar los propios
                contactosQuery.createdBy = req.user._id;
            }
        } else if (role === 'admin' || role === 'gerencia') {
            // sin filtro por creador -> todos los contactos del día
        } else {
            // rol desconocido: por defecto, solo propios hoy
            contactosQuery.createdBy = req.user._id;
        }

        const contactosCargados = await Contact.countDocuments(contactosQuery);

        res.json({ mensajesHoy, usuariosActivos, contactosCargados });
    } catch (error) {
        console.error("❌ Error en /api/metrics/dashboard:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

module.exports = router;