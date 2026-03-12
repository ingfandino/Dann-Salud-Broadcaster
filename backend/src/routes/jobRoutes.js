/**
 * ============================================================
 * RUTAS DE JOBS (jobRoutes.js)
 * ============================================================
 * Alias alternativo para trabajos de envío masivo.
 * Ver también sendJobRoutes.js para rutas completas.
 */

const express = require("express");
const router = express.Router();
const sendJobController = require("../controllers/sendJobController");

/* ========== CRUD DE JOBS ========== */
router.post("/", sendJobController.startJob);

// 🔹 Listar jobs
router.get("/", sendJobController.listJobs);

// 🔹 Obtener un job concreto (con progreso)
router.get("/:id", sendJobController.getJob);

// 🔹 Pausar job
router.post("/:id/pause", sendJobController.pauseJob);

// 🔹 Reanudar job
router.post("/:id/resume", sendJobController.resumeJob);

// 🔹 Cancelar job
router.post("/:id/cancel", sendJobController.cancelJob);

// 🔹 Exportar resultados del job a Excel
router.get("/:id/export/excel", sendJobController.exportJobResultsExcel);

module.exports = router;