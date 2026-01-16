/**
 * ============================================================
 * CONTROLADOR DE AUDITORÍAS (auditController)
 * ============================================================
 * Gestiona el ciclo de vida completo de las auditorías (ventas):
 * - Creación y programación de turnos
 * - Actualización de estados y datos
 * - Gestión de multimedia (imágenes, videos, claves)
 * - Exportación a CSV
 * - Notificaciones en tiempo real vía Socket.IO
 * 
 * Las auditorías representan ventas pendientes de verificación.
 */

const Audit = require('../models/Audit');
const User = require('../models/User');
const InternalMessage = require('../models/InternalMessage');
const {
    emitNewAudit,
    emitAuditUpdate,
    emitFollowUpUpdate,
    getIO
} = require("../config/socket");
const { Parser } = require('json2csv');
const logger = require("../utils/logger");
const {
    notifyAuditDeleted,
    notifyAuditCreated,
    notifyAuditCompleted,
    notifyAuditQRDone,
    notifyRecoveryAuditCompleted
} = require("../services/notificationService");
const { escapeRegex } = require("../utils/stringUtils");

/**
 * Parsea un string tipo 'YYYY-MM-DDTHH:mm' a Date local
 */
function parseLocalDateTime(datetimeStr) {
    if (!datetimeStr || typeof datetimeStr !== 'string') return null;
    const [datePart, timePart = '00:00:00'] = datetimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0, 0);
}

/**
 * Parsea un string 'YYYY-MM-DD' a Date inicio del día local
 */
