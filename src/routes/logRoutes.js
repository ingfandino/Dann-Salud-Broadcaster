// src/routes/logRoutes.js

const express = require("express");
const router = express.Router();
const { listLogs, exportLogsJSON, exportLogsCSV } = require("../controllers/logController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// 🔹 GET /logs → últimos N logs con filtros
//   - Supervisores ven solo su equipo (más adelante con filtros)
//   - Admin ve todo
router.get("/", requireAuth, permit("supervisor", "admin"), listLogs);

// 🔹 GET /logs/export/json → solo admin
router.get("/export/json", requireAuth, permit("admin"), exportLogsJSON);

// 🔹 GET /logs/export/csv → solo admin
router.get("/export/csv", requireAuth, permit("admin"), exportLogsCSV);

module.exports = router;