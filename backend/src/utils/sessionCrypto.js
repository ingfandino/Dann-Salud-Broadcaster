/**
 * ============================================================
 * CRIPTOGRAFÍA DE SESIONES (sessionCrypto.js)
 * ============================================================
 * Encriptación/desencriptación de datos de sesión WhatsApp
 * usando AES-256-GCM para mayor seguridad.
 */

const crypto = require("crypto");
const logger = require("../utils/logger");

/* ========== VALIDACIÓN DE SECRETO ========== */
if (!process.env.SESSION_SECRET) {
    logger.error("❌ FATAL: SESSION_SECRET no definido. Configúralo en tu .env");
    process.exit(1); // detener ejecución
}

const KEY = crypto.scryptSync(process.env.SESSION_SECRET, "salt", 32);
const ALGO = "aes-256-gcm";

function encryptSession(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGO, KEY, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(data), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({ iv: iv.toString("hex"), data: encrypted.toString("hex"), tag: tag.toString("hex") });
}

function decryptSession(payload) {
    const { iv, data, tag } = JSON.parse(payload);
    const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(tag, "hex"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(data, "hex")), decipher.final()]);
    return JSON.parse(decrypted.toString("utf8"));
}

module.exports = { encryptSession, decryptSession };