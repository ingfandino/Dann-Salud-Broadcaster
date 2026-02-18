/**
 * ============================================================
 * CONFIGURACIÓN DE SOCKET.IO PARA COMUNICACIÓN EN TIEMPO REAL
 * ============================================================
 * Este archivo configura el servidor Socket.IO que permite comunicación
 * bidireccional en tiempo real entre el servidor y los clientes.
 * Se usa para: notificaciones de auditorías, progreso de envíos,
 * métricas en vivo, y alertas de sistema.
 */

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const { addUser, removeUser } = require("./connectedUsers");

/** Instancia singleton del servidor Socket.IO */
let ioInstance = null;

/**
 * Inicializa el servidor Socket.IO con autenticación JWT y control de CORS.
 * @param {object} server - Servidor HTTP de Node.js
 * @param {object} app - Instancia de Express (opcional)
 * @param {string[]} allowedOrigins - Lista de orígenes permitidos
 * @returns {object} Instancia de Socket.IO
 */
function initSocket(server, app = null, allowedOrigins = []) {
    /** Convierte patrones con wildcards (*) a expresiones regulares */
    const toRegex = (pattern) => {
        const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
        const wildcarded = escaped.replace(/\*/g, ".*");
        return new RegExp(`^${wildcarded}$`);
    };
    
    /** Verifica si un origen está permitido según la lista de orígenes */
    const matchOrigin = (origin) => {
        if (!origin) return true;
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

    /** Agregar header de seguridad para aislamiento de origen */
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
    global.io = ioInstance;

    /**
     * Middleware de autenticación JWT.
     * Permite conexiones sin token (para broadcasts públicos),
     * pero restringe ciertas salas a usuarios autenticados.
     */
    ioInstance.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            socket.user = null;
            return next();
        }
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = payload;
            next();
        } catch {
            socket.user = null;
            next();
        }
    });

    /** Manejo de conexiones de clientes Socket.IO */
    ioInstance.on("connection", (socket) => {
        /** Funciones auxiliares para verificar permisos del usuario */
        const hasUser = () => !!socket.user;
        const userRole = () => (socket.user?.role || "").toLowerCase();
        const hasRole = (roles = []) => roles.includes(userRole());
        const ackErr = (room, code = "UNAUTHORIZED") => socket.emit("server:err", { ok: false, code, room });

        const user = socket.user || {};
        const userId = user.sub || user.id;
        const userName = user.nombre || user.name || user.email || userId || "?";

        /** Registrar usuario conectado y unirlo a su sala personal */
        if (userId) {
            addUser(userId);
            try {
                socket.join(`user_${userId}`);
            } catch { }
        }

        logger.info(` Socket conectado: ${socket.id} (user: ${userName}, rol: ${user.role || "?"})`);

        /** === SUSCRIPCIONES A MÉTRICAS EN TIEMPO REAL === */
        socket.on("metrics:subscribe", () => {
            if (!hasUser()) return ackErr("metrics");
            socket.join("metrics");
            socket.emit("server:ack", { ok: true, room: "metrics" });
        });
        socket.on("metrics:unsubscribe", () => socket.leave("metrics"));

        /** === SUSCRIPCIONES A LOGS DEL SISTEMA === */
        socket.on("logs:subscribe", () => {
            if (!hasUser() || !hasRole(["administrativo", "supervisor"])) return ackErr("logs");
            socket.join("logs");
            socket.emit("server:ack", { ok: true, room: "logs" });
        });
        socket.on("logs:unsubscribe", () => socket.leave("logs"));

        /** === SUSCRIPCIONES A TRABAJOS DE ENVÍO ESPECÍFICOS === */
        socket.on("job:subscribe", (jobId) => {
            if (!jobId) return;
            if (!hasUser() || !hasRole(["asesor", "supervisor", "administrativo", "gerencia"])) return ackErr(`job_${jobId}`);
            const room = `job_${jobId}`;
            socket.join(room);
            socket.emit("server:ack", { ok: true, room });
        });
        socket.on("job:unsubscribe", (jobId) => socket.leave(`job_${jobId}`));

        /** === SUSCRIPCIONES A TODOS LOS TRABAJOS === */
        socket.on("jobs:subscribe", () => {
            if (!hasUser() || !hasRole(["asesor", "supervisor", "administrativo", "gerencia"])) return ackErr("jobs");
            socket.join("jobs");
            socket.emit("server:ack", { ok: true, room: "jobs" });
        });
        socket.on("jobs:unsubscribe", () => socket.leave("jobs"));

        /** === SUSCRIPCIONES A AUDITORÍAS POR ROL === */
        socket.on("audits:subscribe", (_role) => {
            if (!hasUser()) return ackErr("audits");
            const mapping = { admin: "administrators", gerencia: "administrators", supervisor: "supervisors", encargado: "supervisors", auditor: "auditors" };
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

        /** === SUSCRIPCIONES GLOBALES A TODAS LAS AUDITORÍAS === */
        socket.on("audits:subscribeAll", () => {
            if (!hasUser() || !hasRole(["administrativo", "supervisor", "auditor", "gerencia"])) return ackErr("audits_all");
            socket.join("audits_all");
            socket.emit("server:ack", { ok: true, room: "audits_all" });
        });
        socket.on("audits:unsubscribeAll", () => socket.leave("audits_all"));

        /** === SUSCRIPCIONES A AUDITORÍA ESPECÍFICA === */
        socket.on("audit:subscribe", (auditId) => {
            if (!auditId) return;
            if (!hasUser()) return ackErr(`audit_${auditId}`);
            socket.join(`audit_${auditId}`);
            socket.emit("server:ack", { ok: true, room: `audit_${auditId}` });
        });
        socket.on("audit:unsubscribe", (auditId) => socket.leave(`audit_${auditId}`));

        /** === SUSCRIPCIONES A SEGUIMIENTOS === */
        socket.on("followups:subscribe", () => {
            if (!hasUser()) return ackErr("followups");
            socket.join("followups");
            socket.emit("server:ack", { ok: true, room: "followups" });
        });
        socket.on("followups:unsubscribe", () => socket.leave("followups"));

        /** Notificar al cliente que la conexión está lista */
        socket.emit("server:ready", { connected: true, ts: Date.now() });

        /** Manejar desconexión del cliente */
        socket.on("disconnect", () => {
            if (userId) {
                removeUser(userId);
            }
            logger.info(`🔌 Socket desconectado: ${socket.id} (user: ${userName})`);
        });
    });

    logger.info("✅ Socket.IO inicializado correctamente");
    return ioInstance;
}

/**
 * Obtiene la instancia actual de Socket.IO.
 * @throws {Error} Si Socket.IO no ha sido inicializado
 * @returns {object} Instancia de Socket.IO
 */
function getIO() {
    if (!ioInstance) throw new Error("Socket.IO no ha sido inicializado aún");
    return ioInstance;
}

/**
 * Emite un evento de forma segura a una sala específica.
 * Captura errores para evitar que un fallo detenga el flujo.
 * @param {string} room - Nombre de la sala destino
 * @param {string} event - Nombre del evento a emitir
 * @param {object} payload - Datos a enviar
 */
function safeEmit(room, event, payload) {
    try {
        getIO().to(room).emit(event, payload);
    } catch (err) {
        logger.warn(`⚠️ No se pudo emitir a ${room}: ${err.message}`);
    }
}

/* ============================================================
 * FUNCIONES DE EMISIÓN DE EVENTOS EN TIEMPO REAL
 * Estas funciones notifican a los clientes sobre cambios del sistema.
 * ============================================================ */

/** Emite eventos de métricas del sistema */
function emitMetrics(event, payload) {
    safeEmit("metrics", event, payload);
}

/** Emite progreso de un trabajo de envío a la sala específica y global */
function emitJobProgress(jobId, payload) {
    safeEmit(`job_${jobId}`, "job:progress", payload);
    safeEmit("jobs", "job:progress", payload);
}

/** Emite actualización de la lista de trabajos */
function emitJobsUpdate(payload) {
    safeEmit("jobs", "jobs:update", payload);
}

/** Emite un nuevo registro de log del sistema */
function emitNewLog(log) {
    safeEmit("logs", "logs:new", log);
}

/** Notifica a todos los roles sobre una nueva auditoría creada */
function emitNewAudit(audit) {
    safeEmit("audits_all", "audits:new", audit);
    safeEmit("auditors", "audits:new", audit);
    safeEmit("supervisors", "audits:new", audit);
    safeEmit("administrators", "audits:new", audit);
    logger.info(`📢 Nueva auditoría emitida: ${audit._id}`);
}

/** Notifica actualización de una auditoría específica */
function emitAuditUpdate(auditId, payload) {
    safeEmit(`audit_${auditId}`, "audit:update", payload);
    safeEmit("audits_all", "audit:update", payload);
}

/** Notifica actualización en los seguimientos programados */
function emitFollowUpUpdate(payload) {
    safeEmit("followups", "followup:update", payload);
}

/** Notifica a todos los roles que una auditoría fue eliminada */
function emitAuditDeleted(auditId) {
    safeEmit("audits_all", "audit:deleted", { _id: auditId });
    safeEmit("auditors", "audit:deleted", { _id: auditId });
    safeEmit("supervisors", "audit:deleted", { _id: auditId });
    safeEmit("administrators", "audit:deleted", { _id: auditId });
    logger.info(`🗑️ Auditoría eliminada emitida: ${auditId}`);
}

/**
 * Notifica a un usuario específico sobre el fallo definitivo de un mensaje.
 * Se usa cuando un mensaje falló después de múltiples reintentos.
 */
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