// src/services/logService.js

const Log = require("../models/Log");

// Guardar log en BD
async function addLog({ tipo = "info", mensaje, metadata = {} }) {
    try {
        const log = new Log({ tipo, mensaje, metadata });
        await log.save();
        return log;
    } catch (err) {
        console.error("❌ Error guardando log:", err);
    }
}

// Consultar logs
async function getLogs({ limit = 100, tipo, from, to }) {
    const query = {};
    if (tipo) query.tipo = tipo;
    if (from || to) {
        query.createdAt = {};
        if (from) query.createdAt.$gte = new Date(from);
        if (to) query.createdAt.$lte = new Date(to);
    }

    return Log.find(query).sort({ createdAt: -1 }).limit(limit);
}

// Exportar logs (JSON plano)
async function exportLogs() {
    const logs = await Log.find().sort({ createdAt: -1 });
    return logs.map(l => l.toObject());
}

module.exports = { addLog, getLogs, exportLogs };