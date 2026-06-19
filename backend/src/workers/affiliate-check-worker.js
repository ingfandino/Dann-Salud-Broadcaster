"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("affiliate-check");
const {
    claimAndProcessNextAffiliateCheckJob,
    failStaleProcessingAffiliateCheckJobs
} = require("../services/affiliateCheckProcessor.service");

const POLL_INTERVAL_MS = Number(process.env.AFFILIATE_CHECK_POLL_MS || 5000);
const STALE_CHECK_INTERVAL_MS = 10 * 60 * 1000;

let isShuttingDown = false;
let isProcessing = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[AFFILIATE-CHECK-WORKER] Recibido ${signal}`);

    const startedWaitingAt = Date.now();
    while (isProcessing && Date.now() - startedWaitingAt < 30000) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", error => {
    logger.error(`[AFFILIATE-CHECK-WORKER] Uncaught exception: ${error.stack || error.message}`);
    process.exit(1);
});
process.on("unhandledRejection", reason => {
    logger.error(`[AFFILIATE-CHECK-WORKER] Unhandled rejection: ${reason}`);
});

async function workerLoop() {
    if (isShuttingDown) return;

    try {
        isProcessing = true;
        const job = await claimAndProcessNextAffiliateCheckJob();
        isProcessing = false;

        if (job) {
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (error) {
        isProcessing = false;
        logger.error(`[AFFILIATE-CHECK-WORKER] Error procesando trabajo: ${error.stack || error.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS);
    }
}

async function startWorker() {
    logger.info("[AFFILIATE-CHECK-WORKER] Iniciando...");
    await connectDB();

    const staleResult = await failStaleProcessingAffiliateCheckJobs();
    if (staleResult.modifiedCount > 0) {
        logger.warn(`[AFFILIATE-CHECK-WORKER] ${staleResult.modifiedCount} trabajos interrumpidos marcados como fallidos`);
    }

    setInterval(() => {
        failStaleProcessingAffiliateCheckJobs().catch(error => {
            logger.error(`[AFFILIATE-CHECK-WORKER] Error verificando trabajos interrumpidos: ${error.message}`);
        });
    }, STALE_CHECK_INTERVAL_MS);

    logger.info("[AFFILIATE-CHECK-WORKER] Listo, esperando trabajos pendientes");
    workerLoop();
}

startWorker().catch(error => {
    logger.error(`[AFFILIATE-CHECK-WORKER] Error fatal: ${error.stack || error.message}`);
    process.exit(1);
});
