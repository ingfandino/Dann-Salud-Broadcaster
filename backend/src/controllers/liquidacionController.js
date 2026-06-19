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
const mongoose = require('mongoose');

function getArgentinaDateKey(date = new Date()) {
    const argentinaDate = new Date(date.getTime() - (3 * 60 * 60 * 1000));
    return argentinaDate.toISOString().slice(0, 10);
}

function toIdString(value) {
    if (!value) return '';
    if (value._id) return value._id.toString();
    return value.toString();
}

/**
 * ============================================================
 * FUNCIONES DE UTILIDAD PARA LIQUIDACIÓN
 * ============================================================
 */

/**
 * Determina si una fecha es el último día laborable del mes
 * Días laborables: Lunes(1) a Sábado(6). Domingo(0) NO es laborable.
 * Si el último día del mes es domingo, se usa el sábado anterior.
 * 
 * @param {Date} date - Fecha a verificar
 * @returns {boolean} - true si es el último día laborable del mes
 */
function isLastWorkingDayOfMonth(date) {
    if (!date) return false;
    
    const d = new Date(date);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();
    const dayOfWeek = d.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    
    // Último día del mes actual
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    // Si es domingo (0), no es laborable
    if (dayOfWeek === 0) return false;
    
    // Si es el último día del mes y es laborable (Lun-Sáb)
    if (day === lastDayOfMonth && dayOfWeek >= 1 && dayOfWeek <= 6) {
        return true;
    }
    
    // Si el último día del mes es domingo y hoy es sábado (día anterior)
    const lastDayWeekDay = new Date(year, month + 1, 0).getDay();
    if (lastDayWeekDay === 0 && dayOfWeek === 6 && day === lastDayOfMonth - 1) {
        return true;
    }
    
    return false;
}

/**
 * Normaliza el estado de auditoría para identificar "QR hecho" real
 * Excluye variantes temporales o especiales como "QR hecho (Temporal)"
 * 
 * @param {string} status - Estado original
 * @returns {boolean} - true si es QR hecho real (no temporal)
 */
function isRealQRHecho(status) {
    if (!status) return false;
    const normalized = status.toLowerCase().trim();
    // Debe incluir "qr hecho" pero NO "temporal"
    return normalized.includes('qr hecho') && !normalized.includes('temporal');
}

/**
 * ============================================================
 * CÁLCULOS DE SUELDOS POR ROL
 * ============================================================
 */

/**
 * Calcula sueldo para Asesores según escala Telemarketer
 * 
 * @param {number} ventas - Cantidad de ventas QR hecho
 * @param {number} ventasSemanal - Ventas en la semana actual (viernes-jueves)
 * @returns {Object} - { basico, comisionMensual, premioSemanal, total }
 */
function calcularSueldoAsesor(ventas, ventasSemanal = 0) {
    // Básico según rango de ventas mensuales
    let basico = 400000; // 0-16 ventas
    if (ventas >= 17 && ventas <= 20) basico = 500000;
    else if (ventas >= 21) basico = 700000;
    
    // Comisión mensual por tramos
    let comisionMensual = 0;
    if (ventas >= 10 && ventas <= 11) comisionMensual = 110000;
    else if (ventas >= 12 && ventas <= 16) comisionMensual = 200000;
    else if (ventas >= 17 && ventas <= 20) comisionMensual = 350000;
    else if (ventas >= 21 && ventas <= 23) comisionMensual = 500000;
    else if (ventas >= 24) comisionMensual = 700000;
    
    // Premio semanal (viernes a jueves) - por tramo, no acumulativo
    let premioSemanal = 0;
    if (ventasSemanal >= 10) premioSemanal = 200000;
    else if (ventasSemanal >= 8) premioSemanal = 100000;
    else if (ventasSemanal >= 6) premioSemanal = 80000;
    else if (ventasSemanal >= 4) premioSemanal = 40000;
    else if (ventasSemanal >= 3) premioSemanal = 0; // Sábado libre
    
    return {
        basico,
        comisionMensual,
        premioSemanal,
        total: basico + comisionMensual + premioSemanal
    };
}

