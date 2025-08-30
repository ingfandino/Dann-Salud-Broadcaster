// src/controllers/sendJobController.js

const SendJob = require("../models/SendJob");
const { processJob } = require("../services/sendMessageService");
const { pushMetrics } = require("../services/metricsService");

// 🔹 Crear un job (opcionalmente programado)
exports.startJob = async (req, res) => {
    try {
        const { ownerUser, template, contacts, scheduledFor } = req.body;

        const job = new SendJob({
            ownerUser,
            template,
            contacts,
            scheduledFor: scheduledFor || new Date(),
            status: "pending",
        });

        await job.save();

        if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
            processJob(job._id);
        }

        pushMetrics();
        res.status(201).json(job);
    } catch (err) {
        console.error("❌ Error creando job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Pausar un job en ejecución
exports.pauseJob = async (req, res) => {
    try {
        const job = await SendJob.findByIdAndUpdate(
            req.params.id,
            { status: "paused" },
            { new: true }
        );
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        pushMetrics();
        res.json(job);
    } catch (err) {
        console.error("❌ Error pausando job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Reanudar un job pausado
exports.resumeJob = async (req, res) => {
    try {
        const job = await SendJob.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        if (job.status !== "paused") {
            return res.status(400).json({ error: "Solo se pueden reanudar jobs en pausa" });
        }

        job.status = "running";
        await job.save();
        processJob(job._id);

        pushMetrics();
        res.json(job);
    } catch (err) {
        console.error("❌ Error reanudando job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Cancelar un job
exports.cancelJob = async (req, res) => {
    try {
        const job = await SendJob.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled" },
            { new: true }
        );
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        pushMetrics();
        res.json(job);
    } catch (err) {
        console.error("❌ Error cancelando job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Obtener un job concreto con progreso
exports.getJob = async (req, res) => {
    try {
        const job = await SendJob.findById(req.params.id)
            .populate("contacts", "nombre telefono");
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        const total = job.contacts.length || 0;
        const progress = total > 0 ? ((job.currentIndex / total) * 100).toFixed(2) : 0;

        res.json({ ...job.toObject(), progress });
    } catch (err) {
        console.error("❌ Error obteniendo job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Listar todos los jobs (útil para frontend) con progreso
exports.listJobs = async (_req, res) => {
    try {
        const jobs = await SendJob.find()
            .populate("ownerUser", "nombre email")
            .populate("contacts", "nombre telefono")
            .sort({ scheduledFor: -1, createdAt: -1 });

        const enriched = jobs.map(job => {
            const total = job.contacts.length || 0;
            const progress = total > 0 ? ((job.currentIndex / total) * 100).toFixed(2) : 0;
            return { ...job.toObject(), progress };
        });

        res.json(enriched);
    } catch (err) {
        console.error("❌ Error listando jobs:", err);
        res.status(500).json({ error: err.message });
    }
};