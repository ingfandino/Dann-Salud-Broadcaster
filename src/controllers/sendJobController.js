// src/controllers/sendJobController.js

const SendJob = require("../models/SendJob");
const Message = require("../models/Message");
const { processJob } = require("../services/sendMessageService");
const { pushMetrics } = require("../services/metricsService");
const { addLog } = require("../services/logService");
const ExcelJS = require("exceljs");

// 🔹 Crear un job
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

        await addLog({
            tipo: "info",
            mensaje: `Job creado: ${job._id}`,
            metadata: { ownerUser, contactsCount: contacts.length, scheduledFor }
        });

        if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
            processJob(job._id);
        }

        pushMetrics();
        res.status(201).json(job);
    } catch (err) {
        console.error("❌ Error creando job:", err);
        await addLog({ tipo: "error", mensaje: "Error creando job", metadata: { error: err.message } });
        res.status(500).json({ error: err.message });
    }
};

exports.pauseJob = async (req, res) => {
    try {
        const job = await SendJob.findByIdAndUpdate(
            req.params.id,
            { status: "paused" },
            { new: true }
        );
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        await addLog({ tipo: "info", mensaje: `Job pausado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();
        res.json(job);
    } catch (err) {
        console.error("❌ Error pausando job:", err);
        await addLog({ tipo: "error", mensaje: "Error pausando job", metadata: { error: err.message } });
        res.status(500).json({ error: err.message });
    }
};

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

        await addLog({ tipo: "info", mensaje: `Job reanudado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();

        res.json(job);
    } catch (err) {
        console.error("❌ Error reanudando job:", err);
        await addLog({ tipo: "error", mensaje: "Error reanudando job", metadata: { error: err.message } });
        res.status(500).json({ error: err.message });
    }
};

exports.cancelJob = async (req, res) => {
    try {
        const job = await SendJob.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled" },
            { new: true }
        );
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        await addLog({ tipo: "warning", mensaje: `Job cancelado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();
        res.json(job);
    } catch (err) {
        console.error("❌ Error cancelando job:", err);
        await addLog({ tipo: "error", mensaje: "Error cancelando job", metadata: { error: err.message } });
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

// 🔹 Listar todos los jobs con progreso
exports.listJobs = async (_req, res) => {
    try {
        const jobs = await SendJob.find()
            .populate("ownerUser", "nombre email role")
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

// 🔹 Exportar resultados de un job a Excel
exports.exportJobResultsExcel = async (req, res) => {
    try {
        const { id } = req.params;
        const job = await SendJob.findById(id).populate("contacts");
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        const messages = await Message.find({ job: id }).populate("contact");

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Resultados");

        worksheet.columns = [
            { header: "Contacto", key: "contacto", width: 25 },
            { header: "Teléfono", key: "telefono", width: 18 },
            { header: "Mensaje", key: "mensaje", width: 50 },
            { header: "Estado", key: "estado", width: 15 },
            { header: "Fecha", key: "fecha", width: 22 },
        ];

        messages.forEach(msg => {
            worksheet.addRow({
                contacto: msg.contact?.nombre || "",
                telefono: msg.contact?.telefono || "",
                mensaje: msg.contenido,
                estado: msg.status,
                fecha: msg.timestamp ? new Date(msg.timestamp).toLocaleString() : "",
            });
        });

        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
        });

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=job_${id}_resultados.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("❌ Error exportando resultados:", err);
        res.status(500).json({ error: err.message });
    }
};