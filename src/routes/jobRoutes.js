// src/routes/jobRoutes.js

const express = require("express");
const router = express.Router();
const sendJobController = require("../controllers/sendJobController");

// 🔹 Crear un job
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