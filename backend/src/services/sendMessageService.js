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

    // Marcar job como ejecutando (si no está ya)
    if (initialJob.status !== "ejecutando") {
        initialJob.status = "ejecutando";
        if (!initialJob.startedAt) initialJob.startedAt = new Date();
        await initialJob.save();
    }

    const contactsToSend = initialJob.contacts;
    logger.info(`🚀 Job iniciado (${contactsToSend.length} destinatarios)`);
    await addLog({
        tipo: "info",
        mensaje: `Job ${initialJob._id} iniciado`,
        metadata: { total: contactsToSend.length }
    });

    // Parámetros por Job con fallback a configuración global
    const dMin = Number.isFinite(parseInt(initialJob.delayMin, 10)) ? parseInt(initialJob.delayMin, 10) : (config.minDelay || 2);
    const dMax = Number.isFinite(parseInt(initialJob.delayMax, 10)) ? parseInt(initialJob.delayMax, 10) : (config.maxDelay || 5);
    const jobBatchSize = Number.isFinite(parseInt(initialJob.batchSize, 10)) ? parseInt(initialJob.batchSize, 10) : (config.batchSize || 10);
    const pauseMinutes = Number.isFinite(parseInt(initialJob.pauseBetweenBatchesMinutes, 10)) ? parseInt(initialJob.pauseBetweenBatchesMinutes, 10) : Math.ceil((config.batchPause || 60) / 60);

    const normalizeArNumber = (raw) => {
        let digits = String(raw || "").replace(/\D/g, "");
        // quitar ceros iniciales
        digits = digits.replace(/^0+/, "");
        // quitar 15 al inicio (caso comunes locales)
        if (digits.startsWith("15")) digits = digits.slice(2);
        // si empieza con 54 pero sin 549, insertar 9
        if (digits.startsWith("54") && !digits.startsWith("549")) {
            digits = "549" + digits.slice(2);
        }
        // si no tiene prefijo país, agregar 549
        if (!digits.startsWith("54")) {
            digits = "549" + digits;
        }
        return digits;
    };

    // Set para evitar duplicados dentro del mismo Job (por teléfono normalizado)
    const seenPhones = new Set();
    const startIndex = initialJob.currentIndex || 0;
    // Prefill con teléfonos ya procesados si el job se reanuda
    for (let p = 0; p < startIndex; p++) {
        const prev = contactsToSend[p];
        if (prev && prev.telefono) {
            try { seenPhones.add(normalizeArNumber(prev.telefono)); } catch {}
        }
    }

    for (let i = startIndex; i < contactsToSend.length; i++) {
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

        // 🔹 Soporte de placeholders + spintax con normalización y extraData
        const normalizeKey = (k) => String(k || "")
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "")
            .replace(/_/g, "");
        const dataMap = new Map();
        // Cargar campos de contacto nivel superior
        Object.entries(contact.toObject ? contact.toObject() : contact).forEach(([k, v]) => {
            if (v !== undefined && v !== null && typeof v !== 'object') dataMap.set(normalizeKey(k), v);
        });
        // Incluir extraData si existe
        let extra = (contact.toObject ? contact.toObject() : contact).extraData || {};
        if (extra instanceof Map) {
            extra = Object.fromEntries(extra);
        }
        Object.entries(extra).forEach(([k, v]) => {
            if (v !== undefined && v !== null) dataMap.set(normalizeKey(k), v);
        });

        let rendered = initialJob.message.replace(/{{\s*(.*?)\s*}}/g, (match, key) => {
            const nk = normalizeKey(key);
            return dataMap.has(nk) ? String(dataMap.get(nk)) : "";
        });
        const messageText = parseSpintax(rendered);

        const toDigits = normalizeArNumber(contact.telefono);
        // Evitar duplicados en el mismo Job
        if (seenPhones.has(toDigits)) {
            logger.warn(`⚠️ Duplicado en job: ${toDigits} ya fue procesado. Se omite.`);
            await addLog({ tipo: "warning", mensaje: `Duplicado en job omitido: ${toDigits}`, metadata: { jobId: initialJob._id, index: i } });
            // actualizar progreso sin enviar
            initialJob.currentIndex = i + 1;
            await initialJob.save();
            continue;
        }
        seenPhones.add(toDigits);

        const to = `${toDigits}@c.us`;

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
            const min = Math.max(0, dMin);
            const max = Math.max(min, dMax);
            const randomDelay = Math.floor(Math.random() * (max - min + 1) + min);
            logger.info(`⏳ Delay de ${randomDelay}s...`);
            await delay(randomDelay * 1000);
        }

        if ((i + 1) % jobBatchSize === 0 && i < contactsToSend.length - 1) {
            const pauseMs = Math.max(0, pauseMinutes) * 60 * 1000;
            logger.info(`😴 Pausa de ${pauseMs / 1000}s (fin de lote)...`);
            await delay(pauseMs);
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