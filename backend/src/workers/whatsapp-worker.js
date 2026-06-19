/**
 * ============================================================
 * WHATSAPP WORKER (whatsapp-worker.js)
 * ============================================================
 * Proceso PM2 dedicado para el módulo de WhatsApp.
 * Maneja conexiones de WhatsApp, envío de mensajes masivos,
 * y procesamiento de jobs de mensajería.
 * 
 * Separado del backend principal para:
 * - Aislamiento de logs operacionales
 * - Reinicio independiente
 * - Supervisión limpia de solo WhatsApp
 */

"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("whatsapp");

// WhatsApp specific services
const { initWhatsappClient, whatsappEvents } = require("../config/whatsapp");
const { startScheduler } = require("../services/jobScheduler");
const { startRecoveryScheduler } = require("../services/recoveryScheduler");
const { startAuditReminderCron } = require("../services/auditReminderCron");
const { startAffiliateExportCron } = require("../services/affiliateExportCron");
const { startAuditFollowUpScheduler } = require("../services/auditFollowUpScheduler");

// Cron jobs específicos de WhatsApp/notificaciones
require("../cron/recoveryJob");
require("../cron/leadAssignmentRecycleJob");
require("../cron/phoneRechargeNotificationJob");

const initScheduledJobs = require("../cron/recyclerJob");

// Inicializar tareas programadas
initScheduledJobs();

// Validar entorno
if (!process.env.JWT_SECRET) {
    logger.error("FATAL: JWT_SECRET no definido");
    process.exit(1);
}

// Estado del worker
let isShuttingDown = false;

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    logger.info(`[WHATSAPP-WORKER] Recibido ${signal}, iniciando shutdown graceful...`);
    
    // Dar tiempo a que los jobs activos terminen (máx 10s)
    setTimeout(() => {
        logger.info("[WHATSAPP-WORKER] Shutdown completo");
        process.exit(0);
    }, 10000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Manejo de errores no capturados
process.on("uncaughtException", (err) => {
    logger.error("[WHATSAPP-WORKER] Uncaught Exception:", err);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    logger.error("[WHATSAPP-WORKER] Unhandled Rejection at:", promise, "reason:", reason);
});

/**
 * Inicialización del worker
 */
async function startWorker() {
    try {
        logger.info("🚀 [WHATSAPP-WORKER] Iniciando worker de WhatsApp...");
        
        // Conectar a base de datos
        await connectDB();
        logger.info("✅ [WHATSAPP-WORKER] Conexión a base de datos establecida");
        
        // Inicializar cliente WhatsApp
        await initWhatsappClient();
        logger.info("✅ [WHATSAPP-WORKER] Cliente WhatsApp inicializado");
        
        // Iniciar schedulers
        startScheduler();
        logger.info("✅ [WHATSAPP-WORKER] Job scheduler iniciado");
        
        startRecoveryScheduler();
        logger.info("✅ [WHATSAPP-WORKER] Recovery scheduler iniciado");
        
        startAuditReminderCron();
        logger.info("✅ [WHATSAPP-WORKER] Audit reminder cron iniciado");
        
        startAffiliateExportCron();
        logger.info("✅ [WHATSAPP-WORKER] Affiliate export cron iniciado");
        
        startAuditFollowUpScheduler();
        logger.info("✅ [WHATSAPP-WORKER] Audit follow-up scheduler iniciado");
        
        // Mantener el proceso vivo
        setInterval(() => {
            const memUsage = process.memoryUsage();
            logger.debug(`[WHATSAPP-WORKER] Health check - Memoria: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
        }, 60000);
        
        logger.info("✅ [WHATSAPP-WORKER] Worker completamente iniciado y operativo");
        
    } catch (error) {
        logger.error("❌ [WHATSAPP-WORKER] Error fatal al iniciar:", error);
        process.exit(1);
    }
}

// Iniciar el worker
startWorker();
