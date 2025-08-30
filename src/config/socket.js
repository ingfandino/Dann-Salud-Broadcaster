// src/config/socket.js

const { Server } = require("socket.io");

let ioInstance = null;

/**
 * Inicializa Socket.IO sobre el HTTP server de Express.
 * - Crea una "room" 'metrics' para suscriptores del panel.
 * - Emite un ping inicial para probar la conexión.
 */
function initSocket(server) {
    ioInstance = new Server(server, {
        cors: {
            origin: ["http://localhost:3000", "http://localhost:3001"],
            methods: ["GET", "POST"],
        },
    });

    ioInstance.on("connection", (socket) => {
        console.log("🔌 Socket conectado:", socket.id);

        // Suscripción al canal de métricas
        socket.on("metrics:subscribe", () => {
            socket.join("metrics");
            socket.emit("server:ack", { ok: true, room: "metrics" });
        });

        // Opcional: desuscribirse
        socket.on("metrics:unsubscribe", () => {
            socket.leave("metrics");
        });

        // Suscripción al canal de jobs (para progreso por job)
        socket.on("job:subscribe", (jobId) => {
            socket.join(`job_${jobId}`);
            socket.emit("server:ack", { ok: true, room: `job_${jobId}` });
        });

        socket.on("job:unsubscribe", (jobId) => {
            socket.leave(`job_${jobId}`);
        });

        // Ping inicial
        socket.emit("server:ready", { connected: true, ts: Date.now() });

        socket.on("disconnect", () => {
            console.log("🔌 Socket desconectado:", socket.id);
        });
    });

    console.log("✅ Socket.IO inicializado");
    return ioInstance;
}

/** Obtiene la instancia de io (lanza error si no está inicializada) */
function getIO() {
    if (!ioInstance) {
        throw new Error("Socket.IO no ha sido inicializado aún");
    }
    return ioInstance;
}

/** Helper para emitir a la room de métricas */
function emitMetrics(event, payload) {
    getIO().to("metrics").emit(event, payload);
}

/** Helper para emitir progreso de un job a su propia room */
function emitJobProgress(jobId, payload) {
    getIO().to(`job_${jobId}`).emit("job:progress", payload);
}

module.exports = { initSocket, getIO, emitMetrics, emitJobProgress };