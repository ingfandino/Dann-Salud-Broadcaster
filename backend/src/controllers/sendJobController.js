// backend/src/controllers/sendJobController.js

const mongoose = require("mongoose");
const SendJob = require("../models/SendJob");
const Template = require("../models/Template");
const Message = require("../models/Message");
const { pushMetrics } = require("../services/metricsService");
const { addLog } = require("../services/logService");
const ExcelJS = require("exceljs");
const logger = require("../utils/logger");
const { processJob } = require("../services/sendMessageService");
const { emitJobProgress, emitJobsUpdate } = require("../config/socket");

// 🔹 Crear un job
exports.startJob = async (req, res) => {
    try {
        const { name, templateId, message, contacts, scheduledFor } = req.body;
        const createdBy = req.user?._id;
        logger.info(`📦 Creando Job → contacts=${contacts?.length || 0}, createdBy=${createdBy}`);

        if (!contacts || contacts.length === 0) {
            return res.status(400).json({ error: "Debes especificar al menos un contacto" });
        }

        // ✅ CORRECCIÓN: Deduplicar contactos por teléfono antes de crear el job
        const Contact = require('../models/Contact');
        const contactDocs = await Contact.find({ _id: { $in: contacts } }).lean();
        
        const normalizePhone = (raw) => {
            let digits = String(raw || "").replace(/\D/g, "");
            digits = digits.replace(/^0+/, "");
            if (digits.startsWith("15")) digits = digits.slice(2);
            if (digits.startsWith("54") && !digits.startsWith("549")) {
                digits = "549" + digits.slice(2);
            }
            if (!digits.startsWith("54")) {
                digits = "549" + digits;
            }
            return digits;
        };
        
        const seenPhones = new Set();
        const uniqueContactIds = [];
        let duplicatesRemoved = 0;
        
        for (const contact of contactDocs) {
            const normalized = normalizePhone(contact.telefono);
            if (!seenPhones.has(normalized)) {
                seenPhones.add(normalized);
                uniqueContactIds.push(contact._id);
            } else {
                duplicatesRemoved++;
                logger.warn(`⚠️ Contacto duplicado eliminado del job: ${contact.telefono} (${normalized})`);
            }
        }
        
        if (duplicatesRemoved > 0) {
            logger.info(`🔄 Eliminados ${duplicatesRemoved} contactos duplicados del job`);
        }
        
        if (uniqueContactIds.length === 0) {
            return res.status(400).json({ error: "No hay contactos válidos únicos para enviar" });
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

        // parámetros de envío
        const delayMin = Number.isFinite(parseInt(req.body.delayMin, 10)) ? parseInt(req.body.delayMin, 10) : 2;
        const delayMax = Number.isFinite(parseInt(req.body.delayMax, 10)) ? parseInt(req.body.delayMax, 10) : 5;
        const batchSize = Number.isFinite(parseInt(req.body.batchSize, 10)) ? parseInt(req.body.batchSize, 10) : 10;
        // el frontend envía pauseBetweenBatches en minutos; persistimos en minutes
        const pauseBetweenBatchesMinutes = Number.isFinite(parseInt(req.body.pauseBetweenBatches, 10))
            ? parseInt(req.body.pauseBetweenBatches, 10)
            : 1;

        const job = new SendJob({
            name: name || finalMessage.slice(0, 30),
            createdBy,
            template: templateRef,
            message: finalMessage,
            contacts: uniqueContactIds, // ✅ Usar IDs únicos (sin duplicados)
            scheduledFor: scheduledFor || new Date(),
            status: "pendiente",
            delayMin: Math.max(0, delayMin),
            delayMax: Math.max(delayMin, delayMax),
            batchSize: Math.max(1, batchSize),
            pauseBetweenBatchesMinutes: Math.max(0, pauseBetweenBatchesMinutes),
            stats: {
                total: uniqueContactIds.length, // ✅ Total real sin duplicados
                pending: uniqueContactIds.length,
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
        const job = await SendJob.findById(req.params.id);
        if (!job) return res.status(404).json({ error: "Job no encontrado" });

        const role = String(req.user?.role || '').toLowerCase();
        const isPrivileged = ["admin", "supervisor", "gerencia"].includes(role);
        const isOwner = job.createdBy && job.createdBy.equals(req.user._id);
        if (!isPrivileged && !isOwner) {
            return res.status(403).json({ error: "No tienes permisos para pausar este job" });
        }

        job.status = "pausado";
        await job.save();

        await addLog({ tipo: "info", mensaje: `Job pausado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();
        
        // ✅ Emitir actualizaciones en tiempo real
        try {
            const total = job.contacts?.length || 0;
            const progress = total > 0 ? ((job.currentIndex / total) * 100).toFixed(2) : 0;
            
            emitJobProgress(job._id.toString(), {
                _id: job._id,
                status: job.status,
                progress: parseFloat(progress),
                stats: job.stats,
                currentIndex: job.currentIndex
            });
            
            emitJobsUpdate({ ...job.toObject(), progress: parseFloat(progress) });
        } catch (e) {
            logger.warn(`Error emitiendo actualizaciones del job ${job._id}:`, e.message);
        }
        
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

        const role = String(req.user?.role || '').toLowerCase();
        const isPrivileged = ["admin", "supervisor", "gerencia"].includes(role);
        const isOwner = job.createdBy && job.createdBy.equals(req.user._id);
        if (!isPrivileged && !isOwner) {
            return res.status(403).json({ error: "No tienes permisos para reanudar este job" });
        }

        if (job.status !== "pausado") {
            return res.status(400).json({ error: "Solo se pueden reanudar jobs en pausa" });
        }

        job.status = "pendiente";
        await job.save();

        await addLog({ tipo: "info", mensaje: `Job reanudado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();
        
        // ✅ Emitir actualizaciones en tiempo real
        try {
            const total = job.contacts?.length || 0;
            const progress = total > 0 ? ((job.currentIndex / total) * 100).toFixed(2) : 0;
            
            emitJobProgress(job._id.toString(), {
                _id: job._id,
                status: job.status,
                progress: parseFloat(progress),
                stats: job.stats,
                currentIndex: job.currentIndex
            });
            
            emitJobsUpdate({ ...job.toObject(), progress: parseFloat(progress) });
        } catch (e) {
            logger.warn(`Error emitiendo actualizaciones del job ${job._id}:`, e.message);
        }

        // Re-despachar procesamiento en background (no bloquear la respuesta)
        setTimeout(() => {
            try { processJob(job._id).catch(() => {}); } catch (_) {}
        }, 0);

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

        const role = String(req.user?.role || '').toLowerCase();
        const isPrivileged = ["admin", "supervisor", "gerencia"].includes(role);
        const isOwner = job.createdBy && job.createdBy.equals(req.user._id);
        if (!isPrivileged && !isOwner) {
            return res.status(403).json({ error: "No tienes permisos para cancelar este job" });
        }

        // 🗑️ Eliminar mensajes asociados
        await Message.deleteMany({ job: job._id });
        
        // ✅ Emitir actualización antes de eliminar (para que UI actualice)
        try {
            emitJobsUpdate({ _id: job._id, status: "cancelado", deleted: true });
        } catch (e) {
            logger.warn(`Error emitiendo actualización de cancelación del job ${job._id}:`, e.message);
        }

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
            .populate("contacts", "nombre telefono")
            .populate("createdBy", "_id role numeroEquipo");
        if (!job) return res.status(404).json({ error: "Job no encontrado" });
        const role = String(req.user?.role || '').toLowerCase();
        const userId = req.user?._id?.toString();
        const userEquipo = req.user?.numeroEquipo || null;
        const allowAll = ["admin", "gerencia"].includes(role);
        let allowed = allowAll;
        if (!allowed) {
            if (role === "supervisor") {
                allowed = (job.createdBy?.numeroEquipo && job.createdBy.numeroEquipo === userEquipo);
            } else if (role === "asesor") {
                allowed = job.createdBy && job.createdBy._id && job.createdBy._id.toString() === userId;
            } else {
                allowed = false;
            }
        }
        if (!allowed) return res.status(403).json({ error: "No autorizado" });

        const total = job.contacts.length || 0;
        const progress = total > 0 ? ((job.currentIndex / total) * 100).toFixed(2) : 0;

        res.json({ ...job.toObject(), progress });
    } catch (err) {
        logger.error("❌ Error obteniendo job:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Listar todos los jobs con progreso
exports.listJobs = async (req, res) => {
    try {
        const role = String(req.user?.role || '').toLowerCase();
        const userId = req.user?._id;
        const userEquipo = req.user?.numeroEquipo || null;

        let filter = {};
        if (["admin", "gerencia"].includes(role)) {
            filter = {};
        } else if (role === "supervisor") {
            // mostrar jobs creados por usuarios del mismo numeroEquipo (incluyéndose)
            filter = { };
        } else if (role === "revendedor") {
            // ✅ Revendedores ven jobs creados por otros revendedores
            filter = { };
        } else if (role === "asesor") {
            filter = { createdBy: userId };
        } else {
            filter = { createdBy: userId };
        }

        let query = SendJob.find(filter)
            .populate({ path: "createdBy", select: "nombre email role numeroEquipo" })
            .populate("contacts", "nombre telefono")
            .sort({ scheduledFor: -1, createdAt: -1 });
        let jobs = await query.exec();

        // Post-filtrado por equipo para supervisor (porque createdBy.numeroEquipo es en documento poblado)
        if (role === "supervisor") {
            jobs = jobs.filter(j => j.createdBy && j.createdBy.numeroEquipo === userEquipo);
        } else if (role === "revendedor") {
            // ✅ Filtrar solo jobs creados por revendedores
            jobs = jobs.filter(j => j.createdBy && String(j.createdBy.role).toLowerCase() === "revendedor");
        }

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
                        numeroEquipo: job.createdBy.numeroEquipo || null,
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
            { header: "Respondió", key: "respondio", width: 12 },
            { header: "Fecha", key: "fecha", width: 22 },
        ];

        messages.forEach(msg => {
            worksheet.addRow({
                contacto: msg.contact?.nombre || "",
                telefono: msg.contact?.telefono || "",
                mensaje: msg.contenido,
                estado: msg.status,
                respondio: msg.respondio ? "Sí" : "No",
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