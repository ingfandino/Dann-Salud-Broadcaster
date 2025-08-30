// src/routes/jobRoutes.js

const express = require("express");
const router = express.Router();
const Job = require("../models/Job");

// Crear un job programado
router.post("/", async (req, res) => {
    try {
        const { ownerUser, template, contacts, scheduledFor } = req.body;

        if (!ownerUser || !template || !contacts?.length || !scheduledFor) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        const job = new Job({ ownerUser, template, contacts, scheduledFor });
        await job.save();

        res.status(201).json(job);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar jobs
router.get("/", async (_req, res) => {
    try {
        const jobs = await Job.find()
            .populate("ownerUser", "nombre email")
            .populate("contacts", "nombre telefono");
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ❌ Cancelar job pendiente
router.put("/:id/cancel", async (req, res) => {
    try {
        const job = await Job.findById(req.params.id);

        if (!job) return res.status(404).json({ error: "Job no encontrado" });
        if (job.status !== "pendiente") {
            return res.status(400).json({ error: "Solo se pueden cancelar jobs pendientes" });
        }

        job.status = "cancelado";
        await job.save();

        res.json({ message: "Job cancelado con éxito", job });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;