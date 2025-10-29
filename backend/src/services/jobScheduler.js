// backend/src/services/jobScheduler.js

const SendJob = require("../models/SendJob");
const { processJob } = require("./sendMessageService");
const { emitJobsUpdate } = require("../config/socket");
const logger = require("../utils/logger");

const CHECK_INTERVAL = 15 * 1000;
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_JOBS || 4);
const activeJobs = new Set();

async function claimOneJob() {
    const now = new Date();
    const job = await SendJob.findOneAndUpdate(
        {
            status: "pendiente",
            scheduledFor: { $lte: now }
        },
        { $set: { status: "ejecutando", startedAt: new Date() } },
        { new: true, sort: { scheduledFor: 1 } }
    );
    return job;
}

async function processJobs() {
    try {
        // Rellenar capacidad disponible
        while (activeJobs.size < MAX_CONCURRENT) {
            const job = await claimOneJob();
            if (!job) break;

            activeJobs.add(String(job._id));
            logger.info(`📌 Reclamado y lanzando job ${job._id} (activos: ${activeJobs.size}/${MAX_CONCURRENT})`);

            try { emitJobsUpdate(job); } catch (e) {
                logger.warn("⚠️ No se pudo emitir jobs:update al reclamar job", { error: e?.message });
            }

            // Lanzar en background, liberar slot al terminar
            (async () => {
                try {
                    await processJob(job._id);
                } catch (err) {
                    logger.error(`❌ Error ejecutando job ${job._id}: ${err?.message}`);
                    try { await SendJob.findByIdAndUpdate(job._id, { $set: { status: "fallido", finishedAt: new Date() } }); } catch {}
                } finally {
                    try {
                        const j = await SendJob.findById(job._id);
                        if (j) emitJobsUpdate(j);
                    } catch (emitErr) {
                        logger.warn("⚠️ No se pudo emitir jobs:update al finalizar", { error: emitErr?.message });
                    }
                    activeJobs.delete(String(job._id));
                }
            })();
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