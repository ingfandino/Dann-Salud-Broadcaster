/**
 * ============================================================
 * SERVICIO DE ASIGNACIONES (assignmentService.js)
 * ============================================================
 * Distribuye leads a asesores para "Datos del día".
 * Mezcla afiliados frescos con reutilizables.
 */

const Affiliate = require("../models/Affiliate");
const Audit = require("../models/Audit");
const User = require("../models/User");
const LeadAssignment = require("../models/LeadAssignment");
const Contact = require("../models/Contact");
const logger = require("../utils/logger");

/** Fisher-Yates shuffle para mezclar arrays */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Obtener afiliados mezclados (Frescos + Reutilizables) del pool del supervisor
 * @param {Object} mixConfig - Configuración de mezcla (freshPercentage, reusablePercentage)
 * @param {Number} totalCount - Cantidad total de leads a obtener
 * @param {String} supervisorId - ID del supervisor que ejecuta la distribución
 * @param {Set} usedIds - IDs ya utilizados en esta ejecución
 */
async function getMixedLeads(mixConfig, totalCount, supervisorId, usedIds = new Set()) {
    try {
        const freshPercentage = mixConfig.freshPercentage || 50;
        const reusablePercentage = mixConfig.reusablePercentage || 50;

        const targetFresh = Math.floor(totalCount * (freshPercentage / 100));
        const targetReusable = totalCount - targetFresh;

        logger.info(`📊 Objetivo: ${targetFresh} frescos + ${targetReusable} reutilizables (total: ${totalCount}, supervisor: ${supervisorId})`);

        // ========== DATOS FRESCOS ==========
        let freshAffiliates = [];
        if (targetFresh > 0) {
            freshAffiliates = await Affiliate.find({
                active: true,
                exportedTo: supervisorId,
                isUsed: { $ne: true },
                _id: { $nin: Array.from(usedIds) },
                $or: [
                    { dataSource: 'fresh' },
                    { dataSource: { $exists: false } }
                ]
            })
                .limit(targetFresh)
                .sort({ uploadDate: -1 })
                .lean();
        }

        const freshObtained = freshAffiliates.length;
        freshAffiliates.forEach(a => usedIds.add(a._id.toString()));

        // ========== DATOS REUTILIZABLES ==========
        let reusableAffiliates = [];
        if (targetReusable > 0) {
            reusableAffiliates = await Affiliate.find({
                active: true,
                exportedTo: supervisorId,
                isUsed: { $ne: true },
                _id: { $nin: Array.from(usedIds) },
                dataSource: 'reusable'
            })
                .limit(targetReusable)
                .sort({ uploadDate: -1 })
                .lean();
        }

        const reusableObtained = reusableAffiliates.length;
        reusableAffiliates.forEach(a => usedIds.add(a._id.toString()));

        logger.info(`📊 Obtenidos: ${freshObtained}/${targetFresh} frescos, ${reusableObtained}/${targetReusable} reutilizables`);

        // ========== FALLBACK: Compensar solo si faltan datos ==========
        let extraFresh = [];
        let extraReusable = [];

        const currentTotal = freshObtained + reusableObtained;
        if (currentTotal < totalCount) {
            const deficit = totalCount - currentTotal;
            logger.warn(`⚠️ Déficit de ${deficit} datos. Intentando compensar...`);

            if (freshObtained < targetFresh) {
                const freshDeficit = targetFresh - freshObtained;
                extraReusable = await Affiliate.find({
                    active: true,
                    exportedTo: supervisorId,
                    isUsed: { $ne: true },
                    _id: { $nin: Array.from(usedIds) },
                    dataSource: 'reusable'
                })
                    .limit(freshDeficit)
                    .sort({ uploadDate: -1 })
                    .lean();
                
                extraReusable.forEach(a => usedIds.add(a._id.toString()));
                logger.info(`♻️ Compensación: ${extraReusable.length} reutilizables extra (por falta de frescos)`);
            }

            if (reusableObtained < targetReusable) {
                const reusableDeficit = targetReusable - reusableObtained;
                extraFresh = await Affiliate.find({
                    active: true,
                    exportedTo: supervisorId,
                    isUsed: { $ne: true },
                    _id: { $nin: Array.from(usedIds) },
                    $or: [
                        { dataSource: 'fresh' },
                        { dataSource: { $exists: false } }
                    ]
                })
                    .limit(reusableDeficit)
                    .sort({ uploadDate: -1 })
                    .lean();
                
                extraFresh.forEach(a => usedIds.add(a._id.toString()));
                logger.info(`✨ Compensación: ${extraFresh.length} frescos extra (por falta de reutilizables)`);
            }
        }

        // Marcar origen
        const freshWithSource = [...freshAffiliates, ...extraFresh].map(a => ({ ...a, _source: 'fresh' }));
        const reusableWithSource = [...reusableAffiliates, ...extraReusable].map(a => ({ ...a, _source: 'reusable' }));

        const combined = [...freshWithSource, ...reusableWithSource];
        
        const finalTotal = combined.length;
        logger.info(`📊 Resultado final: ${finalTotal}/${totalCount} (${freshWithSource.length} frescos, ${reusableWithSource.length} reutilizables)`);

        return shuffleArray(combined);

    } catch (error) {
        logger.error("Error en getMixedLeads:", error);
        return [];
    }
}

