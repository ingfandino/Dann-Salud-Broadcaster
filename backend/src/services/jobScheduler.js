// backend/src/services/jobScheduler.js

const SendJob = require("../models/SendJob");
const { processJob } = require("./sendMessageService");
const { emitJobsUpdate } = require("../config/socket");
const logger = require("../utils/logger");

const CHECK_INTERVAL = 15 * 1000;
// ✅ Concurrencia optimizada: 8 jobs simultáneos para mejor throughput
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_JOBS || 8);
const activeJobs = new Set();
const jobStartTimes = new Map(); // Track cuando empezó cada job

// ✅ CORRECCIÓN: Monitoreo de salud del sistema
let systemOverloaded = false;
let lastHealthCheck = Date.now();

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

// ✅ CORRECCIÓN: Verificar salud del sistema
function checkSystemHealth() {
    const now = Date.now();

    // Check cada 30 segundos
    if (now - lastHealthCheck < 30000) return;
    lastHealthCheck = now;

    // Verificar si hay jobs atascados (más de 1 hora ejecutando)
    let stuckJobs = 0;
    for (const [jobId, startTime] of jobStartTimes.entries()) {
        if (now - startTime > 3600000) { // 1 hora
            stuckJobs++;
            logger.warn(`⚠️ Job ${jobId} lleva más de 1 hora ejecutando`);
        }
    }

    // Verificar uso de memoria
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    if (heapUsedMB > 1024) { // Más de 1GB
        logger.warn(`⚠️ Alto uso de memoria: ${heapUsedMB}MB / ${heapTotalMB}MB`);
        systemOverloaded = true;
    } else if (heapUsedMB < 512) {
        systemOverloaded = false;
    }

    logger.info(`💊 Health Check - Jobs activos: ${activeJobs.size}/${MAX_CONCURRENT}, Jobs atascados: ${stuckJobs}, Memoria: ${heapUsedMB}MB, Sobrecarga: ${systemOverloaded}`);
}

async function processJobs() {
    try {
        // ✅ CORRECCIÓN: Verificar jobs en descanso antes de procesar
        await checkRestingJobs();

        // ✅ CORRECCIÓN: Verificar salud del sistema antes de procesar
        checkSystemHealth();

        // ✅ CORRECCIÓN: No procesar nuevos jobs si el sistema está sobrecargado
        if (systemOverloaded) {
            logger.warn("⚠️ Sistema sobrecargado, pausando procesamiento de nuevos jobs");
            return;
        }

        // Rellenar capacidad disponible
        while (activeJobs.size < MAX_CONCURRENT) {
            const job = await claimOneJob();
            if (!job) break;

            activeJobs.add(String(job._id));
            jobStartTimes.set(String(job._id), Date.now()); // Track start time
            logger.info(`📌 Reclamado y lanzando job ${job._id} (activos: ${activeJobs.size}/${MAX_CONCURRENT})`);

            try { emitJobsUpdate(job); } catch (e) {
                logger.warn("⚠️ No se pudo emitir jobs:update al reclamar job", { error: e?.message });
            }

            // Lanzar en background, liberar slot al terminar
            (async () => {
                const jobIdStr = String(job._id);
                try {
                    await processJob(job._id);
                } catch (err) {
                    logger.error(`❌ Error ejecutando job ${job._id}: ${err?.message}`);
                    try { await SendJob.findByIdAndUpdate(job._id, { $set: { status: "fallido", finishedAt: new Date() } }); } catch { }
                } finally {
                    try {
                        const j = await SendJob.findById(job._id);
                        if (j) emitJobsUpdate(j);
                    } catch (emitErr) {
                        logger.warn("⚠️ No se pudo emitir jobs:update al finalizar", { error: emitErr?.message });
                    }
                    activeJobs.delete(jobIdStr);
                    jobStartTimes.delete(jobIdStr); // ✅ Limpiar tracking
                }
            })();
        }
    } catch (err) {
        logger.error("🔥 Error en el ciclo del scheduler", { error: err });
    }
}

// ✅ NUEVO: Verificar jobs en descanso y despertarlos
async function checkRestingJobs() {
    try {
        const now = new Date();
        const restingJobs = await SendJob.find({
            status: "descanso",
            restBreakUntil: { $lte: now }
        });

        if (restingJobs.length > 0) {
            logger.info(`⏰ Despertando ${restingJobs.length} jobs en descanso...`);

            for (const job of restingJobs) {
                job.status = "pendiente"; // Volver a pendiente para que claimOneJob lo tome
                job.restBreakUntil = null; // Limpiar fecha de descanso
                await job.save();

                try { emitJobsUpdate(job); } catch (e) { }
                logger.info(`✅ Job ${job._id} despertado y marcado como pendiente`);
            }
        }
    } catch (err) {
        logger.error("❌ Error verificando jobs en descanso", { error: err });
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