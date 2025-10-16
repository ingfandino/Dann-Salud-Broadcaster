// backend/src/controllers/auditController.js

const Audit = require('../models/Audit');
const User = require('../models/User');
const {
    emitNewAudit,
    emitAuditUpdate,
    emitFollowUpUpdate,
    getIO
} = require("../config/socket");
const { Parser } = require('json2csv');
const logger = require("../utils/logger");

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
    const { nombre, cuil, telefono, tipoVenta, obraSocialAnterior, obraSocialVendida, scheduledAt, asesor } = req.body;

    const sched = parseLocalDateTime(scheduledAt);
    if (!sched || isNaN(sched.getTime())) {
        return res.status(400).json({ message: 'Fecha inválida' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (sched < today) {
        return res.status(400).json({ message: 'Fecha inválida' });
    }

    // 👉 Validación de CUIL único (independiente de la fecha)
    const existing = await Audit.findOne({ cuil: cuil.trim() });
    if (existing) {
        return res.status(400).json({ message: 'Ya existe un afiliado con ese CUIL' });
    }

    const slotStart = new Date(sched);
    const slotEnd = new Date(sched);
    slotEnd.setMinutes(slotEnd.getMinutes() + 20);

    const count = await Audit.countDocuments({
        scheduledAt: { $gte: slotStart, $lt: slotEnd }
    });
    if (count >= 3) {
        return res.status(400).json({ message: 'Turno completo' });
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
        createdBy: req.user._id,
        groupId: req.user.groupId,
        auditor: req.user._id,
        datosExtra: req.body.datosExtra || ""
    });

    await audit.save();
    try { emitNewAudit(audit); } catch (e) { logger.error("socket emit error", e); }
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
        if (estado) filter.status = { $regex: estado, $options: "i" };
        if (tipo) filter.tipoVenta = { $regex: tipo, $options: "i" };

        // Excluir elegibles para recuperación (>24h en estados objetivo) y los ya marcados como isRecovery
        const now = new Date();
        filter.$and = [
            {
                $or: [
                    { status: { $nin: ["Falta clave", "Rechazada", "Falta documentación"] } },
                    { recoveryEligibleAt: { $exists: false } },
                    { recoveryEligibleAt: null },
                    { recoveryEligibleAt: { $gt: now } }
                ]
            },
            { isRecovery: { $ne: true } }
        ];

        let audits = await Audit.find(filter)
            .populate('asesor', 'nombre name email')
            .populate('auditor', 'nombre name email')
            .populate('groupId', 'nombre name')
            .lean();

        // Filtrado adicional (asesor / auditor / grupo) - strings parciales (no siempre llegan ids)
        if (asesor) {
            const q = (asesor || "").toLowerCase();
            audits = audits.filter(a => {
                const as = a.asesor;
                if (!as) return false;
                return (
                    (as.email && as.email.toLowerCase().includes(q)) ||
                    (as.nombre && as.nombre.toLowerCase().includes(q)) ||
                    (as.name && as.name.toLowerCase().includes(q))
                );
            });
        }

        if (auditor) {
            const q = (auditor || "").toLowerCase();
            audits = audits.filter(a => {
                const au = a.auditor;
                if (!au) return false;
                return (
                    (au.email && au.email.toLowerCase().includes(q)) ||
                    (au.nombre && au.nombre.toLowerCase().includes(q)) ||
                    (au.name && au.name.toLowerCase().includes(q))
                );
            });
        }

        if (grupo) {
            const q = (grupo || "").toLowerCase();
            audits = audits.filter(a => {
                const g = a.groupId;
                if (!g) return false;
                return (
                    (g.nombre && g.nombre.toLowerCase().includes(q)) ||
                    (g.name && g.name.toLowerCase().includes(q))
                );
            });
        }

        res.json(audits);
    } catch (err) {
        logger.error("getAuditsByDate error", err);
        res.status(500).json({ message: "Error interno al obtener auditorías" });
    }
};

/**
 * Obtener slots disponibles (cada 20 min, máximo 3 turnos)
 */
exports.getAvailableSlots = async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'date required' });

    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const slots = [];
    const start = new Date(day);
    start.setHours(9, 20, 0, 0);
    const end = new Date(day);
    end.setHours(21, 0, 0, 0);

    let cur = new Date(start);
    while (cur <= end) {
        const slotStart = new Date(cur);
        const slotEnd = new Date(cur);
        slotEnd.setMinutes(slotEnd.getMinutes() + 20);

        const count = await Audit.countDocuments({
            scheduledAt: { $gte: slotStart, $lt: slotEnd }
        });

        const hh = String(cur.getHours()).padStart(2, '0');
        const mm = String(cur.getMinutes()).padStart(2, '0');
        slots.push({ time: `${hh}:${mm}`, count });
        cur.setMinutes(cur.getMinutes() + 20);
    }

    res.json(slots);
};

