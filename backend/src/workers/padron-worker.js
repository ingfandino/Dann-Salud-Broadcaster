/**
 * ============================================================
 * PADRON WORKER (padron-worker.js)
 * ============================================================
 * Proceso PM2 dedicado para el módulo de verificación de Padrón (SSSalud).
 * Maneja el procesamiento de verificación de afiliados en el padrón
 * de obra social.
 * 
 * Separado del backend principal para:
 * - Aislamiento de logs de Padrón
 * - Reinicio independiente sin afectar API
 * - Supervisión limpia de solo Padrón
 */

"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("padron");
const AffiliateContribution = require("../models/AffiliateContribution");

// Servicios Padrón
const { syncPadronBatch } = require("../services/padronSync.service");

// Validar entorno
if (!process.env.JWT_SECRET) {
    logger.error("FATAL: JWT_SECRET no definido");
    process.exit(1);
}

// Estado del worker
let isShuttingDown = false;
let isProcessing = false;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info(`[PADRON-WORKER] Recibido ${signal}, iniciando shutdown graceful...`);
    
    // Esperar a que termine el procesamiento actual (máx 30s)
    let waitTime = 0;
    const maxWait = 30000;
    
    while (isProcessing && waitTime < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
        waitTime += 1000;
        logger.info(`[PADRON-WORKER] Esperando procesamiento actual... (${waitTime/1000}s)`);
    }
    
    logger.info("[PADRON-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.error("[PADRON-WORKER] Uncaught Exception:", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("[PADRON-WORKER] Unhandled Rejection at:", promise, "reason:", reason);
});

/**
 * Obtiene el siguiente batch de afiliados pendientes de verificación de padrón
 */
async function getPendingPadronBatch() {
    try {
        // Buscar afiliados que necesitan verificación de padrón
        // Criterios: canSell es null o tiene padron.status pendiente
        const pending = await AffiliateContribution.find({
            $or: [
                { canSell: null },
                { "padron.status": { $in: [null, "pending", "captcha_failed", "error"] } }
            ],
            // Solo si tienen aportes verificados (ARCA success)
            "verification.status": "success",
            last3ClosedMonthsPaidCount: { $gt: 0 }
        })
        .limit(10)
        .select("affiliateId cuil")
        .lean();
        
        return pending;
    } catch (error) {
        logger.error("[PADRON-WORKER] Error obteniendo batch pendiente:", error.message);
        return [];
    }
}

/**
 * Procesa un batch de verificación de padrón
 */
async function processPadronBatch() {
    if (isShuttingDown) return;
    
    isProcessing = true;
    
    try {
        const batch = await getPendingPadronBatch();
        
        if (batch.length === 0) {
            isProcessing = false;
            return;
        }
        
        logger.info(`[PADRON-WORKER] Procesando batch de ${batch.length} afiliados...`);
        
        // FIX: Construir objetos con _id y cuil para syncPadronBatch
        // El servicio espera: Array<{ _id: string, cuil: string }>
        const affiliates = batch
            .filter(b => b.cuil) // Defensivo: solo procesar si tienen CUIL
            .map(b => ({ 
                _id: String(b.affiliateId), 
                cuil: b.cuil 
            }));
        
        if (affiliates.length === 0) {
            logger.warn("[PADRON-WORKER] Batch tenía registros pero ninguno con CUIL válido");
            isProcessing = false;
            return;
        }
        
        // Procesar usando el servicio existente
        const results = await syncPadronBatch(affiliates);
        
        logger.info(`[PADRON-WORKER] Batch completado - Procesados: ${results.processed}, Éxitos: ${results.found_active || 0}, No encontrados: ${results.not_found || 0}, CAPTCHA: ${results.captcha_failed || 0}`);
        
    } catch (error) {
        logger.error("[PADRON-WORKER] Error procesando batch:", error.message);
    } finally {
        isProcessing = false;
    }
}

/**
 * Loop principal del worker
 */
async function workerLoop() {
    if (isShuttingDown) return;
    
    try {
        await processPadronBatch();
        
        // Esperar antes de siguiente iteración
        const delay = isProcessing ? 5000 : 15000;
        setTimeout(workerLoop, delay);
        
    } catch (error) {
        logger.error("[PADRON-WORKER] Error en loop principal:", error.message);
        setTimeout(workerLoop, 30000);
    }
}

/**
 * Inicialización del worker
 */
async function startWorker() {
    try {
        logger.info("🚀 [PADRON-WORKER] Iniciando worker de Padrón...");
        
        // Conectar a base de datos
        await connectDB();
        logger.info("✅ [PADRON-WORKER] Conexión a base de datos establecida");
        
        // Health check periódico
        setInterval(() => {
            const memUsage = process.memoryUsage();
            logger.debug(`[PADRON-WORKER] Health check - Memoria: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }, 60000);
        
        // Iniciar loop de procesamiento
        logger.info("✅ [PADRON-WORKER] Worker iniciado, esperando batches...");
        workerLoop();
        
    } catch (error) {
        logger.error("❌ [PADRON-WORKER] Error fatal al iniciar:", error);
        process.exit(1);
    }
}

// Iniciar el worker
startWorker();