function parseLocalDate(dateStr) {
    if (!dateStr) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/**
 * Crear auditoría y notificar
 */
exports.createAudit = async (req, res) => {
    const { nombre, cuil, telefono, tipoVenta, obraSocialAnterior, obraSocialVendida, scheduledAt, asesor, validador } = req.body;

    /* Parsear scheduledAt como Date - el frontend envía ISO string con timezone correcto */
    const sched = new Date(scheduledAt);
    if (!sched || isNaN(sched.getTime())) {
        return res.status(400).json({ message: 'Fecha inválida' });
    }

    // ✅ PRIVILEGIO ESPECIAL: Gerencia puede crear ventas de cualquier fecha
    const isGerencia = req.user?.role?.toLowerCase() === 'gerencia';

    if (!isGerencia) {
        // Solo validar fecha para roles que NO sean Gerencia
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (sched < today) {
            return res.status(400).json({ message: 'Fecha inválida' });
        }
    }

    // 👉 Validación de CUIL único (solo si se proporciona)
    // ✅ Permite reutilizar CUIL si la auditoría anterior está "Rechazada"
    if (cuil && cuil.trim()) {
        const existing = await Audit.findOne({ cuil: cuil.trim() });
        if (existing && existing.status !== 'Rechazada') {
            return res.status(400).json({
                message: 'Ya existe una auditoría con ese CUIL. El CUIL solo puede reutilizarse si la auditoría anterior fue rechazada.'
            });
        }
    }

    const slotStart = new Date(sched);
    const slotEnd = new Date(sched);
    slotEnd.setMinutes(slotEnd.getMinutes() + 20);

    const count = await Audit.countDocuments({
        scheduledAt: { $gte: slotStart, $lt: slotEnd }
    });
    if (count >= 10) { // ✅ Aumentado a 10 vacantes por turno
        return res.status(400).json({ message: 'Turno completo' });
    }

    // 🛡️ Doble verificación para mitigar condición de carrera
    // (Idealmente usaríamos transacciones, pero esto reduce la ventana de riesgo)
    const doubleCheck = await Audit.countDocuments({
        scheduledAt: { $gte: slotStart, $lt: slotEnd }
    });
    if (doubleCheck >= 10) {
        return res.status(400).json({ message: 'Turno completo (verificación final)' });
    }

    const audit = new Audit({
        nombre,
        cuil,
        telefono,
        tipoVenta,
        obraSocialAnterior,
        obraSocialVendida,
        scheduledAt: sched,
        asesor: asesor || req.user._id,
        validador: validador || null, // ✅ Usuario que valida la venta
        createdBy: req.user._id,
        groupId: req.user.groupId,
        auditor: null,
        datosExtra: req.body.datosExtra || ""
    });

    if (typeof req.body.datosExtra === 'string' && req.body.datosExtra.trim().length) {
        audit.datosExtraHistory.push({
            value: req.body.datosExtra,
            updatedBy: req.user._id,
            updatedAt: new Date()
        });
    }

    const initialStatus = (audit.status || '').trim();
    if (initialStatus) {
        audit.statusHistory.push({
            value: initialStatus,
            updatedBy: req.user._id,
            updatedAt: new Date()
        });
    }

    await audit.save();

    /* Poblar datos para notificación */
    await audit.populate('createdBy', 'nombre email role numeroEquipo');
    await audit.populate('datosExtraHistory.updatedBy', 'nombre name username email role');
    await audit.populate('statusHistory.updatedBy', 'nombre name username email role');

    try { emitNewAudit(audit); } catch (e) { logger.error("socket emit error", e); }

    // 🔔 Notificar a auditores sobre nueva auditoría
    try {
        await notifyAuditCreated({
            audit: {
                ...audit.toObject(),
                fechaTurno: audit.scheduledAt,
                obraSocial: audit.obraSocialVendida
            }
        });
    } catch (e) {
        logger.error("Error enviando notificación de auditoría creada:", e);
    }

    return res.status(201).json(audit);
};

/**
 * Obtener auditorías por fecha + aplicar filtros opcionales
 *
 * Query params soportados:
 *  - date (YYYY-MM-DD) -> día a consultar (si falta: hoy)
 *  - afiliado, cuil, obraAnterior, obraVendida, estado, tipo, asesor, grupo, auditor
 */
exports.getAuditsByDate = async (req, res) => {
    try {
        const {
            date,
            dateFrom,
            dateTo,
            afiliado,
            cuil,
            telefono,
            obraAnterior,
            obraVendida,
            estado,
            tipo,
            asesor,
            grupo,
            auditor,
            supervisor,
            administrador,
            ignoreDate,
            dateField,
            userId
        } = req.query;

        let filter = {};

        /* Si se busca por CUIL o teléfono (validación de duplicados), no aplicar filtro de fecha
           Esto permite encontrar todos los registros históricos para validación */
        if ((cuil || telefono) && !date && !dateFrom && !dateTo) {
            /* Validación de duplicados: buscar en todo el historial */
            if (cuil && telefono) {
                /* Buscar registros que coincidan en CUIL O teléfono */
                filter.$or = [
                    { cuil: { $regex: `^${escapeRegex(cuil)}$`, $options: "i" } },
                    { telefono: { $regex: `^${escapeRegex(telefono)}$`, $options: "i" } }
                ];
            } else if (cuil) {
                filter.cuil = { $regex: `^${escapeRegex(cuil)}$`, $options: "i" };
            } else if (telefono) {
                filter.telefono = { $regex: `^${escapeRegex(telefono)}$`, $options: "i" };
            }
        } else if (userId && !date && !dateFrom && !dateTo) {
            // ✅ Si filtramos por usuario para estadísticas y no hay fecha, traemos TODO el historial
            /* No aplicamos filtro de fecha */
        } else if (ignoreDate === 'true') {
            // ✅ Si se solicita ignorar la fecha, no aplicamos ningún filtro de fecha
            // Útil para Recuperaciones que necesita ver todo el historial
        } else {
            /* Filtro de fecha normal para listados */
            const fieldToFilter = dateField || 'scheduledAt';

            if (dateFrom && dateTo) {
                const from = parseLocalDate(dateFrom);
                const to = parseLocalDate(dateTo);
                to.setDate(to.getDate() + 1); /* incluir hasta fin de día */

                /* La lógica es: SI fechaCreacionQR tiene valor -> usar ese, SINO -> usar scheduledAt */
                if (!dateField) {
                    filter.$or = [
                        // Caso 1: fechaCreacionQR existe y tiene valor válido en el rango
                        { fechaCreacionQR: { $ne: null, $gte: from, $lt: to } },
                        // Caso 2: fechaCreacionQR NO existe o es null -> usar scheduledAt
                        {
                            $and: [
                                { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                                { scheduledAt: { $gte: from, $lt: to } }
                            ]
                        }
                    ];
                } else {
                    filter[fieldToFilter] = { $gte: from, $lt: to };
                }
            } else {
                /* default: día actual (si no hay rango ni date explícito) */
                const day = parseLocalDate(date || undefined);
                const next = new Date(day);
                next.setDate(next.getDate() + 1);
                filter[fieldToFilter] = { $gte: day, $lt: next };
            }
        }

        // ✅ Filtro por usuario (asesor, auditor, validador o creador)
        if (userId) {
            filter.$or = [
                { asesor: userId },
                { auditor: userId },
                { validador: userId },
                { createdBy: userId }
            ];
        }

        if (afiliado) filter.nombre = { $regex: escapeRegex(afiliado), $options: "i" };
        // ✅ CUIL y teléfono ya manejados arriba para validación de duplicados
        if (cuil && (date || dateFrom || dateTo)) filter.cuil = { $regex: escapeRegex(cuil), $options: "i" };
        if (telefono && (date || dateFrom || dateTo)) filter.telefono = { $regex: escapeRegex(telefono), $options: "i" };
        if (obraAnterior) filter.obraSocialAnterior = { $regex: escapeRegex(obraAnterior), $options: "i" };
        if (obraVendida) filter.obraSocialVendida = { $regex: escapeRegex(obraVendida), $options: "i" };
        if (estado) {
            const estadosRaw = estado
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean);

            if (estadosRaw.length) {
                const includeSinEstado = estadosRaw.some((value) => value.toLowerCase() === 'sin estado');
                const normalizedStatuses = estadosRaw.filter((value) => value.toLowerCase() !== 'sin estado');
                const statusFilterValues = includeSinEstado
                    ? [...normalizedStatuses, '', null]
                    : normalizedStatuses;
                const uniqueStatuses = [...new Set(statusFilterValues)];

                if (uniqueStatuses.length) {
                    filter.status = { $in: uniqueStatuses };
                }
            }
        }
        if (tipo) filter.tipoVenta = { $regex: escapeRegex(tipo), $options: "i" };

        /* Visibilidad por rol */
        const expRole = (req.user?.role || '').toLowerCase();
        if (expRole === 'asesor') {
            /* ✅ RESTRICCIÓN ASESOR: Solo ve ventas donde es el asesor asignado O fue el creador */
            const asesorId = req.user._id;
            
            // Combinar el filtro existente con la restricción de asesor usando $and
            const asesorFilter = {
                $or: [
                    { asesor: asesorId },
                    { createdBy: asesorId }
                ]
            };
            
            // Si ya hay un filtro $or existente (ej. por fecha), necesitamos usar $and
            if (filter.$or) {
                const existingFilter = { ...filter };
                filter = {
                    $and: [
                        existingFilter,
                        asesorFilter
                    ]
                };
            } else {
                // Si no hay $or, simplemente agregamos el filtro de asesor
                filter.$or = asesorFilter.$or;
            }
        } else if (expRole === 'supervisor') {
            /* Supervisores ven TODAS las auditorías
               El frontend ocultará teléfonos de otros grupos */
        }

        /* Ya NO se excluyen auditorías de recuperación de FollowUp
           Se mostrarán TODAS para evitar que "desaparezcan" */



        let audits = await Audit.find(filter)
            .populate({
                path: 'asesor',
                select: 'nombre name email supervisor numeroEquipo',
                populate: { path: 'supervisor', select: 'nombre name email numeroEquipo' }
            })
            .populate('validador', 'nombre name email') // ✅ Usuario que valida la venta
            .populate('auditor', 'nombre name email')
            .populate('administrador', 'nombre name email')
            .populate('groupId', 'nombre name')
            .populate('datosExtraHistory.updatedBy', 'nombre name username email role')
            .populate('statusHistory.updatedBy', 'nombre name username email role')
            .populate({
                path: 'asesorHistory',
                populate: [
                    { path: 'previousAsesor', select: 'nombre name' },
                    { path: 'newAsesor', select: 'nombre name' },
                    { path: 'changedBy', select: 'nombre name' }
                ]
            })
            .sort({ scheduledAt: 1 })
            .lean();

        /* Filtrado adicional (asesor / auditor / grupo) - strings parciales */
        if (asesor) {
            const queries = String(asesor)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const as = a.asesor;
                    if (!as) return false;
                    const candidates = [as.email, as.nombre, as.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        if (auditor) {
            const queries = String(auditor)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const au = a.auditor;
                    if (!au) return false;
                    const candidates = [au.email, au.nombre, au.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        /* Enriquecer supervisor/grupo cuando falte, usando numeroEquipo */
        const supCache = new Map(); /* key: numeroEquipo -> supervisor user */
        await Promise.all(audits.map(async (a) => {
            let as = a.asesor;
            if (!as) return;

            /* Resolver asesor cuando no viene populado (ObjectId) o viene como email string */
            if (!as.email && !as.nombre && !as.name) {
                try {
                    if (typeof as === 'string' && as.includes('@')) {
                        const found = await User.findOne({ email: as }).select('nombre name email supervisor numeroEquipo').lean();
                        if (found) {
                            a.asesor = as = found;
                        }
                    } else {
                        const found = await User.findById(as).select('nombre name email supervisor numeroEquipo').lean();
                        if (found) {
                            a.asesor = as = found;
                        }
                    }
                } catch { }
            }

            const grupo = as && as.numeroEquipo;
            /* Fallback de supervisor a partir de numeroEquipo */
            if (as && (!as.supervisor || !as.supervisor._id) && grupo) {
                if (!supCache.has(String(grupo))) {
                    const sup = await User.findOne({ role: 'supervisor', numeroEquipo: String(grupo) })
                        .select('nombre name email numeroEquipo')
                        .lean();
                    supCache.set(String(grupo), sup || null);
                }
                const found = supCache.get(String(grupo));
                if (found) {
                    a.asesor.supervisor = found;
                }
            }
            /* Fallback de groupId a partir de numeroEquipo */
            if (!a.groupId && grupo) {
                a.groupId = { nombre: String(grupo) };
            }
        }));

        /* Aplicar filtros de grupo y supervisor DESPUÉS del enriquecimiento */
        if (grupo) {
            const groupFilters = String(grupo)
                .split(",")
                .map((g) => g.trim().toLowerCase())
                .filter(Boolean);

            if (groupFilters.length) {
                audits = audits.filter(a => {
                    const g = a.groupId;
                    if (!g) return false;
                    const nombres = [g.nombre, g.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!nombres.length) return false;
                    return groupFilters.some(filterValue =>
                        nombres.some(nombre => nombre.includes(filterValue))
                    );
                });
            }
        }

        if (supervisor) {
            const queries = String(supervisor)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    // ✅ PRIORIDAD 1: supervisorSnapshot (asignación manual, incluye Gerencia)
                    if (a.supervisorSnapshot?.nombre) {
                        const snapCandidates = [a.supervisorSnapshot.nombre]
                            .map((value) => (value || "").toLowerCase())
                            .filter(Boolean);
                        if (snapCandidates.length && queries.some(q => snapCandidates.some(c => c.includes(q)))) {
                            return true;
                        }
                    }
                    
                    // ✅ FALLBACK: asesor.supervisor (supervisor del equipo)
                    const as = a.asesor;
                    if (as?.supervisor) {
                        const sup = as.supervisor;
                        const candidates = [sup.email, sup.nombre, sup.name]
                            .map((value) => (value || "").toLowerCase())
                            .filter(Boolean);
                        if (candidates.length && queries.some(q => candidates.some(c => c.includes(q)))) {
                            return true;
                        }
                    }
                    
                    return false;
                });
            }
        }

        if (administrador) {
            const queries = String(administrador)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const admin = a.administrador;
                    if (!admin) return false;
                    const candidates = [admin.email, admin.nombre, admin.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        res.json(audits);
    } catch (err) {
        logger.error("getAuditsByDate error", err);
        res.status(500).json({ message: "Error interno al obtener auditorías" });
    }
};

/**
 * Obtener slots disponibles (cada 20 min, máximo 4 turnos)
 */
exports.getAvailableSlots = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date required' });

    /* Parsear fecha recibida como YYYY-MM-DD y crear rango en UTC
       El frontend envía fecha en formato local, necesitamos buscar en todo el día */
    const [year, month, day] = date.split('-').map(Number);

    /* Crear inicio del día en Argentina (UTC-3) */
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 3, 0, 0)); // 00:00 ARG = 03:00 UTC
    const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59)); // 23:59 ARG = 02:59 UTC siguiente día

    const slots = [];

    /* Generar slots de 09:20 a 23:00 (hora local Argentina) - Extendido hasta 23:00 */
    for (let hour = 9; hour <= 23; hour++) {
        const minutes = hour === 9 ? [20, 40] : hour === 23 ? [0] : [0, 20, 40];

        for (const minute of minutes) {
            if (hour === 23 && minute > 0) continue; /* No generar después de 23:00 */

            /* Crear slot en hora local de Argentina */
            const slotStartLocal = new Date(year, month - 1, day, hour, minute, 0);
            const slotEndLocal = new Date(slotStartLocal);
            slotEndLocal.setMinutes(slotEndLocal.getMinutes() + 20);

            /* Contar auditorías que caen en este slot */
            const count = await Audit.countDocuments({
                scheduledAt: {
                    $gte: slotStartLocal,
                    $lt: slotEndLocal
                }
            });

            const hh = String(hour).padStart(2, '0');
            const mm = String(minute).padStart(2, '0');
            slots.push({ time: `${hh}:${mm}`, count });
        }
    }

    res.json(slots);
};

