// backend/src/config/socket.js

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { addUser, removeUser } = require("./connectedUsers"); // Usamos helpers

let ioInstance = null;

/**
 * Inicializa el servidor de Socket.IO
 */
function initSocket(server, app = null, allowedOrigins = []) {
    // Convert wildcard patterns to regex matchers
    const toRegex = (pattern) => {
        const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
        const wildcarded = escaped.replace(/\*/g, ".*");
        return new RegExp(`^${wildcarded}$`);
    };
    const matchOrigin = (origin) => {
        if (!origin) return true; // allow same-origin/no-origin
        try {
            const o = origin.trim().replace(/\/$/, "");
            return allowedOrigins.some((p) => toRegex(p).test(o));
        } catch {
            return false;
        }
    };

    ioInstance = new Server(server, {
        pingTimeout: 45000,
        pingInterval: 25000,
        cors: {
            origin: (origin, cb) => {
                if (matchOrigin(origin)) return cb(null, true);
                cb(new Error("Socket.IO CORS: origin not allowed"));
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Ensure Origin-Agent-Cluster header is present in all engine responses
    try {
        ioInstance.engine.on("initial_headers", (headers) => {
            headers["Origin-Agent-Cluster"] = "?1";
        });
        ioInstance.engine.on("headers", (headers) => {
            headers["Origin-Agent-Cluster"] = "?1";
        });
    } catch (e) {
        logger.warn("No se pudieron configurar headers iniciales del engine", { error: e?.message });
    }

    if (app) app.set("io", ioInstance);

    // Exponer io globalmente para servicios de notificación
    global.io = ioInstance;

    // Middleware de autenticación JWT (no obligatorio para recibir broadcast públicos como eventos de WhatsApp)
    ioInstance.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            // permitir conexión sin usuario; limitar acciones a suscripciones públicas
            socket.user = null;
            return next();
        }
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = payload;
            next();
        } catch {
            // si el token no es válido, continuar como no autenticado
            socket.user = null;
            next();
        }
    });

    ioInstance.on("connection", (socket) => {
        // Helpers de autorización
        const hasUser = () => !!socket.user;
        const userRole = () => (socket.user?.role || "").toLowerCase();
        const hasRole = (roles = []) => roles.includes(userRole());
        const ackErr = (room, code = "UNAUTHORIZED") => socket.emit("server:err", { ok: false, code, room });

        const user = socket.user || {};
        // JWT payload usa 'sub' como subject; mantener compat con 'id' si existiera
        const userId = user.sub || user.id;
        const userName = user.nombre || user.name || user.email || userId || "?";

        if (userId) {
            addUser(userId); // Agrega usuario conectado
            try {
                socket.join(`user_${userId}`); // Room individual por usuario
            } catch { }
        }

        logger.info(` Socket conectado: ${socket.id} (user: ${userName}, rol: ${user.role || "?"})`);

        // Suscripciones básicas
        socket.on("metrics:subscribe", () => {
            if (!hasUser()) return ackErr("metrics");
            socket.join("metrics");
            socket.emit("server:ack", { ok: true, room: "metrics" });
        });
        socket.on("metrics:unsubscribe", () => socket.leave("metrics"));

        socket.on("logs:subscribe", () => {
            if (!hasUser() || !hasRole(["administrativo", "supervisor"])) return ackErr("logs");
            socket.join("logs");
            socket.emit("server:ack", { ok: true, room: "logs" });
        });
        socket.on("logs:unsubscribe", () => socket.leave("logs"));

        socket.on("job:subscribe", (jobId) => {
            if (!jobId) return;
            if (!hasUser() || !hasRole(["asesor", "supervisor", "administrativo", "gerencia"])) return ackErr(`job_${jobId}`);
            const room = `job_${jobId}`;
            socket.join(room);
            socket.emit("server:ack", { ok: true, room });
        });
        socket.on("job:unsubscribe", (jobId) => socket.leave(`job_${jobId}`));

        socket.on("jobs:subscribe", () => {
            if (!hasUser() || !hasRole(["asesor", "supervisor", "administrativo", "gerencia", "revendedor"])) return ackErr("jobs");
            socket.join("jobs");
            socket.emit("server:ack", { ok: true, room: "jobs" });
        });
        socket.on("jobs:unsubscribe", () => socket.leave("jobs"));

        // Auditorías y Seguimiento
        socket.on("audits:subscribe", (_role) => {
            if (!hasUser()) return ackErr("audits");
            const mapping = { admin: "administrators", gerencia: "administrators", supervisor: "supervisors", auditor: "auditors" };
            const room = mapping[userRole()];
            if (!room) return ackErr("audits", "FORBIDDEN");
            socket.join(room);
            socket.emit("server:ack", { ok: true, room });
            logger.info(` Usuario suscrito a room: ${room}`);
        });

        socket.on("audits:unsubscribe", (role) => {
            const r = role?.toLowerCase();
            if (!r) return;

            const room = r.endsWith("s") ? r : `${r}s`;
            socket.leave(room);
            logger.info(` Usuario abandonó room: ${room}`);
        });

        socket.on("audits:subscribeAll", () => {
            if (!hasUser() || !hasRole(["administrativo", "supervisor", "auditor", "gerencia"])) return ackErr("audits_all");
            socket.join("audits_all");
            socket.emit("server:ack", { ok: true, room: "audits_all" });
        });
        socket.on("audits:unsubscribeAll", () => socket.leave("audits_all"));

        socket.on("audit:subscribe", (auditId) => {
            if (!auditId) return;
            if (!hasUser()) return ackErr(`audit_${auditId}`);
            socket.join(`audit_${auditId}`);
            socket.emit("server:ack", { ok: true, room: `audit_${auditId}` });
        });
        socket.on("audit:unsubscribe", (auditId) => socket.leave(`audit_${auditId}`));

        socket.on("followups:subscribe", () => {
            if (!hasUser()) return ackErr("followups");
            socket.join("followups");
            socket.emit("server:ack", { ok: true, room: "followups" });
        });
        socket.on("followups:unsubscribe", () => socket.leave("followups"));

        // Ready / Disconnect
        socket.emit("server:ready", { connected: true, ts: Date.now() });

        socket.on("disconnect", () => {
            if (userId) {
                removeUser(userId); // ✅ Elimina usuario conectado
            }
            logger.info(`🔌 Socket desconectado: ${socket.id} (user: ${userName})`);
        });
    });

    logger.info("✅ Socket.IO inicializado correctamente");
    return ioInstance;
}

