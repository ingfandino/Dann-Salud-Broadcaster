// backend/src/services/sendMessageService.js

const SendConfig = require("../models/SendConfig");
const Message = require("../models/Message");
const SendJob = require("../models/SendJob");
const { getOrInitClient, isReady: isReadyForUser } = require("./whatsappManager");
const { getWhatsappClient, isReady: isReadySingle } = require("../config/whatsapp");
const { emitJobProgress } = require("../config/socket");
const { addLog } = require("../services/logService");
const { parseSpintax } = require("../utils/spintax");
const logger = require("../utils/logger");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ CORRECCIÓN: Control de tasa global para evitar rate limiting de WhatsApp
const MESSAGE_RATE_LIMITER = {
    lastMessageTime: 0,
    minIntervalMs: 2000, // Mínimo 2 segundos entre mensajes a nivel global
};

async function throttleMessage() {
    const now = Date.now();
    const elapsed = now - MESSAGE_RATE_LIMITER.lastMessageTime;
    if (elapsed < MESSAGE_RATE_LIMITER.minIntervalMs) {
        const waitTime = MESSAGE_RATE_LIMITER.minIntervalMs - elapsed;
        await delay(waitTime);
    }
    MESSAGE_RATE_LIMITER.lastMessageTime = Date.now();
}

async function getConfig() {
    let config = await SendConfig.findOne();
    if (!config) {
        config = new SendConfig();
        await config.save();
    }
    return config;
}

async function processJob(jobId) {
    const USE_MULTI = process.env.USE_MULTI_SESSION === 'true';
    const config = await getConfig();
    const initialJob = await SendJob.findById(jobId).populate("contacts");

    if (!initialJob || !initialJob.contacts) {
        logger.error("❌ Job no encontrado o sin contactos", { jobId });
        await addLog({ tipo: "error", mensaje: `Job no encontrado o sin contactos: ${jobId}` });
        return;
    }

    // ⚠️ Verificamos conexión con WhatsApp para el creador del job
    const userId = initialJob.createdBy;
    const readyNow = USE_MULTI ? isReadyForUser(userId) : isReadySingle();
    if (!readyNow) {
        logger.warn("⏸️ WhatsApp no está listo para el usuario; re-programando job como 'pendiente'", { userId, jobId });
        initialJob.status = "pendiente";
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

    let sentLocal = Number(initialJob.stats?.sent || 0);
    let failedLocal = Number(initialJob.stats?.failed || 0);
    let pendingLocal = Number(initialJob.stats?.pending != null ? initialJob.stats.pending : (initialJob.stats?.total || contactsToSend.length) - (sentLocal + failedLocal));
    const totalLocal = Number(initialJob.stats?.total || contactsToSend.length);
    let lastEmitTs = 0;

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

        const placeholderMatches = Array.from(initialJob.message.matchAll(/{{\s*(.*?)\s*}}/g));
        const placeholders = placeholderMatches.map(m => m[1]);
        const placeholdersNormalized = Array.from(new Set(placeholders.map(k => normalizeKey(k))));
        const dataKeys = Array.from(dataMap.keys());
        logger.info("🔎 Placeholder debug", { jobId: initialJob._id, contactId: contact?._id, placeholders, placeholdersNormalized, dataKeys });

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
            await SendJob.updateOne(
                { _id: jobId },
                {
                    $inc: {
                        "stats.pending": -1,
                    },
                    $set: { currentIndex: i + 1 },
                }
            );
            continue;
        }
        seenPhones.add(toDigits);

        const to = `${toDigits}@c.us`;

        let wasSent = false;
        try {
            // ✅ CORRECCIÓN: Aplicar throttling global antes de enviar
            await throttleMessage();
            
            let attempt = 0;
            let sent = false;
            let lastError = null;

            while (attempt < 3 && !sent) {
                attempt++;
                try {
                    const userClient = USE_MULTI ? await getOrInitClient(userId) : getWhatsappClient();
                    await userClient.sendMessage(to, messageText);
                    sent = true;
                } catch (err) {
                    lastError = err;
                    const msg = String(err.message || "").toLowerCase();
                    if (msg.includes("rate")) {
                        const backoff = 2000 * Math.pow(2, attempt - 1); // ✅ Aumentar backoff inicial
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
            wasSent = true;

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
            await SendJob.updateOne(
                { _id: jobId },
                {
                    $inc: {
                        "stats.sent": wasSent ? 1 : 0,
                        "stats.failed": wasSent ? 0 : 1,
                        "stats.pending": -1,
                    },
                    $set: { currentIndex: i + 1 },
                }
            );

            if (wasSent) sentLocal++; else failedLocal++;
            pendingLocal = Math.max(0, pendingLocal - 1);

            const now = Date.now();
            const milestone = Math.max(1, Math.floor(totalLocal / 50));
            if (now - lastEmitTs >= 1000 || (i + 1) === totalLocal || ((i + 1) % milestone === 0)) {
                emitJobProgress(initialJob._id.toString(), {
                    currentIndex: i + 1,
                    total: totalLocal,
                    progress: Math.round(((i + 1) / totalLocal) * 100),
                    status: "ejecutando",
                });
                lastEmitTs = now;
            }
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