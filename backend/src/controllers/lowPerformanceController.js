/**
 * ============================================================
 * CONTROLADOR DE BAJO RENDIMIENTO (lowPerformanceController.js)
 * ============================================================
 * Gestión de evaluaciones de bajo rendimiento de Supervisores y Asesores.
 * Evalúa periodos:
 * 1. Quincenal (1-15): Alerta temprana (no guarda historial).
 * 2. Mensual (1-Fin): Evaluación definitiva (guarda en historial si falla).
 */

const LowPerformance = require('../models/LowPerformance');
const Audit = require('../models/Audit');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Utilería para rangos de fechas (Quincena 1-15 y Mes Completo)
 */
const dateHelpers = {
    /**
     * Obtiene el rango de la primera quincena del mes actual (1 al 15)
     */
    getFirstFortnight: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now.getFullYear(), now.getMonth(), 15);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    },

    /**
     * Obtiene el rango del mes actual completo
     */
    getCurrentMonth: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end, monthKey: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}` };
    },

    /**
     * Obtiene el rango del MES ANTERIOR para evaluación histórica
     */
    getPreviousMonth: () => {
        const now = new Date();
        // Mes anterior (restar 1 al mes actual)
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start.setHours(0, 0, 0, 0);

        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);

        return {
            start,
            end,
            monthKey: `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`
        };
    }
};

/**
 * Función interna para calcular métricas de un periodo y rol
 * @param {Date} periodStart - Inicio del periodo
 * @param {Date} periodEnd - Fin del periodo
 * @param {string} role - 'supervisor' o 'asesor'
 * @param {number} threshold - Meta a cumplir
 */
async function calculateMetricsInternal(periodStart, periodEnd, role, threshold) {
    const isSupervisor = role === 'supervisor';

    // 1. Obtener usuarios activos del rol
    const queryRole = isSupervisor
        ? { $in: ['supervisor', 'supervisor_reventa'] }
        : 'asesor';

    const users = await User.find({
        role: queryRole,
        active: { $ne: false }
    }).select('_id nombre email numeroEquipo role');

    // 2. Obtener audits del periodo con QR hecho
    const audits = await Audit.find({
        status: { $regex: /^qr hecho$/i },
        fechaCreacionQR: {
            $gte: periodStart,
            $lte: periodEnd
        }
    })
        .populate('supervisorSnapshot', 'nombre')
        .populate({
            path: 'asesor',
            select: 'nombre supervisor',
            populate: { path: 'supervisor', select: 'nombre' }
        });

    // 3. Pre-calcular conteo de asesores por EQUIPO (solo si es rol supervisor)
    let advisorCountsByTeam = {};
    if (isSupervisor) {
        // Obtener lista de equipos únicos de los supervisores
        const supervisorTeams = [...new Set(users
            .map(u => u.numeroEquipo)
            .filter(t => t))]; // Filtrar nulos y duplicados

        if (supervisorTeams.length > 0) {
            // Contar asesores en esos equipos
            const allAsesors = await User.find({
                role: 'asesor',
                active: { $ne: false },
                numeroEquipo: { $in: supervisorTeams }
            }).select('numeroEquipo');

            for (const asesor of allAsesors) {
                if (asesor.numeroEquipo) {
                    const team = asesor.numeroEquipo;
                    advisorCountsByTeam[team] = (advisorCountsByTeam[team] || 0) + 1;
                }
            }
        }
    }

    const lowPerformers = [];

    for (const user of users) {
        let qrCount = 0;

        if (isSupervisor) {
            // Lógica Supervisor: Contar ventas de su equipo
            const supervisorName = user.nombre;
            qrCount = audits.filter(audit => {
                if (audit.supervisorSnapshot?.nombre) {
                    const sn = audit.supervisorSnapshot.nombre || "";
                    return sn.toLowerCase() === supervisorName.toLowerCase();
                }
                if (audit.asesor?.supervisor?.nombre) {
                    const as = audit.asesor.supervisor.nombre || "";
                    return as.toLowerCase() === supervisorName.toLowerCase();
                }
                return false;
            }).length;
        } else {
            // Lógica Asesor: Contar ventas PROPIAS
            qrCount = audits.filter(audit => {
                return audit.asesor?._id?.toString() === user._id.toString();
            }).length;
        }

        // Si no cumple la meta, agregar a la lista
        if (qrCount < threshold) {
            lowPerformers.push({
                user: {
                    _id: user._id,
                    nombre: user.nombre,
                    email: user.email,
                    numeroEquipo: user.numeroEquipo,
                    role: user.role
                },
                qrHechoCount: qrCount,
                threshold,
                deficit: threshold - qrCount,
                advisorCount: isSupervisor ? (advisorCountsByTeam[user.numeroEquipo] || 0) : undefined
            });
        }
    }

    // Ordenar: Menos ventas (más déficit) primero -> Ascendente por qrHechoCount
    lowPerformers.sort((a, b) => a.qrHechoCount - b.qrHechoCount);

    return lowPerformers;
}

/**
 * GET /api/low-performance
 * Obtiene todos los registros de bajo rendimiento
 */
exports.getAll = async (req, res) => {
    try {
        const records = await LowPerformance.find()
            .populate('supervisorId', 'nombre email numeroEquipo active role')
            .sort({ periodStart: -1 });

        res.json({ records });
    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error getting records:', error);
        res.status(500).json({ message: 'Error al obtener registros' });
    }
};

/**
 * GET /api/low-performance/current-period
 * Obtiene métricas en tiempo real para Quincena y Mes actual
 */
exports.getCurrentPeriod = async (req, res) => {
    try {
        const fortnight = dateHelpers.getFirstFortnight();
        const month = dateHelpers.getCurrentMonth();

        // Metas definidas por negocio
        const TARGETS = {
            SUPERVISOR: { FORTNIGHT: 30, MONTH: 50 },
            ASESOR: { FORTNIGHT: 6, MONTH: 8 }
        };

        // Paralelizar cálculos
        const [
            supFortnight,
            supMonth,
            asesorFortnight,
            asesorMonth
        ] = await Promise.all([
            // Supervisores
            calculateMetricsInternal(fortnight.start, fortnight.end, 'supervisor', TARGETS.SUPERVISOR.FORTNIGHT),
            calculateMetricsInternal(month.start, month.end, 'supervisor', TARGETS.SUPERVISOR.MONTH),
            // Asesores
            calculateMetricsInternal(fortnight.start, fortnight.end, 'asesor', TARGETS.ASESOR.FORTNIGHT),
            calculateMetricsInternal(month.start, month.end, 'asesor', TARGETS.ASESOR.MONTH)
        ]);

        res.json({
            periodInfo: {
                fortnight,
                month
            },
            supervisors: {
                fortnight: supFortnight,
                month: supMonth
            },
            asesors: {
                fortnight: asesorFortnight,
                month: asesorMonth
            }
        });

    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error getting current period metrics:', error);
        res.status(500).json({ message: 'Error al calcular métricas actuales' });
    }
};

/**
 * POST /api/low-performance/evaluate
 * Evalúa y guarda registros del MES ANTERIOR (o específico)
 * Body: { periodStart?, periodEnd?, threshold? } - Si vacío, usa mes anterior
 */
exports.evaluatePeriod = async (req, res) => {
    try {
        const { periodStart: reqStart, periodEnd: reqEnd } = req.body;

        let periodStart, periodEnd, periodKey, monthInfo;

        // Si no se especifican fechas, usar MES ANTERIOR
        if (reqStart && reqEnd) {
            periodStart = new Date(reqStart);
            periodEnd = new Date(reqEnd);
            periodKey = `${periodStart.getFullYear()}-${(periodStart.getMonth() + 1).toString().padStart(2, '0')}`;
        } else {
            monthInfo = dateHelpers.getPreviousMonth();
            periodStart = monthInfo.start;
            periodEnd = monthInfo.end;
            periodKey = monthInfo.monthKey;
        }

        logger.info(`[LOW_PERFORMANCE] Evaluando HISTÓRICO periodo ${periodKey}: ${periodStart.toISOString()} - ${periodEnd.toISOString()}`);

        // Metas Mensuales
        const TARGETS = {
            SUPERVISOR: 50,
            ASESOR: 8
        };

        const savedRecords = [];

        // 1. Evaluar Supervisores
        const lowSupervisors = await calculateMetricsInternal(periodStart, periodEnd, 'supervisor', TARGETS.SUPERVISOR);
        for (const item of lowSupervisors) {
            try {
                const record = await LowPerformance.findOneAndUpdate(
                    { supervisorId: item.user._id, periodKey }, // Upsert key
                    {
                        supervisorId: item.user._id,
                        periodStart,
                        periodEnd,
                        periodKey,
                        role: 'supervisor',
                        qrHechoCount: item.qrHechoCount,
                        threshold: TARGETS.SUPERVISOR,
                        deficit: item.deficit,
                        evaluatedAt: new Date(),
                        evaluatedBy: req.user?._id || null
                    },
                    { upsert: true, new: true }
                );
                savedRecords.push(record);
            } catch (err) {
                logger.error(`[LOW_PERFORMANCE] Error saving supervisor ${item.user.nombre}:`, err);
            }
        }

        // 2. Evaluar Asesores
        const lowAsesors = await calculateMetricsInternal(periodStart, periodEnd, 'asesor', TARGETS.ASESOR);
        for (const item of lowAsesors) {
            try {
                const record = await LowPerformance.findOneAndUpdate(
                    { supervisorId: item.user._id, periodKey },
                    {
                        supervisorId: item.user._id,
                        periodStart,
                        periodEnd,
                        periodKey,
                        role: 'asesor',
                        qrHechoCount: item.qrHechoCount,
                        threshold: TARGETS.ASESOR,
                        deficit: item.deficit,
                        evaluatedAt: new Date(),
                        evaluatedBy: req.user?._id || null
                    },
                    { upsert: true, new: true }
                );
                savedRecords.push(record);
            } catch (err) {
                logger.error(`[LOW_PERFORMANCE] Error saving asesor ${item.user.nombre}:`, err);
            }
        }

        logger.info(`[LOW_PERFORMANCE] Evaluación completada: ${savedRecords.length} registros guardados`);

        res.json({
            periodStart,
            periodEnd,
            periodKey,
            totalEvaluated: lowSupervisors.length + lowAsesors.length,
            savedRecords: savedRecords.length
        });
    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error evaluating period:', error);
        res.status(500).json({ message: 'Error al evaluar periodo' });
    }
};

/**
 * GET /api/low-performance/history/:supervisorId
 * Obtiene el historial de bajo rendimiento de un usuario específico
 */
exports.getSupervisorHistory = async (req, res) => {
    try {
        const { supervisorId } = req.params;

        const records = await LowPerformance.find({ supervisorId })
            .sort({ periodStart: -1 });

        const user = await User.findById(supervisorId)
            .select('nombre email numeroEquipo active role');

        res.json({
            supervisor: user, // Mantenemos key 'supervisor' por compatibilidad frontend viejo si hace falta
            user,
            totalAppearances: records.length,
            history: records
        });
    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error getting supervisor history:', error);
        res.status(500).json({ message: 'Error al obtener historial' });
    }
};

/**
 * POST /api/low-performance/evaluate-historical
 * Evalúa periodos MENSUALES históricos desde una fecha inicial
 * Body: { startFrom: Date }
 */
exports.evaluateHistorical = async (req, res) => {
    try {
        const { startFrom } = req.body;

        if (!startFrom) {
            return res.status(400).json({ message: 'Se requiere fecha de inicio (startFrom)' });
        }

        const startDate = new Date(startFrom);
        const now = new Date();
        const periods = [];

        // Generar periodos mensuales (YYYY-MM) hasta el mes anterior al actual
        let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

        while (current < new Date(now.getFullYear(), now.getMonth(), 1)) {
            const start = new Date(current);
            const end = new Date(current.getFullYear(), current.getMonth() + 1, 0); // Fin del mes
            end.setHours(23, 59, 59, 999);

            periods.push({
                start,
                end,
                key: `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}`
            });

            // Avanzar al siguiente mes
            current.setMonth(current.getMonth() + 1);
        }

        logger.info(`[LOW_PERFORMANCE] Evaluando ${periods.length} meses históricos desde ${startFrom}`);

        const savedRecords = [];
        const TARGETS = { SUPERVISOR: 50, ASESOR: 8 };

        for (const period of periods) {
            // 1. Supervisores
            const lowSupervisors = await calculateMetricsInternal(period.start, period.end, 'supervisor', TARGETS.SUPERVISOR);
            for (const item of lowSupervisors) {
                try {
                    const record = await LowPerformance.findOneAndUpdate(
                        { supervisorId: item.user._id, periodKey: period.key },
                        {
                            supervisorId: item.user._id,
                            periodStart: period.start,
                            periodEnd: period.end,
                            periodKey: period.key,
                            role: 'supervisor',
                            qrHechoCount: item.qrHechoCount,
                            threshold: TARGETS.SUPERVISOR,
                            deficit: item.deficit,
                            evaluatedAt: new Date(),
                            evaluatedBy: req.user?._id || null
                        },
                        { upsert: true, new: true }
                    );
                    savedRecords.push(record);
                } catch (err) { }
            }

            // 2. Asesores
            const lowAsesors = await calculateMetricsInternal(period.start, period.end, 'asesor', TARGETS.ASESOR);
            for (const item of lowAsesors) {
                try {
                    const record = await LowPerformance.findOneAndUpdate(
                        { supervisorId: item.user._id, periodKey: period.key },
                        {
                            supervisorId: item.user._id,
                            periodStart: period.start,
                            periodEnd: period.end,
                            periodKey: period.key,
                            role: 'asesor',
                            qrHechoCount: item.qrHechoCount,
                            threshold: TARGETS.ASESOR,
                            deficit: item.deficit,
                            evaluatedAt: new Date(),
                            evaluatedBy: req.user?._id || null
                        },
                        { upsert: true, new: true }
                    );
                    savedRecords.push(record);
                } catch (err) { }
            }
        }

        res.json({
            periodsEvaluated: periods.length,
            recordsSaved: savedRecords.length,
            periods: periods.map(p => p.key)
        });
    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error evaluating historical:', error);
        res.status(500).json({ message: 'Error al evaluar histórico' });
    }
};

/**
 * GET /api/low-performance/stats
 * Obtiene estadísticas generales
 */
exports.getStats = async (req, res) => {
    try {
        // Obtener estadísticas globales agrupadas por rol
        const stats = await LowPerformance.aggregate([
            {
                $facet: {
                    // Totales y afectados únicos por rol
                    globalStats: [
                        {
                            $group: {
                                _id: '$role',
                                totalRecords: { $sum: 1 },
                                uniqueUsers: { $addToSet: '$supervisorId' }
                            }
                        },
                        {
                            $project: {
                                role: '$_id',
                                totalRecords: 1,
                                uniqueUsersAffected: { $size: '$uniqueUsers' }
                            }
                        }
                    ],
                    // Top recurrentes (Supervisores)
                    topSupervisors: [
                        { $match: { role: 'supervisor' } },
                        {
                            $group: {
                                _id: '$supervisorId',
                                appearances: { $sum: 1 },
                                avgQrCount: { $avg: '$qrHechoCount' },
                                totalDeficit: { $sum: '$deficit' }
                            }
                        },
                        { $sort: { appearances: -1 } },
                        { $limit: 10 },
                        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                        { $unwind: '$user' },
                        { $project: { 'user.password': 0, 'user.code': 0 } }
                    ],
                    // Top recurrentes (Asesores)
                    topAsesors: [
                        { $match: { role: 'asesor' } },
                        {
                            $group: {
                                _id: '$supervisorId',
                                appearances: { $sum: 1 },
                                avgQrCount: { $avg: '$qrHechoCount' },
                                totalDeficit: { $sum: '$deficit' }
                            }
                        },
                        { $sort: { appearances: -1 } },
                        { $limit: 10 },
                        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
                        { $unwind: '$user' },
                        { $project: { 'user.password': 0, 'user.code': 0 } }
                    ],
                    // Tendencia mensual (últimos 6 meses)
                    monthlyTrend: [
                        {
                            $group: {
                                _id: {
                                    year: { $year: '$periodStart' },
                                    month: { $month: '$periodStart' },
                                    role: '$role'
                                },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { '_id.year': 1, '_id.month': 1 } }
                    ]
                }
            }
        ]);

        res.json(stats[0]);
    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error getting stats:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};

/**
 * DELETE /api/low-performance/:id
 * Elimina un registro de bajo rendimiento (solo Gerencia)
 */
exports.deleteRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await LowPerformance.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Registro no encontrado' });
        logger.info(`[LOW_PERFORMANCE] Registro ${id} eliminado por ${req.user?.email}`);
        res.json({ message: 'Registro eliminado correctamente', deleted });
    } catch (error) {
        logger.error('[LOW_PERFORMANCE] Error deleting record:', error);
        res.status(500).json({ message: 'Error al eliminar registro' });
    }
};
