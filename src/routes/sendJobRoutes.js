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
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// 🔹 Crear y arrancar (o programar) un job
router.post("/start", requireAuth, permit("asesor", "supervisor", "admin"), startJob);

// 🔹 Controles de ejecución
router.post("/:id/pause", requireAuth, permit("supervisor", "admin"), pauseJob);
router.post("/:id/resume", requireAuth, permit("supervisor", "admin"), resumeJob);
router.post("/:id/cancel", requireAuth, permit("supervisor", "admin"), cancelJob);

// 🔹 Consultas
router.get("/:id", requireAuth, permit("asesor", "supervisor", "admin"), getJob);
router.get("/", requireAuth, permit("asesor", "supervisor", "admin"), listJobs);

module.exports = router;