/**
 * Retorna la instancia actual de Socket.IO
 */
function getIO() {
    if (!ioInstance) throw new Error("Socket.IO no ha sido inicializado aún");
    return ioInstance;
}

/**
 * Emite un evento seguro (con try/catch)
 */
function safeEmit(room, event, payload) {
    try {
        getIO().to(room).emit(event, payload);
    } catch (err) {
        logger.warn(`⚠️ No se pudo emitir a ${room}: ${err.message}`);
    }
}

// ==========================
// 🔸 Helpers de emisión
// ==========================

function emitMetrics(event, payload) {
    safeEmit("metrics", event, payload);
}

function emitJobProgress(jobId, payload) {
    safeEmit(`job_${jobId}`, "job:progress", payload);
    safeEmit("jobs", "job:progress", payload); // ✅ Emitir también a la sala global de jobs
}
function emitJobsUpdate(payload) {
    safeEmit("jobs", "jobs:update", payload);
}

function emitNewLog(log) {
    safeEmit("logs", "logs:new", log);
}

function emitNewAudit(audit) {
    safeEmit("audits_all", "audits:new", audit);
    safeEmit("auditors", "audits:new", audit);
    safeEmit("supervisors", "audits:new", audit);
    safeEmit("administrators", "audits:new", audit);
    logger.info(`📢 Nueva auditoría emitida: ${audit._id}`);
}

function emitAuditUpdate(auditId, payload) {
    safeEmit(`audit_${auditId}`, "audit:update", payload);
    safeEmit("audits_all", "audit:update", payload);
}

function emitFollowUpUpdate(payload) {
    safeEmit("followups", "followup:update", payload);
}

// ✅ NUEVO: Notificar eliminación de auditoría
function emitAuditDeleted(auditId) {
    safeEmit("audits_all", "audit:deleted", { _id: auditId });
    safeEmit("auditors", "audit:deleted", { _id: auditId });
    safeEmit("supervisors", "audit:deleted", { _id: auditId });
    safeEmit("administrators", "audit:deleted", { _id: auditId });
    logger.info(`🗑️ Auditoría eliminada emitida: ${auditId}`);
}

// ✅ NUEVO: Notificar fallo definitivo de mensaje después de reintentos
function emitMessageFailureAlert(userId, contactInfo, jobId) {
    if (!userId) return;
    safeEmit(`user_${userId}`, "message:failure_alert", {
        contact: contactInfo,
        jobId: jobId,
        message: `Mensaje a ${contactInfo.nombre || contactInfo.telefono} falló después de 20 intentos`,
        timestamp: new Date()
    });
    logger.warn(`⚠️ Alerta de fallo enviada a usuario ${userId} para contacto ${contactInfo.telefono}`);
}

module.exports = {
    initSocket,
    getIO,
    emitMetrics,
    emitJobProgress,
    emitJobsUpdate,
    emitNewLog,
    emitNewAudit,
    emitAuditUpdate,
    emitAuditDeleted,  // ✅ Nueva función para eliminación
    emitFollowUpUpdate,
    emitMessageFailureAlert,
};