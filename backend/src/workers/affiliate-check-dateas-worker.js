"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("affiliate-check-dateas");
const {
    claimAffiliateCheckStage,
    releaseExpiredAffiliateCheckStages
} = require("../services/affiliateCheckStage.service");
const {
    createDateasSession,
    processClaimedAffiliateCheckDateasStage
} = require("../services/affiliateCheckDateasStage.service");

const WORKER_ID = process.env.AFFILIATE_CHECK_DATEAS_WORKER_ID
    || process.env.PM2_PROCESS_NAME
    || `affiliate-check-dateas:${process.pid}`;
const POLL_INTERVAL_MS = Number(process.env.AFFILIATE_CHECK_DATEAS_POLL_MS || 5000);
const LEASE_MS = Number(process.env.AFFILIATE_CHECK_DATEAS_LEASE_MS || 5 * 60 * 1000);
const RELEASE_INTERVAL_MS = Number(process.env.AFFILIATE_CHECK_DATEAS_RELEASE_MS || 60 * 1000);

let isShuttingDown = false;
let isProcessing = false;
let session = null;

async function closeSession() {
    if (!session) return;
    try {
        await session.close();
    } catch (error) {
        logger.warn(`[AFFILIATE-CHECK-DATEAS-WORKER] Error cerrando sesión: ${error.message}`);
    }
    session = null;
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[AFFILIATE-CHECK-DATEAS-WORKER] Recibido ${signal}`);
    const startedAt = Date.now();
    while (isProcessing && Date.now() - startedAt < 30000) {
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    await closeSession();
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", error => {
    logger.error(`[AFFILIATE-CHECK-DATEAS-WORKER] Uncaught exception: ${error.stack || error.message}`);
    process.exit(1);
});
process.on("unhandledRejection", reason => {
    logger.error(`[AFFILIATE-CHECK-DATEAS-WORKER] Unhandled rejection: ${reason}`);
});

async function ensureSession() {
    if (!session) session = await createDateasSession();
    return session;
}

async function workerLoop() {
    if (isShuttingDown) return;
    try {
        isProcessing = true;
        const row = await claimAffiliateCheckStage({
            stage: "dateas",
            workerId: WORKER_ID,
            leaseMs: LEASE_MS,
            now: new Date()
        });
        const result = row
            ? await processClaimedAffiliateCheckDateasStage({
                row,
                workerId: WORKER_ID,
                leaseMs: LEASE_MS,
                session: await ensureSession()
            })
            : null;
        isProcessing = false;
        if (result) setImmediate(workerLoop);
        else setTimeout(workerLoop, POLL_INTERVAL_MS);
    } catch (error) {
        isProcessing = false;
        logger.error(`[AFFILIATE-CHECK-DATEAS-WORKER] Error procesando stage: ${error.stack || error.message}`);
        await closeSession();
        setTimeout(workerLoop, POLL_INTERVAL_MS);
    }
}

async function startWorker() {
    logger.info(`[AFFILIATE-CHECK-DATEAS-WORKER] Iniciando workerId=${WORKER_ID}`);
    const isEnabled = String(process.env.AFFILIATE_CHECK_DATEAS_WORKER_ENABLED || "false").toLowerCase() === "true";
    if (!isEnabled) {
        logger.info(`[AFFILIATE-CHECK-DATEAS-WORKER] Worker deshabilitado (AFFILIATE_CHECK_DATEAS_WORKER_ENABLED=false)`);
        process.exit(0);
        return;
    }
    await connectDB();
    await releaseExpiredAffiliateCheckStages({ stage: "dateas", limit: 100 });
    setInterval(() => {
        releaseExpiredAffiliateCheckStages({ stage: "dateas", limit: 100 }).catch(error => {
            logger.error(`[AFFILIATE-CHECK-DATEAS-WORKER] Error liberando leases: ${error.message}`);
        });
    }, RELEASE_INTERVAL_MS);
    workerLoop();
}

startWorker().catch(error => {
    logger.error(`[AFFILIATE-CHECK-DATEAS-WORKER] Error fatal: ${error.stack || error.message}`);
    process.exit(1);
});