/**
 * Cambiar estado de auditoría
 */
exports.updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const now = new Date();
    const update = { status, statusUpdatedAt: now };
    if (["Falta clave", "Rechazada", "Falta documentación"].includes(status)) {
        update.recoveryEligibleAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else {
        update.recoveryEligibleAt = null;
    }
    const audit = await Audit.findByIdAndUpdate(id, update, { new: true });

    if (audit) {
        try {
            emitAuditUpdate(audit._id, { status });
        } catch (e) {
            logger.error("emitAuditUpdate error", e);
        }
    }

    res.json(audit);
};

/**
 * Editar auditoría (roles: admin, auditor, supervisor)
 */
exports.updateAudit = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Solo admin/auditor/supervisor pueden editar
    if (!['admin', 'auditor', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ message: 'No autorizado' });
    }

    // Manejo de campo auditor:
    // - Si el payload trae auditor -> respetar (porque viene de un select en el frontend)
    // - Si no trae -> se asigna el usuario que edita (fallback)
    if (!updates.auditor) {
        updates.auditor = req.user._id;
    }

    const audit = await Audit.findByIdAndUpdate(
        id,
        updates,
        { new: true }
    )
        .populate('asesor', 'nombre name email')
        .populate('auditor', 'nombre name email')
        .populate('groupId', 'nombre name');

    if (!audit) {
        return res.status(404).json({ message: 'Auditoría no encontrada' });
    }

    try {
        emitAuditUpdate(audit._id, audit);
    } catch (e) {
        logger.error("emitAuditUpdate error", e);
    }

    res.json(audit);
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
        const { afiliadoKey, afiliadoKeyDefinitiva } = req.body; // ✅ se añade este campo

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

        // ✅ Clave afiliado definitiva (solo admin)
        if (req.user.role === "admin" && afiliadoKeyDefinitiva && afiliadoKeyDefinitiva.trim()) {
            audit.multimedia.afiliadoKeyDefinitiva = afiliadoKeyDefinitiva.trim();
        }

        await audit.save();

        try {
            emitAuditUpdate(audit);
        } catch (e) {
            logger.error("socket emit error uploadMultimedia", e);
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

    if (!['admin', 'auditor'].includes(req.user.role)) {
        return res.status(403).json({ message: 'No autorizado' });
    }

    const audit = await Audit.findByIdAndDelete(id);

    if (!audit) {
        return res.status(404).json({ message: 'Auditoría no encontrada' });
    }

    try {
        emitAuditUpdate(id, { deleted: true });
    } catch (e) {
        logger.error("emitAuditUpdate (delete) error", e);
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
        if (estado) filter.status = { $regex: estado, $options: "i" };
        if (tipo) filter.tipoVenta = { $regex: tipo, $options: "i" };

        let audits = await Audit.find(filter)
            .populate('asesor', 'nombre name email')
            .populate('auditor', 'nombre name email')
            .populate('groupId', 'nombre name')
            .lean();

        // filtros post-populate (asesor/auditor/grupo) como en getAuditsByDate
        if (asesor) {
            const q = (asesor || "").toLowerCase();
            audits = audits.filter(a => {
                const as = a.asesor;
                if (!as) return false;
                return (
                    (as.email && as.email.toLowerCase().includes(q)) ||
                    (as.nombre && as.nombre.toLowerCase().includes(q)) ||
                    (as.name && as.name.toLowerCase().includes(q))
                );
            });
        }

        if (auditor) {
            const q = (auditor || "").toLowerCase();
            audits = audits.filter(a => {
                const au = a.auditor;
                if (!au) return false;
                return (
                    (au.email && au.email.toLowerCase().includes(q)) ||
                    (au.nombre && au.nombre.toLowerCase().includes(q)) ||
                    (au.name && au.name.toLowerCase().includes(q))
                );
            });
        }

        if (grupo) {
            const q = (grupo || "").toLowerCase();
            audits = audits.filter(a => {
                const g = a.groupId;
                if (!g) return false;
                return (
                    (g.nombre && g.nombre.toLowerCase().includes(q)) ||
                    (g.name && g.name.toLowerCase().includes(q))
                );
            });
        }

        // Normalizar / aplanar datos para CSV (evitamos [Object])
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
        if (!from || !to)
            return res.status(400).json({ message: "Parámetros de fecha requeridos." });

        const start = parseLocalDate(from);
        const end = parseLocalDate(to);
        end.setDate(end.getDate() + 1);

        const audits = await Audit.find({
            scheduledAt: { $gte: start, $lt: end },
        })
            .populate('asesor', 'nombre name email')
            .populate('auditor', 'nombre name email')
            .populate('groupId', 'nombre name')
            .sort({ scheduledAt: -1 });

        res.json(audits);
    } catch (error) {
        logger.error("getAuditsByDateRange error", error);
        res.status(500).json({ message: "Error interno al filtrar auditorías" });
    }
};