/**
 * Calcula sueldo para Supervisores
 * 
 * @param {number} ventas - Cantidad de QR hechos del equipo
 * @param {number} ventasSemanal - QR del equipo en semana actual (viernes-jueves)
 * @returns {Object} - { basico, comisionMensual, premioSemanal, total }
 */
function calcularSueldoSupervisor(ventas, ventasSemanal = 0) {
    // Básico según rango
    let basico = 500000; // 0-60 ventas
    if (ventas >= 61) basico = 700000;
    
    // Comisión mensual por tramos
    let comisionMensual = 0;
    if (ventas >= 60 && ventas <= 79) comisionMensual = 500000;
    else if (ventas >= 80 && ventas <= 99) comisionMensual = 800000;
    else if (ventas >= 100 && ventas <= 119) comisionMensual = 1100000;
    else if (ventas >= 120) comisionMensual = 1500000;
    
    // Premio semanal (viernes a jueves) - por tramo
    let premioSemanal = 0;
    if (ventasSemanal >= 30) premioSemanal = 700000;
    else if (ventasSemanal >= 25) premioSemanal = 500000;
    else if (ventasSemanal >= 20) premioSemanal = 150000;
    else if (ventasSemanal >= 18) premioSemanal = 100000;
    
    return {
        basico,
        comisionMensual,
        premioSemanal,
        total: basico + comisionMensual + premioSemanal
    };
}

/**
 * Calcula sueldo para Auditores
 * 
 * @param {number} auditoriasLiquidables - Cantidad de auditorías completadas por el auditor
 * @returns {Object} - { basico, comisionPorAuditoria, total }
 */
function calcularSueldoAuditor(auditoriasLiquidables) {
    const basico = 400000;
    const comisionPorAuditoria = 3500;
    const comisionTotal = auditoriasLiquidables * comisionPorAuditoria;
    
    return {
        basico,
        comisionPorAuditoria,
        auditoriasLiquidables,
        comisionTotal,
        total: basico + comisionTotal
    };
}

