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
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
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

function normalizeMix(mixConfig = {}) {
    const rawFresh = Number(mixConfig.freshPercentage);
    const freshPercentage = Number.isFinite(rawFresh)
        ? Math.max(0, Math.min(100, rawFresh))
        : 50;
    return {
        freshPercentage,
        reusablePercentage: 100 - freshPercentage
    };
}

function isStockStateSellable(state, supervisorId, now) {
    if (!state) return false;
    const ownershipSupervisor = state.ownership?.supervisorId;
    if (ownershipSupervisor && String(ownershipSupervisor) !== String(supervisorId)) return false;
    if (state.canSell !== true) return false;
    if (state.verificationStatus !== "checked") return false;
    if (state.saleStatus !== "none") return false;
    if (state.currentCheckJobId) return false;
    if (state.verificationExpiresAt && new Date(state.verificationExpiresAt) <= now) return false;
    return true;
}

function stockSourceType(assignment, state, affiliate) {
    const source = state?.freshness || state?.dataSource || affiliate?.dataSource || assignment?.source;
    return source === "reusable" ? "reusable" : "fresh";
}

function takeBySource(pool, count, usedIds) {
    const selected = [];
    for (const item of pool) {
        if (selected.length >= count) break;
        const affiliateKey = String(item.affiliateId);
        const stockKey = String(item.stockAssignmentId);
        if (usedIds.has(affiliateKey) || usedIds.has(stockKey)) continue;
        selected.push(item);
        usedIds.add(affiliateKey);
        usedIds.add(stockKey);
    }
    return selected;
}

async function getCanonicalStockLeads(mixConfig, totalCount, supervisorId, usedIds = new Set(), now = new Date()) {
    const quantity = Math.max(0, Number(totalCount) || 0);
    if (!quantity) return [];

    const mix = normalizeMix(mixConfig);
    const targetFresh = Math.floor(quantity * (mix.freshPercentage / 100));
    const targetReusable = quantity - targetFresh;

    const rawAssignments = await AffiliateAssignment.find({
        supervisorId,
        status: "active",
        expiresAt: { $gt: now },
        _id: { $nin: Array.from(usedIds).filter(id => String(id).length === 24) }
    })
        .populate("affiliateId", "nombre telefono1 cuil obraSocial localidad dataSource active")
        .populate("operationalStateId")
        .sort({ assignedAt: 1, _id: 1 })
        .limit(Math.max(quantity * 5, 100))
        .lean();

    const affiliateIds = rawAssignments.map(item => item.affiliateId?._id).filter(Boolean);
    const [statesByAffiliate, activeLeadAffiliateIds] = await Promise.all([
        AffiliateOperationalState.find({ affiliateId: { $in: affiliateIds } }).lean()
            .then(rows => new Map(rows.map(row => [String(row.affiliateId), row]))),
        LeadAssignment.distinct("affiliate", {
            affiliate: { $in: affiliateIds },
            active: true
        }).then(ids => new Set(ids.map(String)))
    ]);

    const eligible = [];
    for (const assignment of rawAssignments) {
        const affiliate = assignment.affiliateId;
        if (!affiliate || affiliate.active === false) continue;
        if (activeLeadAffiliateIds.has(String(affiliate._id))) continue;
        const state = assignment.operationalStateId || statesByAffiliate.get(String(affiliate._id));
        if (!isStockStateSellable(state, supervisorId, now)) continue;
        eligible.push({
            _id: affiliate._id,
            affiliateId: affiliate._id,
            stockAssignmentId: assignment._id,
            operationalStateId: state?._id || assignment.operationalStateId?._id || null,
            sourceJobId: assignment.sourceJobId || null,
            stockSource: assignment.source,
            _source: stockSourceType(assignment, state, affiliate)
        });
    }

    const fresh = eligible.filter(item => item._source === "fresh");
    const reusable = eligible.filter(item => item._source === "reusable");
    const selectedFresh = takeBySource(fresh, targetFresh, usedIds);
    const selectedReusable = takeBySource(reusable, targetReusable, usedIds);
    const selected = [...selectedFresh, ...selectedReusable];

    if (selected.length < quantity) {
        const selectedKeys = new Set(selected.map(item => String(item.stockAssignmentId)));
        const remainder = eligible.filter(item => !selectedKeys.has(String(item.stockAssignmentId)));
        selected.push(...takeBySource(remainder, quantity - selected.length, usedIds));
    }

    return selected.slice(0, quantity);
}

