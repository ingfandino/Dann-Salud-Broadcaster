/**
 * ============================================================
 * CONTROLADOR DE RECOVERY (recoveryController)
 * ============================================================
 * Gestiona las auditorías marcadas para "recovery" (reintento).
 * El cron job marca auditorías elegibles diariamente a las 23:01.
 * Este controlador solo consulta y devuelve los datos.
 */

const Audit = require('../models/Audit');
const { permit } = require('../middlewares/roleMiddleware');
const logger = require('../utils/logger');
const {
    normalizeCuil,
    isValidNormalizedCuil,
    findBlockingAuditByCuilNormalized,
    buildDuplicateCuilResponse,
} = require('../utils/auditDuplicateUtils');
const {
    AuditPhoneValidationError,
    normalizeAuditPhone,
} = require('../utils/auditPhoneValidation');
const { maskAuditPhoneIfNeeded } = require('../utils/auditPhoneVisibility');

function serializeAuditForUser(audit, user) {
    if (!audit) return audit;
    const plainAudit = audit.toObject ? audit.toObject() : audit;
    return maskAuditPhoneIfNeeded(plainAudit, user);
}

function buildTelefonoCreatedHistory(telefono, req) {
    return {
        previousValue: null,
        newValue: telefono,
        changedAt: new Date(),
        changedBy: req.user?._id || null,
        changedByName: req.user?.nombre || req.user?.name || req.user?.username || "",
        changedByEmail: req.user?.email || req.user?.username || "",
        changedByRole: req.user?.role || "",
        endpoint: "POST /api/recovery",
        sourceComponent: "recovery-create",
        requestId: req.get?.("x-request-id") || req.id || "",
        reason: "Recovery audit created",
        source: "request.body.telefono",
        eventType: "created",
    };
}

/** Lista auditorías elegibles para recovery */
exports.list = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM

        // ✅ NOTA: El proceso de marcar auditorías para Recovery ahora se ejecuta mediante
        // un VERDADERO cron job en /src/cron/recoveryJob.js a las 23:01 hrs diariamente
        // Este endpoint solo consulta y devuelve los datos

        const User = require('../models/User');

        const { ignoreDate } = req.query;
        console.log('🔍 Recovery Request:', { ignoreDate });

        if (ignoreDate === 'true' || ignoreDate === true) {
            // ✅ Si ignoreDate es true, NO filtramos por mes. Traemos TODO el historial.
            // Y filtramos por los estados específicos solicitados
            filter = {
                status: {
                    $in: [
                        "Falta clave",
                        "Falta documentación",
                        "Falta clave y documentación",
                        "Pendiente"
                    ]
                }
            };
            console.log('📅 Recovery: Ignorando filtro de fecha y buscando por estados (Histórico completo)');
        } else {
            // Default: Mes actual y flag isRecovery
            filter.isRecovery = true;
            filter.recoveryMonth = currentMonth;
            console.log(`📅 Recovery: Filtrando por Mes Actual (${currentMonth})`);
        }

        // ✅ Traer auditorías
        const audits = await Audit.find(filter)
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo role'
            })
            .populate({
                path: 'administrador',
                select: 'nombre name email'
            })
            .populate('groupId', 'nombre name')
            .sort({ statusUpdatedAt: -1, createdAt: -1 }) // ✅ Descendente: más antiguos PRIMERO (más tiempo en estado)
            .lean();

        // ✅ Buscar supervisores dinámicamente por numeroEquipo
        for (let audit of audits) {
            if (audit.asesor?.numeroEquipo) {
                // Buscar el usuario con rol "supervisor" que tenga el mismo numeroEquipo
                const supervisor = await User.findOne({
                    numeroEquipo: audit.asesor.numeroEquipo,
                    role: { $in: ['supervisor', 'supervisor_reventa', 'encargado'] },
                    active: true
                }).select('nombre name email numeroEquipo').lean();

                if (supervisor) {
                    audit.asesor.supervisor = supervisor;
                }
            }
        }

        // 🔍 DEBUG: Log para verificar datos
        console.log('📋 Recovery List - Total audits:', audits.length);
        if (audits.length > 0) {
            console.log('📋 Muestra del primer registro:');
            console.log('   - Asesor:', audits[0].asesor?.nombre || audits[0].asesor?.name);
            console.log('   - Asesor numeroEquipo:', audits[0].asesor?.numeroEquipo);
            console.log('   - Supervisor encontrado:', audits[0].asesor?.supervisor?.nombre || audits[0].asesor?.supervisor?.name);
            console.log('   - Supervisor numeroEquipo:', audits[0].asesor?.supervisor?.numeroEquipo);
        }

        res.json(audits.map(audit => serializeAuditForUser(audit, req.user)));
    } catch (err) {
        logger.error('recovery.list error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};

// POST /api/recovery -> crear registro directo para reventa
exports.create = async (req, res) => {
    try {
        const { nombre, cuil, telefono, obraSocialVendida, datosExtra } = req.body;
        if (!nombre || !cuil || !telefono || !obraSocialVendida) {
            return res.status(400).json({ message: 'Campos requeridos: nombre, cuil, telefono, obraSocialVendida' });
        }
        let normalizedTelefono;
        try {
            normalizedTelefono = normalizeAuditPhone(telefono);
        } catch (err) {
            if (err instanceof AuditPhoneValidationError) {
                return res.status(400).json({ message: err.message });
            }
            throw err;
        }

        const cuilNormalized = normalizeCuil(cuil);
        if (!isValidNormalizedCuil(cuilNormalized)) {
            return res.status(400).json({ message: 'CUIL inválido. Debe tener 11 dígitos.' });
        }

        const duplicate = await findBlockingAuditByCuilNormalized(cuilNormalized);
        if (duplicate) {
            return res.status(409).json(buildDuplicateCuilResponse(duplicate));
        }

        const audit = new Audit({
            nombre,
            cuil: String(cuil).trim(),
            cuilNormalized,
            telefono: normalizedTelefono,
            obraSocialVendida,
            tipoVenta: 'alta',
            scheduledAt: new Date(),
            createdBy: req.user._id,
            auditor: req.user._id,
            status: 'Falta documentación',
            statusUpdatedAt: new Date(),
            recoveryEligibleAt: new Date(),
            isRecovery: true,
            datosExtra: datosExtra || '',
            telefonoHistory: [buildTelefonoCreatedHistory(normalizedTelefono, req)]
        });
        await audit.save();
        res.status(201).json(serializeAuditForUser(audit, req.user));
    } catch (err) {
        logger.error('recovery.create error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};