/**
 * Obtener estadísticas de ventas por obra social anterior para una fecha específica
 * Permite analizar de qué obras sociales vienen los afiliados contactados
 */
exports.getSalesStats = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date required' });

    const [year, month, day] = date.split('-').map(Number);

    // Crear rango de fecha (todo el día)
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

    try {
        // Agrupar por obra social ANTERIOR y contar
        const stats = await Audit.aggregate([
            {
                $match: {
                    scheduledAt: { $gte: startOfDay, $lte: endOfDay },
                    obraSocialAnterior: { $exists: true, $ne: null, $ne: "" }
                }
            },
            {
                $group: {
                    _id: "$obraSocialAnterior",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 } // Ordenar de mayor a menor
            }
        ]);

        // Formatear respuesta
        const formatted = stats.map(s => ({
            obraSocial: s._id,
            count: s.count
        }));

        res.json(formatted);
    } catch (err) {
        logger.error("Error obteniendo estadísticas de ventas:", err);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};

/**
 * Cambiar estado de auditoría
 */
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const now = new Date();
    const update = { status, statusUpdatedAt: now };

    // ✅ ACTUALIZAR FECHA CUANDO CAMBIA A "QR hecho"
    if (status === 'QR hecho') {
        update.scheduledAt = now;
        update.fechaCreacionQR = now; // ✅ Nuevo campo
        logger.info(`updateStatus: Auditoría ${id} cambió a QR hecho. Fecha actualizada a: ${update.scheduledAt}`);
    }

    // ✅ ACTUALIZAR FECHA CUANDO UN ADMIN CAMBIA EL ESTADO (cualquier cambio de estado)
    const userRole = req.user?.role?.toLowerCase();
    if (userRole === 'admin' || userRole === 'administrativo') {
        update.scheduledAt = now;
        logger.info(`updateStatus: Admin/Administrativo cambió estado de auditoría ${id} a "${status}". Fecha actualizada a: ${update.scheduledAt}`);
    }

    const recoveryStates = [
        "Falta clave",
        "Rechazada",
        "Falta documentación",
        "No atendió",
        "Tiene dudas",
        "Falta clave y documentación",
        "No le llegan los mensajes",
        "Cortó"
    ];

    if (recoveryStates.includes(status)) {
        update.recoveryEligibleAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        // Resetear flag de notificación para que pueda enviar nueva notificación después de 12h
        update.followUpNotificationSent = false;
    } else {
        update.recoveryEligibleAt = null;
        // Resetear flag cuando sale del estado problemático
        update.followUpNotificationSent = false;
    }
    const audit = await Audit.findByIdAndUpdate(id, update, { new: true });

    if (audit) {
        try {
            // ✅ Incluir updatedBy para evitar notificaciones al propio usuario
            emitAuditUpdate(audit._id, { status, updatedBy: req.user._id });

            // ✅ Enviar notificación interna al asesor si no fue él quien hizo el cambio
        } catch (e) {
            logger.error("emitAuditUpdate error", e);
        }
    }

    res.json(audit);
};

/**
 * Editar auditoría (roles: administrativo, auditor, supervisor, gerencia, RR.HH)
 */
