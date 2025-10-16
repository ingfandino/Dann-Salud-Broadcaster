// frontend/src/utils/logger.js

import axios from "axios";

const isDev = import.meta.env.MODE === "development";
const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Función para enviar logs al backend (solo producción)
const sendToBackend = async (level, message, extra = {}) => {
    if (isDev) return; // en dev solo consola
    try {
        await axios.post(`${apiBase}/logs/frontend`, {
            level,
            message: typeof message === "string" ? message : JSON.stringify(message),
            extra,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        // fallback sin romper el flujo
        console.error("❌ Error enviando log al backend:", err.message);
    }
};

const logger = {
    info: (msg, ...args) => {
        console.info("ℹ️ [INFO]:", msg, ...args);
        sendToBackend("info", msg, args);
    },
    warn: (msg, ...args) => {
        console.warn("⚠️ [WARN]:", msg, ...args);
        sendToBackend("warn", msg, args);
    },
    error: (msg, ...args) => {
        console.error("❌ [ERROR]:", msg, ...args);
        sendToBackend("error", msg, args);
    },
    debug: (msg, ...args) => {
        if (isDev) {
            console.debug("🐛 [DEBUG]:", msg, ...args);
        }
        sendToBackend("debug", msg, args);
    },
};

export default logger;