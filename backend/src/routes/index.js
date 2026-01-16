/**
 * ============================================================
 * RUTAS PRINCIPALES (routes/index.js)
 * ============================================================
 * Punto central de configuración de rutas de la API.
 * Organiza las rutas en públicas y protegidas.
 * 
 * Prefijo: /api
 * Públicas: /auth (login, registro, recuperación)
 * Protegidas: Todas las demás (requieren JWT)
 */

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");

/* ========== IMPORTACIÓN DE SUBRUTAS ========== */
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const contactRoutes = require("./contactRoutes");
const templateRoutes = require("./templateRoutes");
const autoresponseRoutes = require("./autoresponseRoutes");
const messageRoutes = require("./messageRoutes");
const sendConfigRoutes = require("./sendConfigRoutes");
const sendJobRoutes = require("./sendJobRoutes");
const whatsappRoutes = require("./whatsappRoutes");
const whatsappMeRoutes = require("./whatsappMeRoutes");
const logRoutes = require("./logRoutes");
const reportRoutes = require("./reportRoutes");
const auditRoutes = require("./auditRoutes");
const metricsRoutes = require("./metricsRoutes");
const recoveryRoutes = require("./recoveryRoutes");
const liquidacionRoutes = require("./liquidacionRoutes");
const internalMessageRoutes = require("./internalMessageRoutes");
const affiliateRoutes = require("./affiliates");
const bannedWordRoutes = require("./bannedWords");
const employeeRoutes = require("./employees");
const phoneRoutes = require("./phones");

// 📌 Rutas públicas
router.use("/auth", authRoutes);

// 📌 Middleware para proteger el resto
router.use(requireAuth);

// 📌 Rutas protegidas
router.use("/users", userRoutes);

// Ruta directa para grupos (accesible desde /api/groups)
router.get("/groups", requireAuth, async (req, res) => {
    try {
        const User = require("../models/User");
        const grupos = await User.distinct("numeroEquipo", {
            deletedAt: null,
            numeroEquipo: { $exists: true, $ne: null, $ne: "" }
        });

        grupos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        const gruposFormateados = grupos.map(g => ({
            _id: g,
            nombre: g,
            name: g
        }));

        res.json(gruposFormateados);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.use("/contacts", contactRoutes);
router.use("/templates", templateRoutes);
router.use("/autoresponses", autoresponseRoutes);
router.use("/messages", messageRoutes);
router.use("/send-config", sendConfigRoutes);
router.use("/send-jobs", sendJobRoutes);
router.use("/whatsapp", whatsappRoutes);
router.use("/whatsapp/me", whatsappMeRoutes);
router.use("/logs", logRoutes);
router.use("/reports", reportRoutes);
router.use("/audits", auditRoutes);
router.use("/metrics", metricsRoutes);
router.use("/recovery", recoveryRoutes);
router.use("/liquidacion", liquidacionRoutes);
router.use("/internal-messages", internalMessageRoutes);
router.use("/affiliates", affiliateRoutes);
router.use("/banned-words", bannedWordRoutes);
router.use("/employees", employeeRoutes);
router.use("/phones", phoneRoutes);
router.use("/assignments", require("./assignments"));

module.exports = router;