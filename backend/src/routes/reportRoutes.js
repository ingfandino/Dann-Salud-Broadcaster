/**
 * ============================================================
 * RUTAS DE REPORTES (reportRoutes.js)
 * ============================================================
 * Generación y consulta de reportes de campañas.
 */

const express = require("express");
const {
    getReports,
    createReport,
    generateReportsFromJob,
    getReportsSummary
} = require("../controllers/reportsController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

const router = express.Router();

// 🔒 proteger rutas, solo usuarios autenticados
router.get("/", requireAuth, permit("gerencia"), getReports);
router.post("/", requireAuth, permit("gerencia"), createReport);

// ✅ CORRECCIÓN: Nuevas rutas para integración con mensajería masiva
router.get("/summary", requireAuth, permit("gerencia", "supervisor"), getReportsSummary);
router.post("/generate/:jobId", requireAuth, permit("gerencia", "supervisor", "administrativo", "asesor", "independiente"), generateReportsFromJob);

module.exports = router;