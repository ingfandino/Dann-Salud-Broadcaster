// backend/src/controllers/sendJobController.js

const mongoose = require("mongoose");
const SendJob = require("../models/SendJob");
const Template = require("../models/Template");
const Message = require("../models/Message");
const { pushMetrics } = require("../services/metricsService");
const { addLog } = require("../services/logService");
const ExcelJS = require("exceljs");
const logger = require("../utils/logger");

// 🔹 Crear un job
exports.startJob = async (req, res) => {
    try {
        const { name, templateId, message, contacts, scheduledFor } = req.body;
        const createdBy = req.user?._id;
        logger.info(`📦 Creando Job → contacts=${contacts?.length || 0}, createdBy=${createdBy}`);

        if (!contacts || contacts.length === 0) {
            return res.status(400).json({ error: "Debes especificar al menos un contacto" });
        }

        let finalMessage = "";
        let templateRef = null;

        // Caso: plantilla guardada
        if (templateId && String(templateId).trim().length > 0 && mongoose.Types.ObjectId.isValid(templateId)) {
            const template = await Template.findById(templateId);
            if (!template) {
                logger.warn("⚠️ TemplateId recibido pero no existe");
                return res.status(404).json({ error: "Plantilla no encontrada" });
            }
            templateRef = template._id;
            finalMessage = template.contenido;
        }

        // Caso: texto libre
        if (!finalMessage && message && message.trim() !== "") {
            finalMessage = message.trim();
        }

        if (!finalMessage) {
            return res.status(400).json({ error: "Debes especificar un templateId válido o un mensaje de texto" });
        }

        const job = new SendJob({
            name: name || finalMessage.slice(0, 30),
            createdBy,
            template: templateRef,
            message: finalMessage,
            contacts,
            scheduledFor: scheduledFor || new Date(),
            status: "pendiente",
            stats: {
                total: contacts.length,
                pending: contacts.length,
                sent: 0,
                failed: 0,
            }
        });

        await job.save();

        await addLog({
            tipo: "info",
            mensaje: `Job creado: ${job._id}`,
            metadata: { createdBy, contactsCount: contacts.length, scheduledFor }
        });

        pushMetrics();
        res.status(201).json(job);
    } catch (err) {
        logger.error("❌ Error creando job", { error: err.message });
        await addLog({ tipo: "error", mensaje: "Error creando job", metadata: { error: err.message } });
        res.status(500).json({ error: err.message });
    }
};

exports.pauseJob = async (req, res) => {
    try {
        const job = await SendJob.findByIdAndUpdate(
            req.params.id,
            { status: "pausado" },
            { new: true }
        );
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        await addLog({ tipo: "info", mensaje: `Job pausado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();
        res.json(job);
    } catch (err) {
        logger.error("❌ Error pausando job:", err);
        await addLog({ tipo: "error", mensaje: "Error pausando job", metadata: { error: err.message } });
        res.status(500).json({ error: err.message });
    }
};

exports.resumeJob = async (req, res) => {
    try {
        const job = await SendJob.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        if (job.status !== "pausado") {
            return res.status(400).json({ error: "Solo se pueden reanudar jobs en pausa" });
        }

        job.status = "pendiente";
        await job.save();

        await addLog({ tipo: "info", mensaje: `Job reanudado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();

        res.json(job);
    } catch (err) {
        logger.error("❌ Error reanudando job:", err);
        await addLog({ tipo: "error", mensaje: "Error reanudando job", metadata: { error: err.message } });
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Eliminar definitivamente un Job
exports.cancelJob = async (req, res) => {
    try {
        const job = await SendJob.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        // 🗑️ Eliminar mensajes asociados
        await Message.deleteMany({ job: job._id });

        // 🗑️ Eliminar el Job
        await SendJob.findByIdAndDelete(job._id);

        await addLog({
            tipo: "warning",
            mensaje: `Job eliminado: ${job._id}`,
            metadata: { jobId: job._id }
        });

        pushMetrics();
        res.json({ message: "Job eliminado correctamente" });
    } catch (err) {
        logger.error("❌ Error eliminando job:", err);
        await addLog({ tipo: "error", mensaje: "Error eliminando job", metadata: { error: err.message } });
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
        logger.error("❌ Error obteniendo job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Listar todos los jobs con progreso
exports.listJobs = async (_req, res) => {
    try {
        const jobs = await SendJob.find()
            .populate("createdBy", "nombre email role")
            .populate("contacts", "nombre telefono")
            .sort({ scheduledFor: -1, createdAt: -1 });

        const enriched = jobs.map(job => {
            const total = job.contacts.length || 0;
            const progress = total > 0 ? ((job.currentIndex / total) * 100).toFixed(2) : 0;
            return {
                _id: job._id,
                name: job.name,
                status: job.status,
                progress,
                scheduledFor: job.scheduledFor,
                stats: job.stats,
                createdBy: job.createdBy
                    ? {
                        _id: job.createdBy._id,
                        nombre: job.createdBy.nombre,
                        email: job.createdBy.email,
                        role: job.createdBy.role,
                    }
                    : null,
            };
        });

        res.json(enriched);
    } catch (err) {
        logger.error("❌ Error listando jobs:", err);
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
        logger.error("❌ Error exportando resultados:", err);
        res.status(500).json({ error: err.message });
    }
};