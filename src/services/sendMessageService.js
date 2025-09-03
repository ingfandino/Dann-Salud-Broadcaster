// src/services/sendMessageService.js

const SendConfig = require("../models/SendConfig");
const Message = require("../models/Message");
const SendJob = require("../models/SendJob");
const { client } = require("../config/whatsapp");
const { emitJobProgress } = require("../config/socket");
const { addLog } = require("../services/logService");

// 🔹 Delay utilitario
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 🔹 Configuración de envío
async function getConfig() {
    let config = await SendConfig.findOne();
    if (!config) {
        config = new SendConfig();
        await config.save();
    }
    return config;
}

// 🔹 Procesar un envío (job)
async function processJob(jobId) {
    const config = await getConfig();
    let job = await SendJob.findById(jobId).populate("contacts");

    if (!job) {
        console.error("❌ Job no encontrado:", jobId);
        await addLog({ tipo: "error", mensaje: `Job no encontrado: ${jobId}` });
        return;
    }

    if (job.status !== "pending" && job.status !== "running") {
        console.log(`⚠️ Job ${jobId} en estado ${job.status}, no se procesará`);
        await addLog({
            tipo: "warning",
            mensaje: `Job ${jobId} no procesado (estado=${job.status})`
        });
        return;
    }

    job.status = "running";
    await job.save();

    console.log(`🚀 Job iniciado (${job.contacts.length} destinatarios)`);
    await addLog({
        tipo: "info",
        mensaje: `Job ${job._id} iniciado`,
        metadata: { total: job.contacts.length }
    });

    for (let i = job.currentIndex; i < job.contacts.length; i++) {
        job = await SendJob.findById(jobId).populate("contacts"); // 🔄 refrescar estado cada iteración

        if (!job || ["paused", "cancelled"].includes(job.status)) {
            console.log(`⏸️ Job detenido en índice ${i}, estado=${job?.status}`);
            job.currentIndex = i;
            await job.save();

            await addLog({
                tipo: "warning",
                mensaje: `Job ${job?._id} detenido`,
                metadata: { estado: job?.status, currentIndex: i }
            });
            return;
        }

        const contact = job.contacts[i];
        const to = contact.telefono;
        const messageText = contact.rendered || job.template;

        try {
            await client.sendMessage(to, messageText);

            const newMsg = new Message({
                contact: contact._id,
                ownerUser: job.ownerUser,
                job: job._id, // 🔥 nuevo
                contenido: messageText,
                direction: "outbound",
                status: "enviado",
                timestamp: new Date(),
            });
            await newMsg.save();

            console.log(`✅ Enviado a ${to}`);
            await addLog({
                tipo: "info",
                mensaje: `Mensaje enviado a ${to}`,
                metadata: { jobId: job._id, contactId: contact._id }
            });
        } catch (err) {
            console.error(`❌ Error enviando a ${to}:`, err.message);
            const failedMsg = new Message({
                contact: contact._id,
                ownerUser: job.ownerUser,
                job: job._id, // 🔥 nuevo
                contenido: messageText,
                direction: "outbound",
                status: "fallido",
                timestamp: new Date(),
            });
            await failedMsg.save();
            await addLog({
                tipo: "error",
                mensaje: `Error enviando a ${to}: ${err.message}`,
                metadata: { jobId: job._id, contactId: contact._id }
            });
        }

        job.currentIndex = i + 1;
        await job.save();

        // 🟢 Emitir progreso en vivo
        emitJobProgress(job._id.toString(), {
            currentIndex: job.currentIndex,
            total: job.contacts.length,
            progress: Math.round((job.currentIndex / job.contacts.length) * 100),
            status: job.status,
        });

        // Delay aleatorio entre mensajes
        if (i < job.contacts.length - 1) {
            const randomDelay = Math.floor(
                Math.random() * (config.maxDelay - config.minDelay + 1) + config.minDelay
            );
            console.log(`⏳ Delay de ${randomDelay}s...`);
            await delay(randomDelay * 1000);
        }

        // Pausa entre lotes
        if ((i + 1) % config.batchSize === 0 && i < job.contacts.length - 1) {
            console.log(`😴 Pausa de ${config.batchPause}s (fin de lote)...`);
            await delay(config.batchPause * 1000);
        }
    }

    job.status = "completed";
    await job.save();

    // 🟢 Emitir progreso final
    emitJobProgress(job._id.toString(), {
        currentIndex: job.contacts.length,
        total: job.contacts.length,
        progress: 100,
        status: "completed",
    });

    console.log("🎉 Job completado");
    await addLog({
        tipo: "info",
        mensaje: `Job ${job._id} completado`,
        metadata: { total: job.contacts.length }
    });
}

async function sendSingleMessage(to, text) {
    try {
        const chatId = to.includes("@c.us") ? to : `${to}@c.us`;
        await client.sendMessage(chatId, text);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    processJob,
    sendSingleMessage
};