function buildAuditorRows(audits, { fromKey, toKey, userId } = {}) {
    const rows = [];
    audits.forEach((audit) => {
        const history = Array.isArray(audit.completeHistory) ? audit.completeHistory : [];
        history
            .filter((entry) => {
                const role = entry?.completedByRole?.toLowerCase();
                const completeDate = entry?.completeDate;
                if ((role !== 'auditor' && role !== 'rr.hh') || !completeDate) return false;
                if (fromKey && completeDate < fromKey) return false;
                if (toKey && completeDate > toKey) return false;
                if (userId && toIdString(entry.completedByUserId) !== userId) return false;
                return true;
            })
            .forEach((entry) => {
                const creditedAuditor = entry.completedByUserId && typeof entry.completedByUserId === 'object'
                    ? entry.completedByUserId
                    : audit.auditor;

                rows.push({
                    ...audit,
                    _id: `${audit._id?.toString()}_${entry.monthKey}`,
                    auditId: audit._id,
                    originalAuditId: audit._id,
                    assignedAuditor: audit.auditor,
                    auditor: creditedAuditor || audit.auditor,
                    auditorCompletion: entry,
                    completeDate: entry.completeDate,
                    liquidacionMonth: entry.monthKey
                });
            });
    });
    return rows;
}

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

        if (!tipo || !['supervisor', 'auditor', 'administrativo', 'asesor'].includes(tipo)) {
            return res.status(400).json({ message: 'Parámetro tipo requerido: supervisor | auditor | administrativo | asesor' });
        }

        // ============================================================
        // Server-side role → tipo validation (prevent unauthorized access)
        // ============================================================
        const currentUser = req.user;
        const userRole = currentUser?.role?.toLowerCase();

        const ALLOWED_TIPOS_BY_ROLE = {
            gerencia:           ['supervisor', 'auditor', 'administrativo', 'asesor'],
            encargado:          ['supervisor', 'auditor', 'administrativo', 'asesor'],
            supervisor:         ['supervisor'],
            supervisor_reventa: ['supervisor'],
            asesor:             ['asesor', 'supervisor'],
            auditor:            ['auditor', 'asesor'],
            'rr.hh':            ['auditor'],  // RR.HH uses same liquidation logic as auditor
            administrativo:     ['administrativo'],
            independiente:      ['supervisor', 'auditor', 'asesor'],
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
            { path: 'completeHistory.completedByUserId', select: 'nombre name email role' },
        ];
        let auditorFromKey = null;
        let auditorToKey = null;

        // Date range filter
        if (dateFrom && dateTo) {
            const from = new Date(dateFrom);
            from.setUTCHours(3, 0, 0, 0);
            const to = new Date(dateTo);
            to.setUTCDate(to.getUTCDate() + 1);
            to.setUTCHours(2, 59, 59, 999);

            if (tipo === 'supervisor' || tipo === 'asesor') {
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
            } else if (tipo === 'auditor') {
                auditorFromKey = dateFrom;
                auditorToKey = dateTo;
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

            if (tipo === 'supervisor' || tipo === 'asesor') {
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
            } else if (tipo === 'auditor') {
                auditorFromKey = getArgentinaDateKey(monthStart);
                auditorToKey = getArgentinaDateKey(monthEnd);
            } else {
                filter.scheduledAt = { $gte: monthStart, $lte: monthEnd };
            }
        }

        // Status filter by tipo
        // ✅ NUEVA LÓGICA: Supervisor y Asesor solo ven QR hecho real (no temporal) + excepción Binimed
        if (tipo === 'supervisor' || tipo === 'asesor') {
            // Filtro base: QR hecho real (normalizado, excluye temporal)
            // El filtrado detallado se hace post-query para manejar la excepción Binimed
            filter.status = { $regex: /^qr hecho$/i }; // Solo QR hecho exacto, no temporal ni variantes
        } else if (tipo === 'auditor') {
            filter.completeHistory = {
                $elemMatch: {
                    completedByRole: { $in: [/^auditor$/i, /^rr\.hh$/i] },
                    completeDate: { $gte: auditorFromKey, $lte: auditorToKey }
                }
            };
        } else if (tipo === 'administrativo') {
            // Nuevo universo: ventas con estos estados de seguimiento + administrador asignado
            filter.status = { $regex: /^(qr hecho(\s\(temporal\))?|qr hecho pero pendiente de aprobación|afip|baja laboral sin nueva alta|baja laboral con nueva alta|remuneración no válida|cargada|aprobada( pero no reconoce clave)?|rechazada)$/i }; // ✅ Canonical: no comma
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

        if (tipo === 'auditor') {
            const auditorUserId = (isAuditorRole || isIndependiente) ? userId : null;
            audits = buildAuditorRows(audits, {
                fromKey: auditorFromKey,
                toKey: auditorToKey,
                userId: auditorUserId
            });
        }

        // ============================================================
        // Post-query filtering: QR hecho real + Binimed exception (para supervisor y asesor)
        // ============================================================
        if (tipo === 'supervisor' || tipo === 'asesor') {
            // Fecha actual para verificar excepción Binimed
            const now = new Date();
            const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            const ventasValidas = [];
            const binimedExceptionsToMark = [];
            
            for (const audit of audits) {
                const status = audit.status || '';
                const isQRHechoReal = isRealQRHecho(status);
                
                if (isQRHechoReal) {
                    // QR hecho real - incluir siempre
                    ventasValidas.push(audit);
                } else if (status.toLowerCase() === 'cargada' && 
                           audit.obraSocialVendida === 'Binimed' &&
                           isLastWorkingDayOfMonth(audit.scheduledAt) &&
                           !audit.binimedLiquidationException?.applied) {
                    // Excepción Binimed: Cargada + Binimed + último día laborable + no aplicada aún
                    ventasValidas.push({
                        ...audit,
                        _binimedException: true // Flag interno para UI
                    });
                    binimedExceptionsToMark.push(audit._id);
                }
                // Otros estados (incluyendo QR hecho temporal) se excluyen
            }
            
            // Marcar excepciones Binimed como aplicadas (fire-and-forget)
            if (binimedExceptionsToMark.length > 0) {
                Audit.updateMany(
                    { _id: { $in: binimedExceptionsToMark } },
                    {
                        $set: {
                            'binimedLiquidationException.applied': true,
                            'binimedLiquidationException.period': currentPeriod,
                            'binimedLiquidationException.appliedAt': new Date(),
                            'binimedLiquidationException.appliedBy': currentUser._id,
                            'binimedLiquidationException.reason': 'BINIMED_MONTH_END_CARGADA'
                        }
                    }
                ).catch(err => logger.error('Error marcando binimedLiquidationException:', err));
            }
            
            audits = ventasValidas;
        }

        // ============================================================
        // Role-based result filtering (server-side enforcement)
        // ============================================================
        if (tipo === 'supervisor' || tipo === 'asesor') {
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
                // Independiente in supervisor/asesor accordion: only sales where they are the asesor
                audits = audits.filter(a => a.asesor?._id?.toString() === userId);
            } else if (isAuditorRole && currentUser?.numeroEquipo) {
                // Auditor con equipo actúa como asesor: solo sus propias ventas
                audits = audits.filter(a => a.asesor?._id?.toString() === userId);
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
 * GET /api/liquidacion/stats-monthly?tipo=supervisor|auditor|administrativo|asesor&userId=optional
 * Aggregation pipeline: últimos 4 meses, conteo por {year, month}.
 * Si userId se proporciona, filtra por ese usuario (modo individual).
 */
exports.statsMonthly = async (req, res) => {
    try {
        const { tipo, userId } = req.query;

        if (!tipo || !['supervisor', 'auditor', 'administrativo', 'asesor'].includes(tipo)) {
            return res.status(400).json({ message: 'Parámetro tipo requerido: supervisor | auditor | administrativo | asesor' });
        }

        const now = new Date();
        // 4 months ago: start of that month
        const fourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        fourMonthsAgo.setUTCHours(3, 0, 0, 0); // Argentina midnight
        const fourMonthsAgoKey = `${fourMonthsAgo.getFullYear()}-${String(fourMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

        if (tipo === 'auditor') {
            const auditorMatch = {
                'completeHistory.completedByRole': { $in: [/^auditor$/i, /^rr\.hh$/i] },
                'completeHistory.monthKey': { $gte: fourMonthsAgoKey }
            };

            if (userId) {
                auditorMatch['completeHistory.completedByUserId'] = mongoose.Types.ObjectId.createFromHexString(userId);
            }

            const totalPipeline = [
                { $unwind: '$completeHistory' },
                { $match: auditorMatch },
                {
                    $group: {
                        _id: {
                            year: { $toInt: { $substr: ['$completeHistory.monthKey', 0, 4] } },
                            month: { $toInt: { $substr: ['$completeHistory.monthKey', 5, 2] } }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } }
            ];

            let globalPipeline = null;
            if (userId) {
                const globalMatch = {
                    'completeHistory.completedByRole': { $in: [/^auditor$/i, /^rr\.hh$/i] },
                    'completeHistory.monthKey': { $gte: fourMonthsAgoKey }
                };
                globalPipeline = [
                    { $unwind: '$completeHistory' },
                    { $match: globalMatch },
                    {
                        $group: {
                            _id: {
                                year: { $toInt: { $substr: ['$completeHistory.monthKey', 0, 4] } },
                                month: { $toInt: { $substr: ['$completeHistory.monthKey', 5, 2] } }
                            },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ];
            }

            const [filteredResults, globalResults] = await Promise.all([
                Audit.aggregate(totalPipeline),
                globalPipeline ? Audit.aggregate(globalPipeline) : Promise.resolve(null)
            ]);

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
            return res.json({ tipo, userId: userId || null, data });
        }

        // Build match stage
        let match = {};

        if (tipo === 'supervisor' || tipo === 'asesor') {
            // ✅ NUEVA LÓGICA: Solo QR hecho real (sin temporal) + Binimed en Cargada
            // Para stats mensuales usamos un enfoque simplificado: solo QR hecho exacto
            // La excepción Binimed se maneja mejor en el endpoint detallado
            match.status = { $regex: /^qr hecho$/i };
            match.$or = [
                { fechaCreacionQR: { $gte: fourMonthsAgo } },
                {
                    $and: [
                        { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                        { scheduledAt: { $gte: fourMonthsAgo } }
                    ]
                }
            ];
        } else if (tipo === 'administrativo') {
            match.status = { $regex: /^(qr hecho(\s\(temporal\))?|qr hecho pero pendiente de aprobación|afip|baja laboral sin nueva alta|baja laboral con nueva alta|remuneración no válida|cargada|aprobada( pero no reconoce clave)?|rechazada)$/i }; // ✅ Canonical: no comma
            match.administrador = { $ne: null };
            match.scheduledAt = { $gte: fourMonthsAgo };
            if (userId) match.administrador = require('mongoose').Types.ObjectId.createFromHexString(userId);
        }

        // For supervisor/asesor tipo with individual user filter
        if ((tipo === 'supervisor' || tipo === 'asesor') && userId) {
            match['asesor'] = require('mongoose').Types.ObjectId.createFromHexString(userId);
        }

        // Aggregation: total (all matching audits) grouped by month
        const dateExpr = (tipo === 'supervisor' || tipo === 'asesor')
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

/**
 * ============================================================
 * GET /api/liquidacion/salary-calculation
 * Calcula sueldos on-the-fly para Asesores, Supervisores o Auditores
 * 
 * Query params:
 * - tipo: 'asesor' | 'supervisor' | 'auditor'
 * - userId: ID del usuario (requerido para asesor/supervisor)
 * - dateFrom: fecha inicio (opcional, default mes actual)
 * - dateTo: fecha fin (opcional, default mes actual)
 * - ventasSemanal: número de ventas en semana actual (viernes-jueves)
 * 
 * Retorna: { basico, comisionMensual, premioSemanal, total, detalle }
 * ============================================================
 */
exports.calculateSalary = async (req, res) => {
    try {
        const { tipo, userId, dateFrom, dateTo, ventasSemanal = 0 } = req.query;
        
        // Validaciones
        if (!tipo || !['asesor', 'supervisor', 'auditor'].includes(tipo)) {
            return res.status(400).json({ message: 'Parámetro tipo requerido: asesor | supervisor | auditor' });
        }
        
        if (!userId && tipo !== 'auditor') {
            return res.status(400).json({ message: 'Parámetro userId requerido para asesor y supervisor' });
        }
        
        const User = require('../models/User');
        const currentUser = req.user;
        const userRole = currentUser?.role?.toLowerCase();
        
        // Verificar permisos
        const canViewAll = ['gerencia', 'encargado'].includes(userRole);
        const isOwnUser = userId === currentUser._id?.toString();
        
        if (!canViewAll && !isOwnUser) {
            return res.status(403).json({ message: 'No autorizado para ver cálculo de otros usuarios' });
        }
        
        // Fechas default: mes actual
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const from = dateFrom ? new Date(dateFrom) : currentMonthStart;
        const to = dateTo ? new Date(dateTo) : currentMonthEnd;
        
        // Ajustar horas
        from.setUTCHours(3, 0, 0, 0);
        to.setUTCHours(2, 59, 59, 999);
        
        let resultado = {};
        
        if (tipo === 'asesor' || tipo === 'supervisor') {
            // Buscar usuario
            const user = await User.findById(userId).select('nombre role numeroEquipo').lean();
            if (!user) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            
            // Construir filtro de ventas
            const fromAdjusted = new Date(from.getTime() - (3 * 60 * 60 * 1000));
            const matchFilter = {
                status: { $regex: /^qr hecho$/i },
                $or: [
                    { fechaCreacionQR: { $ne: null, $gte: fromAdjusted, $lte: to } },
                    {
                        $and: [
                            { $or: [{ fechaCreacionQR: { $exists: false } }, { fechaCreacionQR: null }] },
                            { scheduledAt: { $gte: from, $lte: to } }
                        ]
                    }
                ]
            };
            
            if (tipo === 'asesor') {
                // Asesor: sus propias ventas
                matchFilter.asesor = require('mongoose').Types.ObjectId.createFromHexString(userId);
            } else {
                // Supervisor: ventas de su equipo
                if (!user.numeroEquipo) {
                    return res.status(400).json({ message: 'Usuario supervisor sin numeroEquipo asignado' });
                }
                // Buscar asesores del equipo
                const asesoresEquipo = await User.find({ 
                    numeroEquipo: user.numeroEquipo,
                    role: { $in: ['asesor', 'Asesor', 'auditor', 'Auditor', 'independiente', 'Independiente'] },
                    active: true
                }).select('_id').lean();
                
                const asesorIds = asesoresEquipo.map(a => a._id);
                if (asesorIds.length === 0) {
                    resultado = calcularSueldoSupervisor(0, parseInt(ventasSemanal) || 0);
                    resultado.detalle = { usuario: user.nombre, ventasMensuales: 0, ventasSemanal, periodo: { from, to } };
                    return res.json(resultado);
                }
                
                matchFilter.asesor = { $in: asesorIds };
            }
            
            // Contar ventas del período
            const ventasCount = await Audit.countDocuments(matchFilter);
            
            // Calcular sueldo
            const ventasSemanalNum = parseInt(ventasSemanal) || 0;
            if (tipo === 'asesor') {
                resultado = calcularSueldoAsesor(ventasCount, ventasSemanalNum);
            } else {
                resultado = calcularSueldoSupervisor(ventasCount, ventasSemanalNum);
            }
            
            resultado.detalle = {
                usuario: user.nombre,
                rol: user.role,
                ventasMensuales: ventasCount,
                ventasSemanal: ventasSemanalNum,
                periodo: { from: from.toISOString(), to: to.toISOString() }
            };
            
        } else if (tipo === 'auditor') {
            // Para auditor: contar auditorías completadas en el período
            const targetUserId = userId || currentUser._id?.toString();
            
            const auditorMatch = {
                'completeHistory.completedByRole': { $in: [/^auditor$/i, /^rr\.hh$/i] },
                'completeHistory.completedByUserId': require('mongoose').Types.ObjectId.createFromHexString(targetUserId),
                'completeHistory.completeDate': {
                    $gte: getArgentinaDateKey(from),
                    $lte: getArgentinaDateKey(to)
                }
            };
            
            const pipeline = [
                { $match: { completeHistory: { $exists: true, $ne: [] } } },
                { $unwind: '$completeHistory' },
                { $match: auditorMatch },
                { $count: 'total' }
            ];
            
            const countResult = await Audit.aggregate(pipeline);
            const auditoriasCount = countResult[0]?.total || 0;
            
            resultado = calcularSueldoAuditor(auditoriasCount);
            resultado.detalle = {
                auditorId: targetUserId,
                auditoriasLiquidables: auditoriasCount,
                periodo: { from: from.toISOString(), to: to.toISOString() }
            };
        }
        
        console.log(`💰 Salary calculation [${tipo}] user=${userId}:`, resultado);
        res.json({ data: resultado });
        
    } catch (err) {
        logger.error('liquidacion.calculateSalary error:', err);
        res.status(500).json({ message: 'Error interno al calcular sueldo' });
    }
};
