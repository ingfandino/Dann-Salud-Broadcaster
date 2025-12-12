const Affiliate = require("../models/Affiliate");
const Audit = require("../models/Audit");
const User = require("../models/User");
const LeadAssignment = require("../models/LeadAssignment");
const logger = require("../utils/logger");

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Obtener afiliados mezclados (Frescos + Reutilizables)
 * Adaptado para el sistema de asignación digital
 */
async function getMixedLeads(mixConfig, totalCount, usedIds = new Set()) {
    try {
        const freshPercentage = mixConfig.freshPercentage || 50;
        const reusablePercentage = mixConfig.reusablePercentage || 50;

        // Calcular cantidades
        const freshCount = Math.floor(totalCount * (freshPercentage / 100));
        const reusableCount = totalCount - freshCount;

        logger.info(`📊 Mezclando leads: ${freshCount} frescos + ${reusableCount} reutilizables`);

        // ========== DATOS FRESCOS ==========
        // Excluir CUILs que ya están en auditorías O en asignaciones activas
        const auditsWithCuil = await Audit.find({ cuil: { $exists: true, $ne: null } }).distinct('cuil');
        const activeAssignments = await LeadAssignment.find({ active: true }).distinct('affiliate');

        // Agregar asignaciones activas a usedIds
        activeAssignments.forEach(id => usedIds.add(id.toString()));

        const freshAffiliates = await Affiliate.find({
            active: true,
            cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
            _id: { $nin: Array.from(usedIds) }
        })
            .limit(freshCount)
            .sort({ uploadDate: -1 }) // Priorizar recientes
            .lean();

        // ========== DATOS REUTILIZABLES ==========
        const reusableStatuses = ['No atendió', 'Tiene dudas', 'Reprogramada (falta confirmar hora)'];

        // Excluir auditorías que ya tienen asignación activa
        // (Esto es complejo porque Audit no tiene link directo a LeadAssignment, 
        // pero podemos asumir que si está en LeadAssignment como 'reusable', no debemos tomarlo)

        const audits = await Audit.find({
            status: { $in: reusableStatuses }
        })
            .limit(reusableCount)
            .lean();

        // Normalizar reutilizables
        const cuilList = audits.map(a => a.cuil).filter(Boolean);
        const affiliatesForReusable = await Affiliate.find({ cuil: { $in: cuilList } }).select('cuil localidad edad').lean();
        const affiliateMap = {};
        affiliatesForReusable.forEach(a => { if (a.cuil) affiliateMap[a.cuil] = a; });

        const reusableLeads = audits.map(audit => {
            const baseAffiliate = affiliateMap[audit.cuil] || {};
            // Si no encontramos el afiliado base, usamos el ID de la auditoría como referencia temporal
            // OJO: LeadAssignment espera 'affiliate' como ObjectId ref a Affiliate.
            // Si es reutilizable, DEBE tener un Affiliate asociado.

            // Si encontramos el afiliado base, usamos su ID. Si no, no podemos asignarlo como LeadAssignment válido linkeado a Affiliate.
            if (!baseAffiliate._id) return null;

            return {
                ...baseAffiliate, // Usamos el objeto afiliado real
                _source: 'reusable',
                _auditId: audit._id // Guardamos ref a la auditoría origen
            };
        }).filter(Boolean); // Filtrar nulos

        // Combinar y mezclar
        const combined = [...freshAffiliates, ...reusableLeads];
        return shuffleArray(combined);

    } catch (error) {
        logger.error("Error en getMixedLeads:", error);
        return [];
    }
}

/**
 * Distribuir leads a un supervisor y sus asesores
 * @param {Object} config - Configuración de distribución
 * @param {String} supervisorId - ID del supervisor que ejecuta
 */
async function distributeLeads(config, supervisorId) {
    const results = {
        totalAssigned: 0,
        details: []
    };

    try {
        const usedIds = new Set(); // Tracking para esta ejecución

        // Iterar sobre cada configuración de asesor
        for (const item of config.distribution) {
            const { asesorId, quantity, mix } = item;

            if (!quantity || quantity <= 0) continue;

            // Obtener leads mezclados
            const leads = await getMixedLeads(mix, quantity, usedIds);

            if (leads.length === 0) {
                results.details.push({ asesorId, assigned: 0, message: "No hay leads disponibles" });
                continue;
            }

            // Crear asignaciones
            const assignments = leads.map(lead => ({
                affiliate: lead._id,
                assignedTo: asesorId,
                assignedBy: supervisorId,
                status: 'Pendiente',
                sourceType: lead._source || 'fresh',
                active: true,
                interactions: [{
                    type: 'Nota',
                    note: 'Asignación automática por sistema',
                    timestamp: new Date()
                }]
            }));

            // Guardar en BD
            await LeadAssignment.insertMany(assignments);

            // Actualizar tracking
            leads.forEach(l => usedIds.add(l._id.toString()));

            results.totalAssigned += assignments.length;
            results.details.push({ asesorId, assigned: assignments.length });

            logger.info(`✅ Asignados ${assignments.length} leads al asesor ${asesorId}`);
        }

        return results;

    } catch (error) {
        logger.error("Error en distributeLeads:", error);
        throw error;
    }
}

/**
 * Obtener asignaciones del día para un asesor
 */
async function getDailyAssignments(asesorId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return await LeadAssignment.find({
        assignedTo: asesorId,
        active: true,
        status: { $nin: ['Venta', 'No Interesa', 'Reciclable'] }, // Mostrar pendientes y en gestión
        // Opcional: filtrar solo asignados hoy O pendientes antiguos
        // Por ahora mostramos todo lo activo asignado a este asesor
    })
        .populate('affiliate', 'nombre telefono1 cuil obraSocial localidad')
        .sort({ status: 1, assignedAt: -1 }); // Pendientes primero, luego por fecha
}

module.exports = {
    distributeLeads,
    getDailyAssignments
};
