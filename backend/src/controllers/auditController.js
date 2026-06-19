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
const AffiliateContribution = require('../models/AffiliateContribution');
const Affiliate = require('../models/Affiliate');
const { computeAndUpdateCanSell } = require('../utils/canSellUtils');
const { normalizeCuil, buildCuilLooseRegex } = require('../utils/cuilUtils');
const {
    emitNewAudit,
    emitAuditUpdate,
    emitFollowUpUpdate,
    getIO
} = require("../config/socket");
const { Parser } = require('json2csv');
const logger = require("../utils/logger");
const {
    maskAuditPhoneIfNeeded,
    normalizeAuditPhoneRole,
} = require("../utils/auditPhoneVisibility");
const {
    notifyAuditDeleted,
    notifyAuditCreated,
    notifyAuditCompleted,
    notifyAuditQRDone,
    notifyRecoveryAuditCompleted
} = require("../services/notificationService");
const { escapeRegex } = require("../utils/stringUtils");
const {
    normalizeCuil: normalizeAuditCuil,
    isValidNormalizedCuil,
    findBlockingAuditByCuilNormalized,
    buildDuplicateCuilResponse,
} = require("../utils/auditDuplicateUtils");
const documentProcessingCaseService = require("../services/documentProcessingCase.service");
const { resolveStatusUpdate } = require("../utils/statusResolver");
const {
    AuditPhoneValidationError,
    normalizeAuditPhone,
} = require("../utils/auditPhoneValidation");

const AUDIT_UPDATE_ALLOWED_FIELDS = new Set([
    "nombre",
    "cuil",
    "tipoVenta",
    "obraSocialAnterior",
    "obraSocialVendida",
    "scheduledAt",
    "asesor",
    "validador",
    "auditor",
    "administrador",
    "groupId",
    "datosExtra",
    "aporte",
    "cuit",
    "observacionPrivada",
    "clave",
    "esAutovinculacion",
    "email",
    "status",
    "statusAdministrativo",
    "fechaCreacionQR",
    "isRecuperada",
    "disponibleParaVenta",
    "isReferido",
    "supervisor",
    "numeroEquipo",
    "_sourceInterface",
]);

const CLIENT_PROTECTED_AUDIT_FIELDS = new Set([
    "telefono",
    "telefonoHistory",
]);

function pickAuditUpdates(body = {}) {
    const updates = {};
    for (const field of AUDIT_UPDATE_ALLOWED_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            updates[field] = body[field];
        }
    }
    return updates;
}

function hasProtectedAuditField(body = {}) {
    return [...CLIENT_PROTECTED_AUDIT_FIELDS].find(field => Object.prototype.hasOwnProperty.call(body, field));
}

function getRequestId(req) {
    return req.get?.("x-request-id") || req.id || "";
}

function buildTelefonoHistoryEntry({
    previousValue = null,
    newValue = null,
    user,
    endpoint,
    sourceComponent = "",
    requestId = "",
    reason = "",
    source = "",
    eventType = "updated",
}) {
    return {
        previousValue,
        newValue,
        changedAt: new Date(),
        changedBy: user?._id || null,
        changedByName: user?.nombre || user?.name || user?.username || "",
        changedByEmail: user?.email || user?.username || "",
        changedByRole: user?.role || "",
        endpoint,
        sourceComponent,
        requestId,
        reason,
        source,
        eventType,
    };
}

function handleAuditPhoneValidationError(res, err) {
    if (err instanceof AuditPhoneValidationError || err?.statusCode === 400) {
        return res.status(400).json({ message: err.message });
    }
    throw err;
}

function serializeAuditForUser(audit, user, existingCanViewPhone = false) {
    if (!audit) return audit;
    const plainAudit = audit.toObject ? audit.toObject() : audit;
    return maskAuditPhoneIfNeeded(plainAudit, user, existingCanViewPhone);
}

async function maybeCreateDocumentProcessingCase(audit, user) {
    try {
        await documentProcessingCaseService.maybeCreateFromAudit(audit, user);
    } catch (error) {
        logger.error("Error creando caso de procesamiento documental:", error);
    }
}

async function recomputeCanSellByCuil(cuil, context = {}) {
    const normalized = normalizeCuil(cuil);
    if (!normalized) return { matched: 0, recomputed: 0, failed: 0 };

    const looseRegex = buildCuilLooseRegex(normalized);
    const affiliates = await Affiliate.find({
        $or: [
            { cuil },
            { cuil: normalized },
            { cuil: looseRegex }
        ]
    }).select('_id cuil').lean();

    let recomputed = 0;
    let failed = 0;

    for (const affiliate of affiliates) {
        const result = await computeAndUpdateCanSell(affiliate._id);
        if (result.success) recomputed++;
        else failed++;
        logger.info(
            "[AUDIT-QR-HECHO] CanSell recomputed | context=" + (context.action || "unknown") + " | " +
            "auditId=" + (context.auditId || "-") + " | cuil=" + cuil + " | affiliateId=" + affiliate._id + " | " +
            "canSell=" + result.canSell + " | success=" + result.success
        );
    }

    if (affiliates.length === 0) {
        logger.info(
            "[AUDIT-QR-HECHO] No Affiliate found for CanSell recomputation | context=" + (context.action || "unknown") + " | " +
            "auditId=" + (context.auditId || "-") + " | cuil=" + cuil
        );
    }

    return { matched: affiliates.length, recomputed, failed };
}

function parseLocalDateTime(datetimeStr) {
    if (!datetimeStr || typeof datetimeStr !== 'string') return null;
    const [datePart, timePart = '00:00:00'] = datetimeStr.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hh = 0, mm = 0, ss = 0] = timePart.split(':').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, hh || 0, mm || 0, ss || 0, 0);
}

function parseLocalDate(dateStr) {
    if (!dateStr) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

function getArgentinaDateKey(date = new Date()) {
    const argentinaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    return argentinaDate.toISOString().slice(0, 10);
}

async function checkAuditorBlockingAssignment(currentAuditId, auditorId, scheduledAt) {
    if (!auditorId) return { hasBlocking: false, blockingAudit: null };

    const today = scheduledAt ? new Date(scheduledAt) : new Date();
    const argentinaOffset = 3 * 60 * 60 * 1000;
    const argentinaToday = new Date(today.getTime() - argentinaOffset);

    const dayStart = new Date(argentinaToday);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayStartUTC = new Date(dayStart.getTime() + argentinaOffset);

    const dayEnd = new Date(argentinaToday);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const dayEndUTC = new Date(dayEnd.getTime() + argentinaOffset);

    const blockingStatuses = [null, undefined, "", "Seleccione", "Mensaje enviado", "En videollamada"];
    const statusClauses = blockingStatuses.map(status => {
        if (status === null) return { status: null };
        if (status === undefined) return { status: { $exists: false } };
        return { status: status };
    });

    const blockingAudit = await Audit.findOne({
        _id: { $ne: currentAuditId },
        auditor: auditorId,
        scheduledAt: {
            $gte: dayStartUTC,
            $lte: dayEndUTC
        },
        $or: statusClauses
    }).select('nombre status scheduledAt').lean();

    return {
        hasBlocking: !!blockingAudit,
        blockingAudit: blockingAudit || null
    };
}

const AUDITOR_LIQUIDATION_COMPLETION_STATUSES = [
  "Completa",
  "Autovinculación"
];

function normalizeAuditorLiquidationRole(role) {
    const normalized = String(role || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s._-]/g, '');

    if (normalized === 'auditor') return 'auditor';
    if (normalized === 'rrhh' || normalized === 'recursoshumanos') return 'rr.hh';
    return normalized;
}

