// src/controllers/reportsController.js

const Report = require("../models/Report");
const logger = require("../utils/logger");

const getReports = async (req, res) => {
    try {
        const { startDate, endDate, asesor, grupo, q } = req.query;

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

        const reports = await Report.find(filter).sort({ fecha: -1 });

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

module.exports = { getReports, createReport };