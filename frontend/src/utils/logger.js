// frontend/src/utils/logger.js

import axios from "axios";
import { API_URL } from "../config";

const isDev = import.meta.env.MODE === "development";
const enableLogs = import.meta.env.VITE_ENABLE_FRONTEND_LOGS === "true";
const apiBase = API_URL;

// Función para enviar logs al backend (solo producción)
const sendToBackend = async (level, message, extra = {}) => {
    if (isDev || !enableLogs) return; // en dev solo consola o si está deshabilitado
    try {
        await axios.post(`${apiBase}/logs/frontend`, {
            level,
            message: typeof message === "string" ? message : JSON.stringify(message),
            extra,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        // fallback silencioso
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