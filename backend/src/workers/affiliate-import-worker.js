"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger");
const {
    claimAndProcessNextJob,
    failStaleProcessingJobs
} = require("../services/affiliateImport.service");

const POLL_INTERVAL_MS = Number(process.env.AFFILIATE_IMPORT_POLL_MS || 5000);
const STALE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
let isShuttingDown = false;
let isProcessing = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[AFFILIATE-IMPORT-WORKER] Recibido ${signal}`);

    const startedWaitingAt = Date.now();
    while (isProcessing && Date.now() - startedWaitingAt < 30000) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", error => {
    logger.error(`[AFFILIATE-IMPORT-WORKER] Uncaught exception: ${error.stack || error.message}`);
    process.exit(1);
});
process.on("unhandledRejection", reason => {
    logger.error(`[AFFILIATE-IMPORT-WORKER] Unhandled rejection: ${reason}`);
});

async function workerLoop() {
    if (isShuttingDown) return;

    try {
        isProcessing = true;
        const job = await claimAndProcessNextJob();
        isProcessing = false;

        if (job) {
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (error) {
        isProcessing = false;
        logger.error(`[AFFILIATE-IMPORT-WORKER] Error procesando trabajo: ${error.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS);
    }
}

async function startWorker() {
    logger.info("[AFFILIATE-IMPORT-WORKER] Iniciando...");
    await connectDB();

    const staleResult = await failStaleProcessingJobs();
    if (staleResult.modifiedCount > 0) {
        logger.warn(`[AFFILIATE-IMPORT-WORKER] ${staleResult.modifiedCount} trabajos interrumpidos marcados como fallidos`);
    }

    setInterval(() => {
        failStaleProcessingJobs().catch(error => {
            logger.error(`[AFFILIATE-IMPORT-WORKER] Error verificando trabajos interrumpidos: ${error.message}`);
        });
    }, STALE_CHECK_INTERVAL_MS);

    logger.info("[AFFILIATE-IMPORT-WORKER] Listo, esperando trabajos pendientes");
    workerLoop();
}

startWorker().catch(error => {
    logger.error(`[AFFILIATE-IMPORT-WORKER] Error fatal: ${error.stack || error.message}`);
    process.exit(1);
});