exports.updateAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Solo administrativo/auditor/supervisor/gerencia/RR.HH pueden editar
        const userRole = (req.user.role || '').toLowerCase();
        logger.info(`[updateAudit] Usuario: ${req.user.nombre}, Rol original: "${req.user.role}", Rol normalizado: "${userRole}"`);
        if (!['administrativo', 'auditor', 'supervisor', 'gerencia', 'rr.hh'].includes(userRole)) {
            logger.warn(`[updateAudit] Acceso denegado para rol: "${userRole}"`);
            return res.status(403).json({ message: 'No autorizado' });
        }

        // Obtener auditoría anterior para comparar cambios
        const oldAudit = await Audit.findById(id);
        if (!oldAudit) {
            return res.status(404).json({ message: 'Auditoría no encontrada' });
        }

        const oldStatus = oldAudit.status;

        // Si se está cambiando el estado, resetear flag de notificación de seguimiento
        let statusHistoryEntry = null;
        if (typeof updates.status === 'string' && updates.status !== oldStatus) {
            updates.statusUpdatedAt = new Date();
            updates.followUpNotificationSent = false;

            // 
            if (updates.status === 'QR hecho') {
                updates.scheduledAt = new Date();
                // ✅ Solo asignar fechaCreacionQR automáticamente si NO viene del frontend
                if (!updates.fechaCreacionQR) {
                    updates.fechaCreacionQR = new Date();
                }
                logger.info(`Auditoría ${id} cambió a QR hecho. Fecha actualizada a: ${updates.scheduledAt}`);
            }

            // 
            const userRole = req.user?.role?.toLowerCase();
            if (userRole === 'admin' || userRole === 'administrativo') {
                updates.scheduledAt = new Date();
                logger.info(`updateAudit: Admin/Administrativo cambió estado de auditoría ${id} a "${updates.status}". Fecha actualizada a: ${updates.scheduledAt}`);
            }

            // 
            const recoveryStates = [
                "Falta clave",
                "Falta documentación",
                "Falta clave y documentación",
                "Pendiente"
            ];

            // ✅ NO mover inmediatamente a recuperación
            // El cron de las 23:01 hrs verificará qué auditorías tienen estos estados y las moverá
            if (recoveryStates.includes(updates.status)) {
                // Solo actualizar el timestamp del estado, el cron se encargará del resto
                logger.info(`Auditoría ${id} cambió a estado de recuperación: ${updates.status}. Se procesará a las 23:01`);
            } else {
                updates.recoveryEligibleAt = null;
                // ✅ NO desmarcar isRecovery - una vez en recuperación, permanece hasta soft-delete mensual
            }

            statusHistoryEntry = {
                value: updates.status,
                updatedBy: req.user._id,
                updatedAt: new Date()
            };
        }

        if ('datosExtraHistory' in updates) {
            delete updates.datosExtraHistory;
        }

        let historyEntry = null;
        if (typeof updates.datosExtra === 'string') {
            const trimmed = updates.datosExtra.trim();
            const previous = (oldAudit.datosExtra || '').trim();
            if (trimmed !== previous) {
                updates.datosExtra = trimmed;
                historyEntry = {
                    value: trimmed,
                    updatedBy: req.user._id,
                    updatedAt: new Date()
                };
            } else {
                updates.datosExtra = previous;
            }
        }

        let asesorHistoryEntry = null;
        if (updates.asesor && updates.asesor !== oldAudit.asesor?.toString()) {
            asesorHistoryEntry = {
                previousAsesor: oldAudit.asesor,
                newAsesor: updates.asesor,
                changedBy: req.user._id,
                changedAt: new Date()
            };
        }

        // ✅ MANEJO DE SUPERVISOR (Manual vs Automático)
        // 1. Si viene 'supervisor' (ID manual), lo usamos para actualizar el snapshot
        if (updates.supervisor) {
            const User = require('../models/User');
            const supervisorUser = await User.findById(updates.supervisor).select('nombre name email numeroEquipo').lean();
            if (supervisorUser) {
                updates.supervisorSnapshot = {
                    _id: supervisorUser._id,
                    nombre: supervisorUser.nombre || supervisorUser.name,
                    numeroEquipo: supervisorUser.numeroEquipo
                };
            }
            // Eliminamos 'supervisor' del objeto updates para que no intente guardarlo como campo root (si no existe en schema)
            delete updates.supervisor;
        }
        // 2. Si NO viene supervisor manual, pero cambió el asesor o el grupo, recalculamos
        else if (updates.asesor || updates.groupId || updates.numeroEquipo) {
            // Necesitamos el asesor completo para el helper
            const User = require('../models/User');
            const { getSupervisorSnapshotForAudit } = require('../utils/supervisorHelper');

            // Construir objeto temporal para el cálculo
            const tempAudit = {
                ...oldAudit.toObject(),
                ...updates,
                // Asegurar que groupId sea objeto o ID según lo que espera el helper
                groupId: updates.groupId || oldAudit.groupId
            };

            let asesorObj = null;
            if (updates.asesor) {
                asesorObj = await User.findById(updates.asesor).lean();
            } else if (oldAudit.asesor) {
                asesorObj = await User.findById(oldAudit.asesor).lean();
            }

            const snapshot = await getSupervisorSnapshotForAudit(tempAudit, asesorObj);
            if (snapshot) {
                updates.supervisorSnapshot = snapshot;
            }
        }

        const updateDoc = {};
        if (Object.keys(updates).length) {
            updateDoc.$set = updates;
        }
        if (historyEntry || statusHistoryEntry || asesorHistoryEntry) {
            updateDoc.$push = {};
            if (historyEntry) {
                updateDoc.$push.datosExtraHistory = historyEntry;
            }
            if (statusHistoryEntry) {
                updateDoc.$push.statusHistory = statusHistoryEntry;
            }
            if (asesorHistoryEntry) {
                updateDoc.$push.asesorHistory = asesorHistoryEntry;
            }
        }

        if (!Object.keys(updateDoc).length) {
            await oldAudit.populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo supervisor',
                populate: {
                    path: 'supervisor',
                    select: 'nombre name email numeroEquipo'
                }
            });
            await oldAudit.populate('validador', 'nombre name email');
            await oldAudit.populate('auditor', 'nombre name email');
            await oldAudit.populate('administrador', 'nombre name email');
            await oldAudit.populate('createdBy', 'nombre name email numeroEquipo');
            await oldAudit.populate('groupId', 'nombre name');
            await oldAudit.populate('datosExtraHistory.updatedBy', 'nombre name username email role');
            await oldAudit.populate('statusHistory.updatedBy', 'nombre name username email role');
            await oldAudit.populate({
                path: 'asesorHistory',
                populate: [
                    { path: 'previousAsesor', select: 'nombre name' },
                    { path: 'newAsesor', select: 'nombre name' },
                    { path: 'changedBy', select: 'nombre name' }
                ]
            });
            return res.json(oldAudit);
        }

        // No sobreescribir auditor automáticamente. Solo cambiar si viene en el payload.

        const audit = await Audit.findByIdAndUpdate(
            id,
            updateDoc,
            { new: true }
        )
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo supervisor',
                populate: {
                    path: 'supervisor',
                    select: 'nombre name email numeroEquipo'
                }
            })
            .populate('validador', 'nombre name email')
            .populate('auditor', 'nombre name email')
            .populate('administrador', 'nombre name email') // ✅
            .populate('createdBy', 'nombre name email numeroEquipo')
            .populate('groupId', 'nombre name')
            .populate('datosExtraHistory.updatedBy', 'nombre name username email role')
            .populate('statusHistory.updatedBy', 'nombre name username email role')
            .populate({
                path: 'asesorHistory',
                populate: [
                    { path: 'previousAsesor', select: 'nombre name' },
                    { path: 'newAsesor', select: 'nombre name' },
                    { path: 'changedBy', select: 'nombre name' }
                ]
            });

        if (!audit) {
            return res.status(404).json({ message: 'Auditoría no encontrada' });
        }

        try {
            // ✅ Incluir updatedBy para evitar notificaciones al propio usuario
            const payload = audit.toObject ? audit.toObject() : audit;
            emitAuditUpdate(audit._id, { ...payload, updatedBy: req.user._id });
        } catch (e) {
            logger.error("emitAuditUpdate error", e);
        }

        // 🔔 Notificaciones según cambio de estado
        const newStatus = audit.status;

        // Notificar cuando pasa a "Completa"
        if (oldStatus !== "Completa" && newStatus === "Completa") {
            try {
                // ✅ Si la auditoría está en Recuperación, notificar a admins específicamente
                if (audit.isRecovery) {
                    await notifyRecoveryAuditCompleted({
                        audit: {
                            ...audit.toObject(),
                            fechaTurno: audit.scheduledAt,
                            obraSocial: audit.obraSocialVendida
                        }
                    });
                } else {
                    // Notificación estándar para auditorías no recuperadas
                    await notifyAuditCompleted({
                        audit: {
                            ...audit.toObject(),
                            fechaTurno: audit.scheduledAt,
                            obraSocial: audit.obraSocialVendida
                        }
                    });
                }
            } catch (e) {
                logger.error("Error enviando notificación de auditoría completa:", e);
            }
        }

        // Notificar cuando pasa a "QR hecho" (case-insensitive)
        const oldStatusLower = (oldStatus || "").toLowerCase();
        const newStatusLower = (newStatus || "").toLowerCase();

        if (oldStatusLower !== "qr hecho" && newStatusLower === "qr hecho") {
            try {
                // ✅ Si la auditoría está en Recuperación, marcar isRecuperada: true
                // Verificar ANTES del cambio de estado (usando el objeto audit original)
                const auditBeforeUpdate = await Audit.findById(audit._id).select('isRecovery recoveryDeletedAt').lean();

                if (auditBeforeUpdate && (auditBeforeUpdate.isRecovery || auditBeforeUpdate.recoveryDeletedAt)) {
                    await Audit.findByIdAndUpdate(
                        audit._id,
                        { $set: { isRecuperada: true } },
                        { new: true }
                    );
                    logger.info(`✅ Auditoría ${audit._id} (${audit.nombre}) en Recuperación marcada como recuperada (QR hecho)`);
                } else {
                    logger.info(`ℹ️ Auditoría ${audit._id} (${audit.nombre}) cambió a QR hecho pero NO está en Recuperación`);
                }

                await notifyAuditQRDone({
                    audit: {
                        ...audit.toObject(),
                        fechaTurno: audit.scheduledAt,
                        obraSocial: audit.obraSocialVendida
                    }
                });
            } catch (e) {
                logger.error("Error enviando notificación de QR hecho:", e);
            }
        }

        res.json(audit);
    } catch (err) {
        logger.error("Error actualizando auditoría:", err);

        // Manejar errores de validación de Mongoose
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        // Manejar errores de cast (ObjectId inválido)
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `ID inválido para el campo ${err.path}` });
        }

        // Error genérico
        return res.status(500).json({
            message: 'Error al actualizar auditoría',
            error: err.message
        });
    }
};