async function claimStockForAdvisor(lead, asesorId, supervisorId, now) {
    const claimed = await AffiliateAssignment.findOneAndUpdate(
        {
            _id: lead.stockAssignmentId,
            affiliateId: lead.affiliateId,
            supervisorId,
            status: "active",
            expiresAt: { $gt: now }
        },
        {
            $set: {
                status: "released",
                releasedAt: now,
                releaseReason: "assigned_to_advisor"
            }
        },
        { new: true }
    ).lean();

    if (!claimed) return null;

    try {
        const assignment = await LeadAssignment.create({
            affiliate: lead.affiliateId,
            assignedTo: asesorId,
            assignedBy: supervisorId,
            supervisor: supervisorId,
            sourceStockAssignment: lead.stockAssignmentId,
            operationalState: lead.operationalStateId,
            sourceCheckJob: lead.sourceJobId,
            status: "Pendiente",
            sourceType: lead._source || "fresh",
            active: true,
            interactions: [{
                type: "Nota",
                note: "Asignación desde stock verificado del supervisor",
                performedBy: supervisorId,
                timestamp: now
            }]
        });

        await Promise.all([
            Affiliate.updateOne(
                { _id: lead.affiliateId },
                {
                    $set: {
                        isUsed: true,
                        assignedTo: asesorId,
                        assignedAt: now,
                        leadStatus: "Asignado"
                    }
                }
            ),
            lead.operationalStateId
                ? AffiliateOperationalState.updateOne(
                    { _id: lead.operationalStateId },
                    {
                        $set: {
                            usageStatus: "assigned",
                            availableForSale: false,
                            unavailableReason: "assigned_to_advisor",
                            lastUsedAt: now
                        }
                    }
                )
                : Promise.resolve()
        ]);

        return assignment;
    } catch (error) {
        if (error?.code !== 11000) {
            await AffiliateAssignment.updateOne(
                { _id: lead.stockAssignmentId, status: "released", releaseReason: "assigned_to_advisor" },
                {
                    $set: { status: "active" },
                    $unset: { releasedAt: "", releaseReason: "" }
                }
            ).catch(() => {});
        }
        logger.warn(`No se pudo crear LeadAssignment desde stock ${lead.stockAssignmentId}: ${error.message}`);
        return null;
    }
}

/**
 * Obtener afiliados mezclados (Frescos + Reutilizables) del pool del supervisor
 * Respeta estrictamente los porcentajes solicitados por el usuario.
 * Fallback solo se activa cuando no hay suficientes datos del tipo solicitado.
 * 
 * @param {Object} mixConfig - Configuración de mezcla (freshPercentage, reusablePercentage)
 * @param {Number} totalCount - Cantidad total de leads a obtener
 * @param {String} supervisorId - ID del supervisor que ejecuta la distribución
 * @param {Set} usedIds - IDs ya utilizados en esta ejecución
 * @returns {Object} { leads, metadata } - Leads mezclados y metadata de distribución
 */
