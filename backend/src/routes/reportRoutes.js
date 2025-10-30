// backend/src/routes/reportRoutes.js

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
router.get("/", requireAuth, permit("gerencia", "revendedor"), getReports);
router.post("/", requireAuth, permit("gerencia"), createReport);

// ✅ CORRECCIÓN: Nuevas rutas para integración con mensajería masiva
router.get("/summary", requireAuth, permit("gerencia", "supervisor", "revendedor"), getReportsSummary);
router.post("/generate/:jobId", requireAuth, permit("gerencia", "supervisor", "admin", "asesor"), generateReportsFromJob);

module.exports = router;