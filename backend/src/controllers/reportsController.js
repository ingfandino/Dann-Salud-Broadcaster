// src/controllers/reportsController.js

const Report = require("../models/Report");
const SendJob = require("../models/SendJob");
const Message = require("../models/Message");
const Contact = require("../models/Contact");
const User = require("../models/User");
const logger = require("../utils/logger");

const getReports = async (req, res) => {
    try {
        const { startDate, endDate, asesor, grupo, q, jobId } = req.query;

        let filter = {};

        if (startDate) {
            filter.fecha = { ...filter.fecha, $gte: new Date(startDate) };
        }
        if (endDate) {
            filter.fecha = { ...filter.fecha, $lte: new Date(endDate) };
        }
        if (asesor) {
            filter.asesorNombre = { $regex: asesor, $options: "i" };
        }
        if (grupo) {
            filter.grupo = { $regex: grupo, $options: "i" };
        }
        if (q) {
            filter.$or = [
                { nombre: { $regex: q, $options: "i" } },
                { telefono: { $regex: q, $options: "i" } },
            ];
        }
        // ✅ CORRECCIÓN: Filtrar por campaña específica
        if (jobId) {
            filter.job = jobId;
        }

        const reports = await Report.find(filter)
            .populate('job', 'name')
            .populate('createdBy', 'nombre numeroEquipo')
            .sort({ fecha: -1 });

        res.json(reports);
    } catch (err) {
        logger.error("❌ Error en getReports:", err);
        res.status(500).json({ msg: "Error obteniendo reportes" });
    }
};

const createReport = async (req, res) => {
    try {
        const report = new Report(req.body);
        await report.save();
        res.status(201).json(report);
    } catch (err) {
        logger.error("❌ Error en createReport:", err);
        res.status(500).json({ msg: "Error creando reporte" });
    }
};

// ✅ CORRECCIÓN: Generar reportes automáticamente desde una campaña completada
const generateReportsFromJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await SendJob.findById(jobId).populate('createdBy contacts');
        if (!job) {
            return res.status(404).json({ error: "Campaña no encontrada" });
        }

        const messages = await Message.find({ job: jobId }).populate('contact');
        
        const reports = [];
        for (const msg of messages) {
            const contact = msg.contact;
            if (!contact) continue;

            // Verificar si ya existe un reporte para este mensaje
            const existing = await Report.findOne({ message: msg._id });
            if (existing) continue;

            const report = new Report({
                fecha: msg.timestamp || msg.createdAt,
                telefono: contact.telefono || "",
                nombre: contact.nombre || "Sin nombre",
                obraSocial: contact.obraSocial || "",
                respondio: msg.respondio || false,
                asesorNombre: job.createdBy?.nombre || "N/A",
                grupo: job.createdBy?.numeroEquipo || "N/A",
                job: job._id,
                contact: contact._id,
                message: msg._id,
                createdBy: job.createdBy?._id,
                campaignName: job.name,
                messageStatus: msg.status,
            });

            await report.save();
            reports.push(report);
        }

        logger.info(`✅ Generados ${reports.length} reportes para campaña ${job.name}`);
        res.json({ 
            success: true, 
            generated: reports.length,
            jobName: job.name,
            reports 
        });
    } catch (err) {
        logger.error("❌ Error en generateReportsFromJob:", err);
        res.status(500).json({ error: "Error generando reportes", details: err.message });
    }
};

// ✅ CORRECCIÓN: Obtener resumen de reportes por campaña
const getReportsSummary = async (req, res) => {
    try {
        const summary = await Report.aggregate([
            {
                $group: {
                    _id: "$job",
                    total: { $sum: 1 },
                    respondieron: { $sum: { $cond: ["$respondio", 1, 0] } },
                    enviados: { $sum: { $cond: [{ $eq: ["$messageStatus", "enviado"] }, 1, 0] } },
                    fallidos: { $sum: { $cond: [{ $eq: ["$messageStatus", "fallido"] }, 1, 0] } },
                }
            },
            {
                $lookup: {
                    from: "sendjobs",
                    localField: "_id",
                    foreignField: "_id",
                    as: "jobInfo"
                }
            },
            { $unwind: { path: "$jobInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    campaignName: "$jobInfo.name",
                    total: 1,
                    respondieron: 1,
                    enviados: 1,
                    fallidos: 1,
                    tasaRespuesta: { 
                        $multiply: [
                            { $divide: ["$respondieron", "$total"] }, 
                            100
                        ] 
                    }
                }
            },
            { $sort: { total: -1 } }
        ]);

        res.json(summary);
    } catch (err) {
        logger.error("❌ Error en getReportsSummary:", err);
        res.status(500).json({ error: "Error obteniendo resumen" });
    }
};

module.exports = { 
    getReports, 
    createReport, 
    generateReportsFromJob,
    getReportsSummary 
};