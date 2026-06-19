"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger = require("../utils/logger").getLogger("padron-recovery-worker");
const {
    getPadronRecoveryConfig,
    runPadronRecoveryOnce
} = require("../services/padronRecovery.service");

const WORKER_ID = process.env.PADRON_RECOVERY_WORKER_ID
    || process.env.PM2_PROCESS_NAME
    || `padron-recovery:${process.pid}`;

async function main() {
    const config = getPadronRecoveryConfig();
    if (!config.enabled) {
        logger.info("[PADRON-RECOVERY-WORKER] Deshabilitado (PADRON_RECOVERY_ENABLED=false)");
        return;
    }

    await connectDB();
    const stats = await runPadronRecoveryOnce({ workerId: WORKER_ID });
    logger.info(`[PADRON-RECOVERY-WORKER] Ejecución finalizada ${JSON.stringify(stats)}`);
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        logger.error(`[PADRON-RECOVERY-WORKER] Error fatal: ${error.stack || error.message}`);
        process.exit(1);
    });
