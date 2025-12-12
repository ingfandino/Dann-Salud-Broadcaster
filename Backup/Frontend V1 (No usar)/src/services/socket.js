// frontend/src/services/socket.js
import { io } from "socket.io-client";
import logger from "../utils/logger";
import { SOCKET_ORIGIN } from "../config";

const URL = SOCKET_ORIGIN;

if (!URL) {
    logger.warn("⚠️ SOCKET_ORIGIN no está definida, el socket no podrá conectarse.");
}

const socket = io(URL, {
    autoConnect: false,
    // Permitir fallback a polling en redes/VPN que bloquean WS puro
    transports: ["websocket", "polling"],
    timeout: 10000,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    auth: () => {
        const token = localStorage.getItem("token");
        return token ? { token } : {};
    },
});

// Logs de diagnóstico
socket.on("connect", () => {
    logger.info("✅ Socket conectado:", socket.id);
});

socket.on("disconnect", (reason) => {
    logger.warn("🔌 Socket desconectado:", reason);
});

socket.on("connect_error", (err) => {
    logger.error("❌ Error de conexión de Socket:", err.message);
});

// ✅ NUEVO: Listener global para alertas de fallos de mensajes
socket.on("message:failure_alert", (data) => {
    // Importar toast dinámicamente para evitar problemas de dependencias circulares
    import('react-toastify').then(({ toast }) => {
        toast.error(
            `❌ Fallo definitivo: ${data.message}`,
            {
                position: "top-right",
                autoClose: 10000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            }
        );
    });
    logger.error("❌ Alerta de fallo de mensaje:", data);
});

// 🔹 Métricas globales
export function subscribeToMetrics(callback) {
    socket.emit("metrics:subscribe");
    socket.on("metrics:update", callback);

    return () => {
        socket.emit("metrics:unsubscribe");
        socket.off("metrics:update", callback);
    };
}

// 🔹 Jobs generales
export function subscribeToJobs(callback) {
    socket.emit("jobs:subscribe");
    socket.on("jobs:update", callback);

    return () => {
        socket.emit("jobs:unsubscribe");
        socket.off("jobs:update", callback);
    };
}

// 🔹 Progreso de un job específico
export function subscribeToJobProgress(jobId, callback) {
    socket.emit("job:subscribe", jobId);
    socket.on("job:progress", callback);

    return () => {
        socket.emit("job:unsubscribe", jobId);
        socket.off("job:progress", callback);
    };
}

// 🔹 Logs en vivo
export function subscribeToLogs(callback) {
    socket.emit("logs:subscribe");
    socket.on("logs:new", callback);

    return () => {
        socket.emit("logs:unsubscribe");
        socket.off("logs:new", callback);
    };
}

export default socket;