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

            try {
                // Intentar reclamar el job de forma atómica
                const claimed = await SendJob.findOneAndUpdate(
                    { _id: job._id, status: "pending" },
                    { $set: { status: "running", startedAt: new Date() } },
                    { new: true }
                );

                if (!claimed) {
                    console.log(`⚠️ Job ${job._id} ya fue reclamado por otro worker`);
                    continue;
                }

                await processJob(claimed._id);

            } catch (err) {
                console.error(`❌ Error ejecutando job ${job._id}:`, err.message);
                await SendJob.findByIdAndUpdate(job._id, { $set: { status: "failed" } });
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