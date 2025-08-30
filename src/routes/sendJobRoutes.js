// src/routes/sendJobRoutes.js

const express = require("express");
const router = express.Router();
const {
    startJob,
    pauseJob,
    resumeJob,
    cancelJob,
    getJob,
    listJobs,
} = require("../controllers/sendJobController");

// 🔹 Crear y arrancar (o programar) un job
router.post("/start", startJob);

// 🔹 Controles de ejecución
router.post("/:id/pause", pauseJob);   // Pausar
router.post("/:id/resume", resumeJob); // Reanudar
router.post("/:id/cancel", cancelJob); // Cancelar

// 🔹 Consultas
router.get("/:id", getJob); // Obtener un job concreto
router.get("/", listJobs);  // Listar todos los jobs

module.exports = router;