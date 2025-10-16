// backend/src/routes/index.js

const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");

// Importar subrutas
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

// 📌 Rutas públicas
router.use("/auth", authRoutes);

// 📌 Middleware para proteger el resto
router.use(requireAuth);

// 📌 Rutas protegidas
router.use("/users", userRoutes);
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

module.exports = router;