// backend/src/config/index.js

const logger = require("../utils/logger");

const requiredInProd = [
    "MONGO_URI",
    "JWT_SECRET",
];

const envConfig = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || "5000",
    MONGO_URI: process.env.MONGO_URI || "",
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
            logger.error("FATAL: Faltan variables de entorno obligatorias en production:", missing.join(", "));
            process.exit(1);
        }
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