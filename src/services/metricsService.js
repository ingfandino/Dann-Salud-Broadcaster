// src/services/metricsService.js

const Message = require("../models/Message");
const Job = require("../models/Job");
const { emitMetrics } = require("../config/socket");

async function collectMetrics() {
    const totalEnviados = await Message.countDocuments({ status: "enviado" });
    const totalFallidos = await Message.countDocuments({ status: "fallido" });
    const totalPendientes = await Message.countDocuments({ status: "pendiente" });
    const totalRespuestas = await Message.countDocuments({ direction: "inbound" });
    const total = totalEnviados + totalFallidos + totalPendientes;
    const porcentajeExito = total > 0 ? ((totalEnviados / total) * 100).toFixed(2) : 0;

    const jobsPendientes = await Job.countDocuments({ status: "pendiente" });
    const jobsEjecutando = await Job.countDocuments({ status: "ejecutando" });

    return {
        mensajes: {
            total,
            enviados: totalEnviados,
            fallidos: totalFallidos,
            pendientes: totalPendientes,
            porcentajeExito,
            respuestas: totalRespuestas
        },
        jobs: {
            pendientes: jobsPendientes,
            ejecutando: jobsEjecutando,
        },
    };
}

async function pushMetrics() {
    try {
        const metrics = await collectMetrics();
        emitMetrics("metrics:update", metrics);
        console.log("📊 Métricas emitidas:", metrics);
    } catch (err) {
        console.error("❌ Error recolectando métricas:", err);
    }
}

module.exports = { collectMetrics, pushMetrics };