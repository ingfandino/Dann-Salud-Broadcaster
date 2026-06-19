/**
 * ============================================================
 * ARCA WORKER (arca-worker.js)
 * ============================================================
 * Proceso PM2 dedicado para el módulo de verificación de aportes ARCA.
 * Maneja el procesamiento de tareas ArcaAssistedTask para verificación
 * masiva de aportes de afiliados.
 * 
 * Separado del backend principal para:
 * - Aislamiento de logs de ARCA
 * - Reinicio independiente sin afectar API
 * - Supervisión limpia de solo ARCA
 */

"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("arca");
const ArcaAssistedTask = require("../models/ArcaAssistedTask");

// Servicios ARCA
const { runArcaTask } = require("../services/contributionSync.service");

// Validar entorno
if (!process.env.JWT_SECRET) {
    logger.error("FATAL: JWT_SECRET no definido");
    process.exit(1);
}

// Estado del worker
let isShuttingDown = false;
let currentTaskId = null;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info(`[ARCA-WORKER] Recibido ${signal}, iniciando shutdown graceful...`);
    
    if (currentTaskId) {
        logger.info(`[ARCA-WORKER] Liberando tarea ${currentTaskId}...`);
        try {
            await ArcaAssistedTask.findByIdAndUpdate(currentTaskId, {
                status: "pending",
                errorMessage: "Worker reiniciado - tarea liberada"
            });
        } catch (e) {
            logger.error("[ARCA-WORKER] Error al liberar tarea:", e.message);
        }
    }
    
    setTimeout(() => {
        logger.info("[ARCA-WORKER] Shutdown completo");
        process.exit(0);
    }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.error("[ARCA-WORKER] Uncaught Exception:", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("[ARCA-WORKER] Unhandled Rejection at:", promise, "reason:", reason);
});

/**
 * Busca y reclama la siguiente tarea pendiente
 */
async function claimNextTask() {
    try {
        const task = await ArcaAssistedTask.findOneAndUpdate(
            { status: "pending" },
            { 
                $set: { 
                    status: "running", 
                    startedAt: new Date(),
                    errorMessage: null
                } 
            },
            { new: true, sort: { requestedAt: 1 } }
        );
        return task;
    } catch (error) {
        logger.error("[ARCA-WORKER] Error al reclamar tarea:", error.message);
        return null;
    }
}

/**
 * Procesa una tarea ARCA
 */
async function processTask(task) {
    currentTaskId = String(task._id);
    logger.info(`[ARCA-WORKER] Procesando tarea ${task._id} (modo: ${task.mode})`);
    
    try {
        // Ejecutar la tarea
        await runArcaTask(task);
        
        logger.info(`[ARCA-WORKER] Tarea ${task._id} completada exitosamente`);
    } catch (error) {
        logger.error(`[ARCA-WORKER] Error procesando tarea ${task._id}:`, error.message);
        
        try {
            await ArcaAssistedTask.findByIdAndUpdate(task._id, {
                status: "error",
                errorMessage: error.message,
                completedAt: new Date()
            });
        } catch (e) {
            logger.error("[ARCA-WORKER] Error al actualizar estado de error:", e.message);
        }
    } finally {
        currentTaskId = null;
    }
}

/**
 * Loop principal del worker
 */
async function workerLoop() {
    if (isShuttingDown) return;
    
    try {
        const task = await claimNextTask();
        
        if (task) {
            await processTask(task);
            // Procesar inmediatamente siguiente si hay
            setImmediate(workerLoop);
        } else {
            // No hay tareas, esperar antes de revisar
            setTimeout(workerLoop, 5000);
        }
    } catch (error) {
        logger.error("[ARCA-WORKER] Error en loop principal:", error.message);
        setTimeout(workerLoop, 10000);
    }
}

/**
 * Inicialización del worker
 */
async function startWorker() {
    try {
        logger.info("🚀 [ARCA-WORKER] Iniciando worker de ARCA...");
        
        // Conectar a base de datos
        await connectDB();
        logger.info("✅ [ARCA-WORKER] Conexión a base de datos establecida");
        
        // Recuperar tareas huérfanas de caídas abruptas para reanudarlas
        try {
            const resetResult = await ArcaAssistedTask.updateMany(
                { status: "running" },
                { 
                    $set: { 
                        status: "pending", 
                        errorMessage: "Worker reiniciado. Tarea en cola para ser reanudada desde el último punto de guardado.",
                        completedAt: null
                    } 
                }
            );
            if (resetResult.modifiedCount > 0) {
                logger.warn(`⚠️ [ARCA-WORKER] Tareas huérfanas recuperadas: ${resetResult.modifiedCount}. Marcadas como pendientes para continuación.`);
            }
        } catch (e) {
            logger.error("[ARCA-WORKER] Error al limpiar tareas huérfanas en el inicio:", e.message);
        }
        
        // Health check periódico
        setInterval(() => {
            const memUsage = process.memoryUsage();
            logger.debug(`[ARCA-WORKER] Health check - Memoria: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }, 60000);
        
        // Iniciar loop de procesamiento
        logger.info("✅ [ARCA-WORKER] Worker iniciado, esperando tareas...");
        workerLoop();
        
    } catch (error) {
        logger.error("❌ [ARCA-WORKER] Error fatal al iniciar:", error);
        process.exit(1);
    }
}

// Iniciar el worker
startWorker();
