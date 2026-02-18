/**
 * ============================================================
 * HELPER DE SUPERVISORES (supervisorHelper.js)
 * ============================================================
 * Funciones para determinar el supervisor correcto de una auditoría
 * basándose en el historial de equipos del asesor y fechas.
 */

const User = require('../models/User');
const logger = require('./logger');

/**
 * Obtiene el supervisor correcto para una auditoría.
 * Usa el historial de equipos del asesor para fechas pasadas.
 */
async function getSupervisorSnapshotForAudit(audit, asesor) {
    try {
        // 1. Determinar fecha de referencia
        let referenceDate = audit.fechaCreacionQR;

        // Si no hay fechaCreacionQR, buscar en statusHistory cuándo pasó a "QR hecho"
        if (!referenceDate && audit.statusHistory && audit.statusHistory.length > 0) {
            const qrHechoEntry = audit.statusHistory.find(h =>
                h.value && h.value.toLowerCase() === 'qr hecho'
            );
            if (qrHechoEntry && qrHechoEntry.updatedAt) {
                referenceDate = qrHechoEntry.updatedAt;
            }
        }

        // Fallback final a scheduledAt
        if (!referenceDate) {
            referenceDate = audit.scheduledAt || new Date();
        }

        logger.debug(`[SUPERVISOR_HELPER] Audit ${audit._id}: usando fecha de referencia ${referenceDate}`);

        // 2. Determinar numeroEquipo target
        let targetNumeroEquipo = null;

        // Si hay asesor, usar su numeroEquipo (con teamHistory si existe)
        if (asesor) {
            let period = null;

            if (asesor.teamHistory && asesor.teamHistory.length > 0) {
                period = asesor.teamHistory.find(h => {
                    const afterStart = new Date(referenceDate) >= new Date(h.fechaInicio);
                    const beforeEnd = !h.fechaFin || new Date(referenceDate) <= new Date(h.fechaFin);
                    return afterStart && beforeEnd;
                });
            }

            // Si no hay periodo en historial, usar numeroEquipo actual del asesor
            targetNumeroEquipo = period ? period.numeroEquipo : asesor.numeroEquipo;
        }

        // Si no se obtuvo numeroEquipo del asesor, intentar con groupId
        if (!targetNumeroEquipo && audit.groupId) {
            // groupId puede ser un ObjectId o un objeto con numero/nombre
            if (typeof audit.groupId === 'string') {
                targetNumeroEquipo = audit.groupId;
            } else if (audit.groupId.numero) {
                targetNumeroEquipo = audit.groupId.numero;
            } else if (audit.groupId.nombre) {
                targetNumeroEquipo = audit.groupId.nombre;
            }
        }

        if (!targetNumeroEquipo) {
            logger.warn(`[SUPERVISOR_HELPER] Audit ${audit._id}: sin numeroEquipo (ni asesor ni groupId)`);
            return null;
        }

        logger.debug(`[SUPERVISOR_HELPER] Audit ${audit._id}: buscando supervisor para equipo ${targetNumeroEquipo}`);

        // 3. Buscar supervisor del numeroEquipo
        const supervisor = await User.findOne({
            numeroEquipo: String(targetNumeroEquipo),
            role: { $in: ['supervisor', 'Supervisor', 'encargado'] },
            active: true
        }).select('_id nombre numeroEquipo');

        if (!supervisor) {
            logger.warn(`[SUPERVISOR_HELPER] Audit ${audit._id}: no se encontró supervisor para equipo ${targetNumeroEquipo}`);
            return null;
        }

        logger.info(`[SUPERVISOR_SNAPSHOT] Audit ${audit._id} asignado supervisor ${supervisor._id} (${supervisor.nombre}, equipo ${targetNumeroEquipo})`);

        return {
            _id: supervisor._id,
            nombre: supervisor.nombre,
            numeroEquipo: String(targetNumeroEquipo)
        };

    } catch (error) {
        logger.error(`[SUPERVISOR_HELPER] Error calculando supervisor para audit ${audit._id}:`, error.message);
        return null;
    }
}

/**
 * Encuentra el periodo de equipo activo para una fecha específica
 * 
 * @param {Array} teamHistory - Array de periodos de equipo
 * @param {Date} date - Fecha de referencia
 * @returns {Object|null} Periodo encontrado o null
 */
function getTeamPeriodForDate(teamHistory, date) {
    if (!teamHistory || teamHistory.length === 0) return null;

    const refDate = new Date(date);

    return teamHistory.find(period => {
        const afterStart = refDate >= new Date(period.fechaInicio);
        const beforeEnd = !period.fechaFin || refDate <= new Date(period.fechaFin);
        return afterStart && beforeEnd;
    });
}

/**
 * Valida que el historial de equipos sea consistente
 * - Solo un periodo puede estar abierto (fechaFin = null)
 * - No debe haber superposición de fechas
 * - fechaInicio < fechaFin
 * 
 * @param {Array} teamHistory - Array de periodos a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateTeamHistory(teamHistory) {
    const errors = [];

    if (!teamHistory || teamHistory.length === 0) {
        return { valid: true, errors: [] };
    }

    // 1. Verificar que solo haya un periodo abierto
    const openPeriods = teamHistory.filter(h => !h.fechaFin);
    if (openPeriods.length > 1) {
        errors.push(`Múltiples periodos abiertos encontrados (${openPeriods.length}). Solo debe haber uno.`);
    }

    // 2. Verificar fechaInicio < fechaFin para cada periodo cerrado
    teamHistory.forEach((period, idx) => {
        if (period.fechaFin && new Date(period.fechaInicio) >= new Date(period.fechaFin)) {
            errors.push(`Periodo ${idx + 1}: fechaInicio debe ser menor que fechaFin`);
        }
    });

    // 3. Verificar que no haya superposiciones
    for (let i = 0; i < teamHistory.length; i++) {
        for (let j = i + 1; j < teamHistory.length; j++) {
            const p1 = teamHistory[i];
            const p2 = teamHistory[j];

            const p1Start = new Date(p1.fechaInicio);
            const p1End = p1.fechaFin ? new Date(p1.fechaFin) : new Date('2099-12-31');
            const p2Start = new Date(p2.fechaInicio);
            const p2End = p2.fechaFin ? new Date(p2.fechaFin) : new Date('2099-12-31');

            // Check for overlap (exclusive end date - touching periods are OK)
            // p1End is inclusive, so we need strict greater than for actual overlap
            const overlaps = (p1Start < p2End && p1End > p2Start);

            if (overlaps) {
                errors.push(`Superposición entre periodos ${i + 1} y ${j + 1}`);
            }
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

module.exports = {
    getSupervisorSnapshotForAudit,
    getTeamPeriodForDate,
    validateTeamHistory
};