async function getMixedLeads(mixConfig, totalCount, supervisorId, usedIds = new Set()) {
    try {
        const freshPercentage = mixConfig.freshPercentage || 50;
        const reusablePercentage = mixConfig.reusablePercentage || 50;

        // Detectar porcentajes extremos (100% de un solo tipo)
        const is100Fresh = freshPercentage === 100;
        const is100Reusable = reusablePercentage === 100;

        const targetFresh = Math.floor(totalCount * (freshPercentage / 100));
        const targetReusable = totalCount - targetFresh;

        logger.info(`📊 Objetivo: ${targetFresh} frescos + ${targetReusable} reutilizables (total: ${totalCount}, supervisor: ${supervisorId})`);
        if (is100Fresh) logger.info(`📊 Modo: 100% FRESCOS solicitados`);
        if (is100Reusable) logger.info(`📊 Modo: 100% REUTILIZABLES solicitados`);

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

        // ========== FALLBACK CONTROLADO ==========
        // REGLA: Solo compensar con el tipo opuesto si:
        // 1. El usuario NO pidió 100% de un solo tipo (mezcla), O
        // 2. El usuario pidió 100% pero NO hay suficientes del tipo solicitado
        let extraFresh = [];
        let extraReusable = [];
        let fallbackUsed = false;
        let fallbackReason = null;

        const currentTotal = freshObtained + reusableObtained;

        if (currentTotal < totalCount) {
            const deficit = totalCount - currentTotal;

            if (is100Fresh) {
                // Usuario pidió 100% frescos - solo usar fallback si no hay suficientes frescos
                if (freshObtained < totalCount) {
                    fallbackUsed = true;
                    fallbackReason = `No hay suficientes datos frescos (${freshObtained}/${totalCount})`;
                    const freshDeficit = totalCount - freshObtained;

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
                    logger.warn(`⚠️ FALLBACK ACTIVADO: ${fallbackReason}. Completando con ${extraReusable.length} reutilizables.`);
                }
            } else if (is100Reusable) {
                // Usuario pidió 100% reutilizables - solo usar fallback si no hay suficientes
                if (reusableObtained < totalCount) {
                    fallbackUsed = true;
                    fallbackReason = `No hay suficientes datos reutilizables (${reusableObtained}/${totalCount})`;
                    const reusableDeficit = totalCount - reusableObtained;

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
                    logger.warn(`⚠️ FALLBACK ACTIVADO: ${fallbackReason}. Completando con ${extraFresh.length} frescos.`);
                }
            } else {
                // Usuario pidió mezcla (ej: 70/30) - compensar proporcionalmente
                logger.warn(`⚠️ Déficit de ${deficit} datos en modo mezcla. Compensando...`);

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
                    if (extraReusable.length > 0) {
                        logger.info(`♻️ Compensación: ${extraReusable.length} reutilizables extra (por falta de frescos)`);
                    }
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
                    if (extraFresh.length > 0) {
                        logger.info(`✨ Compensación: ${extraFresh.length} frescos extra (por falta de reutilizables)`);
                    }
                }
            }
        }

        // Marcar origen correctamente
        const freshWithSource = [...freshAffiliates, ...extraFresh].map(a => ({ ...a, _source: 'fresh' }));
        const reusableWithSource = [...reusableAffiliates, ...extraReusable].map(a => ({ ...a, _source: 'reusable' }));

        const combined = [...freshWithSource, ...reusableWithSource];

        const finalFreshCount = freshWithSource.length;
        const finalReusableCount = reusableWithSource.length;
        const finalTotal = combined.length;

        logger.info(`📊 Resultado final: ${finalTotal}/${totalCount} (${finalFreshCount} frescos, ${finalReusableCount} reutilizables)`);

        if (fallbackUsed) {
            logger.warn(`⚠️ Se activó fallback: ${fallbackReason}`);
        } else if (is100Fresh && finalReusableCount === 0) {
            logger.info(`✅ 100% frescos respetado correctamente`);
        } else if (is100Reusable && finalFreshCount === 0) {
            logger.info(`✅ 100% reutilizables respetado correctamente`);
        }

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
            active: true,
            sourceStockAssignment: null
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
        requestedTotal: 0,
        partial: false,
        details: []
    };

    try {
        const usedIds = new Set();

        for (const item of config.distribution) {
            const { asesorId, quantity, mix } = item;

            if (!quantity || quantity <= 0) continue;
            const requested = Number(quantity) || 0;
            results.requestedTotal += requested;

            // PASO 1: Reciclar asignaciones previas del asesor
            const recycleResult = await recycleAsesorAssignments(asesorId, supervisorId);

            // PASO 2: Obtener stock verificado del supervisor (modelo canónico)
            const now = new Date();
            const stockLeads = await getCanonicalStockLeads(mix, requested, supervisorId, usedIds, now);

            if (stockLeads.length === 0) {
                results.details.push({
                    asesorId,
                    assigned: 0,
                    recycled: recycleResult.recycled,
                    requested,
                    message: "No hay stock verificado disponible para este supervisor"
                });
                continue;
            }

            const createdAssignments = [];
            for (const lead of stockLeads) {
                const assignment = await claimStockForAdvisor(lead, asesorId, supervisorId, now);
                if (assignment) createdAssignments.push(assignment);
            }

            // Actualizar tracking para esta ejecución
            stockLeads.forEach(l => {
                usedIds.add(String(l.affiliateId));
                usedIds.add(String(l.stockAssignmentId));
            });

            results.totalAssigned += createdAssignments.length;
            results.details.push({
                asesorId,
                requested,
                assigned: createdAssignments.length,
                recycled: recycleResult.recycled,
                source: "verified_supervisor_stock",
                partial: createdAssignments.length < requested
            });

            logger.info(`✅ Asignados ${createdAssignments.length}/${requested} leads verificados al asesor ${asesorId} (reciclados legacy: ${recycleResult.recycled})`);
        }

        results.partial = results.totalAssigned < results.requestedTotal;
        if (results.partial) {
            results.message = `Distribución parcial: ${results.totalAssigned}/${results.requestedTotal} asignados`;
        } else {
            results.message = "Distribución completada";
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
