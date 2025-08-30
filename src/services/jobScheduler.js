// src/services/jobScheduler.js

const SendJob = require("../models/SendJob");
const { processJob } = require("./sendMessageService");

// Intervalo de chequeo → cada 30 segundos
const CHECK_INTERVAL = 30 * 1000;

async function processJobs() {
    try {
        const now = new Date();

        // Buscar trabajos "pending" cuya fecha programada ya llegó
        const jobs = await SendJob.find({
            status: "pending",
            scheduledFor: { $lte: now }
        });

        for (const job of jobs) {
            console.log(`📌 Lanzando job ${job._id} programado para ${job.scheduledFor}`);

            // Evitamos re-ejecutar si alguien ya lo cambió
            if (job.status !== "pending") {
                console.log(`⚠️ Job ${job._id} ya no está en estado pending (estado=${job.status})`);
                continue;
            }

            try {
                // Marcamos "running" y disparamos en background
                job.status = "running";
                await job.save();

                await processJob(job._id);

            } catch (err) {
                console.error(`❌ Error ejecutando job ${job._id}:`, err.message);
                job.status = "failed";
                await job.save();
            }
        }
    } catch (err) {
        console.error("🔥 Error procesando jobs:", err);
    }
}

function startScheduler() {
    console.log("⏰ Scheduler de Jobs iniciado...");
    setInterval(processJobs, CHECK_INTERVAL);
}

module.exports = { startScheduler };