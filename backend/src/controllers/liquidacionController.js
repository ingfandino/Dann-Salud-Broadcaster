/**
 * ============================================================
 * CONTROLADOR DE LIQUIDACIÓN (liquidacionController)
 * ============================================================
 * Gestiona las auditorías listas para liquidar (estado "QR hecho").
 * Al final de cada mes, las auditorías se archivan automáticamente.
 */

const Audit = require('../models/Audit');
const Employee = require('../models/Employee');
const logger = require('../utils/logger');

/** Lista auditorías con estado "QR hecho" listas para liquidación */
exports.list = async (req, res) => {
    try {
        const User = require('../models/User');

        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const currentDay = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // ✅ Último día del mes a las 23:01: Soft-delete (ocultar) auditorías del mes actual
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

        if (currentDay === lastDayOfMonth && hours === 23 && minutes >= 1) {
            await Audit.updateMany(
                {
                    status: { $in: ["QR hecho", "Cargada", "Aprobada"] },
                    liquidacionMonth: currentMonth,
                    isLiquidacion: true
                },
                {
                    $set: {
                        isLiquidacion: false, // Soft-delete: ya no aparecerá en Liquidación
                        liquidacionDeletedAt: new Date() // Timestamp para auditoría
                    }
                }
            );
            console.log(`🗑️ Soft-delete Liquidación: Auditorías del mes ${currentMonth} ocultadas`);
        }

        const { dateFrom, dateTo, dateField } = req.query;

        // ✅ Marcar auditorías QR hecho/Cargada/Aprobada que aún no están marcadas para liquidación
        // ⚠️ SOLO si estamos viendo el mes actual (sin filtros de fecha), para no "resucitar" auditorías viejas
        if (!dateFrom && !dateTo) {
            await Audit.updateMany(
                {
                    status: { $in: ["QR hecho", "Cargada", "Aprobada"] },
                    isLiquidacion: { $ne: true }
                },
                {
                    $set: {
                        isLiquidacion: true,
                        liquidacionMonth: currentMonth
                    }
                }
            );
        }

        // ✅ Construir filtro base
        let filter = {};

        console.log('🔍 Liquidación Request:', { dateFrom, dateTo, dateField });

        if (dateFrom && dateTo) {
            // Esto permite ver históricos
            const from = new Date(dateFrom);
            from.setUTCHours(3, 0, 0, 0); // 00:00 Argentina = 03:00 UTC
            
            const to = new Date(dateTo);
            to.setUTCDate(to.getUTCDate() + 1);
            to.setUTCHours(2, 59, 59, 999); // 23:59:59 Argentina = 02:59:59 UTC del día siguiente

            const field = dateField || 'fechaCreacionQR'; // Default a fechaCreacionQR si no se especifica

            if (field === 'fechaCreacionQR') {
                // ✅ Ajustar rango para fechaCreacionQR: compensar desfase UTC (-3 horas Argentina)
                // fechaCreacionQR puede estar guardado en UTC medianoche, lo que causa desfase
                const fromAdjusted = new Date(from.getTime() - (3 * 60 * 60 * 1000));
                
                // La lógica es: SI fechaCreacionQR tiene valor -> usar ese, SINO -> usar scheduledAt
                filter.$or = [
                    // Caso 1: fechaCreacionQR existe y tiene valor válido en el rango (ajustado)
                    { fechaCreacionQR: { $ne: null, $gte: fromAdjusted, $lte: to } },
                    // Caso 2: fechaCreacionQR NO existe o es null -> usar scheduledAt
                    {
                        $and: [
                            { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                            { scheduledAt: { $gte: from, $lte: to } }
                        ]
                    }
                ];
            } else {
                filter[field] = { $gte: from, $lte: to };
            }

            filter.status = { $in: ["QR hecho", "Cargada", "Aprobada"] };

            console.log(`📅 Filtrando Liquidación por ${field} (con fallback): ${from.toISOString()} - ${to.toISOString()}`);
        } else {
            // ✅ Default: Últimas 4 semanas laborales (para mostrar todas las pestañas en el frontend)
            // Cada semana va de Viernes 00:00 a Jueves 23:59 (hora Argentina = UTC-3)
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun, ..., 4=Jue, 5=Vie, 6=Sab

            // Calcular inicio de la semana ACTUAL (Viernes más reciente)
            let currentWeekStart = new Date(today);
            if (dayOfWeek === 5) {
                // Viernes - hoy es inicio de semana
            } else if (dayOfWeek === 6) {
                // Sábado - la semana comenzó ayer
                currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 1);
            } else {
                // Domingo a Jueves - restar días hasta viernes anterior
                const daysToSubtract = dayOfWeek === 0 ? 2 : dayOfWeek + 2;
                currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToSubtract);
            }
            // Ajustar a 00:00 Argentina (03:00 UTC)
            currentWeekStart.setUTCHours(3, 0, 0, 0);

            // Retroceder 3 semanas para obtener 4 semanas en total
            let monthStart = new Date(currentWeekStart);
            monthStart.setUTCDate(monthStart.getUTCDate() - 21); // 3 semanas antes

            // Fin de la semana actual (Jueves 23:59:59 Argentina = 02:59:59 UTC del día siguiente)
            let monthEnd = new Date(currentWeekStart);
            monthEnd.setUTCDate(monthEnd.getUTCDate() + 7); // Siguiente viernes
            monthEnd.setUTCHours(2, 59, 59, 999); // 23:59:59 Argentina del jueves

            // ✅ Ajustar rango para fechaCreacionQR: compensar desfase UTC (-3 horas Argentina)
            const monthStartAdjusted = new Date(monthStart.getTime() - (3 * 60 * 60 * 1000));

            filter.$and = [
                {
                    $or: [
                        { fechaCreacionQR: { $gte: monthStartAdjusted, $lte: monthEnd } },
                        {
                            $and: [
                                { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                                { scheduledAt: { $gte: monthStart, $lte: monthEnd } }
                            ]
                        }
                    ]
                }
            ];
            filter.status = { $in: ["QR hecho", "Cargada", "Aprobada"] };

            console.log(`📅 Filtrando Liquidación (últimas 4 semanas): ${monthStart.toISOString()} - ${monthEnd.toISOString()}`);
        }

        // Traer auditorías
        let audits = await Audit.find(filter)
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo role'
            })
            .populate({
                path: 'auditor',
                select: 'nombre name email'
            })
            .populate({
                path: 'administrador',
                select: 'nombre name email'
            })
            .populate('groupId', 'nombre name')
            .sort({ createdAt: -1 }) // Más recientes primero
            .lean();

        const currentUser = req.user;
        const userRole = currentUser?.role?.toLowerCase();
        const isSupervisor = userRole === 'supervisor';
        const isEncargado = userRole === 'encargado';
        const isAsesor = userRole === 'asesor';
        const isAuditor = userRole === 'auditor';
        const isIndependiente = userRole === 'independiente';

        // ✅ Filtro para ASESORES e INDEPENDIENTES: Solo ver sus propias auditorías
        if (isAsesor || isIndependiente) {
            audits = audits.filter((audit) => {
                // El asesor de la auditoría debe ser el usuario actual
                return audit.asesor?._id?.toString() === currentUser._id?.toString();
            });

            logger.info(
                `👤 ${isIndependiente ? 'Independiente' : 'Asesor'} ${currentUser.email} viendo ${audits.length} auditorías propias en Liquidación`
            );
        }
        // ✅ Filtro para AUDITORES con equipo: Solo ver donde aparecen como asesor
        else if (isAuditor && currentUser?.numeroEquipo) {
            audits = audits.filter((audit) => {
                // El auditor ve solo donde él aparece como asesor
                return audit.asesor?._id?.toString() === currentUser._id?.toString();
            });

            logger.info(
                `🔍 Auditor con equipo ${currentUser.email} viendo ${audits.length} auditorías como asesor en Liquidación`
            );
        }
        // ✅ Filtro para SUPERVISORES: Ver auditorías de su equipo
        else if (isSupervisor && currentUser?.numeroEquipo) {
            const targetNumeroEquipo = String(currentUser.numeroEquipo || '').trim().toLowerCase();

            audits = audits.filter((audit) => {
                const numeroEquipoAsesor = String(audit.asesor?.numeroEquipo || '').trim().toLowerCase();
                return numeroEquipoAsesor && numeroEquipoAsesor === targetNumeroEquipo;
            });

            if (!audits.length) {
                logger.warn(
                    ` Supervisor ${currentUser.email} (${currentUser.numeroEquipo}) sin auditorías en Liquidación tras filtrar por equipo`
                );
            } else {
                logger.info(
                    ` Supervisor ${currentUser.email} viendo ${audits.length} auditorías de Liquidación de su equipo ${currentUser.numeroEquipo}`
                );
            }
        }
        // ✅ Gerencia/Auditor/Administrativo/Encargado ven todo (sin filtro adicional)

        // Buscar supervisores dinámicamente por numeroEquipo
        const equipos = [...new Set(
            audits
                .map((audit) => audit.asesor?.numeroEquipo)
                .filter(Boolean)
        )];

        if (equipos.length > 0) {
            const supervisores = await User.find({
                numeroEquipo: { $in: equipos },
                role: { $in: ['supervisor', 'Supervisor', 'encargado'] },
                active: true
            })
                .select('nombre name email numeroEquipo')
                .lean();

            const supervisorPorEquipo = supervisores.reduce((acc, supervisor) => {
                acc[supervisor.numeroEquipo] = supervisor;
                return acc;
            }, {});

            audits.forEach((audit) => {
                const equipo = audit.asesor?.numeroEquipo;
                if (equipo && supervisorPorEquipo[equipo]) {
                    audit.asesor.supervisor = supervisorPorEquipo[equipo];
                }
            });
        }

        console.log('💰 Liquidación List - Total audits:', audits.length);

        res.json(audits);
    } catch (err) {
        logger.error('liquidacion.list error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};

/**
 * GET /api/liquidacion/by-tipo?tipo=supervisor|auditor|administrativo
 * Lista auditorías filtradas por tipo de liquidación.
 * - supervisor: misma lógica actual (QR hecho / Cargada / Aprobada)
 * - auditor: ventas donde auditorId = usuario, con estados específicos de auditoría
 * - administrativo: ventas con status de seguimiento (QR hecho, Cargada, Aprobada, etc.) + administrador asignado
 */
exports.listByTipo = async (req, res) => {
    try {
        const User = require('../models/User');
        const { tipo, dateFrom, dateTo } = req.query;

        if (!tipo || !['supervisor', 'auditor', 'administrativo'].includes(tipo)) {
            return res.status(400).json({ message: 'Parámetro tipo requerido: supervisor | auditor | administrativo' });
        }

        // ============================================================
        // Server-side role → tipo validation (prevent unauthorized access)
        // ============================================================
        const currentUser = req.user;
        const userRole = currentUser?.role?.toLowerCase();

        const ALLOWED_TIPOS_BY_ROLE = {
            gerencia:           ['supervisor', 'auditor', 'administrativo'],
            encargado:          ['supervisor', 'auditor', 'administrativo'],
            supervisor:         ['supervisor'],
            supervisor_reventa: ['supervisor'],
            asesor:             ['supervisor'],
            auditor:            ['auditor'],
            administrativo:     ['administrativo'],
            independiente:      ['supervisor', 'auditor'],
            recuperador:        ['supervisor'],
        };

        const allowedTipos = ALLOWED_TIPOS_BY_ROLE[userRole] || [];
        if (!allowedTipos.includes(tipo)) {
            logger.warn(`[LIQUIDACION] Acceso denegado: rol "${userRole}" solicitó tipo "${tipo}". Permitidos: [${allowedTipos.join(', ')}]`);
            return res.status(403).json({ message: 'No autorizado para este tipo de liquidación' });
        }

        let filter = {};
        let populateFields = [
            { path: 'asesor', select: 'nombre name email numeroEquipo role' },
            { path: 'auditor', select: 'nombre name email' },
            { path: 'administrador', select: 'nombre name email' },
        ];

        // Date range filter
        if (dateFrom && dateTo) {
            const from = new Date(dateFrom);
            from.setUTCHours(3, 0, 0, 0);
            const to = new Date(dateTo);
            to.setUTCDate(to.getUTCDate() + 1);
            to.setUTCHours(2, 59, 59, 999);

            if (tipo === 'supervisor') {
                const fromAdjusted = new Date(from.getTime() - (3 * 60 * 60 * 1000));
                filter.$or = [
                    { fechaCreacionQR: { $ne: null, $gte: fromAdjusted, $lte: to } },
                    {
                        $and: [
                            { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                            { scheduledAt: { $gte: from, $lte: to } }
                        ]
                    }
                ];
            } else {
                filter.scheduledAt = { $gte: from, $lte: to };
            }
        } else {
            // Default: últimas 4 semanas laborales
            const today = new Date();
            const dayOfWeek = today.getDay();
            let currentWeekStart = new Date(today);
            if (dayOfWeek === 5) { /* viernes */ }
            else if (dayOfWeek === 6) { currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 1); }
            else {
                const daysToSubtract = dayOfWeek === 0 ? 2 : dayOfWeek + 2;
                currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToSubtract);
            }
            currentWeekStart.setUTCHours(3, 0, 0, 0);
            let monthStart = new Date(currentWeekStart);
            monthStart.setUTCDate(monthStart.getUTCDate() - 21);
            let monthEnd = new Date(currentWeekStart);
            monthEnd.setUTCDate(monthEnd.getUTCDate() + 7);
            monthEnd.setUTCHours(2, 59, 59, 999);

            if (tipo === 'supervisor') {
                const monthStartAdjusted = new Date(monthStart.getTime() - (3 * 60 * 60 * 1000));
                filter.$and = [{
                    $or: [
                        { fechaCreacionQR: { $gte: monthStartAdjusted, $lte: monthEnd } },
                        {
                            $and: [
                                { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                                { scheduledAt: { $gte: monthStart, $lte: monthEnd } }
                            ]
                        }
                    ]
                }];
            } else {
                filter.scheduledAt = { $gte: monthStart, $lte: monthEnd };
            }
        }

        // Status filter by tipo
        if (tipo === 'supervisor') {
            filter.status = { $in: ["QR hecho", "Cargada", "Aprobada"] };
        } else if (tipo === 'auditor') {
            filter.status = { $in: [
                'Rechazada', 'Completa', 'Pendiente', 'QR hecho',
                'QR hecho pero pendiente de aprobación', 'AFIP',
                'Baja laboral sin nueva alta', 'Baja laboral con nueva alta',
                'Padrón', 'En revisión', 'Remuneración no válida',
                'Cargada', 'Aprobada', 'Aprobada, pero no reconoce clave',
                'El afiliado cambió la clave'
            ]};
            filter.auditor = { $ne: null };
        } else if (tipo === 'administrativo') {
            // Nuevo universo: ventas con estos estados de seguimiento + administrador asignado
            filter.status = { $regex: /^(qr hecho(\s\(temporal\))?|qr hecho pero pendiente de aprobación|afip|padrón|baja laboral sin nueva alta|baja laboral con nueva alta|remuneración no válida|cargada|aprobada(, pero no reconoce clave)?|rechazada)$/i };
            filter.administrador = { $ne: null };
        }

        // Diagnóstico: log del filtro final antes de la query
        console.log(`📋 [LIQUIDACION by-tipo] tipo=${tipo}, rol=${userRole}, filter=`, JSON.stringify(filter, null, 2));

        let audits = await Audit.find(filter)
            .populate(populateFields)
            .populate('groupId', 'nombre name')
            .sort({ scheduledAt: -1 })
            .lean();

        // ============================================================
        // Role-based result filtering (server-side enforcement)
        // ============================================================
        const isSupervisorRole = userRole === 'supervisor' || userRole === 'supervisor_reventa';
        const isEncargado = userRole === 'encargado';
        const isAsesor = userRole === 'asesor';
        const isAuditorRole = userRole === 'auditor';
        const isAdministrativoRole = userRole === 'administrativo';
        const isIndependiente = userRole === 'independiente';
        const userId = currentUser._id?.toString();

        if (tipo === 'supervisor') {
            if (isSupervisorRole && currentUser?.numeroEquipo) {
                // Supervisor: only their team's sales
                const target = String(currentUser.numeroEquipo || '').trim().toLowerCase();
                audits = audits.filter(a => {
                    const eq = String(a.asesor?.numeroEquipo || '').trim().toLowerCase();
                    return eq && eq === target;
                });
            } else if (isAsesor) {
                // Asesor: only sales where they are the asesor
                audits = audits.filter(a => a.asesor?._id?.toString() === userId);
            } else if (isIndependiente) {
                // Independiente in supervisor accordion: only sales where they are the asesor
                audits = audits.filter(a => a.asesor?._id?.toString() === userId);
            }
            // Gerencia, Encargado: see all (no filter)
        } else if (tipo === 'auditor') {
            if (isAuditorRole) {
                // Auditor: only sales where they are the auditor
                audits = audits.filter(a => a.auditor?._id?.toString() === userId);
            } else if (isIndependiente) {
                // Independiente in auditor accordion: only sales where they are the auditor
                audits = audits.filter(a => a.auditor?._id?.toString() === userId);
            }
            // Gerencia, Encargado: see all (no filter)
        } else if (tipo === 'administrativo') {
            if (isAdministrativoRole) {
                // Administrativo: only sales where they are the administrador
                audits = audits.filter(a => a.administrador?._id?.toString() === userId);
            }
            // Gerencia, Encargado: see all (no filter)
        }

        // Enrich with supervisor info
        const equipos = [...new Set(audits.map(a => a.asesor?.numeroEquipo).filter(Boolean))];
        if (equipos.length > 0) {
            const supervisores = await User.find({
                numeroEquipo: { $in: equipos },
                role: { $in: ['supervisor', 'Supervisor', 'encargado', 'supervisor_reventa'] },
                active: true
            }).select('nombre name email numeroEquipo').lean();

            const supervisorPorEquipo = supervisores.reduce((acc, s) => { acc[s.numeroEquipo] = s; return acc; }, {});
            audits.forEach(a => {
                const eq = a.asesor?.numeroEquipo;
                if (eq && supervisorPorEquipo[eq]) a.asesor.supervisor = supervisorPorEquipo[eq];
            });
        }

        console.log(`💰 Liquidación by-tipo (${tipo}) rol=${userRole} - Total: ${audits.length}`);
        res.json(audits);
    } catch (err) {
        logger.error('liquidacion.listByTipo error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};

/**
 * GET /api/liquidacion/stats-monthly?tipo=supervisor|auditor|administrativo&userId=optional
 * Aggregation pipeline: últimos 4 meses, conteo por {year, month}.
 * Si userId se proporciona, filtra por ese usuario (modo individual).
 */
exports.statsMonthly = async (req, res) => {
    try {
        const { tipo, userId } = req.query;

        if (!tipo || !['supervisor', 'auditor', 'administrativo'].includes(tipo)) {
            return res.status(400).json({ message: 'Parámetro tipo requerido: supervisor | auditor | administrativo' });
        }

        const now = new Date();
        // 4 months ago: start of that month
        const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        fourMonthsAgo.setUTCHours(3, 0, 0, 0); // Argentina midnight

        // Build match stage
        let match = {};

        if (tipo === 'supervisor') {
            match.status = { $in: ["QR hecho", "Cargada", "Aprobada"] };
            match.$or = [
                { fechaCreacionQR: { $gte: fourMonthsAgo } },
                {
                    $and: [
                        { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                        { scheduledAt: { $gte: fourMonthsAgo } }
                    ]
                }
            ];
        } else if (tipo === 'auditor') {
            match.status = { $in: [
                'Rechazada', 'Completa', 'Pendiente', 'QR hecho',
                'QR hecho pero pendiente de aprobación', 'AFIP',
                'Baja laboral sin nueva alta', 'Baja laboral con nueva alta',
                'Padrón', 'En revisión', 'Remuneración no válida',
                'Cargada', 'Aprobada', 'Aprobada, pero no reconoce clave',
                'El afiliado cambió la clave'
            ]};
            match.auditor = { $ne: null };
            match.scheduledAt = { $gte: fourMonthsAgo };
            if (userId) match.auditor = require('mongoose').Types.ObjectId.createFromHexString(userId);
        } else if (tipo === 'administrativo') {
            match.status = { $regex: /^(qr hecho(\s\(temporal\))?|qr hecho pero pendiente de aprobación|afip|padrón|baja laboral sin nueva alta|baja laboral con nueva alta|remuneración no válida|cargada|aprobada(, pero no reconoce clave)?|rechazada)$/i };
            match.administrador = { $ne: null };
            match.scheduledAt = { $gte: fourMonthsAgo };
            if (userId) match.administrador = require('mongoose').Types.ObjectId.createFromHexString(userId);
        }

        // For supervisor tipo with individual user filter
        if (tipo === 'supervisor' && userId) {
            match['supervisorSnapshot._id'] = require('mongoose').Types.ObjectId.createFromHexString(userId);
        }

        // Aggregation: total (all matching audits) grouped by month
        const dateExpr = tipo === 'supervisor'
            ? { $ifNull: ['$fechaCreacionQR', '$scheduledAt'] }
            : '$scheduledAt';

        const totalPipeline = [
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: dateExpr },
                        month: { $month: dateExpr }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];

        // Build "global" match (without userId filter) for comparison
        let globalMatch = { ...match };
        if (tipo === 'supervisor' && userId) {
            delete globalMatch['supervisorSnapshot._id'];
        } else if (tipo === 'auditor' && userId) {
            globalMatch.auditor = { $ne: null };
        } else if (tipo === 'administrativo' && userId) {
            globalMatch.administrador = { $ne: null };
        }

        const globalPipeline = [
            { $match: globalMatch },
            {
                $group: {
                    _id: {
                        year: { $year: dateExpr },
                        month: { $month: dateExpr }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ];

        const [filteredResults, globalResults] = await Promise.all([
            Audit.aggregate(totalPipeline),
            userId ? Audit.aggregate(globalPipeline) : Promise.resolve(null)
        ]);

        // Build response: last 4 months
        const months = [];
        for (let i = 3; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }

        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const data = months.map(m => {
            const filtered = filteredResults.find(r => r._id.year === m.year && r._id.month === m.month);
            const global = globalResults ? globalResults.find(r => r._id.year === m.year && r._id.month === m.month) : null;

            return {
                label: `${mesesNombres[m.month - 1]} ${m.year}`,
                year: m.year,
                month: m.month,
                filtered: filtered?.count || 0,
                global: global?.count || 0
            };
        });

        console.log(`📊 Liquidación stats-monthly (${tipo}${userId ? ', user: ' + userId : ''}):`, data.map(d => `${d.label}: ${d.filtered}`).join(', '));

        res.json({ tipo, userId: userId || null, data });
    } catch (err) {
        logger.error('liquidacion.statsMonthly error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};

// POST /api/liquidacion/export -> Exportar a Excel
// CRÍTICO: Esta función NO ES ASYNC para evitar que express-async-errors envuelva la respuesta binaria en JSON
exports.exportLiquidation = (req, res) => {
    const ExcelJS = require('exceljs');
    const { dateFrom, dateTo, dateField } = req.body;

    console.log('📊 Exportando Liquidación:', { dateFrom, dateTo, user: req.user.email });

    // 1. Construir Filtro Base
    let filter = {};

    // SIEMPRE filtrar por status "QR hecho" (requisito estricto)
    filter.status = "QR hecho";

    if (dateFrom && dateTo) {
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);

        const field = dateField || 'fechaCreacionQR';

        if (field === 'fechaCreacionQR') {
            // La lógica es: SI fechaCreacionQR tiene valor -> usar ese, SINO -> usar scheduledAt
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
            filter[field] = { $gte: from, $lt: to };
        }
        console.log(`📅 Export Filter: ${field} (prioriza fechaCreacionQR) between ${from.toISOString()} and ${to.toISOString()}`);
    } else {
        // Default: Mes actual
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        filter.isLiquidacion = true;
        filter.liquidacionMonth = currentMonth;
        console.log(`📅 Export Filter: Mes Actual (${currentMonth})`);
    }

    // 2. Obtener Auditorías (usando promesas puras, NO await)
    Audit.find(filter)
        .populate({
            path: 'asesor',
            select: 'nombre name email numeroEquipo role'
        })
        .populate({
            path: 'auditor',
            select: 'nombre name email'
        })
        .populate({
            path: 'administrador',
            select: 'nombre name email'
        })
        .sort({ scheduledAt: -1 })
        .lean()
        .then(async (audits) => {
            // 3. Lógica de Roles
            const currentUser = req.user;
            const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'Supervisor';

            // Filtrar por equipo si es supervisor (Encargado ve todo)
            if (isSupervisor && currentUser?.numeroEquipo) {
                const targetNumeroEquipo = String(currentUser.numeroEquipo || '').trim().toLowerCase();
                audits = audits.filter((audit) => {
                    const numeroEquipoAsesor = String(audit.asesor?.numeroEquipo || '').trim().toLowerCase();
                    return numeroEquipoAsesor && numeroEquipoAsesor === targetNumeroEquipo;
                });
            }

            // Enriquecer con supervisores
            const equipos = [...new Set(audits.map((audit) => audit.asesor?.numeroEquipo).filter(Boolean))];

            let supervisorPorEquipo = {};
            if (equipos.length > 0) {
                const User = require('../models/User');
                const supervisores = await User.find({
                    numeroEquipo: { $in: equipos },
                    role: { $in: ['supervisor', 'Supervisor', 'encargado'] },
                    active: true
                }).select('nombre name email numeroEquipo').lean();

                supervisorPorEquipo = supervisores.reduce((acc, supervisor) => {
                    acc[supervisor.numeroEquipo] = supervisor;
                    return acc;
                }, {});

                audits.forEach((audit) => {
                    const equipo = audit.asesor?.numeroEquipo;
                    if (equipo && supervisorPorEquipo[equipo]) {
                        audit.asesor.supervisor = supervisorPorEquipo[equipo];
                    }
                });
            }

            // 4. Generar Excel
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Dann Salud';
            workbook.created = new Date();

            // ✅ Obtener fechas de ingreso de todos los asesores
            const asesorIds = [...new Set(audits.map(a => a.asesor?._id?.toString()).filter(Boolean))];
            let empleadosPorAsesor = {};
            
            if (asesorIds.length > 0) {
                const empleados = await Employee.find({
                    userId: { $in: asesorIds }
                }).select('userId fechaIngreso').lean();
                
                empleadosPorAsesor = empleados.reduce((acc, emp) => {
                    acc[emp.userId.toString()] = emp.fechaIngreso;
                    return acc;
                }, {});
            }

            const columns = [
                { header: 'Fecha', key: 'fecha', width: 15 },
                { header: 'Afiliado', key: 'afiliado', width: 30 },
                { header: 'CUIL', key: 'cuil', width: 15 },
                { header: 'O.S. Vendida', key: 'os', width: 15 },
                { header: 'Asesor', key: 'asesor', width: 25 },
                { header: 'Fecha de ingreso del asesor', key: 'fechaIngresoAsesor', width: 22 },
                { header: 'Supervisor', key: 'supervisor', width: 25 },
                { header: 'Auditor', key: 'auditor', width: 20 },
                { header: 'Admin', key: 'admin', width: 20 },
                { header: 'Estado', key: 'estado', width: 15 }
            ];

            // Helper para agregar hoja
            const addSheet = (sheetName, items) => {
                const safeName = sheetName.replace(/[*?:\\/\\[\\]]/g, '').substring(0, 30) || 'Hoja 1';
                const sheet = workbook.addWorksheet(safeName);
                sheet.columns = columns;

                items.forEach(item => {
                    // Usar componentes UTC para evitar desplazamiento de timezone
                    const dateObj = item.fechaCreacionQR || item.scheduledAt;
                    let fechaStr = '';
                    if (dateObj) {
                        const d = new Date(dateObj);
                        fechaStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
                    }

                    // ✅ Obtener fecha de ingreso del asesor desde Employee
                    let fechaIngresoStr = '';
                    const asesorId = item.asesor?._id?.toString();
                    if (asesorId && empleadosPorAsesor[asesorId]) {
                        const fechaIngreso = new Date(empleadosPorAsesor[asesorId]);
                        fechaIngresoStr = `${fechaIngreso.getUTCDate().toString().padStart(2, '0')}/${(fechaIngreso.getUTCMonth() + 1).toString().padStart(2, '0')}/${fechaIngreso.getUTCFullYear()}`;
                    }

                    sheet.addRow({
                        fecha: fechaStr,
                        afiliado: item.nombre || '',
                        cuil: item.cuil || '',
                        os: item.obraSocialVendida || '',
                        asesor: item.asesor?.nombre || '',
                        fechaIngresoAsesor: fechaIngresoStr,
                        supervisor: item.supervisorSnapshot?.nombre || item.asesor?.supervisor?.nombre || item.asesor?.numeroEquipo || 'Sin Supervisor',
                        auditor: item.auditor?.nombre || '',
                        admin: item.administrador?.nombre || '',
                        estado: item.status || ''
                    });
                });

                // Estilo Header
                sheet.getRow(1).eachCell((cell) => {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
                    cell.alignment = { horizontal: 'center' };
                });
            };

            if (isSupervisor) {
                // Caso Supervisor: Una sola hoja
                addSheet(`Equipo ${currentUser.numeroEquipo || 'Mío'}`, audits);
            } else {
                // Caso Gerencia: Agrupar por Supervisor (usar supervisorSnapshot para historial correcto)
                const auditsBySupervisor = audits.reduce((acc, audit) => {
                    const supName = audit.supervisorSnapshot?.nombre || audit.asesor?.supervisor?.nombre || `Equipo ${audit.asesor?.numeroEquipo || 'Sin Asignar'}`;
                    if (!acc[supName]) acc[supName] = [];
                    acc[supName].push(audit);
                    return acc;
                }, {});

                if (Object.keys(auditsBySupervisor).length === 0) {
                    addSheet('Sin Datos', []);
                } else {
                    Object.entries(auditsBySupervisor).forEach(([supName, items]) => {
                        addSheet(supName, items);
                    });
                }
            }

            console.log(`📊 Generando ${workbook.worksheets.length} hojas con ${audits.length} registros`);

            // 5. Generar buffer y enviar (TODO síncronamente)
            return workbook.xlsx.writeBuffer();
        })
        .then((buffer) => {
            console.log(`📊 Buffer generado: ${buffer.length} bytes`);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=liquidacion_${Date.now()}.xlsx`);
            res.setHeader('Content-Length', buffer.length);

            res.end(buffer, 'binary');
        })
        .catch((err) => {
            logger.error('❌ Error exportando liquidación:', err);

            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al generar exportación' });
            }
        });
};

// POST /api/liquidacion/export-direct -> VERSION DIRECTA PARA DEBUGGING
// Esta versión es ULTRA SIMPLE para identificar dónde se produce la envoltura JSON
exports.exportLiquidationDirect = (req, res) => {
    console.log('🔍 [DIRECT] ===== INICIO EXPORT DIRECTO =====');
    console.log('🔍 [DIRECT] Headers antes:', res.getHeaders());

    const ExcelJS = require('exceljs');

    console.log('🔍 [DIRECT] Creando workbook...');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dann Salud Test';

    console.log('🔍 [DIRECT] Creando sheet...');
    const sheet = workbook.addWorksheet('Test');
    sheet.columns = [
        { header: 'Columna1', key: 'col1', width: 20 },
        { header: 'Columna2', key: 'col2', width: 20 }
    ];

    sheet.addRow({ col1: 'Dato1', col2: 'Dato2' });
    sheet.addRow({ col1: 'Dato3', col2: 'Dato4' });

    console.log('🔍 [DIRECT] Generando buffer...');

    workbook.xlsx.writeBuffer()
        .then((buffer) => {
            console.log('🔍 [DIRECT] Buffer generado:', buffer.length, 'bytes');
            console.log('🔍 [DIRECT] Es Buffer?:', Buffer.isBuffer(buffer));
            console.log('🔍 [DIRECT] Primeros 10 bytes:', buffer.slice(0, 10));

            console.log('🔍 [DIRECT] Configurando headers...');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=test-direct.xlsx');
            res.setHeader('Content-Length', buffer.length);

            console.log('🔍 [DIRECT] Headers configurados:', res.getHeaders());
            console.log('🔍 [DIRECT] Enviando buffer con res.end()...');

            res.end(buffer, 'binary');

            console.log('🔍 [DIRECT] res.end() llamado');
            console.log('🔍 [DIRECT] headersSent?:', res.headersSent);
            console.log('🔍 [DIRECT] ===== FIN EXPORT DIRECTO =====');
        })
        .catch((err) => {
            console.error('🔍 [DIRECT] ERROR:', err);

            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
        });

    console.log('🔍 [DIRECT] Función retornada (sin return explícito)');
};
