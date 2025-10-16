// backend/src/services/sendMessageService.js

const SendConfig = require("../models/SendConfig");
const Message = require("../models/Message");
const SendJob = require("../models/SendJob");
const { getOrInitClient, isReady: isReadyForUser } = require("./whatsappManager");
const { emitJobProgress } = require("../config/socket");
const { addLog } = require("../services/logService");
const { parseSpintax } = require("../utils/spintax");
const logger = require("../utils/logger");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getConfig() {
    let config = await SendConfig.findOne();
    if (!config) {
        config = new SendConfig();
        await config.save();
    }
    return config;
}

async function processJob(jobId) {
    const config = await getConfig();
    const initialJob = await SendJob.findById(jobId).populate("contacts");

    if (!initialJob || !initialJob.contacts) {
        logger.error("❌ Job no encontrado o sin contactos", { jobId });
        await addLog({ tipo: "error", mensaje: `Job no encontrado o sin contactos: ${jobId}` });
        return;
    }

    // ⚠️ Verificamos conexión con WhatsApp para el creador del job
    const userId = initialJob.createdBy;
    if (!isReadyForUser(userId)) {
        logger.error("❌ WhatsApp (usuario) no está conectado, abortando job", { userId });
        initialJob.status = "fallido";
        await initialJob.save();
        return;
    }

    const contactsToSend = initialJob.contacts;
    logger.info(`🚀 Job iniciado (${contactsToSend.length} destinatarios)`);
    await addLog({
        tipo: "info",
        mensaje: `Job ${initialJob._id} iniciado`,
        metadata: { total: contactsToSend.length }
    });

    for (let i = initialJob.currentIndex; i < contactsToSend.length; i++) {
        const currentJobState = await SendJob.findById(jobId);

        if (!currentJobState || ["pausado", "cancelado"].includes(currentJobState.status)) {
            logger.warn(`⏸️ Job detenido en índice ${i}, estado=${currentJobState?.status}`);
            await addLog({
                tipo: "warning",
                mensaje: `Job ${currentJobState?._id} detenido`,
                metadata: { estado: currentJobState?.status, currentIndex: i }
            });
            return;
        }

        const contact = contactsToSend[i];

        // 🔹 Soporte de placeholders + spintax
        let rendered = initialJob.message.replace(/{{(.*?)}}/g, (match, key) => {
            const cleanKey = key.trim();
            return contact[cleanKey] !== undefined ? contact[cleanKey] : match;
        });
        const messageText = parseSpintax(rendered);

        const to = `${contact.telefono}@c.us`;

        try {
            let attempt = 0;
            let sent = false;
            let lastError = null;

            while (attempt < 3 && !sent) {
                attempt++;
                try {
                    const userClient = await getOrInitClient(userId);
                    await userClient.sendMessage(to, messageText);
                    sent = true;
                } catch (err) {
                    lastError = err;
                    const msg = String(err.message || "").toLowerCase();
                    if (msg.includes("rate")) {
                        const backoff = 1000 * Math.pow(2, attempt - 1);
                        logger.warn(`⚠️ Rate limit, reintento ${attempt} en ${backoff}ms`);
                        await delay(backoff);
                    } else {
                        break;
                    }
                }
            }

            if (!sent) throw lastError || new Error("Fallo desconocido en sendMessage");

            const newMsg = new Message({
                contact: contact._id,
                createdBy: initialJob.createdBy,
                job: initialJob._id,
                contenido: messageText,
                direction: "outbound",
                status: "enviado",
                timestamp: new Date(),
            });
            await newMsg.save();

            logger.info(`✅ Enviado a ${contact.telefono}`);

        } catch (err) {
            logger.error(`❌ Error enviando a ${contact.telefono}`, { error: err.message });

            const failedMsg = new Message({
                contact: contact._id,
                createdBy: initialJob.createdBy,
                job: initialJob._id,
                contenido: messageText,
                direction: "outbound",
                status: "fallido",
                timestamp: new Date(),
            });
            await failedMsg.save();
        } finally {
            const finalStatus = await SendJob.findById(jobId);
            const sentCount = await Message.countDocuments({ job: jobId, status: "enviado" });
            const failedCount = await Message.countDocuments({ job: jobId, status: "fallido" });

            finalStatus.currentIndex = i + 1;
            finalStatus.stats.sent = sentCount;
            finalStatus.stats.failed = failedCount;
            finalStatus.stats.pending = finalStatus.stats.total - (sentCount + failedCount);
            await finalStatus.save();

            emitJobProgress(finalStatus._id.toString(), {
                currentIndex: finalStatus.currentIndex,
                total: finalStatus.stats.total,
                progress: Math.round((finalStatus.currentIndex / finalStatus.stats.total) * 100),
                status: finalStatus.status,
            });
        }

        if (i < contactsToSend.length - 1) {
            const randomDelay = Math.floor(
                Math.random() * (config.maxDelay - config.minDelay + 1) + config.minDelay
            );
            logger.info(`⏳ Delay de ${randomDelay}s...`);
            await delay(randomDelay * 1000);
        }

        if ((i + 1) % config.batchSize === 0 && i < contactsToSend.length - 1) {
            logger.info(`😴 Pausa de ${config.batchPause}s (fin de lote)...`);
            await delay(config.batchPause * 1000);
        }
    }

    const completedJob = await SendJob.findById(jobId);
    completedJob.status = "completado";
    completedJob.finishedAt = new Date();
    await completedJob.save();

    emitJobProgress(completedJob._id.toString(), {
        currentIndex: contactsToSend.length,
        total: contactsToSend.length,
        progress: 100,
        status: "completado",
    });

    logger.info("🎉 Job completado");
    await addLog({
        tipo: "info",
        mensaje: `Job ${completedJob._id} completado`,
        metadata: { total: contactsToSend.length, sent: completedJob.stats.sent, failed: completedJob.stats.failed }
    });
}

async function sendSingleMessage(userId, to, text) {
    try {
        const chatId = to.includes("@c.us") ? to : `${to}@c.us`;
        const userClient = await getOrInitClient(userId);
        await userClient.sendMessage(chatId, text);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = {
    processJob,
    sendSingleMessage
};