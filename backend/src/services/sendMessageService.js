/**
 * ============================================================
 * SERVICIO DE ENVÍO DE MENSAJES (sendMessageService.js)
 * ============================================================
 * Motor principal de envío masivo de mensajes por WhatsApp.
 * Incluye delays anti-detección, manejo de errores y reintentos.
 */

const SendConfig = require("../models/SendConfig");
const Message = require("../models/Message");
const SendJob = require("../models/SendJob");
const Contact = require("../models/Contact");
const Affiliate = require("../models/Affiliate");
const LeadAssignment = require("../models/LeadAssignment");
const { isReady, sendMessage, USE_MULTI, USE_BAILEYS, getActiveEngine } = require("./whatsappUnified");
const { emitJobProgress } = require("../config/socket");
const { addLog } = require("../services/logService");
const { parseSpintax } = require("../utils/spintax");
const { formatWhatsAppJid, maskJid, normalizePhoneDigits } = require("../utils/whatsappJid");
const { recordWhatsAppSendAttempt } = require("./whatsappSendAttemptService");
const logger = require("../utils/logger").getLogger("whatsapp");

logger.info(`[SendMessageService] Usando ${USE_BAILEYS ? 'Baileys' : 'whatsapp-web.js'}, Multi: ${USE_MULTI}`);

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

// 🛡️ ANTI-DETECCIÓN: Delays más humanos con distribución gaussiana
function humanDelay(min, max) {
    // Usar distribución normal en lugar de uniforme
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 4;

    // Box-Muller transform para generar distribución normal
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    let result = mean + z * stdDev;
    result = Math.max(min, Math.min(max, result)); // Clamp entre min y max

    return Math.floor(result);
}

// 🛡️ ANTI-DETECCIÓN: Simular tiempo de escritura basado en longitud del mensaje
function calculateTypingTime(messageLength) {
    // Humano promedio: 40-60 palabras por minuto = ~200-300 caracteres/minuto
    // Pero con errores, pausas, correcciones: más lento
    const baseCharsPerSecond = 3 + Math.random() * 2; // 3-5 chars/segundo
    const typingTime = (messageLength / baseCharsPerSecond) * 1000;

    // Agregar variabilidad (distracciones, pausas para pensar)
    const variability = 1 + (Math.random() * 0.5 - 0.25); // ±25%

    // Mínimo 2s, máximo 30s (nadie escribe más de 30s seguidos)
    return Math.min(30000, Math.max(2000, typingTime * variability));
}

// 🛡️ ANTI-DETECCIÓN: Detectar si estamos en horario laboral
function isWorkingHours() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Domingo, 6 = Sábado

    // Lunes a Viernes: 8am - 8pm
    // Sábados: 9am - 2pm
    // Domingos: No enviar

    if (day === 0) return false; // Domingo
    if (day === 6) return hour >= 9 && hour < 14; // Sábado 9am-2pm
    return hour >= 8 && hour < 20; // Lun-Vie 8am-8pm
}

// 🛡️ ANTI-DETECCIÓN: Pausa aleatoria ocasional (simula distracciones humanas)
function shouldTakeRandomBreak() {
    // ✅ 15% de probabilidad de tomar una pausa corta (antes: 5%)
    // Más pausas = más humano = menos detección
    return Math.random() < 0.15;
}

function getRandomBreakDuration() {
    // Pausa corta: 30s - 3 minutos
    return (30 + Math.random() * 150) * 1000;
}

// ✅ CORRECCIÓN: Control de tasa global para evitar rate limiting de WhatsApp
const MESSAGE_RATE_LIMITER = {
    lastMessageTime: 0,
    minIntervalMs: 3000, // ✅ Aumentado: Mínimo 3 segundos (antes: 2s)
    maxIntervalMs: 10000, // ✅ NUEVO: Máximo 10 segundos (variabilidad)
};

