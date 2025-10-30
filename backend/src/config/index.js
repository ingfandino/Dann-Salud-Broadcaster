// backend/src/config/index.js

const logger = require("../utils/logger");

const requiredInProd = [
    "MONGO_URI",
    "JWT_SECRET",
];

const envConfig = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "5000",
    // Soportar tanto MONGODB_URI como MONGO_URI para compatibilidad
    MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",
    JWT_SECRET: process.env.JWT_SECRET || "",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "",
    WHATSAPP_SESSION_PATH: process.env.WHATSAPP_SESSION_PATH || "./.wwebjs_auth"
};

function validateEnv() {
    // Si estamos en producción, requerimos que ciertos valores estén presentes
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
        
        // Validaciones adicionales de seguridad en producción
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

    // Aviso en development si JWT_SECRET es fallback
    if (!envConfig.JWT_SECRET && envConfig.NODE_ENV !== "production") {
        logger.warn("⚠️ JWT_SECRET no definido; usando valor por defecto (solo para dev). Asegúrate de definirlo en producción.");
    }

    return true;
}

module.exports = {
    envConfig,
    validateEnv
};