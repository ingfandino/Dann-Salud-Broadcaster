// backend/src/services/jobScheduler.js

const SendJob = require("../models/SendJob");
const { processJob } = require("./sendMessageService");
const { emitJobsUpdate } = require("../config/socket");
const logger = require("../utils/logger");

const CHECK_INTERVAL = 15 * 1000;

async function processJobs() {
    try {
        const now = new Date();

        const job = await SendJob.findOneAndUpdate(
            {
                status: "pendiente",
                scheduledFor: { $lte: now }
            },
            {
                $set: { status: "ejecutando", startedAt: new Date() }
            },
            {
                new: true, // Devuelve el documento actualizado
                sort: { scheduledFor: 1 } // Procesa el más antiguo primero
            }
        );

        if (job) {
            logger.info(`📌 Reclamado y lanzando job ${job._id} programado para ${job.scheduledFor}`);

            try {
                emitJobsUpdate(job);
            } catch (errEmit) {
                logger.warn("⚠️ No se pudo emitir jobs:update al reclamar job", { error: errEmit.message });
            }

            try {
                await processJob(job._id);
                const finishedJob = await SendJob.findById(job._id);
                if (finishedJob) {
                    emitJobsUpdate(finishedJob);
                }
            } catch (err) {
                logger.error(`❌ Error ejecutando job ${job._id}:`, err.message);
                await SendJob.findByIdAndUpdate(job._id, {
                    $set: { status: "fallido", finishedAt: new Date() }
                });
                try {
                    const failedJob = await SendJob.findById(job._id);
                    if (failedJob) {
                        emitJobsUpdate(failedJob);
                    }
                } catch (errEmit2) {
                    logger.warn("⚠️ No se pudo emitir jobs:update tras fallo", { error: errEmit2.message });
                }
            }
        }
    } catch (err) {
        logger.error("🔥 Error en el ciclo del scheduler", { error: err });
    }
}

async function reconcileJobs() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1h
    const res = await SendJob.updateMany(
        { status: "ejecutando", updatedAt: { $lt: cutoff } },
        { $set: { status: "pendiente" }, $inc: { attempts: 1 } }
    );
    if (res.modifiedCount) {
        logger.info(`🔄 Reconciliados ${res.modifiedCount} jobs colgados`);
    }
}

function startScheduler() {
    // 🚫 No arrancar en modo test
    if (process.env.NODE_ENV === "test") return;

    logger.info("⏰ Scheduler de Jobs iniciado...");
    reconcileJobs().catch(err => logger.error("Error en reconciliador", { error: err }));
    processJobs();
    setInterval(processJobs, CHECK_INTERVAL);
}

module.exports = { startScheduler };