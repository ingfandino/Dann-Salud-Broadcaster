// src/controllers/logController.js

const { getLogs, exportLogs } = require("../services/logService");
const { Parser } = require("json2csv");
const ExcelJS = require("exceljs");

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

// 🔹 Exportar logs en Excel (.xlsx)
exports.exportLogsExcel = async (_req, res) => {
    try {
        const logs = await exportLogs();

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Logs");

        // Definir columnas
        worksheet.columns = [
            { header: "ID", key: "_id", width: 24 },
            { header: "Tipo", key: "tipo", width: 15 },
            { header: "Mensaje", key: "mensaje", width: 50 },
            { header: "Metadata", key: "metadata", width: 50 },
            { header: "Creado", key: "createdAt", width: 22 },
            { header: "Actualizado", key: "updatedAt", width: 22 },
        ];

        // Añadir filas
        logs.forEach(log => {
            worksheet.addRow({
                _id: log._id.toString(),
                tipo: log.tipo,
                mensaje: log.mensaje,
                metadata: JSON.stringify(log.metadata || {}),
                createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : "",
                updatedAt: log.updatedAt ? new Date(log.updatedAt).toISOString() : "",
            });
        });

        // Formato de cabecera
        worksheet.getRow(1).eachCell(cell => {
            cell.font = { bold: true };
        });

        // Generar y enviar
        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader("Content-Disposition", "attachment; filename=logs.xlsx");

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("❌ Error exportando logs Excel:", err);
        res.status(500).json({ error: err.message });
    }
};