/**
 * Obtener auditoría por CUIL exacto
 */
exports.getAuditByCuil = async (req, res) => {
    try {
        const { cuil } = req.params;
        if (!cuil) return res.status(400).json({ message: "CUIL requerido" });

        const audit = await Audit.findOne({ cuil: cuil.trim() }).lean();
        if (!audit) return res.status(404).json({ message: "No se encontró auditoría para ese CUIL" });

        res.json(audit);
    } catch (err) {
        logger.error("getAuditByCuil error", err);
        res.status(500).json({ message: "Error interno al buscar por CUIL" });
    }
};

/**
 * Subir multimedia (DNI frontal/dorso, video, audio respaldatorio)
 */
/**
 * Subir multimedia (DNI frontal/dorso, video, audio respaldatorio)
 * + clave afiliado definitiva (solo admin)
 */
exports.uploadMultimedia = async (req, res) => {
    try {
        const { id } = req.params;
        const files = req.files || {};
        const { afiliadoKey, afiliadoKeyDefinitiva } = req.body;

        const audit = await Audit.findById(id);
        if (!audit) return res.status(404).json({ message: "Auditoría no encontrada" });

        // Si está completa, no permitir modificaciones
        if (audit.isComplete) {
            return res.status(400).json({ message: "La auditoría está marcada como completa" });
        }

        // Asegurar objeto multimedia
        if (!audit.multimedia) audit.multimedia = {};

        // Procesar imágenes
        if (files.images && files.images.length > 0) {
            const imgs = files.images.map((f) => f.path.replace(/\\/g, "/"));
            audit.multimedia.images = [...(audit.multimedia.images || []), ...imgs];
        }

        // Procesar video
        if (files.video && files.video[0]) {
            audit.multimedia.video = files.video[0].path.replace(/\\/g, "/");
        }

        // Procesar audio respaldatorio
        if (files.audioBackup && files.audioBackup[0]) {
            audit.multimedia.audioBackup = files.audioBackup[0].path.replace(/\\/g, "/");
        }

        // Clave afiliado
        if (afiliadoKey && afiliadoKey.trim()) {
            audit.multimedia.afiliadoKey = afiliadoKey.trim();
        }

        // ✅ Clave afiliado definitiva (solo gerencia)
        if (req.user.role === "gerencia" && afiliadoKeyDefinitiva && afiliadoKeyDefinitiva.trim()) {
            audit.multimedia.afiliadoKeyDefinitiva = afiliadoKeyDefinitiva.trim();
        }

        // Verificar si la auditoría está completa (tiene todos los archivos necesarios)
        const wasIncomplete = audit.status !== "Completa";
        const hasVideo = audit.multimedia.video;
        const hasImages = audit.multimedia.images && audit.multimedia.images.length >= 2; // DNI frente y dorso
        const isNowComplete = hasVideo && hasImages;

        // Si se completó justo ahora, actualizar estado y notificar
        if (wasIncomplete && isNowComplete && audit.status !== "Completa") {
            audit.status = "Completa";
        }

        await audit.save();

        // Poblar para notificaciones
        await audit.populate('createdBy', 'nombre email role numeroEquipo');
        await audit.populate('auditor', 'nombre email');
        await audit.populate('administrador', 'nombre email'); // ✅

        try {
            // ✅ Incluir updatedBy para evitar notificaciones al propio usuario
            const payload = audit.toObject ? audit.toObject() : audit;
            emitAuditUpdate(audit._id, { ...payload, updatedBy: req.user._id });
        } catch (e) {
            logger.error("socket emit error uploadMultimedia", e);
        }

        // 🔔 Notificar a admins si se completó
        if (wasIncomplete && isNowComplete) {
            try {
                await notifyAuditCompleted({
                    audit: {
                        ...audit.toObject(),
                        fechaTurno: audit.scheduledAt,
                        obraSocial: audit.obraSocialVendida
                    }
                });
            } catch (e) {
                logger.error("Error enviando notificación de auditoría completa:", e);
            }
        }

        res.json(audit);
    } catch (err) {
        logger.error("uploadMultimedia error", err);
        res.status(500).json({ message: "Error al subir archivos" });
    }
};