function shouldCreditAuditorCompletion(audit, monthKey, user) {
    const userRole = normalizeAuditorLiquidationRole(user?.role);
    if (!['auditor', 'rr.hh'].includes(userRole) || !user?._id) return false;
    const history = Array.isArray(audit?.completeHistory) ? audit.completeHistory : [];
    return !history.some(entry => entry?.monthKey === monthKey);
}

function shouldTrackCompletionForAuditorLiquidation(previousStatus, newStatus) {
  const previousWasCompletion = AUDITOR_LIQUIDATION_COMPLETION_STATUSES.includes(previousStatus);
  const newIsCompletion = AUDITOR_LIQUIDATION_COMPLETION_STATUSES.includes(newStatus);
  return !previousWasCompletion && newIsCompletion;
}

function buildCompleteHistoryEntry(completeDate, user) {
    return {
        monthKey: completeDate.slice(0, 7),
        completeDate,
        completedByUserId: user._id,
        completedByRole: user.role
    };
}

const LEGACY_STATUS_MAP = {
    "Aprobada pero no reconoce clave": ["Aprobada pero no reconoce clave", "Aprobada, pero no reconoce clave"]
};

function normalizeStatusFilter(statusValues) {
    if (!Array.isArray(statusValues)) return statusValues;

    const normalized = new Set();
    statusValues.forEach(status => {
        normalized.add(status);
        if (LEGACY_STATUS_MAP[status]) {
            LEGACY_STATUS_MAP[status].forEach(s => normalized.add(s));
        }
    });

    return [...normalized];
}

/**
 * Crear auditoría y notificar
 */
