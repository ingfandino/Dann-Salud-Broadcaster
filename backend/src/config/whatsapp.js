// backend/src/config/whatsapp.js

const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
// Evitar warnings por listeners acumulados y permitir más suscriptores sin ruido
EventEmitter.defaultMaxListeners = 50;
const path = require("path");
const logger = require("../utils/logger");

let whatsappClient = null;
const whatsappEvents = new EventEmitter();
whatsappEvents.setMaxListeners(50);

// 🔎 Estado actual
let ready = false;
let qrTimeout = null;
let currentQR = null;
let initInFlight = false; // mutex simple para evitar initialize() concurrentes

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

        // Construir flags de Puppeteer más robustos para entornos restringidos/containers
        const puppeteerArgs = [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--no-zygote",
            "--ignore-certificate-errors",
        ];
        if (process.env.HTTPS_PROXY) {
            puppeteerArgs.push(`--proxy-server=${process.env.HTTPS_PROXY}`);
        }

        const puppeteerConfig = {
            headless: true,
            args: puppeteerArgs,
        };
        if (process.env.WHATSAPP_CHROME_PATH) {
            puppeteerConfig.executablePath = process.env.WHATSAPP_CHROME_PATH;
        }

        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: getSessionPath(),
            }),
            puppeteer: puppeteerConfig,
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
            if (qrTimeout) { try { clearTimeout(qrTimeout); } catch {} qrTimeout = null; }
            logger.warn(`⚠️ Cliente desconectado: ${reason}`);
            whatsappEvents.emit("disconnected");
        });

        whatsappClient.on("auth_failure", (msg) => {
            ready = false;
            currentQR = null;
            if (qrTimeout) { try { clearTimeout(qrTimeout); } catch {} qrTimeout = null; }
            logger.error("❌ Fallo de autenticación:", msg);
            whatsappEvents.emit("auth_failure", msg);
        });

        // Proxy eventos de mensajes entrantes
        whatsappClient.on("message", (msg) => whatsappEvents.emit("message", msg));

        logger.info("⏳ Inicializando cliente de WhatsApp...");
        // Mutex: evitar doble initialize en paralelo
        if (initInFlight) {
            logger.warn("⚠️ initialize() ya en curso; evitando llamada concurrente");
            return whatsappClient;
        }
        initInFlight = true;
        try {
            await whatsappClient.initialize();
            logger.info("✅ Cliente inicializado correctamente");
        } finally {
            initInFlight = false;
        }

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

    // 4. Reinicializar el cliente (respetando el mutex para evitar carreras).
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