/**
 * Eliminar auditoría (solo admin/auditor)
 */
exports.deleteAudit = async (req, res) => {
    const { id } = req.params;

    const allowedRoles = ['admin', 'auditor', 'supervisor', 'gerencia', 'RR.HH', 'administrativo'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: 'No autorizado' });
    }

    // Obtener auditoría para validar permisos de supervisor y enviar notificaciones
    const audit = await Audit.findById(id)
        .populate({ path: 'asesor', select: 'numeroEquipo _id nombre email' })
        .populate({ path: 'createdBy', select: '_id nombre email numeroEquipo' });

    if (!audit) {
        return res.status(404).json({ message: 'Auditoría no encontrada' });
    }

    if (req.user.role === 'supervisor') {
        const myGroup = req.user.numeroEquipo || null;
        const advisorGroup = audit.asesor && audit.asesor.numeroEquipo ? audit.asesor.numeroEquipo : null;
        const createdByMe = audit.createdBy && audit.createdBy._id?.toString() === req.user._id.toString();

        const sameGroup = myGroup !== null && advisorGroup !== null && String(myGroup) === String(advisorGroup);

        if (!sameGroup && !createdByMe) {
            return res.status(403).json({ message: 'No autorizado a eliminar este turno' });
        }
    }

    // 🔔 Enviar notificación ANTES de eliminar
    try {
        await notifyAuditDeleted({
            audit: {
                ...audit.toObject(),
                fechaTurno: audit.scheduledAt,
                obraSocial: audit.obraSocialVendida
            },
            deletedBy: {
                nombre: req.user.nombre,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (e) {
        logger.error("Error enviando notificación de auditoría eliminada:", e);
    }

    await Audit.findByIdAndDelete(id);

    // ✅ Emitir evento de eliminación para actualización en tiempo real
    try {
        const { emitAuditDeleted } = require("../config/socket");
        emitAuditDeleted(id);
    } catch (e) {
        logger.error("emitAuditDeleted error", e);
    }

    res.json({ message: 'Auditoría eliminada', id });
};

/**
 * Exportar auditorías del día (o con filtros) a CSV
 */
exports.exportByDate = async (req, res) => {
    try {
        const {
            date,
            dateFrom,
            dateTo,
            afiliado,
            cuil,
            obraAnterior,
            obraVendida,
            estado,
            tipo,
            asesor,
            grupo,
            auditor
        } = req.query;

        let filter = {};
        if (dateFrom && dateTo) {
            const from = parseLocalDate(dateFrom);
            const to = parseLocalDate(dateTo);
            to.setDate(to.getDate() + 1); // incluir hasta fin de día
            filter.scheduledAt = { $gte: from, $lt: to };
        } else {
            // default: día actual (si no hay rango ni date explícito)
            const day = parseLocalDate(date || undefined);
            const next = new Date(day);
            next.setDate(next.getDate() + 1);
            filter.scheduledAt = { $gte: day, $lt: next };
        }

        if (afiliado) filter.nombre = { $regex: afiliado, $options: "i" };
        if (cuil) filter.cuil = { $regex: cuil, $options: "i" };
        if (obraAnterior) filter.obraSocialAnterior = { $regex: obraAnterior, $options: "i" };
        if (obraVendida) filter.obraSocialVendida = { $regex: obraVendida, $options: "i" };
        if (estado) filter.status = { $in: estado.split(',').map((s) => s.trim()).filter(Boolean) };
        if (tipo) filter.tipoVenta = { $regex: tipo, $options: "i" };

        let audits = await Audit.find(filter)
            .populate({
                path: 'asesor',
                select: 'nombre name email supervisor numeroEquipo',
                populate: { path: 'supervisor', select: 'nombre name email numeroEquipo' }
            })
            .populate('auditor', 'nombre name email')
            .populate('administrador', 'nombre name email') // ✅
            .populate('groupId', 'nombre name')
            .populate('datosExtraHistory.updatedBy', 'nombre name email role')
            .sort({ scheduledAt: 1 })
            .lean();

        // filtros post-populate (asesor/auditor/grupo) como en getAuditsByDate
        if (asesor) {
            const queries = String(asesor)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const as = a.asesor;
                    if (!as) return false;
                    const candidates = [as.email, as.nombre, as.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        if (auditor) {
            const queries = String(auditor)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const au = a.auditor;
                    if (!au) return false;
                    const candidates = [au.email, au.nombre, au.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        if (grupo) {
            const groupFilters = String(grupo)
                .split(",")
                .map((g) => g.trim().toLowerCase())
                .filter(Boolean);

            if (groupFilters.length) {
                audits = audits.filter(a => {
                    const g = a.groupId;
                    if (!g) return false;
                    const nombres = [g.nombre, g.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!nombres.length) return false;
                    return groupFilters.some(filterValue =>
                        nombres.some(nombre => nombre.includes(filterValue))
                    );
                });
            }
        }

        if (supervisor) {
            const queries = String(supervisor)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const as = a.asesor;
                    if (!as || !as.supervisor) return false;
                    const sup = as.supervisor;
                    const candidates = [sup.email, sup.nombre, sup.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        if (administrador) {
            const queries = String(administrador)
                .split(",")
                .map((value) => value.trim().toLowerCase())
                .filter(Boolean);

            if (queries.length) {
                audits = audits.filter(a => {
                    const admin = a.administrador;
                    if (!admin) return false;
                    const candidates = [admin.email, admin.nombre, admin.name]
                        .map((value) => (value || "").toLowerCase())
                        .filter(Boolean);
                    if (!candidates.length) return false;
                    return queries.some(q => candidates.some(candidate => candidate.includes(q)));
                });
            }
        }

        // Normalizar / aplanar datos para CSV (evitamos [Object])
        // Fallback supervisor/grupo vía numeroEquipo
        const supCache = new Map();
        for (const a of audits) {
            const as = a.asesor;
            const grupo = as?.numeroEquipo;
            if ((!as?.supervisor?._id) && grupo) {
                if (!supCache.has(String(grupo))) {
                    const sup = await User.findOne({ role: 'supervisor', numeroEquipo: String(grupo) })
                        .select('nombre name email numeroEquipo')
                        .lean();
                    supCache.set(String(grupo), sup || null);
                }
                const found = supCache.get(String(grupo));
                if (found) a.asesor.supervisor = found;
            }
            if (!a.groupId && grupo) {
                a.groupId = { nombre: String(grupo) };
            }
        }

        const mapped = audits.map(a => ({
            scheduledAt: a.scheduledAt ? new Date(a.scheduledAt).toISOString() : '',
            nombre: a.nombre || '',
            cuil: a.cuil || '',
            telefono: a.telefono || '',
            tipoVenta: a.tipoVenta || '',
            obraSocialAnterior: a.obraSocialAnterior || '',
            obraSocialVendida: a.obraSocialVendida || '',
            asesor: a.asesor ? (a.asesor.email || a.asesor.nombre || a.asesor.name || '') : '',
            status: a.status || '',
            group: a.groupId ? (a.groupId.nombre || a.groupId.name || '') : '',
            auditor: a.auditor ? (a.auditor.email || a.auditor.nombre || a.auditor.name || '') : ''
        }));

        const fields = [
            'scheduledAt',
            'nombre',
            'cuil',
            'telefono',
            'tipoVenta',
            'obraSocialAnterior',
            'obraSocialVendida',
            'asesor',
            'status',
            'group',
            'auditor'
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(mapped);

        res.header('Content-Type', 'text/csv');
        let filename = "audits";
        if (dateFrom && dateTo) {
            filename = `audits_${dateFrom}_to_${dateTo}`;
        } else if (date) {
            filename = `audits_${date}`;
        } else {
            filename = `audits_${new Date().toISOString().slice(0, 10)}`;
        }
        res.attachment(`${filename}.csv`);
        return res.send(csv);
    } catch (err) {
        logger.error("exportByDate error", err);
        return res.status(500).json({ message: "Error exportando auditorías" });
    }
};

exports.getAuditsByDateRange = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) {
            return res.status(400).json({ message: "Parámetros de fecha requeridos." });
        }

        const start = parseLocalDate(from);
        const end = parseLocalDate(to);
        end.setDate(end.getDate() + 1);

        const rangeFilter = {
            scheduledAt: { $gte: start, $lt: end },
        };

        // ✅ Restricción por rol
        const rangeRole = (req.user?.role || '').toLowerCase();
        if (rangeRole === 'supervisor') {
            // El frontend ocultará teléfonos de otros grupos
        } else if (rangeRole === 'asesor') {
            // Asesor: solo lo creado por él/ella
            rangeFilter.$and = (rangeFilter.$and || []).concat([{ createdBy: req.user._id }]);
        }

        const audits = await Audit.find(rangeFilter)
            .populate({
                path: 'asesor',
                select: 'nombre name email supervisor',
                populate: { path: 'supervisor', select: 'nombre name email' }
            })
            .populate('auditor', 'nombre name email')
            .populate('administrador', 'nombre name email')
            .populate('groupId', 'nombre name')
            .sort({ scheduledAt: 1 });

        return res.json(audits);
    } catch (error) {
        logger.error("getAuditsByDateRange error", error);
        return res.status(500).json({ message: "Error interno al filtrar auditorías" });
    }
};

// ✅ POST /audits/recalculate-supervisors - Batch recalcular supervisores
exports.recalculateSupervisors = async (req, res) => {
    try {
        const { dateFrom, dateTo, onlyMissing } = req.body;

        logger.info(`[RECALCULATE] Iniciando recalculo de supervisores por ${req.user.email}`);

        // Construir filtro
        let filter = {};

        if (dateFrom && dateTo) {
            const from = new Date(dateFrom);
            const to = new Date(dateTo);
            to.setDate(to.getDate() + 1);

            filter.$or = [
                { fechaCreacionQR: { $gte: from, $lt: to } },
                { scheduledAt: { $gte: from, $lt: to } }
            ];
        }

        // Solo ventas sin snapshot si se especifica
        if (onlyMissing) {
            filter["supervisorSnapshot._id"] = { $exists: false };
        }

        const { getSupervisorSnapshotForAudit } = require("../utils/supervisorHelper");

        // Obtener ventas a recalcular (incluir teamHistory del asesor para historial)
        const audits = await Audit.find(filter).populate("asesor", "nombre numeroEquipo teamHistory");

        logger.info(`[RECALCULATE] ${audits.length} ventas encontradas para recalcular`);

        let successCount = 0;
        let errorCount = 0;

        // Recalcular en batch
        for (const audit of audits) {
            try {
                if (!audit.asesor) {
                    logger.warn(`[RECALCULATE] Audit ${audit._id} sin asesor, saltando`);
                    errorCount++;
                    continue;
                }

                const snapshot = await getSupervisorSnapshotForAudit(audit, audit.asesor);

                if (snapshot) {
                    audit.supervisorSnapshot = snapshot;
                    await audit.save();
                    successCount++;
                } else {
                    logger.warn(`[RECALCULATE] No se pudo calcular supervisor para audit ${audit._id}`);
                    errorCount++;
                }
            } catch (err) {
                logger.error(`[RECALCULATE] Error procesando audit ${audit._id}:`, err.message);
                errorCount++;
            }
        }

        logger.info(`[RECALCULATE] Completado: ${successCount} exitosos, ${errorCount} errores`);

        res.json({
            message: "Recalculo completado",
            total: audits.length,
            success: successCount,
            errors: errorCount
        });

    } catch (err) {
        logger.error("[RECALCULATE] Error en recalculateSupervisors:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Obtener estadísticas de ventas por supervisor (histórico)
 * Solo cuenta auditorías con estado "QR hecho"
 */
exports.getSupervisorStats = async (req, res) => {
    try {
        // Traer todas las auditorías con QR hecho
        // Proyectamos solo lo necesario para determinar el supervisor
        const audits = await Audit.find({ status: 'QR hecho' })
            .select('supervisorSnapshot asesor')
            .populate({
                path: 'asesor',
                select: 'supervisor',
                populate: { path: 'supervisor', select: 'nombre' }
            })
            .lean();

        const stats = {};

        for (const audit of audits) {
            let supervisorName = 'Sin Supervisor';

            // Lógica de prioridad igual al frontend: 1. Snapshot, 2. Asesor.Supervisor
            if (audit.supervisorSnapshot && audit.supervisorSnapshot.nombre) {
                supervisorName = audit.supervisorSnapshot.nombre;
            } else if (audit.asesor && audit.asesor.supervisor && audit.asesor.supervisor.nombre) {
                supervisorName = audit.asesor.supervisor.nombre;
            }

            if (!stats[supervisorName]) {
                stats[supervisorName] = 0;
            }
            stats[supervisorName]++;
        }

        // Convertir a array y ordenar descendente
        const result = Object.entries(stats)
            .map(([nombre, count]) => ({ nombre, count }))
            .sort((a, b) => b.count - a.count);

        res.json(result);

    } catch (err) {
        logger.error("Error en getSupervisorStats:", err);
        res.status(500).json({ message: "Error al obtener estadísticas de supervisores" });
    }
};

/**
 * Obtener estadísticas de ventas por Obra Social Vendida (histórico)
 * Solo cuenta auditorías con estado "QR hecho"
 */
exports.getObraSocialStats = async (req, res) => {
    try {
        const stats = await Audit.aggregate([
            { $match: { status: 'QR hecho' } },
            { $group: { _id: "$obraSocialVendida", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        const result = stats.map(s => ({
            nombre: s._id || 'Sin Obra Social',
            count: s.count
        }));

        res.json(result);
    } catch (err) {
        logger.error("Error en getObraSocialStats:", err);
        res.status(500).json({ message: "Error al obtener estadísticas de obras sociales" });
    }
};

/**
 * Carga masiva de auditorías desde Excel (solo Gerencia)
 * Campos esperados: nombre, cuil, telefono, tipoVenta, obraSocialAnterior, obraSocialVendida,
 *                   supervisor, asesor, administrativo, estado, aporte, cuit, datosExtra,
 *                   observacionPrivada, clave, email, fechaTurno
 */
exports.bulkImportAudits = async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ message: 'No se recibieron registros para importar' });
        }

        const results = {
            success: [],
            errors: []
        };

        const allUsers = await User.find({ active: { $ne: false } }).select('_id nombre email role numeroEquipo').lean();
        
        const supervisorMap = new Map();
        const asesorMap = new Map();
        const adminMap = new Map();

        allUsers.forEach(u => {
            const nombre = (u.nombre || '').toLowerCase().trim();
            const role = (u.role || '').toLowerCase();
            
            if (role === 'supervisor') {
                supervisorMap.set(nombre, u);
            }
            if (role === 'asesor' || role === 'auditor') {
                asesorMap.set(nombre, u);
            }
            if (role === 'administrativo' || role === 'admin') {
                adminMap.set(nombre, u);
            }
        });

        const validStatuses = [
            "QR hecho", "QR hecho (Temporal)", "QR hecho, pero pendiente de aprobación",
            "Hacer QR", "Aprobada", "Pendiente", "Cargada", "Falta clave", "AFIP",
            "Rechazada", "Padrón", "Remuneración no válida", "Autovinculación",
            "En revisión", "Caída", "Completa"
        ];
        const validStatusesLower = validStatuses.map(s => s.toLowerCase());

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNum = i + 2;
            const errors = [];

            if (!record.nombre || !record.nombre.trim()) {
                errors.push('Nombre es requerido');
            }

            if (!record.telefono || !record.telefono.trim()) {
                errors.push('Teléfono es requerido');
            }

            if (!record.obraSocialVendida || !record.obraSocialVendida.trim()) {
                errors.push('Obra Social Vendida es requerida');
            }

            let supervisorUser = null;
            let asesorUser = null;
            let adminUser = null;

            if (record.supervisor) {
                const supName = (record.supervisor || '').toLowerCase().trim();
                supervisorUser = supervisorMap.get(supName);
                if (!supervisorUser) {
                    errors.push(`Supervisor "${record.supervisor}" no encontrado`);
                }
            }

            if (record.asesor) {
                const asesorName = (record.asesor || '').toLowerCase().trim();
                asesorUser = asesorMap.get(asesorName);
                if (!asesorUser) {
                    errors.push(`Asesor "${record.asesor}" no encontrado`);
                }
            }

            if (record.administrativo) {
                const adminName = (record.administrativo || '').toLowerCase().trim();
                adminUser = adminMap.get(adminName);
                if (!adminUser) {
                    errors.push(`Administrativo "${record.administrativo}" no encontrado`);
                }
            }

            let status = 'Completa';
            if (record.estado) {
                const estadoLower = (record.estado || '').toLowerCase().trim();
                const foundIdx = validStatusesLower.findIndex(s => s === estadoLower);
                if (foundIdx >= 0) {
                    status = validStatuses[foundIdx];
                } else {
                    errors.push(`Estado "${record.estado}" no es válido`);
                }
            }

            if (record.cuil && record.cuil.trim()) {
                const existingAudit = await Audit.findOne({ cuil: record.cuil.trim(), status: { $ne: 'Rechazada' } });
                if (existingAudit) {
                    errors.push(`CUIL "${record.cuil}" ya existe en el sistema`);
                }
            }

            if (errors.length > 0) {
                results.errors.push({
                    row: rowNum,
                    data: record,
                    reasons: errors
                });
                continue;
            }

            let scheduledAt = new Date();
            if (record.fechaTurno) {
                const parsed = new Date(record.fechaTurno);
                if (!isNaN(parsed.getTime())) {
                    scheduledAt = parsed;
                }
            }

            const auditData = {
                nombre: (record.nombre || '').trim(),
                cuil: (record.cuil || '').trim() || undefined,
                telefono: (record.telefono || '').trim(),
                tipoVenta: (record.tipoVenta || 'alta').trim(),
                obraSocialAnterior: (record.obraSocialAnterior || '').trim() || undefined,
                obraSocialVendida: (record.obraSocialVendida || '').trim(),
                scheduledAt,
                status,
                statusAdministrativo: status,
                createdBy: req.user._id,
                aporte: record.aporte ? parseFloat(record.aporte) : undefined,
                cuit: (record.cuit || '').trim() || undefined,
                datosExtra: (record.datosExtra || '').trim() || undefined,
                observacionPrivada: (record.observacionPrivada || '').trim() || undefined,
                clave: (record.clave || '').trim() || undefined,
                email: (record.email || '').trim() || undefined,
                migrada: true,
                statusHistory: [{
                    value: status,
                    updatedBy: req.user._id,
                    updatedAt: new Date()
                }]
            };

            if (asesorUser) {
                auditData.asesor = asesorUser._id;
            }

            if (adminUser) {
                auditData.administrador = adminUser._id;
            }

            if (supervisorUser) {
                auditData.supervisorSnapshot = {
                    _id: supervisorUser._id,
                    nombre: supervisorUser.nombre,
                    numeroEquipo: supervisorUser.numeroEquipo
                };
            } else if (asesorUser && asesorUser.numeroEquipo) {
                const sup = allUsers.find(u => 
                    (u.role || '').toLowerCase() === 'supervisor' && 
                    u.numeroEquipo === asesorUser.numeroEquipo
                );
                if (sup) {
                    auditData.supervisorSnapshot = {
                        _id: sup._id,
                        nombre: sup.nombre,
                        numeroEquipo: sup.numeroEquipo
                    };
                }
            }

            try {
                const newAudit = new Audit(auditData);
                await newAudit.save();
                results.success.push({ row: rowNum, _id: newAudit._id });
            } catch (err) {
                results.errors.push({
                    row: rowNum,
                    data: record,
                    reasons: [err.message]
                });
            }
        }

        res.json({
            message: `Importación completada: ${results.success.length} exitosos, ${results.errors.length} errores`,
            totalProcessed: records.length,
            successCount: results.success.length,
            errorCount: results.errors.length,
            errors: results.errors
        });

    } catch (err) {
        logger.error("Error en bulkImportAudits:", err);
        res.status(500).json({ message: "Error al importar registros: " + err.message });
    }
};
