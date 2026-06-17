"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("affiliate-check-finalizer");
const {
    processNextAffiliateCheckFinalization,
    releaseExpiredAffiliateCheckFinalizations
} = require("../services/affiliateCheckFinalizer.service");

const WORKER_ID = process.env.AFFILIATE_CHECK_FINALIZER_WORKER_ID
    || process.env.PM2_PROCESS_NAME
    || `affiliate-check-finalizer:${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.AFFILIATE_CHECK_FINALIZER_POLL_MS || 3000);
const LEASE_MS = Number(process.env.AFFILIATE_CHECK_FINALIZER_LEASE_MS || 5 * 60 * 1000);
const RELEASE_INTERVAL_MS = Number(process.env.AFFILIATE_CHECK_FINALIZER_RELEASE_MS || 60 * 1000);

let isShuttingDown = false;
let isProcessing = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[AFFILIATE-CHECK-FINALIZER-WORKER] Recibido ${signal}`);
    const startedAt = Date.now();
    while (isProcessing && Date.now() - startedAt < 30000) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", error => {
    logger.error(`[AFFILIATE-CHECK-FINALIZER-WORKER] Uncaught exception: ${error.stack || error.message}`);
    process.exit(1);
});
process.on("unhandledRejection", reason => {
    logger.error(`[AFFILIATE-CHECK-FINALIZER-WORKER] Unhandled rejection: ${reason}`);
});

async function workerLoop() {
    if (isShuttingDown) return;
    try {
        isProcessing = true;
        const result = await processNextAffiliateCheckFinalization({
            workerId: WORKER_ID,
            leaseMs: LEASE_MS,
            now: new Date()
        });
        isProcessing = false;
        if (result) setImmediate(workerLoop);
        else setTimeout(workerLoop, POLL_INTERVAL_MS);
    } catch (error) {
        isProcessing = false;
        logger.error(`[AFFILIATE-CHECK-FINALIZER-WORKER] Error procesando fila: ${error.stack || error.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS);
    }
}

async function startWorker() {
    logger.info(`[AFFILIATE-CHECK-FINALIZER-WORKER] Iniciando workerId=${WORKER_ID}`);
    const isEnabled = String(process.env.AFFILIATE_CHECK_FINALIZER_WORKER_ENABLED || "false").toLowerCase() === "true";
    if (!isEnabled) {
        logger.info(`[AFFILIATE-CHECK-FINALIZER-WORKER] Worker deshabilitado (AFFILIATE_CHECK_FINALIZER_WORKER_ENABLED=false)`);
        process.exit(0);
        return;
    }
    await connectDB();
    await releaseExpiredAffiliateCheckFinalizations({ limit: 100 });
    setInterval(() => {
        releaseExpiredAffiliateCheckFinalizations({ limit: 100 }).catch(error => {
            logger.error(`[AFFILIATE-CHECK-FINALIZER-WORKER] Error liberando leases: ${error.message}`);
        });
    }, RELEASE_INTERVAL_MS);
    workerLoop();
}

startWorker().catch(error => {
    logger.error(`[AFFILIATE-CHECK-FINALIZER-WORKER] Error fatal: ${error.stack || error.message}`);
    process.exit(1);
});
