/**
 * ============================================================
 * CLIENTE DE WHATSAPP WEB (whatsapp-web.js)
 * ============================================================
 * Este archivo gestiona la conexión con WhatsApp Web mediante
 * la librería whatsapp-web.js. Maneja autenticación por QR,
 * reconexión automática, y emisión de eventos para el frontend.
 * 
 * Eventos emitidos:
 * - qr: Nuevo código QR para escanear
 * - qr_expired: QR expiró sin ser escaneado
 * - ready: Cliente listo para enviar mensajes
 * - authenticated: Sesión autenticada correctamente
 * - disconnected: Cliente desconectado
 * - auth_failure: Falló la autenticación
 * - message: Mensaje entrante recibido
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 50;
const path = require("path");
const logger = require("../utils/logger");

/** Instancia del cliente de WhatsApp */
let whatsappClient = null;

/** Emisor de eventos para notificar cambios de estado */
const whatsappEvents = new EventEmitter();
whatsappEvents.setMaxListeners(50);

/** Variables de estado del cliente */
let ready = false;
let qrTimeout = null;
let currentQR = null;
let initInFlight = false;

/**
 * Obtiene la ruta donde se almacena la sesión de WhatsApp.
 * @returns {string} Ruta del directorio de sesión
 */
function getSessionPath() {
    return process.env.WHATSAPP_SESSION_PATH || path.resolve(process.cwd(), ".wwebjs_auth");
}

/**
 * Inicializa el cliente de WhatsApp Web.
 * Configura Puppeteer con opciones optimizadas para entornos restringidos.
 * Establece listeners para todos los eventos del ciclo de vida de la sesión.
 * @returns {Promise<Client>} Instancia del cliente inicializado
 */
async function initWhatsappClient() {
    try {
        /** Destruir cliente previo si existe */
        if (whatsappClient) {
            try {
                await whatsappClient.destroy();
            } catch (err) {
                logger.warn("⚠️ Error al destruir cliente previo:", err.message);
            }
            whatsappClient = null;
        }

        /** Configuración de Puppeteer para entornos sin interfaz gráfica */
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

        /** Crear nueva instancia del cliente */
        whatsappClient = new Client({
            authStrategy: new LocalAuth({
                dataPath: getSessionPath(),
            }),
            puppeteer: puppeteerConfig,
        });

        /** Evento: Nuevo código QR generado */
        whatsappClient.on("qr", (qr) => {
            logger.info("📡 QR recibido (emitido a frontend)");
            whatsappEvents.emit("qr", qr);
            currentQR = qr;

            if (qrTimeout) clearTimeout(qrTimeout);
            
            /** El QR expira en 60 segundos, forzar nueva sesión si no se escanea */
            qrTimeout = setTimeout(() => {
                logger.warn("⏰ QR expirado, generando nuevo...");
                whatsappEvents.emit("qr_expired");
                forceNewSession();
            }, 60000);
        });

        /** Evento: Cliente listo para enviar mensajes */
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

        /** Evento: Sesión autenticada correctamente */
        whatsappClient.on("authenticated", () => {
            logger.info("🔐 Cliente autenticado");
            whatsappEvents.emit("authenticated");
        });

        /** Evento: Cliente desconectado */
        whatsappClient.on("disconnected", (reason) => {
            ready = false;
            currentQR = null;
            if (qrTimeout) { try { clearTimeout(qrTimeout); } catch {} qrTimeout = null; }
            logger.warn(`⚠️ Cliente desconectado: ${reason}`);
            whatsappEvents.emit("disconnected");
        });

        /** Evento: Falló la autenticación */
        whatsappClient.on("auth_failure", (msg) => {
            ready = false;
            currentQR = null;
            if (qrTimeout) { try { clearTimeout(qrTimeout); } catch {} qrTimeout = null; }
            logger.error("❌ Fallo de autenticación:", msg);
            whatsappEvents.emit("auth_failure", msg);
        });

        /** Reenviar mensajes entrantes al emisor de eventos */
        whatsappClient.on("message", (msg) => whatsappEvents.emit("message", msg));

        logger.info("⏳ Inicializando cliente de WhatsApp...");
        
        /** Mutex para evitar inicializaciones concurrentes */
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

/**
 * Fuerza el cierre de la sesión actual y reinicia el cliente.
 * Útil cuando el QR expira o se necesita una nueva vinculación.
 */
async function forceNewSession() {
    logger.info("♻️ Forzando nueva sesión de WhatsApp...");

    ready = false;
    currentQR = null;

    if (whatsappClient) {
        try {
            await whatsappClient.destroy();
            logger.info("Cliente de WhatsApp anterior destruido.");
        } catch (err) {
            logger.warn("⚠️ Error al destruir el cliente previo (puede que ya estuviera cerrado):", err.message);
        }
        whatsappClient = null;
    }

    /** Pausa breve para liberar recursos del navegador */
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        await initWhatsappClient();
    } catch (err) {
        logger.error("❌ Error forzando nueva sesión:", err);
    }
}

/**
 * Obtiene la instancia actual del cliente de WhatsApp.
 * @returns {Client|null} Cliente o null si no está inicializado
 */
function getWhatsappClient() {
    return whatsappClient;
}

/**
 * Verifica si el cliente está listo para enviar mensajes.
 * @returns {boolean} true si está conectado y listo
 */
function isReady() {
    return ready && !!whatsappClient;
}

/**
 * Obtiene el código QR actual para vinculación.
 * @returns {string|null} Código QR en formato texto o null
 */
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