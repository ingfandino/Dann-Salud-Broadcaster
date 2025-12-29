/**
 * ============================================================
 * SERVICIO DE MÉTRICAS (metricsService.js)
 * ============================================================
 * Recolecta y emite métricas de mensajería en tiempo real.
 */

const Message = require("../models/Message");
const SendJob = require("../models/SendJob");
const { emitMetrics } = require("../config/socket");
const logger = require("../utils/logger");

/** Recolecta métricas de mensajes y jobs */
async function collectMetrics() {
    // Mensajes
    const totalEnviados = await Message.countDocuments({ status: "enviado" });
    const totalFallidos = await Message.countDocuments({ status: "fallido" });
    const totalPendientes = await Message.countDocuments({ status: "pendiente" });
    const totalRespuestas = await Message.countDocuments({ direction: "inbound" });

    const total = totalEnviados + totalFallidos + totalPendientes;
    const porcentajeExito = total > 0 ? ((totalEnviados / total) * 100).toFixed(2) : 0;

    // Jobs (usando los estados reales del modelo SendJob)
    const jobsPendientes = await SendJob.countDocuments({ status: "pendiente" });
    const jobsEjecutando = await SendJob.countDocuments({ status: "ejecutando" });
    const jobsCompletados = await SendJob.countDocuments({ status: "completado" });
    const jobsFallidos = await SendJob.countDocuments({ status: "fallido" });
    const jobsCancelados = await SendJob.countDocuments({ status: "cancelado" });

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
            completados: jobsCompletados,
            fallidos: jobsFallidos,
            cancelados: jobsCancelados
        },
    };
}

async function pushMetrics() {
    try {
        const metrics = await collectMetrics();
        emitMetrics("metrics:update", metrics);
        logger.info("📊 Métricas emitidas:", metrics);
    } catch (err) {
        logger.error("❌ Error recolectando métricas:", err);
    }
}

module.exports = { collectMetrics, pushMetrics };