async function throttleMessage() {
    const now = Date.now();
    const elapsed = now - MESSAGE_RATE_LIMITER.lastMessageTime;

    // ✅ Delay variable entre 3-10 segundos (más humano, menos predecible)
    const targetDelay = MESSAGE_RATE_LIMITER.minIntervalMs +
        Math.random() * (MESSAGE_RATE_LIMITER.maxIntervalMs - MESSAGE_RATE_LIMITER.minIntervalMs);

    if (elapsed < targetDelay) {
        const waitTime = targetDelay - elapsed;
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

/**
 * Marca un teléfono como Spam en Affiliate y LeadAssignment.
 * Se invoca cuando se detecta que un número no tiene WhatsApp.
 * 
 * @param {string} phone - Teléfono a marcar (formato original o normalizado)
 * @param {string} reason - Razón del spam (ej: 'Sin WhatsApp')
 */
async function markPhoneAsSpam(phone, reason) {
    try {
        // Normalizar el teléfono para búsqueda
        const normalizedPhone = String(phone).replace(/\D/g, "");
        const phoneVariants = [
            normalizedPhone,
            normalizedPhone.replace(/^549/, ""), // Sin prefijo país
            normalizedPhone.replace(/^54/, ""),  // Sin prefijo
        ].filter(p => p.length >= 8); // Solo variantes válidas

        // Buscar affiliates con este teléfono en cualquiera de los campos
        const affiliates = await Affiliate.find({
            $or: phoneVariants.flatMap(variant => [
                { telefono1: { $regex: variant, $options: "i" } },
                { telefono2: { $regex: variant, $options: "i" } },
                { telefono3: { $regex: variant, $options: "i" } },
                { telefono4: { $regex: variant, $options: "i" } },
                { telefono5: { $regex: variant, $options: "i" } },
            ])
        });

        if (affiliates.length === 0) {
            logger.debug(`[markPhoneAsSpam] No se encontraron affiliates para teléfono ${phone}`);
            return;
        }

        for (const affiliate of affiliates) {
            // Marcar affiliate como fallido y sin WhatsApp
            affiliate.leadStatus = 'Fallido';
            affiliate.noWhatsApp = true;
            await affiliate.save();

            // Buscar y marcar LeadAssignment activos
            const updatedAssignments = await LeadAssignment.updateMany(
                { affiliate: affiliate._id, active: true, status: { $ne: 'Spam' } },
                {
                    $set: {
                        status: 'Spam',
                        subStatus: reason
                    },
                    $push: {
                        interactions: {
                            type: 'Cambio Estado',
                            note: `Marcado automáticamente: ${reason}`,
                            timestamp: new Date()
                        }
                    }
                }
            );

            if (updatedAssignments.modifiedCount > 0) {
                logger.info(`📛 Affiliate ${affiliate._id} y ${updatedAssignments.modifiedCount} asignación(es) marcados como Spam: ${reason}`);
            } else {
                logger.info(`📛 Affiliate ${affiliate._id} marcado como Fallido/noWhatsApp (sin asignaciones activas)`);
            }
        }

        await addLog({
            tipo: "info",
            mensaje: `Teléfono ${phone} marcado como Spam en ${affiliates.length} affiliate(s)`,
            metadata: { phone, reason, affiliateCount: affiliates.length }
        });

    } catch (error) {
        logger.error(`[markPhoneAsSpam] Error marcando teléfono ${phone}:`, error.message);
    }
}

async function processJob(jobId) {
    const config = await getConfig();
    const initialJob = await SendJob.findById(jobId).populate("contacts");

    if (!initialJob || !initialJob.contacts) {
        logger.error("❌ Job no encontrado o sin contactos", { jobId });
        await addLog({ tipo: "error", mensaje: `Job no encontrado o sin contactos: ${jobId}` });
        return;
    }

    // ✅ NUEVO: Verificar si está en descanso y auto-reanudar
    if (initialJob.status === "descanso" && initialJob.restBreakUntil) {
        const now = Date.now();
        const breakEnd = new Date(initialJob.restBreakUntil).getTime();

        if (now < breakEnd) {
            const remainingMs = breakEnd - now;
            const remainingMinutes = Math.ceil(remainingMs / 60000);
            logger.info(`😴 Job en descanso. Reanudando en ${remainingMinutes} minutos...`);

            // Emitir progreso con tiempo restante
            emitJobProgress(jobId.toString(), {
                _id: jobId.toString(),
                status: "descanso",
                restBreakMinutesRemaining: remainingMinutes
            });

            await delay(remainingMs);
        }

        // Reanudar automáticamente
        logger.info(`▶️ Auto-reanudando job después del descanso...`);
        initialJob.status = "ejecutando";
        initialJob.restBreakUntil = null;
        await initialJob.save();
    }

    // ✅ CORRECCIÓN: Límite de intentos para evitar bucles infinitos
    const MAX_ATTEMPTS = 10;
    const currentAttempts = initialJob.attempts || 0;

    if (currentAttempts >= MAX_ATTEMPTS) {
        logger.error(`❌ Job ${jobId} excedió el límite de intentos (${currentAttempts}/${MAX_ATTEMPTS}). Marcando como fallido.`);
        initialJob.status = "fallido";
        initialJob.finishedAt = new Date();
        await initialJob.save();
        await addLog({
            tipo: "error",
            mensaje: `Job ${jobId} marcado como fallido tras ${currentAttempts} intentos (WhatsApp no disponible)`
        });
        return;
    }

    // ⚠️ Verificamos conexión con WhatsApp para el creador del job
    const userId = USE_MULTI ? initialJob.createdBy : null;
    const readyNow = isReady(userId);
    if (!readyNow) {
        // ✅ CORRECCIÓN: Re-programar con delay de 2 minutos para evitar bucle infinito
        const delayMinutes = 2;
        const nextAttempt = new Date(Date.now() + delayMinutes * 60 * 1000);

        logger.warn(`⏸️ WhatsApp no está listo; re-programando job para ${nextAttempt.toLocaleTimeString('es-AR')}`, {
            userId,
            jobId,
            attempts: (initialJob.attempts || 0) + 1,
            nextAttempt
        });

        initialJob.status = "pendiente";
        initialJob.scheduledFor = nextAttempt; // ✅ Posponer 2 minutos
        initialJob.attempts = (initialJob.attempts || 0) + 1; // ✅ Incrementar contador
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
    // ✅ Delays aumentados: mínimo 5s (antes: 2s), máximo 15s (antes: 5s)
    const dMin = Number.isFinite(parseInt(initialJob.delayMin, 10)) ? parseInt(initialJob.delayMin, 10) : (config.minDelay || 5);
    const dMax = Number.isFinite(parseInt(initialJob.delayMax, 10)) ? parseInt(initialJob.delayMax, 10) : (config.maxDelay || 15);
    const jobBatchSize = Number.isFinite(parseInt(initialJob.batchSize, 10)) ? parseInt(initialJob.batchSize, 10) : (config.batchSize || 10);
    const pauseMinutes = Number.isFinite(parseInt(initialJob.pauseBetweenBatchesMinutes, 10)) ? parseInt(initialJob.pauseBetweenBatchesMinutes, 10) : Math.ceil((config.batchPause || 60) / 60);

    const engine = getActiveEngine();
    const normalizeArNumber = normalizePhoneDigits;

    // Set para evitar duplicados dentro del mismo Job (por teléfono normalizado)
    const seenPhones = new Set();
    const startIndex = initialJob.currentIndex || 0;
    // Prefill con teléfonos ya procesados si el job se reanuda
    for (let p = 0; p < startIndex; p++) {
        const prev = contactsToSend[p];
        if (prev && prev.telefono) {
            try { seenPhones.add(normalizeArNumber(prev.telefono)); } catch { }
        }
    }

    let sentLocal = Number(initialJob.stats?.sent || 0);
    let failedLocal = Number(initialJob.stats?.failed || 0);
    let pendingLocal = Number(initialJob.stats?.pending != null ? initialJob.stats.pending : (initialJob.stats?.total || contactsToSend.length) - (sentLocal + failedLocal));
    const totalLocal = Number(initialJob.stats?.total || contactsToSend.length);
    let lastEmitTs = 0;
    let messagesProcessed = 0; // ✅ Track actual sent/failed messages for batch breaks

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

        const placeholderMatches = Array.from(initialJob.message.matchAll(/\[\s*(.*?)\s*\]/g));
        const placeholders = placeholderMatches.map(m => m[1]);
        const placeholdersNormalized = Array.from(new Set(placeholders.map(k => normalizeKey(k))));
        const dataKeys = Array.from(dataMap.keys());

        // 🔍 Debug mejorado: mostrar valores del dataMap
        const dataMapObj = Object.fromEntries(dataMap);
        logger.info("🔎 Placeholder debug", {
            jobId: initialJob._id,
            contactId: contact?._id,
            telefono: contact?.telefono,
            placeholders,
            placeholdersNormalized,
            dataKeys,
            dataMapSample: dataMapObj // Mostrar todos los datos disponibles
        });

        // Reemplazar placeholders con formato [key] (corchetes)
        let rendered = initialJob.message.replace(/\[\s*(.*?)\s*\]/g, (match, key) => {
            const nk = normalizeKey(key);
            if (dataMap.has(nk)) {
                return String(dataMap.get(nk));
            } else {
                logger.warn(`⚠️ Placeholder no encontrado: "[${key}]" (normalizado: "${nk}")`, {
                    jobId: initialJob._id,
                    contactId: contact?._id,
                    availableKeys: dataKeys
                });
                return match; // Devolver [key] original
            }
        });
        const messageText = parseSpintax(rendered);

        const toDigits = normalizeArNumber(contact.telefono);
        // ✅ CORRECCIÓN CRÍTICA: Evitar duplicados en el mismo Job
        if (seenPhones.has(toDigits)) {
            logger.warn(`⚠️ Duplicado en job: ${toDigits} ya fue procesado. Se omite sin afectar stats.`);
            await addLog({ tipo: "warning", mensaje: `Duplicado en job omitido: ${toDigits}`, metadata: { jobId: initialJob._id, index: i } });
            // El duplicado NO cuenta como enviado, fallido NI se decrementa pending
            // Solo avanzar currentIndex para no quedarse atascado
            await SendJob.updateOne(
                { _id: jobId },
                {
                    $set: { currentIndex: i + 1 },
                    // NO tocar stats aquí
                }
            );
            continue;
        }

        const to = `${toDigits}@c.us`;
        const sendTo = formatWhatsAppJid(contact.telefono, engine);

        // 🚨 VERIFICACIÓN GLOBAL: Evitar duplicados ENTRE CAMPAÑAS
        // Verificar si ya se envió un mensaje a este número en las últimas 24 horas
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentMessage = await Message.findOne({
            to: to,
            direction: "outbound",
            timestamp: { $gte: twentyFourHoursAgo },
            status: { $in: ["enviado", "entregado", "leido"] } // Solo exitosos
        });

        if (recentMessage) {
            logger.warn(`🚨 DUPLICADO GLOBAL: ${toDigits} ya recibió mensaje hace ${Math.round((Date.now() - recentMessage.timestamp) / 60000)} minutos. OMITIENDO.`);
            await addLog({
                tipo: "warning",
                mensaje: `Duplicado global omitido: ${toDigits} (ya contactado en campaña anterior)`,
                metadata: {
                    jobId: initialJob._id,
                    index: i,
                    previousJob: recentMessage.job,
                    minutesAgo: Math.round((Date.now() - recentMessage.timestamp) / 60000)
                }
            });

            // NO enviar, avanzar currentIndex sin afectar stats
            await SendJob.updateOne(
                { _id: jobId },
                {
                    $set: { currentIndex: i + 1 },
                }
            );
            continue;
        }

        seenPhones.add(toDigits);

        let wasSent = false;
        try {
            // ✅ CORRECCIÓN: Aplicar throttling global antes de enviar
            await throttleMessage();

            await recordWhatsAppSendAttempt({
                flow: "mass_messaging",
                userId: userId || initialJob.createdBy || null,
                sourceId: initialJob._id,
                engine,
                jid: sendTo,
                recipient: contact.telefono,
                sendStatus: "queued"
            });

            // ✅ NUEVO: Sistema de reintentos optimizado
            const MAX_RETRIES = 3; // Reducido de 20 a 3
            let attempt = 0;
            let sent = false;
            let sendResult = null;
            let lastError = null;

            while (attempt < MAX_RETRIES && !sent) {
                try {
                    const result = await sendMessage(userId, sendTo, messageText);
                    if (!result?.success || result?.status !== "accepted") {
                        const sendErr = new Error(result?.message || "WhatsApp no acepto el envio");
                        sendErr.code = result?.code || "WHATSAPP_SEND_FAILED";
                        sendErr.status = result?.status || "failed";
                        throw sendErr;
                    }
                    sendResult = result;
                    sent = true;
                    await recordWhatsAppSendAttempt({
                        flow: "mass_messaging",
                        userId: userId || initialJob.createdBy || null,
                        sourceId: initialJob._id,
                        engine: result.engine || engine,
                        jid: sendTo,
                        recipient: contact.telefono,
                        sendStatus: "accepted",
                        messageId: result.messageId || null,
                    });
                } catch (err) {
                    attempt++;
                    lastError = err;
                    const errMsg = (err.message || "").toLowerCase();

                    // 🚨 FAIL FAST: Si el número no existe o no tiene WhatsApp, NO reintentar
                    if (errMsg.includes("not-authorized") || errMsg.includes("no exists") || errMsg.includes("invalid jid") || errMsg.includes("no tiene whatsapp")) {
                        logger.warn(`🛑 FAIL FAST: Número inválido detectado (${contact.telefono}). Abortando reintentos.`);

                        await Contact.findByIdAndUpdate(contact._id, { noWhatsApp: true });
                        logger.info(`📛 Contacto ${contact.telefono} marcado como noWhatsApp=true`);

                        // Propagar estado Spam a Affiliate y LeadAssignment
                        await markPhoneAsSpam(contact.telefono, 'Sin WhatsApp');

                        await addLog({
                            tipo: "warning",
                            mensaje: `Envío abortado: Número inválido o sin WhatsApp (${contact.telefono})`,
                            metadata: { jobId: initialJob._id, error: errMsg }
                        });
                        break;
                    }

                    if (attempt < MAX_RETRIES) {
                        // Backoff exponencial: 1s, 2s, 4s
                        const backoffMs = Math.min(10000, 1000 * Math.pow(2, attempt - 1));
                        logger.warn(`⚠️ Reintento ${attempt}/${MAX_RETRIES} para ${contact.telefono} en ${Math.round(backoffMs / 1000)}s (Error: ${err.message})`);
                        await delay(backoffMs);
                    } else {
                        // Fallo definitivo después de MAX_RETRIES
                        logger.error(`❌ FALLIDO DEFINITIVO después de ${MAX_RETRIES} intentos: ${contact.telefono}`);

                        // Emitir notificación de fallo al usuario
                        const { emitMessageFailureAlert } = require("../config/socket");
                        emitMessageFailureAlert(initialJob.createdBy, {
                            nombre: contact.nombre,
                            telefono: contact.telefono
                        }, jobId);

                        throw lastError; // Re-lanzar para que se maneje como fallido
                    }
                }
            }

            if (!sent) {
                throw lastError || new Error("WhatsApp no acepto el envio");
            }

            // ✅ CORRECCIÓN BUG 1: Verificar si ya existe mensaje para este contacto en este job
            const existingMsg = await Message.findOne({
                job: initialJob._id,
                to: to,
                direction: "outbound"
            });

            if (existingMsg) {
                if (existingMsg.status !== "enviado") {
                    existingMsg.status = "enviado";
                    existingMsg.timestamp = new Date();
                    await existingMsg.save();
                }
                logger.warn(`⚠️ Mensaje duplicado detectado en BD para ; envio actual aceptado por WhatsApp y registro conservado.`);
                wasSent = true;
            } else {
                const newMsg = new Message({
                    contact: contact._id,
                    createdBy: initialJob.createdBy,
                    job: initialJob._id,
                    contenido: messageText,
                    to: to,
                    direction: "outbound",
                    status: "enviado",
                    timestamp: new Date(),
                });
                await newMsg.save();

                await Contact.findByIdAndUpdate(contact._id, { massMessagedAt: new Date() });
                logger.info(`✅ Envio aceptado por WhatsApp a  (marcado massMessagedAt)`, {
                    flow: "campaign",
                    engine: sendResult?.engine || engine,
                    jid: maskJid(sendTo),
                    sendStatus: "accepted",
                    messageId: sendResult?.messageId || null,
                });
                wasSent = true;
            }

        } catch (err) {
            await recordWhatsAppSendAttempt({
                flow: "mass_messaging",
                userId: userId || initialJob.createdBy || null,
                sourceId: initialJob._id,
                engine,
                jid: sendTo,
                recipient: contact.telefono,
                sendStatus: err.status || "failed",
                errorCode: err.code || "WHATSAPP_SEND_FAILED",
                errorMessage: err.message,
            });

            // Verificar si ya existe registro antes de guardar como fallido
            const existingMsg = await Message.findOne({
                job: initialJob._id,
                to: to,
                direction: "outbound"
            });

            if (!existingMsg) {
                const failedMsg = new Message({
                    contact: contact._id,
                    createdBy: initialJob.createdBy,
                    job: initialJob._id,
                    contenido: messageText,
                    to: to,
                    direction: "outbound",
                    status: "fallido",
                    timestamp: new Date(),
                });
                await failedMsg.save();
            }
        } finally {
            // ✅ CORRECCIÓN: Actualizar stats correctamente
            await SendJob.updateOne(
                { _id: jobId },
                {
                    $inc: {
                        "stats.sent": wasSent ? 1 : 0,
                        "stats.failed": wasSent ? 0 : 1,
                        "stats.pending": -1, // Decrementar porque procesamos un contacto real
                    },
                    $set: { currentIndex: i + 1 },
                }
            );

            if (wasSent) sentLocal++; else failedLocal++;
            pendingLocal = Math.max(0, pendingLocal - 1); // Nunca negativo
            messagesProcessed++; // ✅ Increment actual processed count

            const now = Date.now();
            const milestone = Math.max(1, Math.floor(totalLocal / 50));
            if (now - lastEmitTs >= 1000 || (i + 1) === totalLocal || ((i + 1) % milestone === 0)) {
                // ✅ CORRECCIÓN: Calcular progreso basado en procesados vs total
                const processed = sentLocal + failedLocal;
                const progressPercent = Math.min(100, Math.round((processed / totalLocal) * 100));

                emitJobProgress(initialJob._id.toString(), {
                    _id: initialJob._id.toString(),
                    currentIndex: i + 1,
                    total: totalLocal,
                    progress: progressPercent,
                    status: "ejecutando",
                    stats: {
                        sent: sentLocal,
                        failed: failedLocal,
                        pending: Math.max(0, totalLocal - processed)
                    }
                });
                lastEmitTs = now;
            }
        }

        if (i < contactsToSend.length - 1) {
            // 🛡️ ANTI-DETECCIÓN: Verificar horario laboral
            if (!isWorkingHours()) {
                logger.info(`🌙 Fuera de horario laboral. Pausando hasta mañana...`);
                const now = new Date();
                const tomorrow8am = new Date(now);
                tomorrow8am.setDate(tomorrow8am.getDate() + (now.getDay() === 6 ? 2 : 1)); // Skip domingo
                tomorrow8am.setHours(8, 0, 0, 0);
                const waitTime = tomorrow8am - now;

                await addLog({
                    tipo: "info",
                    mensaje: `Job pausado hasta ${tomorrow8am.toLocaleString('es-AR')} (fuera de horario)`,
                    metadata: { jobId, waitTimeHours: Math.round(waitTime / 3600000) }
                });

                await delay(Math.min(waitTime, 3600000)); // Máx 1 hora, luego re-chequear
                continue; // Re-evaluar horario
            }

            const min = Math.max(0, dMin);
            const max = Math.max(min, dMax);

            // 🛡️ ANTI-DETECCIÓN: Delay más humano con distribución gaussiana
            const randomDelay = humanDelay(min, max);

            // 🛡️ ANTI-DETECCIÓN: Simular tiempo de escritura
            const typingTime = calculateTypingTime(messageText.length);
            const typingSeconds = Math.round(typingTime / 1000);

            logger.info(`⌨️ Simulando escritura (${typingSeconds}s) + delay (${randomDelay}s)...`);
            await delay(typingTime); // Simular typing
            await delay(randomDelay * 1000); // Delay post-envío

            // 🛡️ ANTI-DETECCIÓN: Pausa aleatoria ocasional (5% probabilidad)
            if (shouldTakeRandomBreak()) {
                const breakDuration = getRandomBreakDuration();
                logger.info(`☕ Pausa aleatoria: ${Math.round(breakDuration / 1000)}s (simulando distracción humana)`);
                await delay(breakDuration);
            }
        }

        // ✅ CORRECCIÓN: Usar mensajes realmente procesados en vez del índice del array
        if (messagesProcessed > 0 && messagesProcessed % jobBatchSize === 0 && i < contactsToSend.length - 1) {
            // 🛡️ ANTI-DETECCIÓN: Pausa de lote con variabilidad
            const basePause = Math.max(0, pauseMinutes) * 60 * 1000;
            const variability = 0.8 + Math.random() * 0.4; // ±20%
            const pauseMs = Math.floor(basePause * variability);

            // ✅ Cambiar estado a "descanso" durante la pausa de lote
            if (pauseMs > 0) {
                const restBreakUntil = new Date(Date.now() + pauseMs);

                await SendJob.findByIdAndUpdate(jobId, {
                    $set: {
                        status: "descanso",
                        restBreakUntil: restBreakUntil  // ✅ Persistir timestamp
                    }
                });

                const remainingMinutes = Math.ceil(pauseMs / 60000);

                // ✅ FIX: Calcular progressPercent aquí (estaba undefined fuera del scope del if anterior)
                const processed = sentLocal + failedLocal;
                const progressPercent = Math.min(100, Math.round((processed / totalLocal) * 100));

                emitJobProgress(jobId.toString(), {
                    _id: jobId.toString(),
                    currentIndex: i + 1,
                    total: totalLocal,
                    progress: progressPercent,
                    status: "descanso",
                    restBreakUntil: restBreakUntil,
                    restBreakMinutesRemaining: remainingMinutes
                });

                logger.info(`😴 Pausa de lote: ${Math.round(pauseMs / 1000)}s (fin de batch ${Math.floor((i + 1) / jobBatchSize)})`);
                await addLog({
                    tipo: "info",
                    mensaje: `Job ${jobId} en descanso entre lotes`,
                    metadata: {
                        batchNumber: Math.floor((i + 1) / jobBatchSize),
                        pauseDurationSeconds: Math.round(pauseMs / 1000),
                        currentIndex: i + 1
                    }
                });

                await delay(pauseMs);

                // ✅ Volver a estado "ejecutando" después de la pausa
                await SendJob.findByIdAndUpdate(jobId, {
                    $set: {
                        status: "ejecutando",
                        restBreakUntil: null  // ✅ Limpiar timestamp
                    }
                });

                // progressPercent ya está calculado arriba en este mismo bloque if
                emitJobProgress(jobId.toString(), {
                    _id: jobId.toString(),
                    currentIndex: i + 1,
                    total: totalLocal,
                    progress: progressPercent,
                    status: "ejecutando"
                });

                logger.info(`▶️ Reanudando job después del descanso...`);
            }
        }
    }

    const completedJob = await SendJob.findById(jobId).populate('createdBy');
    const completionTime = new Date();
    completedJob.status = "completado";
    completedJob.finishedAt = completionTime;
    completedJob.completedAt = completionTime; // ✅ Registrar fecha de finalización
    await completedJob.save();

    emitJobProgress(completedJob._id.toString(), {
        _id: completedJob._id.toString(),
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

    // ✅ GENERAR REPORTES AUTOMÁTICAMENTE
    try {
        const Report = require('../models/Report');
        const messages = await Message.find({ job: jobId }).populate('contact');

        let reportsGenerated = 0;
        for (const msg of messages) {
            const contact = msg.contact;
            if (!contact) continue;

            // Verificar si ya existe un reporte para este mensaje
            const existing = await Report.findOne({ message: msg._id });
            if (existing) continue;

            const report = new Report({
                fecha: msg.timestamp || msg.createdAt,
                telefono: contact.telefono || "",
                nombre: contact.nombre || "Sin nombre",
                obraSocial: contact.obraSocial || "",
                respondio: msg.respondio || false,
                asesorNombre: completedJob.createdBy?.nombre || "N/A",
                grupo: completedJob.createdBy?.numeroEquipo || "N/A",
                job: completedJob._id,
                contact: contact._id,
                message: msg._id,
                createdBy: completedJob.createdBy?._id,
                campaignName: completedJob.name,
                messageStatus: msg.status,
            });

            await report.save();
            reportsGenerated++;
        }

        logger.info(`📊 Generados ${reportsGenerated} reportes para campaña ${completedJob.name}`);
    } catch (reportErr) {
        logger.error("❌ Error generando reportes automáticos:", reportErr.message);
    }
}

async function sendSingleMessage(userId, to, text, options = {}) {
    const engine = getActiveEngine();
    const flow = options.flow || 'direct';
    const sourceId = options.sourceId || null;
    
    try {
        await recordWhatsAppSendAttempt({
            flow,
            userId,
            sourceId,
            engine,
            recipient: to,
            sendStatus: "queued"
        });

        if (!text || !String(text).trim()) {
            await recordWhatsAppSendAttempt({
                flow, userId, sourceId, engine, recipient: to,
                sendStatus: "failed", errorCode: "WHATSAPP_EMPTY_MESSAGE", errorMessage: "El mensaje de WhatsApp esta vacio."
            });
            return {
                success: false,
                sendStatus: "failed",
                status: "failed",
                engine,
                code: "WHATSAPP_EMPTY_MESSAGE",
                message: "El mensaje de WhatsApp esta vacio.",
            };
        }

        if (!isReady(userId)) {
            await recordWhatsAppSendAttempt({
                flow, userId, sourceId, engine, recipient: to,
                sendStatus: "not_connected", errorCode: "WHATSAPP_NOT_CONNECTED", errorMessage: "WhatsApp no esta conectado."
            });
            return {
                success: false,
                sendStatus: "not_connected",
                status: "not_connected",
                engine,
                code: "WHATSAPP_NOT_CONNECTED",
                message: "WhatsApp no esta conectado.",
            };
        }

        const chatId = formatWhatsAppJid(to, engine);
        const result = await sendMessage(userId, chatId, text);
        if (!result?.success || result?.status !== "accepted") {
            await recordWhatsAppSendAttempt({
                flow, userId, sourceId, engine: result?.engine || engine, jid: chatId, recipient: to,
                sendStatus: result?.status || "failed", errorCode: result?.code || "WHATSAPP_SEND_FAILED", errorMessage: result?.message || "No se pudo enviar el mensaje por WhatsApp."
            });
            return {
                success: false,
                sendStatus: result?.status || "failed",
                status: result?.status || "failed",
                engine: result?.engine || engine,
                code: result?.code || "WHATSAPP_SEND_FAILED",
                message: result?.message || "No se pudo enviar el mensaje por WhatsApp.",
            };
        }

        await recordWhatsAppSendAttempt({
            flow, userId, sourceId, engine: result.engine || engine, jid: chatId, recipient: to,
            sendStatus: "accepted", messageId: result.messageId || null
        });

        return {
            success: true,
            sendStatus: "accepted",
            status: "accepted",
            engine: result.engine || engine,
            messageId: result.messageId || null,
            jid: maskJid(chatId),
            message: "WhatsApp acepto el envio.",
        };
    } catch (err) {
        const status = err.status || (err.code === "WHATSAPP_SEND_UNAVAILABLE" ? "unavailable" : "failed");
        await recordWhatsAppSendAttempt({
            flow, userId, sourceId, engine: err.engine || engine, recipient: to,
            sendStatus: status, errorCode: err.code || "WHATSAPP_SEND_FAILED", errorMessage: err.message
        });
        return {
            success: false,
            sendStatus: status,
            status,
            engine: err.engine || engine,
            code: err.code || "WHATSAPP_SEND_FAILED",
            message: status === "unavailable"
                ? "El servicio de WhatsApp no tiene un metodo de envio disponible para esta sesion."
                : "No se pudo enviar el mensaje por WhatsApp.",
            error: err.message,
        };
    }
}

module.exports = {
    processJob,
    sendSingleMessage
};