exports.createAudit = async (req, res) => {
    const { nombre, cuil, telefono, tipoVenta, obraSocialAnterior, obraSocialVendida, scheduledAt, asesor, validador } = req.body;
    let normalizedTelefono;
    try {
        normalizedTelefono = normalizeAuditPhone(telefono);
    } catch (err) {
        return handleAuditPhoneValidationError(res, err);
    }

    const sched = new Date(scheduledAt);
    if (!sched || isNaN(sched.getTime())) {
        return res.status(400).json({ message: 'Fecha inválida' });
    }

    const isGerencia = req.user?.role?.toLowerCase() === 'gerencia' || req.user?.role?.toLowerCase() === 'encargado';

    if (!isGerencia) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (sched < today) {
            return res.status(400).json({ message: 'Fecha inválida' });
        }
    }

    const userRole = req.user?.role?.toLowerCase();
    const isIndependiente = userRole === 'independiente';
    let finalAsesor = asesor;
    let supervisorSnapshotForIndependiente = null;
    let isReferidoFlag = req.body.isReferido || false;

    if (isIndependiente) {
        finalAsesor = req.user._id;

        const User = require('../models/User');
        const elianaSoledad = await User.findOne({
            $or: [
                { nombre: { $regex: /eliana.*soledad/i } },
                { email: { $regex: /eliana.*soledad/i } }
            ],
            role: 'gerencia',
            active: true
        }).select('_id nombre numeroEquipo');

        if (!elianaSoledad) {
            return res.status(400).json({
                message: 'No se pudo asignar supervisor automático. Eliana Soledad (Gerencia) no encontrada en el sistema.'
            });
        }

        supervisorSnapshotForIndependiente = {
            _id: elianaSoledad._id,
            nombre: elianaSoledad.nombre,
            numeroEquipo: null
        };

        isReferidoFlag = true;
        logger.info("[INDEPENDIENTE] Usuario " + req.user.nombre + " creando venta. Asesor: auto-asignado, Supervisor: " + elianaSoledad.nombre);
    }

    const cuilNormalized = normalizeAuditCuil(cuil);
    if (cuil && String(cuil).trim() && !isValidNormalizedCuil(cuilNormalized)) {
        return res.status(400).json({ message: "CUIL inválido. Debe tener 11 dígitos." });
    }

    if (cuilNormalized) {
        const existing = await findBlockingAuditByCuilNormalized(cuilNormalized);
        if (existing) {
            return res.status(409).json(buildDuplicateCuilResponse(existing));
        }
    }

    const slotStart = new Date(sched);
    const slotEnd = new Date(sched);
    slotEnd.setMinutes(slotEnd.getMinutes() + 20);

    const count = await Audit.countDocuments({
        scheduledAt: { $gte: slotStart, $lt: slotEnd }
    });
    if (count >= 10) {
        return res.status(400).json({ message: 'Turno completo' });
    }

    const doubleCheck = await Audit.countDocuments({
        scheduledAt: { $gte: slotStart, $lt: slotEnd }
    });
    if (doubleCheck >= 10) {
        return res.status(400).json({ message: 'Turno completo (verificación final)' });
    }

    let supervisorSnapshotData = null;

    if (supervisorSnapshotForIndependiente) {
        supervisorSnapshotData = supervisorSnapshotForIndependiente;
    } else if (req.body.supervisor) {
        const User = require('../models/User');
        const supervisorUser = await User.findById(req.body.supervisor).select('_id nombre numeroEquipo');
        if (supervisorUser) {
            supervisorSnapshotData = {
                _id: supervisorUser._id,
                nombre: supervisorUser.nombre,
                numeroEquipo: supervisorUser.numeroEquipo ? String(supervisorUser.numeroEquipo) : null
            };
        }
    }

    const audit = new Audit({
        nombre,
        cuil: cuil ? String(cuil).trim() : cuil,
        cuilNormalized,
        telefono: normalizedTelefono,
        tipoVenta,
        obraSocialAnterior,
        obraSocialVendida,
        scheduledAt: sched,
        asesor: finalAsesor || req.user._id,
        validador: validador || null,
        createdBy: req.user._id,
        groupId: req.user.groupId,
        auditor: null,
        datosExtra: req.body.datosExtra || "",
        supervisorSnapshot: supervisorSnapshotData,
        isReferido: isReferidoFlag
    });

    audit.telefonoHistory.push(buildTelefonoHistoryEntry({
        previousValue: null,
        newValue: normalizedTelefono,
        user: req.user,
        endpoint: "POST /api/audits",
        sourceComponent: req.body._sourceComponent || req.body._sourceInterface || "audit-create",
        requestId: getRequestId(req),
        reason: "Audit created",
        source: "request.body.telefono",
        eventType: "created",
    }));

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

    await audit.populate('createdBy', 'nombre email role numeroEquipo');
    await audit.populate('datosExtraHistory.updatedBy', 'nombre name username email role');
    await audit.populate('statusHistory.updatedBy', 'nombre name username email role');
    await audit.populate('telefonoHistory.changedBy', 'nombre name username email role');

    try { emitNewAudit(audit); } catch (e) { logger.error("socket emit error", e); }

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
            userId,
            assignedAuditorOnly
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
                    // ✅ Ajustar rango para fechaCreacionQR: compensar desfase UTC (-3 horas Argentina)
                    // fechaCreacionQR puede estar guardado en UTC medianoche, lo que causa desfase
                    const fromAdjusted = new Date(from.getTime() - (3 * 60 * 60 * 1000));

                    filter.$or = [
                        // Caso 1: fechaCreacionQR existe y tiene valor válido en el rango (ajustado)
                        { fechaCreacionQR: { $ne: null, $gte: fromAdjusted, $lt: to } },
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

                if (!dateField) {
                    // ✅ Misma lógica dual: fechaCreacionQR (ajustado) o scheduledAt
                    const dayAdjusted = new Date(day.getTime() - (3 * 60 * 60 * 1000));

                    filter.$or = [
                        { fechaCreacionQR: { $ne: null, $gte: dayAdjusted, $lt: next } },
                        {
                            $and: [
                                { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                                { scheduledAt: { $gte: day, $lt: next } }
                            ]
                        }
                    ];
                } else {
                    filter[fieldToFilter] = { $gte: day, $lt: next };
                }
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
                    // ✅ Buscar SOLO en campo status para filtrado de interfaces preciso
                    // El campo statusAdministrativo es para uso administrativo interno,
                    // no para determinar en qué interfaz aparece un registro

                    // ✅ Normalize status values to handle backward compatibility
                    // This ensures records with legacy "Aprobada, pero no reconoce clave"
                    // are also matched when filtering for canonical "Aprobada pero no reconoce clave"
                    const normalizedStatuses = normalizeStatusFilter(uniqueStatuses);
                    const statusCondition = { status: { $in: normalizedStatuses } };

                    // ✅ Si ya existe un $or (ej. por userId), combinar con $and
                    if (filter.$or) {
                        const existingOr = filter.$or;
                        delete filter.$or;
                        filter.$and = filter.$and || [];
                        filter.$and.push({ $or: existingOr });
                        filter.$and.push(statusCondition);
                    } else {
                        filter.status = { $in: normalizedStatuses };
                    }
                }
            }
        }
        if (tipo) filter.tipoVenta = { $regex: escapeRegex(tipo), $options: "i" };

        /* Visibilidad por rol */
        const expRole = (req.user?.role || '').toLowerCase();
        if (expRole === 'asesor' || expRole === 'independiente') {
            /* ✅ RESTRICCIÓN ASESOR/INDEPENDIENTE: Solo ve ventas donde es el asesor asignado O fue el creador */
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
        } else if (expRole === 'auditor' && assignedAuditorOnly === 'true') {
            const auditorFilter = { auditor: req.user._id };
            if (filter.$or || filter.$and) {
                filter = {
                    $and: [
                        filter,
                        auditorFilter
                    ]
                };
            } else {
                filter.auditor = req.user._id;
            }
        } else if (expRole === 'supervisor' || expRole === 'encargado') {
            /* Supervisores/Encargados ven TODAS las auditorías
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
            .populate('revisado_por', 'nombre name')
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
            .populate('administradorHistory.previousAdmin', 'nombre name')
            .populate('administradorHistory.newAdmin', 'nombre name')
            .populate('administradorHistory.changedBy', 'nombre name')
            .populate('telefonoHistory.changedBy', 'nombre name username email role')
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
                    const sup = await User.findOne({ role: { $in: ['supervisor', 'supervisor_reventa', 'encargado'] }, numeroEquipo: String(grupo) })
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
            // ✅ FIX: Solo aplicar fallback si NO hay supervisor asignado (para evitar reaparecer grupo cuando se asignó supervisor manual)
            if (!a.groupId && grupo && (!a.supervisorSnapshot || !a.supervisorSnapshot.nombre)) {
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

        // ✅ Ordenamiento por fechaOrden: momento efectivo en que el turno quedó agendado
        // Para reprogramadas: última entrada "Reprogramada" en statusHistory (timestamp de reprogramación)
        // Para no reprogramadas: createdAt (timestamp de creación original)
        audits.sort((a, b) => {
            const schedA = new Date(a.scheduledAt).getTime();
            const schedB = new Date(b.scheduledAt).getTime();
            if (schedA !== schedB) return schedA - schedB;

            const getFechaOrden = (audit) => {
                const history = audit.statusHistory || [];
                const reprogramaciones = history
                    .filter(h => h.value === 'Reprogramada' || h.value === 'Reprogramada (falta confirmar hora)')
                    .map(h => new Date(h.updatedAt).getTime())
                    .filter(t => !isNaN(t));
                if (reprogramaciones.length > 0) {
                    return Math.max(...reprogramaciones);
                }
                return new Date(audit.createdAt).getTime();
            };

            return getFechaOrden(a) - getFechaOrden(b);
        });

        // ── Enriquecer con datos de aportes ARCA (por CUIL) ──
        if (audits.length) {
            const cuils = [...new Set(audits.map((a) => a.cuil).filter(Boolean))];
            if (cuils.length) {
                const contributions = await AffiliateContribution.find(
                    { cuil: { $in: cuils } },
                    { cuil: 1, lastContributionPeriod: 1, "verification.status": 1, "verification.checkedAt": 1 }
                ).lean();

                const contribMap = {};
                for (const c of contributions) {
                    contribMap[c.cuil] = c;
                }

                for (const audit of audits) {
                    const contrib = audit.cuil ? contribMap[audit.cuil] : null;
                    audit.contribution = contrib
                        ? {
                              lastContributionPeriod: contrib.lastContributionPeriod || null,
                              verificationStatus: contrib.verification?.status || "pending",
                              verificationCheckedAt: contrib.verification?.checkedAt || null,
                          }
                        : {
                              lastContributionPeriod: null,
                              verificationStatus: "pending",
                              verificationCheckedAt: null,
                          };
                }
            }
        }

        audits = audits.map(audit => serializeAuditForUser(audit, req.user));

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
    const { status, statusAdministrativo } = req.body;
    const sourceInterface = req.body._sourceInterface;

    const now = new Date();

    // ✅ STATUS SYNCHRONIZATION (Phase 1)
    // Resolve status update based on source interface
    let resolvedStatus = status;
    let resolvedStatusAdministrativo = status;

    if (sourceInterface) {
        // For registro_ventas, use statusAdministrativo as the source of truth
        // (it contains the administrative value like "Hacer QR")
        // For seguimiento, use status directly (it contains the operational value)
        const incomingStatus = (sourceInterface === "registro_ventas" && statusAdministrativo)
            ? statusAdministrativo
            : status;

        const resolution = resolveStatusUpdate({
            sourceInterface,
            incomingStatus
        });

        if (resolution.warning) {
            logger.warn(`[StatusSync] updateStatus ${id}: ${resolution.warning}`);
        }

        // Reject non-assignable statuses from Seguimiento
        if (!resolution.isValid && resolution.syncType === "rejected_non_assignable") {
            return res.status(400).json({
                message: resolution.warning || "Invalid status assignment"
            });
        }

        resolvedStatus = resolution.status;
        resolvedStatusAdministrativo = resolution.statusAdministrativo;

        logger.info(`[StatusSync] updateStatus ${id}: ${resolution.syncType} (${sourceInterface} -> status=${resolvedStatus}, admin=${resolvedStatusAdministrativo})`);
    }

    if (resolvedStatus === "QR hecho") {
        const currentAudit = await Audit.findById(id).select("cuil cuilNormalized nombre").lean();
        if (!currentAudit) {
            return res.status(404).json({ message: "Auditoría no encontrada" });
        }
        const qrCuilNormalized = currentAudit.cuilNormalized || normalizeAuditCuil(currentAudit.cuil);
        if (qrCuilNormalized && isValidNormalizedCuil(qrCuilNormalized)) {
            const duplicate = await findBlockingAuditByCuilNormalized(qrCuilNormalized, id);
            if (duplicate) {
                return res.status(409).json(buildDuplicateCuilResponse(duplicate));
            }
        }
    }

    const update = {
        status: resolvedStatus,
        statusAdministrativo: resolvedStatusAdministrativo,
        statusUpdatedAt: now
    };
    const previousAudit = await Audit.findById(id).select("status completeHistory cuil cuilNormalized nombre").lean();
    if (!previousAudit) {
        return res.status(404).json({ message: "Auditoría no encontrada" });
    }
    const enteredCompletion = shouldTrackCompletionForAuditorLiquidation(previousAudit?.status, resolvedStatus);
    const completeDate = enteredCompletion ? getArgentinaDateKey(now) : null;
    let completeHistoryEntry = null;

    update.isComplete = resolvedStatus === "Completa";  // Keep tied only to "Completa"
    if (enteredCompletion) {
        update.completeDate = completeDate;
        const monthKey = completeDate.slice(0, 7);
        if (shouldCreditAuditorCompletion(previousAudit, monthKey, req.user)) {
            completeHistoryEntry = buildCompleteHistoryEntry(completeDate, req.user);
        }
    }

    // ✅ ACTUALIZAR FECHA CUANDO CAMBIA A "QR hecho"
    if (resolvedStatus === 'QR hecho') {
        update.scheduledAt = now;
        update.fechaCreacionQR = now; // ✅ Nuevo campo
        logger.info(`updateStatus: Auditoría ${id} cambió a QR hecho. Fecha actualizada a: ${update.scheduledAt}`);
    }

    // ✅ ACTUALIZAR FECHA CUANDO UN ADMIN CAMBIA EL ESTADO (cualquier cambio de estado)
    const userRole = req.user?.role?.toLowerCase();
    if (userRole === 'admin' || userRole === 'administrativo') {
        update.scheduledAt = now;
        logger.info(`updateStatus: Admin/Administrativo cambió estado de auditoría ${id} a "${resolvedStatus}". Fecha actualizada a: ${update.scheduledAt}`);
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

    if (recoveryStates.includes(resolvedStatus)) {
        update.recoveryEligibleAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        // Resetear flag de notificación para que pueda enviar nueva notificación después de 12h
        update.followUpNotificationSent = false;
    } else {
        update.recoveryEligibleAt = null;
        // Resetear flag cuando sale del estado problemático
        update.followUpNotificationSent = false;
    }
    const updateDoc = { $set: update };
    if (completeHistoryEntry) {
        updateDoc.$push = { completeHistory: completeHistoryEntry };
    }

    const audit = await Audit.findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true });

    if (audit) {
        try {
            // ✅ Incluir updatedBy para evitar notificaciones al propio usuario
            // ✅ Incluir ambos campos de estado para sincronización
            emitAuditUpdate(audit._id, {
                status: resolvedStatus,
                statusAdministrativo: resolvedStatusAdministrativo,
                updatedBy: req.user._id
            });

            // ✅ Enviar notificación interna al asesor si no fue él quien hizo el cambio
        } catch (e) {
            logger.error("emitAuditUpdate error", e);
        }
        if (enteredCompletion && audit.status === "Completa") {
            await maybeCreateDocumentProcessingCase(audit, req.user);
        }

        // 🔁 RECOMPUTE CanSell when status changes to/from "QR hecho"
        // This affects availability for the Affiliate with this CUIL
        const previousStatus = previousAudit?.status;
        const newStatus = resolvedStatus;

        if (previousStatus !== newStatus && (previousStatus === "QR hecho" || newStatus === "QR hecho") && audit.cuil) {
            try {
                await recomputeCanSellByCuil(audit.cuil, {
                    action: "updateStatus",
                    auditId: id,
                    previousStatus,
                    newStatus
                });
            } catch (canSellErr) {
                logger.error(
                    `[AUDIT-QR-HECHO] CanSell recomputation failed | auditId=${id} | ` +
                    `cuil=${audit.cuil} | error=${canSellErr.message}`
                );
            }
        }
    }

    res.json(serializeAuditForUser(audit, req.user));
};

/**
 * Editar auditoría (roles: administrativo, auditor, supervisor, gerencia, RR.HH)
 */
exports.updateAudit = async (req, res) => {
    try {
        const { id } = req.params;
        const protectedField = hasProtectedAuditField(req.body);
        if (protectedField) {
            return res.status(400).json({
                message: `${protectedField} no puede modificarse desde este endpoint. Use la operación dedicada de teléfono.`
            });
        }
        const updates = pickAuditUpdates(req.body);

        // Solo administrativo/auditor/supervisor/gerencia/RR.HH/recuperador pueden editar
        const userRole = (req.user.role || '').toLowerCase();
        logger.info(`[updateAudit] Usuario: ${req.user.nombre}, Rol original: "${req.user.role}", Rol normalizado: "${userRole}"`);

        if (!['administrativo', 'auditor', 'supervisor', 'gerencia', 'rr.hh', 'encargado', 'independiente', 'recuperador'].includes(userRole)) {
            logger.warn(`[updateAudit] Acceso denegado para rol: "${userRole}"`);
            return res.status(403).json({ message: 'No autorizado' });
        }

        // Obtener auditoría anterior para comparar cambios
        const oldAudit = await Audit.findById(id);
        if (!oldAudit) {
            return res.status(404).json({ message: 'Auditoría no encontrada' });
        }

        const oldStatus = oldAudit.status;

        // ✅ FIELD RESTRICTION for Auditor/Supervisor in recovery states (Falta clave, Rechazada, Pendiente, etc.)
        // These roles can ONLY update: datosExtra, scheduledAt (fecha/hora), and status (limited options)
        const recoveryStates = [
            "Falta clave",
            "Falta documentación",
            "Falta clave y documentación",
            "Pendiente",
            "Rechazada"
        ];

        const isLimitedRole = userRole === 'auditor' || userRole === 'supervisor';
        const isRecoveryState = recoveryStates.includes(oldAudit.status);

        if (isLimitedRole && isRecoveryState) {
            // Define allowed fields for limited editing. Status is allowed only when
            // explicitly changed to a valid Seguimiento status and the auditor is assigned.
            const allowedFields = ['datosExtra', 'scheduledAt'];
            const requestedStatusChange = Object.prototype.hasOwnProperty.call(updates, 'status') &&
                typeof updates.status === 'string' &&
                updates.status !== oldStatus;

            if (requestedStatusChange) {
                const incomingStatus = (updates._sourceInterface === 'registro_ventas' && updates.statusAdministrativo)
                    ? updates.statusAdministrativo
                    : updates.status;
                const resolution = resolveStatusUpdate({
                    sourceInterface: updates._sourceInterface || 'seguimiento',
                    incomingStatus
                });

                if (!resolution.isValid) {
                    return res.status(400).json({
                        success: false,
                        message: resolution.warning || 'No se puede asignar ese estado desde Seguimiento.'
                    });
                }

                if (userRole === 'auditor') {
                    const currentUserId = req.user?._id?.toString();
                    const oldAuditorIdForStatus = oldAudit.auditor?.toString() || null;
                    const requestedAuditorIdForStatus = updates.auditor ? updates.auditor.toString() : null;
                    const isAssignedAuditor = oldAuditorIdForStatus === currentUserId;
                    const isAssigningSelf = !oldAuditorIdForStatus && requestedAuditorIdForStatus === currentUserId;

                    if (!isAssignedAuditor && !isAssigningSelf) {
                        return res.status(403).json({
                            success: false,
                            message: 'No tenés permisos para cambiar el estado de esta auditoría.'
                        });
                    }

                    if (isAssigningSelf) {
                        allowedFields.push('auditor');
                    }
                }

                allowedFields.push('status', 'statusAdministrativo', '_sourceInterface');
            }

            // Check if any non-allowed fields are being modified
            const requestedFields = Object.keys(updates);
            const nonAllowedFields = requestedFields.filter(field => !allowedFields.includes(field));

            if (nonAllowedFields.length > 0) {
                logger.warn(`[updateAudit] Usuario ${req.user.nombre} (${userRole}) intentó modificar campos no permitidos: ${nonAllowedFields.join(', ')}. Estado: ${oldAudit.status}`);

                // Remove non-allowed fields from updates (preserve original values).
                // Never silently remove an explicitly requested status change.
                nonAllowedFields.forEach(field => {
                    delete updates[field];
                });

                // If no valid fields remain, return error
                if (Object.keys(updates).length === 0) {
                    return res.status(403).json({
                        success: false,
                        message: requestedStatusChange
                            ? 'No tenés permisos para cambiar el estado de esta auditoría.'
                            : 'No tienes permiso para modificar esos campos. Solo puedes editar: Datos Extra/Notas y Reprogramar turno (Fecha/Hora).'
                    });
                }
            }
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'cuil')) {
            const incomingCuil = updates.cuil;
            const incomingCuilNormalized = normalizeAuditCuil(incomingCuil);
            if (incomingCuil && String(incomingCuil).trim() && !isValidNormalizedCuil(incomingCuilNormalized)) {
                return res.status(400).json({ message: "CUIL inválido. Debe tener 11 dígitos." });
            }

            if (incomingCuilNormalized) {
                const duplicate = await findBlockingAuditByCuilNormalized(incomingCuilNormalized, id);
                if (duplicate) {
                    return res.status(409).json(buildDuplicateCuilResponse(duplicate));
                }
            }

            updates.cuil = incomingCuil ? String(incomingCuil).trim() : incomingCuil;
            updates.cuilNormalized = incomingCuilNormalized;
        }

        // 🔒 AUDITOR ASSIGNMENT LOCK: Prevent users from hoarding multiple audits
        // Check if the auditor field is being changed to a new non-empty value
        const oldAuditorId = oldAudit.auditor?.toString() || null;
        const newAuditorId = updates.auditor || null;
        const isAuditorBeingChanged = newAuditorId !== undefined && newAuditorId !== oldAuditorId;

        if (isAuditorBeingChanged && newAuditorId) {
            const { hasBlocking, blockingAudit } = await checkAuditorBlockingAssignment(
                id,
                newAuditorId,
                updates.scheduledAt || oldAudit.scheduledAt
            );

            if (hasBlocking) {
                logger.warn(`[AuditorLock] Bloqueada asignación de auditor ${newAuditorId} a auditoría ${id}. Ya tiene auditoría bloqueante: ${blockingAudit?._id} (${blockingAudit?.status})`);
                return res.status(409).json({
                    message: "Este auditor ya tiene una auditoría pendiente hoy. Debe finalizarla antes de tomar otra.",
                    blockingAudit: blockingAudit ? {
                        _id: blockingAudit._id,
                        affiliateName: blockingAudit.nombre,
                        status: blockingAudit.status
                    } : null
                });
            }
        }

        if ('completeHistory' in updates) delete updates.completeHistory;
        if ('completeDate' in updates) delete updates.completeDate;
        if ('isComplete' in updates) delete updates.isComplete;

        // ✅ STATUS SYNCHRONIZATION (Phase 1)
        // Resolve status update based on source interface
        if (typeof updates.status === 'string' && updates.status !== oldStatus) {
            const sourceInterface = updates._sourceInterface;
            // For registro_ventas, use statusAdministrativo as the source of truth
            // (it contains the administrative value like "Hacer QR")
            // For seguimiento, use status directly (it contains the operational value)
            const incomingStatus = (sourceInterface === "registro_ventas" && updates.statusAdministrativo)
                ? updates.statusAdministrativo
                : updates.status;

            const resolution = resolveStatusUpdate({
                sourceInterface,
                incomingStatus
            });

            // Log any warnings
            if (resolution.warning) {
                logger.warn(`[StatusSync] Audit ${id}: ${resolution.warning}`);
            }

            // Reject non-assignable statuses from Seguimiento
            if (!resolution.isValid && resolution.syncType === "rejected_non_assignable") {
                return res.status(400).json({
                    message: resolution.warning || "Invalid status assignment from Seguimiento"
                });
            }

            // Apply resolved values
            updates.status = resolution.status;
            updates.statusAdministrativo = resolution.statusAdministrativo;

            logger.info(`[StatusSync] Audit ${id}: ${resolution.syncType} (${sourceInterface || 'unknown'} -> status=${resolution.status}, admin=${resolution.statusAdministrativo})`);

            // Remove source flag before saving
            delete updates._sourceInterface;
        }

        if (updates.status === "QR hecho") {
            const qrCuilNormalized = updates.cuilNormalized || oldAudit.cuilNormalized || normalizeAuditCuil(updates.cuil || oldAudit.cuil);
            if (qrCuilNormalized && isValidNormalizedCuil(qrCuilNormalized)) {
                const duplicate = await findBlockingAuditByCuilNormalized(qrCuilNormalized, id);
                if (duplicate) {
                    return res.status(409).json(buildDuplicateCuilResponse(duplicate));
                }
            }
        }

        // Si se está cambiando el estado, resetear flag de notificación de seguimiento
        let statusHistoryEntry = null;
        let completeHistoryEntry = null;
        let adminHistoryEntry = null;
        if (typeof updates.status === 'string' && updates.status !== oldStatus) {
            updates.statusUpdatedAt = new Date();
            updates.followUpNotificationSent = false;
            updates.isComplete = updates.status === "Completa";  // Keep tied only to "Completa"

            const enteredCompletion = shouldTrackCompletionForAuditorLiquidation(oldStatus, updates.status);
            if (enteredCompletion) {
                const completeDate = getArgentinaDateKey(updates.statusUpdatedAt);
                updates.completeDate = completeDate;
                const monthKey = completeDate.slice(0, 7);
                if (shouldCreditAuditorCompletion(oldAudit, monthKey, req.user)) {
                    completeHistoryEntry = buildCompleteHistoryEntry(completeDate, req.user);
                }
            }

            //
            if (updates.status === 'QR hecho' || updates.status === 'QR hecho pero pendiente de aprobación') {
                updates.scheduledAt = new Date();
                // ✅ Solo asignar fechaCreacionQR automáticamente si NO viene del frontend
                if (!updates.fechaCreacionQR) {
                    updates.fechaCreacionQR = new Date();
                    // ✅ Marcar como asignación automática para el historial
                    updates._fechaQRAutomatic = true;
                }
                logger.info(`Auditoría ${id} cambió a ${updates.status}. Fecha actualizada a: ${updates.scheduledAt}`);
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

        // Normalizar ambos valores a string de ObjectId o null
        const oldAdminId = oldAudit.administrador ? oldAudit.administrador.toString() : null;
        const newAdminId = updates.administrador ? updates.administrador.toString() : null;

    if (Object.prototype.hasOwnProperty.call(updates, 'administrador') && oldAdminId !== newAdminId) {
        adminHistoryEntry = {
            previousAdmin: oldAudit.administrador || null,
            newAdmin: updates.administrador || null,
            changedBy: req.user._id,
            changedAt: new Date()
        };
        logger.info(`[updateAudit] Historial admin: ${oldAdminId || 'null'} → ${newAdminId || 'null'} por ${req.user.nombre}`);
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
    // ✅ FIX: Si el grupo se establece explícitamente a NULL (updates.numeroEquipo === null),
    // significa que queremos "desvincular" del equipo y mantener el supervisor actual (manual).
    // En ese caso, NO recalculamos el snapshot.
    else if (updates.asesor || updates.groupId !== undefined || updates.numeroEquipo !== undefined) {
        // Verificar si es referido (ya sea en updates o en oldAudit)
        const isReferido = updates.isReferido !== undefined ? updates.isReferido : oldAudit.isReferido;

        // Si es referido, NO recalcular automáticamente por equipo (protege supervisor asignado manualmente)
        if (isReferido) {
            logger.info(`[updateAudit] Audit ${id} es Referido. Omitiendo recálculo automático de supervisor por equipo.`);
        }
        // Si numeroEquipo viene como null explícito, NO recalcular snapshot
        else if (updates.numeroEquipo === null || updates.groupId === null) {
            logger.info(`[updateAudit] Grupo/Equipo establecido a NULL para audit ${id}. Manteniendo supervisor actual.`);
        } else {
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
    }

        // ✅ Registrar historial de fechaCreacionQR si cambió
        let fechaQRHistoryEntry = null;
        if ('fechaCreacionQR' in updates) {
            const oldFechaQR = oldAudit.fechaCreacionQR ? new Date(oldAudit.fechaCreacionQR).toISOString() : null;
            const newFechaQR = updates.fechaCreacionQR ? new Date(updates.fechaCreacionQR).toISOString() : null;

            if (oldFechaQR !== newFechaQR) {
                // Determinar si fue automático (por cambio a QR hecho) o manual
                const isAutomatic = updates._fechaQRAutomatic === true;

                fechaQRHistoryEntry = {
                    value: updates.fechaCreacionQR ? new Date(updates.fechaCreacionQR) : null,
                    updatedBy: req.user._id,
                    updatedAt: new Date(),
                    isAutomatic: isAutomatic
                };

                logger.info(`[updateAudit] Registrando historial de fechaCreacionQR para auditoría ${id}. Automático: ${isAutomatic}`);
            }

            // Limpiar flag temporal
            delete updates._fechaQRAutomatic;
        }

        const updateDoc = {};
        if (Object.keys(updates).length) {
            updateDoc.$set = updates;
        }
        if (historyEntry || statusHistoryEntry || asesorHistoryEntry || fechaQRHistoryEntry || adminHistoryEntry || completeHistoryEntry) {
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
            if (fechaQRHistoryEntry) {
                updateDoc.$push.fechaQRHistory = fechaQRHistoryEntry;
            }
            if (adminHistoryEntry) {
                updateDoc.$push.administradorHistory = adminHistoryEntry;
            }
            if (completeHistoryEntry) {
                updateDoc.$push.completeHistory = completeHistoryEntry;
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
            await oldAudit.populate('fechaQRHistory.updatedBy', 'nombre name username email role');
            await oldAudit.populate('telefonoHistory.changedBy', 'nombre name username email role');
            await oldAudit.populate({
                path: 'asesorHistory',
                populate: [
                    { path: 'previousAsesor', select: 'nombre name' },
                    { path: 'newAsesor', select: 'nombre name' },
                    { path: 'changedBy', select: 'nombre name' }
                ]
            });
            await oldAudit.populate('administradorHistory.previousAdmin', 'nombre name');
            await oldAudit.populate('administradorHistory.newAdmin', 'nombre name');
            await oldAudit.populate('administradorHistory.changedBy', 'nombre name');
            return res.json(serializeAuditForUser(oldAudit, req.user));
        }

        // No sobreescribir auditor automáticamente. Solo cambiar si viene en el payload.

        const audit = await Audit.findByIdAndUpdate(
            id,
            updateDoc,
            { new: true, runValidators: true }
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
            .populate('fechaQRHistory.updatedBy', 'nombre name username email role')
            .populate('telefonoHistory.changedBy', 'nombre name username email role')
            .populate({
                path: 'asesorHistory',
                populate: [
                    { path: 'previousAsesor', select: 'nombre name' },
                    { path: 'newAsesor', select: 'nombre name' },
                    { path: 'changedBy', select: 'nombre name' }
                ]
            })
            .populate('administradorHistory.previousAdmin', 'nombre name')
            .populate('administradorHistory.newAdmin', 'nombre name')
            .populate('administradorHistory.changedBy', 'nombre name');

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
            await maybeCreateDocumentProcessingCase(audit, req.user);
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

        const cuilChanged = normalizeCuil(oldAudit.cuil) !== normalizeCuil(audit.cuil);
        const qrRelevantStatusChange = oldStatus !== newStatus && (oldStatus === "QR hecho" || newStatus === "QR hecho");
        const qrRelevantCuilChange = cuilChanged && (oldStatus === "QR hecho" || newStatus === "QR hecho");

        if (qrRelevantStatusChange || qrRelevantCuilChange) {
            const cuilsToRecompute = new Set([oldAudit.cuil, audit.cuil].filter(Boolean));
            for (const cuil of cuilsToRecompute) {
                try {
                    await recomputeCanSellByCuil(cuil, {
                        action: "updateAudit",
                        auditId: id,
                        previousStatus: oldStatus,
                        newStatus
                    });
                } catch (canSellErr) {
                    logger.error(
                        `[AUDIT-QR-HECHO] CanSell recomputation failed | auditId=${id} | ` +
                        `cuil=${cuil} | error=${canSellErr.message}`
                    );
                }
            }
        }

        res.json(serializeAuditForUser(audit, req.user));
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
 * Actualizar telefono de auditoría con historial atómico.
 * PATCH /audits/:id/telefono
 */
exports.updateAuditTelefono = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = normalizeAuditPhoneRole(req.user?.role);
        if (!["gerencia", "desarrollador"].includes(userRole)) {
            return res.status(403).json({ message: "No autorizado para modificar teléfono" });
        }

        const protectedTelefonoUpdateFields = [
            "telefonoHistory",
            "changedBy",
            "changedByName",
            "changedByEmail",
            "changedByRole",
            "previousValue",
            "newValue",
            "changedAt",
        ];
        const submittedProtectedField = protectedTelefonoUpdateFields.find(field =>
            Object.prototype.hasOwnProperty.call(req.body || {}, field)
        );
        if (submittedProtectedField) {
            return res.status(400).json({ message: `${submittedProtectedField} no puede modificarse desde el cliente` });
        }

        let normalizedTelefono;
        try {
            normalizedTelefono = normalizeAuditPhone(req.body?.telefono);
        } catch (err) {
            return handleAuditPhoneValidationError(res, err);
        }

        const eventType = req.body?.eventType === "recovered" ? "recovered" : "updated";
        const submittedReason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
        const submittedSource = typeof req.body?.source === "string" ? req.body.source.trim() : "";
        if (eventType === "recovered") {
            if (!submittedReason) {
                return res.status(400).json({ message: "reason es requerido para recuperaciones de teléfono" });
            }
            if (!submittedSource) {
                return res.status(400).json({ message: "source es requerido para recuperaciones de teléfono" });
            }
        }

        const oldAudit = await Audit.findById(id).select("telefono").lean();
        if (!oldAudit) {
            return res.status(404).json({ message: "Auditoría no encontrada" });
        }

        if (oldAudit.telefono === normalizedTelefono) {
            const unchanged = await Audit.findById(id)
                .populate('createdBy', 'nombre name email numeroEquipo')
                .populate('telefonoHistory.changedBy', 'nombre name username email role');
            return res.json(unchanged);
        }

        const historyEntry = buildTelefonoHistoryEntry({
            previousValue: oldAudit.telefono || null,
            newValue: normalizedTelefono,
            user: req.user,
            endpoint: "PATCH /api/audits/:id/telefono",
            sourceComponent: req.body?.sourceComponent || "dedicated-phone-update",
            requestId: getRequestId(req),
            reason: submittedReason || "Dedicated phone update",
            source: submittedSource || "request.body.telefono",
            eventType,
        });

        const audit = await Audit.findOneAndUpdate(
            { _id: id, telefono: oldAudit.telefono },
            {
                $set: { telefono: normalizedTelefono },
                $push: { telefonoHistory: historyEntry },
            },
            { new: true, runValidators: true }
        )
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo supervisor',
                populate: {
                    path: 'supervisor',
                    select: 'nombre name email numeroEquipo'
                }
            })
            .populate('auditor', 'nombre name email')
            .populate('createdBy', 'nombre name email numeroEquipo')
            .populate('telefonoHistory.changedBy', 'nombre name username email role');

        if (!audit) {
            return res.status(409).json({ message: "El teléfono fue modificado por otra operación. Recargue e intente nuevamente." });
        }

        try {
            const payload = audit.toObject ? audit.toObject() : audit;
            emitAuditUpdate(audit._id, { ...payload, updatedBy: req.user._id });
        } catch (e) {
            logger.error("emitAuditUpdate telefono error", e);
        }

        res.json(serializeAuditForUser(audit, req.user));
    } catch (err) {
        logger.error("Error actualizando teléfono de auditoría:", err);
        if (err.name === 'CastError') {
            return res.status(400).json({ message: `ID inválido para el campo ${err.path}` });
        }
        res.status(500).json({ message: "Error al actualizar teléfono: " + err.message });
    }
};

/**
 * Obtener auditoría por CUIL exacto
 */
exports.getAuditByCuil = async (req, res) => {
    try {
        const { cuil } = req.params;
        if (!cuil) return res.status(400).json({ message: "CUIL requerido" });

        const cuilNormalized = normalizeAuditCuil(cuil);
        const looseRegex = buildCuilLooseRegex(cuilNormalized);
        const audit = await Audit.findOne({
            $or: [
                { cuilNormalized },
                { cuil: cuil.trim() },
                { cuil: cuilNormalized },
                ...(looseRegex ? [{ cuil: looseRegex }] : [])
            ]
        }).lean();
        if (!audit) return res.status(404).json({ message: "No se encontró auditoría para ese CUIL" });

        res.json(serializeAuditForUser(audit, req.user));
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
            const completeDate = getArgentinaDateKey(new Date());
            audit.status = "Completa";
            audit.statusUpdatedAt = new Date();
            audit.isComplete = true;
            audit.completeDate = completeDate;
            const monthKey = completeDate.slice(0, 7);
            if (shouldCreditAuditorCompletion(audit, monthKey, req.user)) {
                if (!Array.isArray(audit.completeHistory)) audit.completeHistory = [];
                audit.completeHistory.push(buildCompleteHistoryEntry(completeDate, req.user));
            }
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
            await maybeCreateDocumentProcessingCase(audit, req.user);
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

    // ⚠️ IMPORTANTE: rol "encargado" NUNCA puede borrar registros
    if (req.user.role === 'encargado') {
        return res.status(403).json({ message: 'No autorizado para eliminar auditorías' });
    }

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

    // Verificar permisos: Solo Gerencia/Admin pueden eliminar
    // Supervisores pueden eliminar de su equipo o creadas por ellos
    // Encargado NO puede eliminar
    if (req.user.role === 'encargado') {
        return res.status(403).json({ message: 'Encargado no tiene permisos para eliminar auditorías' });
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

    const deletedAuditCuil = audit.cuil;
    const deletedAuditStatus = audit.status;
    await Audit.findByIdAndDelete(id);

    if (deletedAuditStatus === "QR hecho" && deletedAuditCuil) {
        try {
            await recomputeCanSellByCuil(deletedAuditCuil, {
                action: "deleteAudit",
                auditId: id,
                previousStatus: deletedAuditStatus,
                newStatus: null
            });
        } catch (canSellErr) {
            logger.error(
                `[AUDIT-QR-HECHO] CanSell recomputation failed after delete | auditId=${id} | ` +
                `cuil=${deletedAuditCuil} | error=${canSellErr.message}`
            );
        }
    }

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
        const role = (req.user?.role || '').toLowerCase();
        // Only Gerencia and Desarrollador can export from restricted Audit interfaces
        // Encargado is explicitly excluded from export permissions
        if (!['gerencia', 'desarrollador'].includes(role)) {
            return res.status(403).json({ message: 'No tienes permisos para exportar esta información.' });
        }

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
                    const sup = await User.findOne({ role: { $in: ['supervisor', 'supervisor_reventa', 'encargado'] }, numeroEquipo: String(grupo) })
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
        if (rangeRole === 'supervisor' || rangeRole === 'encargado') {
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
        const qrHechoCuilsToRecompute = new Set();
        const seenNormalizedCuils = new Set();

        const allUsers = await User.find({ active: { $ne: false } }).select('_id nombre email role numeroEquipo').lean();

        const supervisorMap = new Map();
        const asesorMap = new Map();
        const adminMap = new Map();

        allUsers.forEach(u => {
            const nombre = (u.nombre || '').toLowerCase().trim();
            const role = (u.role || '').toLowerCase();

            if (role === 'supervisor' || role === 'supervisor_reventa' || role === 'encargado') {
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
            "QR hecho", "QR hecho (Temporal)", "QR hecho pero pendiente de aprobación",
            "Hacer QR", "Aprobada", "Pendiente", "Cargada", "Falta clave", "AFIP",
            "Rechazada", "Remuneración no válida", "Autovinculación",
            "En revisión", "Caída", "Completa"
        ];
        const validStatusesLower = validStatuses.map(s => s.toLowerCase());

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNum = i + 2;
            const errors = [];
            let normalizedTelefono = null;

            if (!record.nombre || !record.nombre.trim()) {
                errors.push('Nombre es requerido');
            }

            try {
                normalizedTelefono = normalizeAuditPhone(record.telefono);
            } catch (err) {
                if (err instanceof AuditPhoneValidationError) {
                    errors.push(err.message);
                } else {
                    throw err;
                }
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

            const rowCuilNormalized = normalizeAuditCuil(record.cuil);
            if (record.cuil && String(record.cuil).trim() && !isValidNormalizedCuil(rowCuilNormalized)) {
                errors.push('CUIL inválido. Debe tener 11 dígitos.');
            }

            if (rowCuilNormalized) {
                if (seenNormalizedCuils.has(rowCuilNormalized)) {
                    errors.push('CUIL duplicado dentro del archivo importado.');
                } else {
                    seenNormalizedCuils.add(rowCuilNormalized);
                }

                const existingAudit = await findBlockingAuditByCuilNormalized(rowCuilNormalized);
                if (existingAudit) {
                    errors.push('CUIL duplicado: ya existe una venta/auditoría activa con este CUIL.');
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
                cuil: record.cuil ? String(record.cuil).trim() : undefined,
                cuilNormalized: rowCuilNormalized || undefined,
                telefono: normalizedTelefono,
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
                }],
                telefonoHistory: [buildTelefonoHistoryEntry({
                    previousValue: null,
                    newValue: normalizedTelefono,
                    user: req.user,
                    endpoint: "POST /api/audits/bulk-import",
                    sourceComponent: "bulk-import",
                    requestId: getRequestId(req),
                    reason: `Bulk import row ${rowNum}`,
                    source: "record.telefono",
                    eventType: "created",
                })]
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
                    ['supervisor', 'supervisor_reventa', 'encargado'].includes((u.role || '').toLowerCase()) &&
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
                if (status === "QR hecho" && auditData.cuil) {
                    qrHechoCuilsToRecompute.add(auditData.cuil);
                }
                results.success.push({ row: rowNum, _id: newAudit._id });
            } catch (err) {
                results.errors.push({
                    row: rowNum,
                    data: record,
                    reasons: [err.message]
                });
            }
        }

        for (const cuil of qrHechoCuilsToRecompute) {
            try {
                await recomputeCanSellByCuil(cuil, {
                    action: "bulkImportAudits",
                    auditId: "bulk-import",
                    previousStatus: null,
                    newStatus: "QR hecho"
                });
            } catch (canSellErr) {
                logger.error(
                    `[AUDIT-QR-HECHO] CanSell recomputation failed after bulk import | ` +
                    `cuil=${cuil} | error=${canSellErr.message}`
                );
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

/**
 * Marcar auditoría como revisada y opcionalmente lista para reventa.
 * PATCH /audits/:id/revision
 * Body: { lista_para_reventa?: boolean }
 */
exports.markRevision = async (req, res) => {
    try {
        const { id } = req.params;
        const { lista_para_reventa } = req.body;

        const update = {
            ultima_revision: new Date(),
            revisado_por: req.user._id
        };

        if (typeof lista_para_reventa === 'boolean') {
            update.lista_para_reventa = lista_para_reventa;
        }

        const audit = await Audit.findByIdAndUpdate(id, update, { new: true, runValidators: true })
            .populate('asesor', 'nombre username numeroEquipo role')
            .populate('auditor', 'nombre username')
            .populate('administrador', 'nombre username')
            .populate('revisado_por', 'nombre username');

        if (!audit) {
            return res.status(404).json({ message: 'Auditoría no encontrada' });
        }

        // Emitir actualización en tiempo real
        const io = getIO();
        if (io) {
            io.emit('audit:updated', audit);
        }

        res.json(serializeAuditForUser(audit, req.user));
    } catch (err) {
        logger.error("Error en markRevision:", err);
        res.status(500).json({ message: "Error al marcar revisión: " + err.message });
    }
};

/**
 * Obtener auditorías listas para reventa.
 * GET /audits/reventa
 * Roles: supervisor (solo su equipo), encargado, gerencia (todos).
 */
exports.getReventa = async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        const allowed = ['supervisor', 'encargado', 'gerencia'];
        if (!allowed.includes(role)) {
            return res.status(403).json({ message: 'No autorizado' });
        }

        let filter = { lista_para_reventa: true };

        if (role === 'supervisor') {
            filter['supervisorSnapshot._id'] = req.user._id;
        }

        const audits = await Audit.find(filter)
            .populate({
                path: 'asesor',
                select: 'nombre name email supervisor numeroEquipo',
                populate: { path: 'supervisor', select: 'nombre name email numeroEquipo' }
            })
            .populate('administrador', 'nombre name email')
            .populate('revisado_por', 'nombre name')
            .sort({ createdAt: -1 })
            .lean();

        res.json(audits);
    } catch (err) {
        logger.error("Error en getReventa:", err);
        res.status(500).json({ message: "Error al obtener reventa: " + err.message });
    }
};

/**
 * Exportar auditorías listas para reventa a CSV.
 * GET /audits/reventa/export
 * Roles: encargado, gerencia.
 */
exports.exportReventa = async (req, res) => {
    try {
        const role = (req.user?.role || '').toLowerCase();
        // Only Gerencia and Desarrollador can export from restricted Audit interfaces
        // Encargado is explicitly excluded from export permissions
        if (role !== 'gerencia' && role !== 'desarrollador') {
            return res.status(403).json({ message: 'No tienes permisos para exportar esta información.' });
        }

        const audits = await Audit.find({ lista_para_reventa: true })
            .populate({
                path: 'asesor',
                select: 'nombre name email supervisor numeroEquipo',
                populate: { path: 'supervisor', select: 'nombre name email numeroEquipo' }
            })
            .populate('administrador', 'nombre name email')
            .populate('revisado_por', 'nombre name')
            .sort({ createdAt: -1 })
            .lean();

        const getSupervisor = (a) => {
            if (a.supervisorSnapshot?.nombre) return a.supervisorSnapshot.nombre;
            if (a.asesor?.supervisor?.nombre) return a.asesor.supervisor.nombre;
            return '-';
        };

        const formatDate = (d) => {
            if (!d) return '-';
            const date = new Date(d);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('es-AR') + ' ' + date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
        };

        const fields = [
            { label: 'Afiliado', value: r => r.nombre || '-' },
            { label: 'CUIL', value: r => r.cuil || '-' },
            { label: 'Teléfono', value: r => r.telefono || '-' },
            { label: 'Obra Social Vendida', value: r => r.obraSocialVendida || '-' },
            { label: 'Asesor', value: r => r.asesor?.nombre || '-' },
            { label: 'Supervisor', value: r => getSupervisor(r) },
            { label: 'Grupo', value: r => r.asesor?.numeroEquipo || '-' },
            { label: 'Administrativo', value: r => r.administrador?.nombre || '-' },
            { label: 'Estado', value: r => r.status || '-' },
            { label: 'Fecha de alta', value: r => formatDate(r.createdAt) },
            { label: 'Última revisión', value: r => {
                if (!r.ultima_revision) return 'Sin revisión';
                const ts = formatDate(r.ultima_revision);
                const who = r.revisado_por?.nombre || '';
                return who ? `${ts} — ${who}` : ts;
            }},
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(audits);

        const today = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`reventa_${today}.csv`);
        return res.send(csv);
    } catch (err) {
        logger.error("Error en exportReventa:", err);
        res.status(500).json({ message: "Error al exportar reventa: " + err.message });
    }
};

/**
 * Toggle estado "en proceso" de una auditoría
 * Solo el administrativo asignado puede marcar/desmarcar
 */
exports.toggleEnProceso = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const audit = await Audit.findById(id);
        if (!audit) {
            return res.status(404).json({ message: 'Auditoría no encontrada' });
        }

        // Verificar que el usuario sea el administrativo asignado
        if (!audit.administrador || audit.administrador.toString() !== userId.toString()) {
            return res.status(403).json({
                message: 'Solo el administrativo asignado puede marcar esta venta como en proceso'
            });
        }

        // Toggle del estado
        const nuevoEstado = !audit.enProceso.activo;

        audit.enProceso = {
            activo: nuevoEstado,
            procesadoPor: nuevoEstado ? userId : null,
            iniciadoEn: nuevoEstado ? new Date() : null
        };

        await audit.save();

        // Poblar datos para respuesta
        const auditPopulated = await Audit.findById(id)
            .populate('asesor', 'nombre email numeroEquipo supervisor')
            .populate('administrador', 'nombre email')
            .populate('auditor', 'nombre email')
            .populate('enProceso.procesadoPor', 'nombre email')
            .lean();

        // Emitir actualización por socket para todos los usuarios
        emitAuditUpdate(auditPopulated);

        logger.info(`[TOGGLE_EN_PROCESO] Audit ${id} ${nuevoEstado ? 'marcada' : 'desmarcada'} como en proceso por ${req.user.nombre}`);

        res.json({
            ok: true,
            audit: auditPopulated,
            message: nuevoEstado ? 'Venta marcada como en proceso' : 'Venta desmarcada'
        });
    } catch (err) {
        logger.error("Error en toggleEnProceso:", err);
        res.status(500).json({ message: "Error al actualizar estado: " + err.message });
    }
};
