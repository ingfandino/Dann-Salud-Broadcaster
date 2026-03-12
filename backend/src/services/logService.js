/**
 * ============================================================
 * SERVICIO DE LOGS (logService.js)
 * ============================================================
 * Persiste logs en MongoDB y emite en tiempo real vía Socket.IO.
 */

const Log = require("../models/Log");
const { emitNewLog } = require("../config/socket");
const logger = require("../utils/logger");

/** Guarda log en BD y emite en tiempo real */
async function addLog({ tipo = "info", mensaje, metadata = {} }) {
    try {
        const log = new Log({ tipo, mensaje, metadata });
        await log.save();

        // Emitir evento en tiempo real
        try {
            emitNewLog(log);
        } catch (emitErr) {
            logger.warn("⚠️ No se pudo emitir log en tiempo real", { error: emitErr });
        }

        return log;
    } catch (err) {
        logger.error("❌ Error guardando log", { error: err });
        throw err;
    }
}

// Consultar logs
async function getLogs({ limit = 100, tipo, from, to } = {}) {
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