/**
 * Reciclar asignaciones previas de un asesor
 * Devuelve los affiliates no utilizados al pool del supervisor
 */
async function recycleAsesorAssignments(asesorId, supervisorId) {
    try {
        const prevAssignments = await LeadAssignment.find({
            assignedTo: asesorId,
            active: true
        }).lean();

        if (prevAssignments.length === 0) return { recycled: 0, freshReturned: 0, reusableReturned: 0 };

        let freshReturned = 0;
        let reusableReturned = 0;

        for (const assignment of prevAssignments) {
            if (assignment.status === 'Pendiente' || assignment.status === 'Llamando') {
                const sourceType = assignment.sourceType || 'fresh';
                await Affiliate.findByIdAndUpdate(assignment.affiliate, {
                    isUsed: false,
                    leadStatus: 'Pendiente'
                });
                if (sourceType === 'fresh') freshReturned++;
                else reusableReturned++;
            }
        }

        await LeadAssignment.updateMany(
            { assignedTo: asesorId, active: true },
            { active: false }
        );

        logger.info(`🔄 Recicladas ${prevAssignments.length} asignaciones del asesor ${asesorId}: ${freshReturned} frescos, ${reusableReturned} reutilizables devueltos al pool`);

        return { recycled: prevAssignments.length, freshReturned, reusableReturned };
    } catch (error) {
        logger.error("Error reciclando asignaciones:", error);
        return { recycled: 0, freshReturned: 0, reusableReturned: 0 };
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
        const usedIds = new Set();

        for (const item of config.distribution) {
            const { asesorId, quantity, mix } = item;

            if (!quantity || quantity <= 0) continue;

            // PASO 1: Reciclar asignaciones previas del asesor
            const recycleResult = await recycleAsesorAssignments(asesorId, supervisorId);

            // PASO 2: Obtener leads mezclados del pool del supervisor
            const leads = await getMixedLeads(mix, quantity, supervisorId, usedIds);

            if (leads.length === 0) {
                results.details.push({ 
                    asesorId, 
                    assigned: 0, 
                    recycled: recycleResult.recycled,
                    message: "No hay leads disponibles en el pool del supervisor" 
                });
                continue;
            }

            // PASO 3: Crear asignaciones
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

            await LeadAssignment.insertMany(assignments);

            // PASO 4: Marcar Affiliates como usados para descontar del pool
            const affiliateIds = leads.map(l => l._id);
            await Affiliate.updateMany(
                { _id: { $in: affiliateIds } },
                { 
                    isUsed: true, 
                    assignedTo: asesorId,
                    assignedAt: new Date(),
                    leadStatus: 'Asignado'
                }
            );

            // Actualizar tracking para esta ejecución
            leads.forEach(l => usedIds.add(l._id.toString()));

            results.totalAssigned += assignments.length;
            results.details.push({ 
                asesorId, 
                assigned: assignments.length,
                recycled: recycleResult.recycled
            });

            logger.info(`✅ Asignados ${assignments.length} leads al asesor ${asesorId} (reciclados: ${recycleResult.recycled})`);
        }

        return results;

    } catch (error) {
        logger.error("Error en distributeLeads:", error);
        throw error;
    }
}

/**
 * Obtener asignaciones del día para un asesor/supervisor
 * ✅ Incluye leads asignados directamente + leads reasignados al usuario
 * ✅ Marca automáticamente como "Spam" si el teléfono ya fue contactado por mensajería masiva
 */
async function getDailyAssignments(userId) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const assignments = await LeadAssignment.find({
        $or: [
            { assignedTo: userId },
            { reassignedTo: userId }
        ],
        active: true,
        status: { $nin: ['Venta', 'No Interesa', 'Reciclable'] },
    })
        .populate('affiliate', 'nombre telefono1 cuil obraSocial localidad')
        .sort({ isPriority: -1, status: 1, assignedAt: -1 });

    const phoneNumbers = assignments
        .map(a => a.affiliate?.telefono1)
        .filter(Boolean)
        .map(phone => String(phone).replace(/\D/g, ""));

    if (phoneNumbers.length > 0) {
        const contactedPhones = await Contact.find({
            telefono: { $in: phoneNumbers },
            massMessagedAt: { $ne: null }
        }).select('telefono').lean();

        const contactedSet = new Set(contactedPhones.map(c => String(c.telefono)));

        for (const assignment of assignments) {
            const phone = assignment.affiliate?.telefono1 
                ? String(assignment.affiliate.telefono1).replace(/\D/g, "") 
                : null;
            
            if (phone && contactedSet.has(phone) && assignment.status !== 'Spam') {
                assignment.status = 'Spam';
                assignment.subStatus = 'Ya contactado por campaña masiva';
                await assignment.save();
                logger.info(`📛 Lead ${assignment._id} marcado como Spam (teléfono ${phone} ya contactado por mensajería masiva)`);
            }
        }
    }

    return assignments;
}

module.exports = {
    distributeLeads,
    getDailyAssignments
};
