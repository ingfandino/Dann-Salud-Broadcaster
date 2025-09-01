// src/controllers/logController.js

const { getLogs, exportLogs } = require("../services/logService");
const { Parser } = require("json2csv");

// 🔹 Listar logs con filtros
exports.listLogs = async (req, res) => {
    try {
        const { tipo, limit, from, to } = req.query;

        const logs = await getLogs({
            tipo,
            limit: parseInt(limit) || 100,
            from,
            to
        });

        res.json(logs);
    } catch (err) {
        console.error("❌ Error listando logs:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Exportar logs en JSON
exports.exportLogsJSON = async (_req, res) => {
    try {
        const logs = await exportLogs();
        res.json(logs);
    } catch (err) {
        console.error("❌ Error exportando logs JSON:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔹 Exportar logs en CSV
exports.exportLogsCSV = async (_req, res) => {
    try {
        const logs = await exportLogs();

        const fields = ["_id", "tipo", "mensaje", "metadata", "createdAt", "updatedAt"];
        const parser = new Parser({ fields });
        const csv = parser.parse(logs);

        res.header("Content-Type", "text/csv");
        res.attachment("logs.csv");
        return res.send(csv);
    } catch (err) {
        console.error("❌ Error exportando logs CSV:", err);
        res.status(500).json({ error: err.message });
    }
};