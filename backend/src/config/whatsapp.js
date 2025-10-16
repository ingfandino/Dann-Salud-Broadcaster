// backend/src/config/whatsapp.js

const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
const path = require("path");
const logger = require("../utils/logger");

let whatsappClient = null;
const whatsappEvents = new EventEmitter();

// 🔎 Estado actual
let ready = false;
let qrTimeout = null;
let currentQR = null;

function getSessionPath() {
    return process.env.WHATSAPP_SESSION_PATH || path.resolve(process.cwd(), ".wwebjs_auth");
}

async function initWhatsappClient() {
    try {
        if (whatsappClient) {
            try {
                await whatsappClient.destroy();
            } catch (err) {
                logger.warn("⚠️ Error al destruir cliente previo:", err.message);
            }
            whatsappClient = null;
        }

        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: getSessionPath(),
            }),
            puppeteer: { headless: true, args: ["--no-sandbox"] },
        });

        // Eventos base
        whatsappClient.on("qr", (qr) => {
            logger.info("📡 QR recibido (emitido a frontend)");
            whatsappEvents.emit("qr", qr);
            currentQR = qr;

            // Limpiar timeout anterior
            if (qrTimeout) clearTimeout(qrTimeout);
            
            // QR expira en 60 segundos
            qrTimeout = setTimeout(() => {
                logger.warn("⏰ QR expirado, generando nuevo...");
                whatsappEvents.emit("qr_expired");
                // Forzar nueva sesión
                forceNewSession();
            }, 60000);
        });

        whatsappClient.on("ready", () => {
            if (qrTimeout) {
                clearTimeout(qrTimeout);
                qrTimeout = null;
            }
            ready = true;
            currentQR = null;
            logger.info("✅ WhatsApp listo y vinculado");
            whatsappEvents.emit("ready");
        });

        whatsappClient.on("authenticated", () => {
            logger.info("🔐 Cliente autenticado");
            whatsappEvents.emit("authenticated");
        });

        whatsappClient.on("disconnected", (reason) => {
            ready = false;
            currentQR = null;
            logger.warn(`⚠️ Cliente desconectado: ${reason}`);
            whatsappEvents.emit("disconnected");
        });

        whatsappClient.on("auth_failure", (msg) => {
            ready = false;
            currentQR = null;
            logger.error("❌ Fallo de autenticación:", msg);
            whatsappEvents.emit("auth_failure", msg);
        });

        // Proxy eventos de mensajes entrantes
        whatsappClient.on("message", (msg) => whatsappEvents.emit("message", msg));

        logger.info("⏳ Inicializando cliente de WhatsApp...");
        await whatsappClient.initialize();
        logger.info("✅ Cliente inicializado correctamente");

        return whatsappClient;
    } catch (err) {
        logger.error("❌ Error inicializando WhatsApp:", err);
        throw err;
    }
}

async function forceNewSession() {
    logger.info("♻️ Forzando nueva sesión de WhatsApp...");

    // 1. Marcar el estado como no listo inmediatamente.
    ready = false;
    currentQR = null;

    // 2. Destruir el cliente existente de forma segura.
    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
            logger.info("Cliente de WhatsApp anterior destruido.");
        } catch (err) {
            logger.warn("⚠️ Error al destruir el cliente previo (puede que ya estuviera cerrado):", err.message);
        }
        whatsappClient = null;
    }

    // 3. Pausa breve para asegurar que los recursos se liberen.
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 4. Reinicializar el cliente.
    try {
        await initWhatsappClient();
    } catch (err) {
        logger.error("❌ Error forzando nueva sesión:", err);
        // No relanzar el error para no detener el servidor, pero el estado ya es 'no listo'.
    }
}

function getWhatsappClient() {
    return whatsappClient;
}

function isReady() {
    return ready && !!whatsappClient;
}

function getCurrentQR() {
    return currentQR;
}

module.exports = {
    initWhatsappClient,
    getWhatsappClient,
    forceNewSession,
    isReady,
    getCurrentQR,
    getSessionPath,
    whatsappEvents,
};