/**
 * ============================================================
 * CONFIGURACIÓN CENTRAL DE VARIABLES DE ENTORNO
 * ============================================================
 * Este archivo centraliza todas las variables de entorno del sistema.
 * Proporciona valores por defecto para desarrollo y valida que las
 * variables críticas estén presentes en producción.
 */

const logger = require("../utils/logger");

/**
 * Lista de variables obligatorias en modo producción.
 * Si alguna falta, el servidor no arrancará.
 */
const requiredInProd = [
    "MONGO_URI",
    "JWT_SECRET",
];

/**
 * Objeto con todas las variables de configuración del sistema.
 * Soporta múltiples nombres para compatibilidad (MONGODB_URI / MONGO_URI).
 */
const envConfig = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "5000",
    MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "",
    WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH || "./.wwebjs_auth"
};

/**
 * Valida que las variables de entorno críticas estén configuradas.
 * En producción, detiene el servidor si faltan variables obligatorias
 * o si se detectan valores inseguros como JWT_SECRET por defecto.
 * 
 * @returns {boolean} true si la validación es exitosa
 */
function validateEnv() {
    const missing = [];
    
    if (envConfig.NODE_ENV === "production") {
        for (const k of requiredInProd) {
            if (!envConfig[k]) missing.push(k);
        }
        
        if (missing.length > 0) {
            logger.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            logger.error("❌ MODO PRODUCCIÓN: Faltan variables obligatorias");
            logger.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            logger.error("");
            logger.error("Variables faltantes:", missing.join(", "));
            logger.error("");
            logger.error("Por favor, configura tu archivo .env con:");
            logger.error("");
            if (missing.includes("MONGO_URI")) {
                logger.error("  MONGODB_URI=mongodb://username:password@localhost:27017/dann-salud-broadcaster?authSource=admin");
            }
            if (missing.includes("JWT_SECRET")) {
                logger.error("  JWT_SECRET=tu-clave-secreta-muy-segura-cambiar-esto");
            }
            logger.error("");
            logger.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            process.exit(1);
        }
        
        if (envConfig.JWT_SECRET === "your-secret-key-here-change-in-production") {
            logger.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            logger.error("❌ MODO PRODUCCIÓN: JWT_SECRET inseguro");
            logger.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            logger.error("");
            logger.error("No puedes usar el JWT_SECRET por defecto en producción.");
            logger.error("Genera uno seguro con:");
            logger.error("  openssl rand -base64 64");
            logger.error("");
            logger.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            process.exit(1);
        }
        
        logger.info("✅ Variables de entorno de PRODUCCIÓN validadas correctamente");
    }

    if (!envConfig.JWT_SECRET && envConfig.NODE_ENV !== "production") {
        logger.warn("⚠️ JWT_SECRET no definido; usando valor por defecto (solo para dev). Asegúrate de definirlo en producción.");
    }

    return true;
}

module.exports = {
    envConfig,
    validateEnv
};