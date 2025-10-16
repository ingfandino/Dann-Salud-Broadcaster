// backend/src/routes/logRoutes.js

const express = require("express");
const router = express.Router();
const logController = require("../controllers/logController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

// 📌 Logs desde el FRONTEND (sin auth)
router.post("/frontend", (req, res) => {
    const { level = "info", message, extra, timestamp } = req.body;

    // Usar el logger del backend
    if (logger[level]) {
        logger[level](`🌐 [FRONTEND] ${message}`, { extra, timestamp });
    } else {
        logger.info(`🌐 [FRONTEND] ${message}`, { extra, timestamp });
    }

    res.json({ success: true });
});

// 📌 Listado de logs (supervisor/admin)
router.get("/", requireAuth, permit("supervisor", "admin"), async (req, res) => {
    await logController.listLogs(req, res);
});

// 📌 Exportaciones (solo admin)
router.get("/export/json", requireAuth, permit("admin"), async (req, res) => {
    await logController.exportLogsJSON(req, res);
});
router.get("/export/csv", requireAuth, permit("admin"), async (req, res) => {
    await logController.exportLogsCSV(req, res);
});
router.get("/export/excel", requireAuth, permit("admin"), async (req, res) => {
    await logController.exportLogsExcel(req, res);
});

module.exports = router;