/**
 * ============================================================
 * CONTROLADOR DE TRABAJOS DE ENVÍO (sendJobController)
 * ============================================================
 * Gestiona las campañas de envío masivo de mensajes por WhatsApp.
 * 
 * Funcionalidades:
 * - Crear, pausar, reanudar y cancelar trabajos
 * - Monitoreo de progreso en tiempo real
 * - Deduplicación de contactos
 * - Exportación de reportes de respuestas
 * - Gestión de estadísticas por campaña
 */

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
const { canAccessSendJob, canControlSendJob } = require("../utils/sendJobAccess");

/** Crea un nuevo trabajo de envío masivo */
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

        if (contactDocs.length !== contacts.length) {
            return res.status(400).json({ error: "La campaña contiene contactos inexistentes" });
        }

        const role = String(req.user?.role || "").toLowerCase();
        if (role === "independiente") {
            const hasForeignContact = contactDocs.some(contact =>
                String(contact.createdBy || "") !== String(createdBy)
            );
            if (hasForeignContact) {
                return res.status(403).json({ error: "No puedes usar contactos de otro usuario" });
            }
        }

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

        // 🚨 DETECCIÓN DE PALABRAS PROHIBIDAS
        const bannedWordController = require("./bannedWordController");
        const detectedWords = await bannedWordController.detectBannedWords(finalMessage);

        if (detectedWords.length > 0) {
            logger.warn(`🚫 Palabras prohibidas detectadas en campaña: ${detectedWords.map(w => w.word).join(", ")}`);

            for (const detected of detectedWords) {
                await bannedWordController.notifyBannedWordDetection({
                    word: detected.word,
                    wordId: detected.wordId,
                    userId: createdBy,
                    campaignName: name || "Sin nombre",
                    messageContent: finalMessage,
                    detectedIn: "bulk_message"
                });
            }

            return res.status(400).json({
                error: "El mensaje contiene palabras o frases prohibidas",
                bannedWords: detectedWords.map(w => w.word),
                message: `Elimina las siguientes palabras/frases para continuar: ${detectedWords.map(w => `"${w.word}"`).join(", ")}`
            });
        }

        // parámetros de envío
        const delayMin = Number.isFinite(parseInt(req.body.delayMin, 10)) ? parseInt(req.body.delayMin, 10) : 2;
        const delayMax = Number.isFinite(parseInt(req.body.delayMax, 10)) ? parseInt(req.body.delayMax, 10) : 5;
        const batchSize = Number.isFinite(parseInt(req.body.batchSize, 10)) ? parseInt(req.body.batchSize, 10) : 10;
        // el frontend envía pauseBetweenBatches en minutos; persistimos en minutes
        const pauseBetweenBatchesMinutes = Number.isFinite(parseInt(req.body.pauseBetweenBatches, 10))
            ? parseInt(req.body.pauseBetweenBatches, 10)
            : 1;

        // Validar y procesar fecha de programación
        let scheduledDate;
        if (scheduledFor) {
            scheduledDate = new Date(scheduledFor);
            if (isNaN(scheduledDate.getTime())) {
                return res.status(400).json({ error: "Fecha de programación inválida" });
            }
            // Permitir margen de 1 minuto para evitar rechazos por latencia
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
            if (scheduledDate < oneMinuteAgo) {
                return res.status(400).json({
                    error: "La fecha de programación debe ser en el futuro"
                });
            }
            logger.info(`📅 Campaña programada para: ${scheduledDate.toISOString()} (local: ${scheduledDate.toLocaleString('es-AR')})`);
        } else {
            scheduledDate = new Date();
            logger.info(`📅 Campaña de envío inmediato`);
        }

        const job = new SendJob({
            name: name || finalMessage.slice(0, 30),
            createdBy,
            template: templateRef,
            message: finalMessage,
            contacts: uniqueContactIds,
            scheduledFor: scheduledDate,
            status: "pendiente",
            delayMin: Math.max(0, delayMin),
            delayMax: Math.max(delayMin, delayMax),
            batchSize: Math.max(1, batchSize),
            pauseBetweenBatchesMinutes: Math.max(0, pauseBetweenBatchesMinutes),
            stats: {
                total: uniqueContactIds.length,
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

        // ✅ Emitir evento de nuevo job
        try {
            emitJobsUpdate({ ...job.toObject(), progress: 0 });
        } catch (e) {
            logger.warn(`Error emitiendo evento de nuevo job ${job._id}:`, e.message);
        }

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

        if (!canControlSendJob(req.user, job)) {
            return res.status(403).json({ error: "No tienes permisos para pausar este job" });
        }

        job.status = "pausado";
        await job.save();

        await addLog({ tipo: "info", mensaje: `Job pausado: ${job._id}`, metadata: { jobId: job._id } });
        pushMetrics();

        // ✅ Emitir actualizaciones en tiempo real
        try {
            const total = job.stats?.total || job.contacts?.length || 0;
            const processed = (job.stats?.sent || 0) + (job.stats?.failed || 0);
            const progress = total > 0 ? Math.min(100, ((processed / total) * 100).toFixed(2)) : 0;

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

        if (!canControlSendJob(req.user, job)) {
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
            const total = job.stats?.total || job.contacts?.length || 0;
            const processed = (job.stats?.sent || 0) + (job.stats?.failed || 0);
            const progress = total > 0 ? Math.min(100, ((processed / total) * 100).toFixed(2)) : 0;

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
            try { processJob(job._id).catch(() => { }); } catch (_) { }
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

        if (!canControlSendJob(req.user, job)) {
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
        if (!canAccessSendJob(req.user, job)) return res.status(403).json({ error: "No autorizado" });

        const total = job.stats?.total || job.contacts?.length || 0;
        const processed = (job.stats?.sent || 0) + (job.stats?.failed || 0);
        const progress = total > 0 ? Math.min(100, ((processed / total) * 100).toFixed(2)) : 0;

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
        if (["admin", "gerencia", "encargado"].includes(role)) {
            // ✅ Gerencia/Admin/Encargado ven todo
            filter = {};
        } else if (role === "supervisor") {
            // mostrar jobs creados por usuarios del mismo numeroEquipo (incluyéndose)
            filter = {};
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

        // Post-filtrado por equipo solo para supervisor (Encargado ve todo)
        if (role === "supervisor") {
            jobs = jobs.filter(j => j.createdBy && j.createdBy.numeroEquipo === userEquipo);
        }

        // Calcular respuestas (mensajes inbound) para cada job
        const enriched = await Promise.all(jobs.map(async (job) => {
            const total = job.stats?.total || job.contacts?.length || 0;
            const processed = (job.stats?.sent || 0) + (job.stats?.failed || 0);
            const progress = total > 0 ? Math.min(100, ((processed / total) * 100).toFixed(2)) : 0;

            // Contar respuestas únicas (solo primer mensaje por número de teléfono)
            // Solo contar si la campaña fue creada en las últimas 24 horas
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const campaignCreatedAt = new Date(job.createdAt);
            let repliesCount = 0;

            if (campaignCreatedAt >= twentyFourHoursAgo) {
                const distinctPhones = await Message.distinct('from', {
                    job: job._id,
                    direction: 'inbound'
                });
                repliesCount = distinctPhones.length;
            }

            return {
                _id: job._id,
                name: job.name,
                status: job.status,
                progress,
                scheduledFor: job.scheduledFor,
                createdAt: job.createdAt,
                completedAt: job.completedAt, // ✅ Agregar fecha de finalización
                stats: job.stats,
                // ✅ Agregar campos que espera el frontend
                totalContacts: job.stats?.total || job.contacts?.length || 0,
                sentCount: job.stats?.sent || 0,
                failedCount: job.stats?.failed || 0,
                repliesCount,
                restBreakUntil: job.restBreakUntil,
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
        }));

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
        const job = await SendJob.findById(id)
            .populate("contacts")
            .populate("createdBy", "_id role numeroEquipo");
        if (!job) return res.status(404).json({ error: "Job no encontrado" });
        if (!canAccessSendJob(req.user, job)) return res.status(403).json({ error: "No autorizado" });

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

// 🔹 MEJORA 3: Exportar reporte de auto-respuestas de un job
exports.exportAutoResponseReport = async (req, res) => {
    try {
        const { id } = req.params;
        const AutoResponseLog = require("../models/AutoResponseLog");
        const Contact = require("../models/Contact");

        // Obtener job para verificar permisos
        const job = await SendJob.findById(id).populate("createdBy", "_id role numeroEquipo");
        if (!job) return res.status(404).json({ error: "Job no encontrado" });
        if (!canAccessSendJob(req.user, job)) return res.status(403).json({ error: "No autorizado" });

        // Obtener logs de auto-respuestas para este job
        const logs = await AutoResponseLog.find({ job: id })
            .populate('contact', 'nombre telefono')
            .sort({ respondedAt: 1 });

        if (logs.length === 0) {
            return res.status(404).json({
                error: "No hay auto-respuestas registradas para esta campaña"
            });
        }

        const workbook = new ExcelJS.Workbook();

        // ═══════════════════════════════════════════════════════════
        // HOJA 1: DETALLE DE AUTO-RESPUESTAS
        // ═══════════════════════════════════════════════════════════
        const detailSheet = workbook.addWorksheet('Detalle Auto-respuestas');

        detailSheet.columns = [
            { header: 'Fecha/Hora', key: 'fecha', width: 20 },
            { header: 'Afiliado', key: 'nombre', width: 30 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Mensaje del Usuario', key: 'userMessage', width: 40 },
            { header: 'Palabra Clave', key: 'keyword', width: 20 },
            { header: 'Auto-respuesta Enviada', key: 'response', width: 50 }
        ];

        // Agregar datos
        logs.forEach(log => {
            detailSheet.addRow({
                fecha: log.respondedAt ? new Date(log.respondedAt).toLocaleString('es-AR') : 'N/A',
                nombre: log.contact?.nombre || 'Desconocido',
                telefono: log.contact?.telefono || 'N/A',
                userMessage: log.userMessage || '',
                keyword: log.isFallback ? 'Comodín' : (log.keyword || 'N/A'),
                response: log.response || ''
            });
        });

        // Estilo del header
        detailSheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // ═══════════════════════════════════════════════════════════
        // HOJA 2: RESUMEN POR PALABRA CLAVE
        // ═══════════════════════════════════════════════════════════
        const summarySheet = workbook.addWorksheet('Resumen');

        summarySheet.columns = [
            { header: 'Palabra Clave', key: 'keyword', width: 25 },
            { header: 'Cantidad de Respuestas', key: 'count', width: 25 },
            { header: 'Porcentaje', key: 'percentage', width: 15 }
        ];

        // Agrupar por keyword
        const grouped = logs.reduce((acc, log) => {
            const key = log.isFallback ? 'Comodín' : (log.keyword || 'Sin keyword');
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const total = logs.length;

        // Agregar filas de resumen
        Object.entries(grouped)
            .sort((a, b) => b[1] - a[1]) // Ordenar por cantidad descendente
            .forEach(([keyword, count]) => {
                const percentage = ((count / total) * 100).toFixed(1);
                summarySheet.addRow({
                    keyword,
                    count,
                    percentage: `${percentage}%`
                });
            });

        // Agregar fila de total
        summarySheet.addRow({
            keyword: 'TOTAL',
            count: total,
            percentage: '100%'
        });

        // Estilo del header
        summarySheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF70AD47' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });

        // Estilo de la fila de total
        const lastRow = summarySheet.lastRow;
        lastRow.eachCell(cell => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE7E6E6' }
            };
        });

        // ═══════════════════════════════════════════════════════════
        // ENVIAR ARCHIVO
        // ═══════════════════════════════════════════════════════════
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=autorespuestas_${id}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

        logger.info(`✅ Reporte de auto-respuestas generado para job ${id}: ${logs.length} registros`);
    } catch (err) {
        logger.error("❌ Error generando reporte de auto-respuestas:", err);
        res.status(500).json({ error: err.message });
    }
};