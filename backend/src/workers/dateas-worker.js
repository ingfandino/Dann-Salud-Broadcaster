/**
 * ============================================================
 * DATEAS WORKER (dateas-worker.js)
 * ============================================================
 * Proceso PM2 dedicado para el módulo DATEAS (Base Nativa).
 * Maneja el bot de adquisición de datos desde Dateas/ARCA/CODEM.
 * 
 * Separado del backend principal para:
 * - Aislamiento de logs de DATEAS
 * - Reinicio independiente sin afectar API
 * - Supervisión limpia de solo DATEAS
 */

"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("dateas");
const DateasTask = require("../models/DateasTask");

// Servicios DATEAS
const { 
    enqueueTask, 
    stopBot, 
    togglePause, 
    getBotState, 
    getActiveTask,
    _runNextFromQueue  // Internal function to process queue
} = require("../services/dateasBot.service");

// Validar entorno
if (!process.env.JWT_SECRET) {
    logger.error("FATAL: JWT_SECRET no definido");
    process.exit(1);
}

// Estado del worker
let isShuttingDown = false;
let queueInterval = null;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info(`[DATEAS-WORKER] Recibido ${signal}, iniciando shutdown graceful...`);
    
    // Detener el bot si está corriendo
    try {
        stopBot();
        logger.info("[DATEAS-WORKER] Bot detenido");
    } catch (e) {
        logger.warn("[DATEAS-WORKER] Error al detener bot:", e.message);
    }
    
    // Limpiar intervalo
    if (queueInterval) {
        clearInterval(queueInterval);
    }
    
    // Marcar tarea actual como error si existe
    try {
        const { active } = await getActiveTask();
        if (active && active.status === "running") {
            await DateasTask.findByIdAndUpdate(active._id, {
                status: "error",
                errorMessage: "Worker reiniciado - tarea interrumpida",
                completedAt: new Date()
            });
            logger.info(`[DATEAS-WORKER] Tarea ${active._id} marcada como error`);
        }
    } catch (e) {
        logger.error("[DATEAS-WORKER] Error al actualizar tarea:", e.message);
    }
    
    setTimeout(() => {
        logger.info("[DATEAS-WORKER] Shutdown completo");
        process.exit(0);
    }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.error("[DATEAS-WORKER] Uncaught Exception:", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("[DATEAS-WORKER] Unhandled Rejection at:", promise, "reason:", reason);
});

/**
 * Loop de procesamiento de cola
 */
async function processQueue() {
    if (isShuttingDown) return;
    
    try {
        const state = getBotState();
        
        // Si no hay bot corriendo, intentar iniciar siguiente tarea
        if (!state.running) {
            await _runNextFromQueue();
        }
    } catch (error) {
        logger.error("[DATEAS-WORKER] Error procesando cola:", error.message);
    }
}

/**
 * Inicialización del worker
 */
async function startWorker() {
    try {
        logger.info("🚀 [DATEAS-WORKER] Iniciando worker de DATEAS...");
        
        // Conectar a base de datos
        await connectDB();
        logger.info("✅ [DATEAS-WORKER] Conexión a base de datos establecida");
        
        // Iniciar loop de procesamiento de cola
        // Revisar cada 5 segundos si hay tareas pendientes
        queueInterval = setInterval(processQueue, 5000);
        
        // Health check periódico
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const state = getBotState();
            logger.debug(
                `[DATEAS-WORKER] Health check - ` +
                `Memoria: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB, ` +
                `Running: ${state.running}, Paused: ${state.paused}`
            );
        }, 60000);
        
        // Intento inicial de procesar cola
        await processQueue();
        
        logger.info("✅ [DATEAS-WORKER] Worker iniciado y operativo");
        
    } catch (error) {
        logger.error("❌ [DATEAS-WORKER] Error fatal al iniciar:", error);
        process.exit(1);
    }
}

// Iniciar el worker
startWorker();
