"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("affiliate-check-expiration-worker");
const { expireStaleAssignments } = require("../services/affiliateCheckExpiration.service");

const ENABLED = String(process.env.AFFILIATE_CHECK_EXPIRATION_WORKER_ENABLED || "false").toLowerCase() === "true";
const INTERVAL_MS = Number(process.env.AFFILIATE_CHECK_EXPIRATION_INTERVAL_MS || 60000);
const BATCH_SIZE = Number(process.env.AFFILIATE_CHECK_EXPIRATION_BATCH_SIZE || 100);

let isRunning = false;
let isShuttingDown = false;
let timer = null;

async function runBatch() {
    if (isRunning || isShuttingDown) return null;
    isRunning = true;
    try {
        const stats = await expireStaleAssignments({ limit: BATCH_SIZE });
        logger.info(`[AFFILIATE-CHECK-EXPIRATION-WORKER] scanned= eligible= expired= skippedNotDue= skippedChanged= alreadyExpired= operationalStateUpdated= operationalStateFailed= errors= durationMs=`);
        return stats;
    } catch (error) {
        logger.error(`[AFFILIATE-CHECK-EXPIRATION-WORKER] Batch failed: ${error.stack || error.message}`);
        return null;
    } finally {
        isRunning = false;
    }
}

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    if (timer) clearInterval(timer);
    logger.info(`[AFFILIATE-CHECK-EXPIRATION-WORKER] Received ${signal}`);
    const deadline = Date.now() + 30000;
    while (isRunning && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    process.exit(0);
}

async function startWorker() {
    if (!ENABLED) {
        logger.info("[AFFILIATE-CHECK-EXPIRATION-WORKER] Disabled (AFFILIATE_CHECK_EXPIRATION_WORKER_ENABLED=false)");
        return;
    }
    await connectDB();
    await runBatch();
    timer = setInterval(runBatch, Math.max(1000, INTERVAL_MS));
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

if (require.main === module) {
    startWorker().catch(error => {
        logger.error(`[AFFILIATE-CHECK-EXPIRATION-WORKER] Fatal startup error: ${error.stack || error.message}`);
        process.exit(1);
    });
}

module.exports = {
    BATCH_SIZE,
    ENABLED,
    INTERVAL_MS,
    runBatch,
    startWorker
};
