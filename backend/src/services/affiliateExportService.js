/**
 * ============================================================
 * SERVICIO DE EXPORTACIÓN DE AFILIADOS (affiliateExportService.js)
 * ============================================================
 * Genera archivos Excel de afiliados para supervisores.
 * Distribuye datos frescos y reutilizables según configuración.
 */

const Affiliate = require("../models/Affiliate");
const Audit = require("../models/Audit");
const AffiliateExportConfig = require("../models/AffiliateExportConfig");
const AffiliateContribution = require("../models/AffiliateContribution");
const User = require("../models/User");
const InternalMessage = require("../models/InternalMessage");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs").promises;
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");

/**
 * ========== HELPER: CONVERTIR SET DE IDs A ObjectIds ==========
 * Convierte un Set de IDs (pueden ser strings u ObjectIds) a un array de ObjectIds
 * para usar en queries de MongoDB. Esto garantiza compatibilidad de tipos.
 * @param {Set} idSet - Set de IDs a convertir
 * @returns {Array} Array de ObjectIds válidos
 */
function setToObjectIds(idSet) {
    return Array.from(idSet).map(id => {
        if (id instanceof mongoose.Types.ObjectId) return id;
        if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
        return id; // Fallback para IDs no válidos
    }).filter(Boolean);
}

/**
 * ========== LIMPIEZA DE DATOS POR SUPERVISOR ==========
 * Antes de cada nuevo envío, recupera los datos no utilizados del supervisor
 * y los devuelve al pool correspondiente (frescos o reutilizables)
 * @param {ObjectId} supervisorId - ID del supervisor
 * @param {String} batchId - ID del batch actual para trazabilidad
 * @returns {Object} { freshReturned, reusableReturned } - Conteo de datos devueltos
 */
async function cleanupSupervisorUnusedData(supervisorId, batchId) {
    try {
        // Buscar datos asignados al supervisor que NO fueron utilizados
        // Un dato NO utilizado tiene isUsed: false o isUsed no existe
        // y leadStatus: 'Pendiente' o 'Asignado' (no procesado)
        const unusedFilter = {
            exportedTo: supervisorId,
            active: true,
            $or: [
                { isUsed: false },
                { isUsed: { $exists: false } }
            ],
            leadStatus: { $in: ['Pendiente', 'Asignado', null, undefined] }
        };

        // Contar cuántos hay de cada tipo antes de actualizar
        const freshToReturn = await Affiliate.countDocuments({
            ...unusedFilter,
            $or: [
                { dataSource: 'fresh' },
                { dataSource: { $exists: false } }
            ]
        });

        const reusableToReturn = await Affiliate.countDocuments({
            ...unusedFilter,
            dataSource: 'reusable'
        });

        if (freshToReturn === 0 && reusableToReturn === 0) {
            return { freshReturned: 0, reusableReturned: 0 };
        }

        // Devolver datos FRESCOS al pool de frescos
        // (quitar asignación, mantener dataSource)
        if (freshToReturn > 0) {
            await Affiliate.updateMany(
                {
                    ...unusedFilter,
                    $or: [
                        { dataSource: 'fresh' },
                        { dataSource: { $exists: false } }
                    ]
                },
                {
                    $set: {
                        dataSource: 'fresh', // Asegurar que esté marcado como fresco
                        exported: false,
                        isUsed: false,
                        leadStatus: 'Pendiente',
                        returnedToPollAt: new Date(),
                        returnedFromBatchId: batchId
                    },
                    $unset: {
                        exportedTo: "",
                        exportedAt: "",
                        exportBatchId: "",
                        assignedTo: "",
                        assignedAt: ""
                    }
                }
            );
        }

        // Devolver datos REUTILIZABLES al pool de reutilizables
        if (reusableToReturn > 0) {
            await Affiliate.updateMany(
                {
                    ...unusedFilter,
                    dataSource: 'reusable'
                },
                {
                    $set: {
                        exported: false,
                        isUsed: false,
                        leadStatus: 'Pendiente',
                        returnedToPollAt: new Date(),
                        returnedFromBatchId: batchId
                    },
                    $unset: {
                        exportedTo: "",
                        exportedAt: "",
                        exportBatchId: "",
                        assignedTo: "",
                        assignedAt: ""
                    }
                }
            );
        }

        return { freshReturned: freshToReturn, reusableReturned: reusableToReturn };

    } catch (error) {
        logger.error(`❌ Error en cleanupSupervisorUnusedData para supervisor ${supervisorId}:`, error);
        return { freshReturned: 0, reusableReturned: 0, error: error.message };
    }
}

function formatPadron(padron) {
    if (!padron || !padron.status) return 'Pendiente';
    switch (padron.status) {
        case 'not_found':
        case 'found_expired':
            return 'No';
        case 'found_active': {
            if (padron.periodoDesde) {
                const [mm, yyyy] = String(padron.periodoDesde).split('/');
                if (mm && yyyy) {
                    const d = new Date(parseInt(yyyy), parseInt(mm) - 1 + 12, 1);
                    const rel = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    return `S\u00ed (${rel})`;
                }
            }
            return 'S\u00ed';
        }
        case 'captcha_failed':
        case 'error':
            return 'Error';
        default:
            return 'Pendiente';
    }
}

/** Fisher-Yates shuffle para mezclar arrays aleatoriamente */
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * ============================================================
 * DISTRIBUCIÓN PROPORCIONAL POR OBRA SOCIAL - ENVÍO MASIVO
 * ============================================================
 * Mezcla datos de TODAS las obras sociales disponibles de forma proporcional.
 * - Distribuye según stock disponible de cada obra social
 * - Respeta porcentajes frescos/reutilizables
 * - Garantiza que toda obra social con stock aporte al menos 1 dato
 * - Compensa solo cuando falta stock
 * 
 * @param {Object} mixConfig - Configuración {freshPercentage, reusablePercentage}
 * @param {Number} totalCount - Total de afiliados necesarios
 * @param {Set} usedIds - IDs de Affiliates ya usados (para evitar duplicados entre supervisores)
 * @param {Set} usedReusableCuils - CUILs de audits ya usadas como reutilizables
 * @returns {Object} { affiliates, usedAuditIds, auditsWithoutBase, usedReusableCuilsInThisCall }
 */
async function getMixedAffiliates(mixConfig, totalCount, usedIds = new Set(), usedReusableCuils = new Set()) {
    try {
        const freshPercentage = mixConfig.freshPercentage || 50;
        const reusablePercentage = mixConfig.reusablePercentage || 50;

        // Calcular cantidades objetivo por tipo
        const targetFresh = Math.floor(totalCount * (freshPercentage / 100));
        const targetReusable = totalCount - targetFresh;

        logger.info(`📊 ========== INICIO DISTRIBUCIÓN PROPORCIONAL ==========`);
        logger.info(`📊 Configuración: ${totalCount} total (${freshPercentage}% fresh = ${targetFresh}, ${reusablePercentage}% reusable = ${targetReusable})`);

        // ========== PASO 1: OBTENER STOCK POR OBRA SOCIAL (FRESCOS) ==========
        // Obtener CUILs que YA están en auditorías (para excluir de frescos)
        const auditsWithCuil = await Audit.find({
            cuil: { $exists: true, $ne: null }
        }).distinct('cuil').lean();

        // Agrupar stock fresco por obra social
        const freshStockByOS = await Affiliate.aggregate([
            {
                $match: {
                    active: true,
                    cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
                    _id: { $nin: setToObjectIds(usedIds) },
                    dataSource: { $ne: 'reusable' },
                    isUsed: { $ne: true },
                    obraSocial: { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: '$obraSocial',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const totalFreshStock = freshStockByOS.reduce((sum, os) => sum + os.count, 0);
        logger.info(`✨ Stock fresco total: ${totalFreshStock} en ${freshStockByOS.length} obras sociales`);
        freshStockByOS.forEach(os => logger.info(`   - ${os._id}: ${os.count}`));

        // ========== PASO 2: OBTENER STOCK POR OBRA SOCIAL (REUTILIZABLES) ==========
        const reusableStatuses = ['No atendió', 'Tiene dudas', 'Reprogramada (falta confirmar hora)'];
        const usedCuilsSet = new Set([...Array.from(usedReusableCuils)]);

        const reusableStockByOS = await Audit.aggregate([
            {
                $match: {
                    status: { $in: reusableStatuses },
                    cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuilsSet) },
                    reusableExportedAt: { $exists: false }
                }
            },
            {
                $group: {
                    _id: { $ifNull: ['$obraSocialAnterior', '$obraSocialVendida'] },
                    count: { $sum: 1 }
                }
            },
            {
                $match: { _id: { $ne: null } }
            },
            { $sort: { count: -1 } }
        ]);

        const totalReusableStock = reusableStockByOS.reduce((sum, os) => sum + os.count, 0);
        logger.info(`♻️  Stock reutilizable total: ${totalReusableStock} en ${reusableStockByOS.length} obras sociales`);
        reusableStockByOS.forEach(os => logger.info(`   - ${os._id}: ${os.count}`));

        // ========== PASO 3: CALCULAR DISTRIBUCIÓN PROPORCIONAL ==========
        /**
         * Calcula cuántos datos tomar de cada obra social proporcionalmente
         * Garantiza que toda OS con stock aporte al menos 1 dato
         */
        function calculateProportionalDistribution(stockByOS, totalNeeded) {
            if (stockByOS.length === 0 || totalNeeded <= 0) return [];
            
            const totalStock = stockByOS.reduce((sum, os) => sum + os.count, 0);
            if (totalStock === 0) return [];

            // Si hay más obras que datos necesarios, priorizar las de mayor stock
            if (stockByOS.length > totalNeeded) {
                const sorted = [...stockByOS].sort((a, b) => b.count - a.count);
                return sorted.slice(0, totalNeeded).map(os => ({
                    obraSocial: os._id,
                    cantidad: 1,
                    stockDisponible: os.count
                }));
            }

            // Calcular distribución proporcional
            const distribution = [];
            let remaining = totalNeeded;
            let remainingStock = totalStock;

            // Primero: asignar al menos 1 a cada OS con stock
            for (const os of stockByOS) {
                if (os.count > 0 && remaining > 0) {
                    distribution.push({
                        obraSocial: os._id,
                        cantidad: 1,
                        stockDisponible: os.count
                    });
                    remaining--;
                    remainingStock -= os.count;
                }
            }

            // Segundo: distribuir el resto proporcionalmente
            if (remaining > 0) {
                // Calcular proporciones basadas en stock restante (stock - 1 ya asignado)
                const stockForProportions = stockByOS.map(os => ({
                    obraSocial: os._id,
                    availableForMore: Math.max(0, os.count - 1)
                })).filter(os => os.availableForMore > 0);

                const totalAvailable = stockForProportions.reduce((sum, os) => sum + os.availableForMore, 0);
                
                if (totalAvailable > 0) {
                    // Distribuir proporcionalmente con decimales
                    let fractionalParts = [];
                    
                    for (const os of stockForProportions) {
                        const proportion = os.availableForMore / totalAvailable;
                        const exactAmount = remaining * proportion;
                        const wholeAmount = Math.floor(exactAmount);
                        const fractional = exactAmount - wholeAmount;

                        // Encontrar en distribution y sumar
                        const existing = distribution.find(d => d.obraSocial === os.obraSocial);
                        if (existing) {
                            const canAdd = Math.min(wholeAmount, os.availableForMore);
                            existing.cantidad += canAdd;
                            fractionalParts.push({
                                obraSocial: os.obraSocial,
                                fractional,
                                canAddMore: os.availableForMore - canAdd
                            });
                        }
                    }

                    // Asignar sobrantes (decimales) a las OS con mayor stock disponible
                    const totalAssigned = distribution.reduce((sum, d) => sum + d.cantidad, 0);
                    let stillRemaining = totalNeeded - totalAssigned;

                    if (stillRemaining > 0) {
                        // Ordenar por parte fraccionaria descendente, luego por stock disponible
                        fractionalParts.sort((a, b) => {
                            if (b.fractional !== a.fractional) return b.fractional - a.fractional;
                            return b.canAddMore - a.canAddMore;
                        });

                        for (const fp of fractionalParts) {
                            if (stillRemaining <= 0) break;
                            if (fp.canAddMore > 0) {
                                const existing = distribution.find(d => d.obraSocial === fp.obraSocial);
                                if (existing) {
                                    existing.cantidad++;
                                    stillRemaining--;
                                }
                            }
                        }
                    }
                }
            }

            // Verificar que ninguna OS exceda su stock
            for (const d of distribution) {
                const original = stockByOS.find(os => os._id === d.obraSocial);
                if (original && d.cantidad > original.count) {
                    d.cantidad = original.count;
                }
            }

            return distribution.filter(d => d.cantidad > 0);
        }

        // Calcular distribución para frescos
        const freshDistribution = calculateProportionalDistribution(freshStockByOS, targetFresh);
        const plannedFresh = freshDistribution.reduce((sum, d) => sum + d.cantidad, 0);
        logger.info(`📋 Distribución frescos planeada: ${plannedFresh}/${targetFresh}`);
        freshDistribution.forEach(d => logger.info(`   - ${d.obraSocial}: ${d.cantidad}/${d.stockDisponible}`));

        // Calcular distribución para reutilizables
        const reusableDistribution = calculateProportionalDistribution(reusableStockByOS, targetReusable);
        const plannedReusable = reusableDistribution.reduce((sum, d) => sum + d.cantidad, 0);
        logger.info(`📋 Distribución reutilizables planeada: ${plannedReusable}/${targetReusable}`);
        reusableDistribution.forEach(d => logger.info(`   - ${d.obraSocial}: ${d.cantidad}/${d.stockDisponible}`));

        // ========== PASO 4: OBTENER DATOS FRESCOS SEGÚN DISTRIBUCIÓN ==========
        let freshAffiliates = [];

        for (const dist of freshDistribution) {
            if (dist.cantidad <= 0) continue;

            const affiliates = await Affiliate.find({
                active: true,
                obraSocial: dist.obraSocial,
                cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
                _id: { $nin: setToObjectIds(usedIds) },
                dataSource: { $ne: 'reusable' },
                isUsed: { $ne: true }
            })
                .limit(dist.cantidad)
                .sort({ uploadDate: -1 })
                .lean();

            affiliates.forEach(a => {
                a._source = 'fresh';
                usedIds.add(a._id); // ✅ FIX: Sin toString() para mantener ObjectId
            });

            freshAffiliates.push(...affiliates);
        }

        const freshObtained = freshAffiliates.length;
        logger.info(`✨ Fresh obtenidos: ${freshObtained}/${targetFresh}`);

        // ========== PASO 5: OBTENER DATOS REUTILIZABLES SEGÚN DISTRIBUCIÓN ==========
        let reusableAffiliates = [];
        const localReusableCuils = new Set();
        const usedAuditIds = [];
        const auditsWithoutBase = [];
        let withBase = 0;
        let withoutBase = 0;

        // Agregar CUILs de frescos a exclusión
        freshAffiliates.forEach(a => {
            if (a.cuil) usedCuilsSet.add(a.cuil);
        });

        for (const dist of reusableDistribution) {
            if (dist.cantidad <= 0) continue;

            const audits = await Audit.find({
                status: { $in: reusableStatuses },
                $or: [
                    { obraSocialAnterior: dist.obraSocial },
                    { obraSocialVendida: dist.obraSocial }
                ],
                cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuilsSet) },
                reusableExportedAt: { $exists: false }
            })
                .sort({ scheduledAt: -1 })
                .limit(dist.cantidad * 2) // Buscar más por si hay duplicados
                .lean();

            // Obtener Affiliates base para estos CUILs
            const cuilList = audits.map(a => a.cuil).filter(Boolean);
            let affiliatesForReusable = [];
            if (cuilList.length > 0) {
                affiliatesForReusable = await Affiliate.find({
                    cuil: { $in: cuilList },
                    _id: { $nin: setToObjectIds(usedIds) }
                }).select('_id cuil localidad edad nombre telefono1 obraSocial').lean();
            }

            const affiliateMap = {};
            affiliatesForReusable.forEach(a => {
                if (a.cuil) affiliateMap[a.cuil] = a;
            });

            let countForThisOS = 0;
            for (const audit of audits) {
                if (countForThisOS >= dist.cantidad) break;
                if (!audit.cuil || localReusableCuils.has(audit.cuil) || usedCuilsSet.has(audit.cuil)) continue;

                const baseAffiliate = affiliateMap[audit.cuil];
                usedAuditIds.push(audit._id);
                usedCuilsSet.add(audit.cuil);
                localReusableCuils.add(audit.cuil);

                if (baseAffiliate) {
                    reusableAffiliates.push({
                        _id: baseAffiliate._id,
                        _affiliateId: baseAffiliate._id,
                        _hasBase: true,
                        _auditId: audit._id,
                        nombre: audit.nombre || baseAffiliate.nombre,
                        cuil: audit.cuil,
                        telefono1: audit.telefono || baseAffiliate.telefono1,
                        obraSocial: audit.obraSocialAnterior || audit.obraSocialVendida || baseAffiliate.obraSocial || '-',
                        localidad: baseAffiliate.localidad || 'DESCONOCIDO',
                        edad: baseAffiliate.edad || '',
                        _source: 'reusable'
                    });
                    usedIds.add(baseAffiliate._id); // ✅ FIX: Sin toString()
                    withBase++;
                } else {
                    auditsWithoutBase.push(audit);
                    reusableAffiliates.push({
                        _id: `pending_${audit._id}`,
                        _hasBase: false,
                        _auditId: audit._id,
                        _pendingCreate: true,
                        nombre: audit.nombre || 'Sin nombre',
                        cuil: audit.cuil,
                        telefono1: audit.telefono,
                        obraSocial: audit.obraSocialAnterior || audit.obraSocialVendida || '-',
                        localidad: 'DESCONOCIDO',
                        edad: '',
                        _source: 'reusable'
                    });
                    withoutBase++;
                }
                countForThisOS++;
            }
        }

        const reusableObtained = reusableAffiliates.length;
        logger.info(`♻️  Reutilizables obtenidos: ${reusableObtained}/${targetReusable} (${withBase} con base, ${withoutBase} sin base)`);

        // ========== PASO 6: COMPENSACIÓN (solo si falta stock) ==========
        let currentTotal = freshObtained + reusableObtained;
        let compensationAffiliates = [];

        // Compensar frescos faltantes con reutilizables adicionales
        if (freshObtained < targetFresh && currentTotal < totalCount) {
            const freshDeficit = targetFresh - freshObtained;
            const canCompensate = Math.min(freshDeficit, totalCount - currentTotal);
            
            if (canCompensate > 0) {
                logger.info(`🔄 Compensando ${canCompensate} frescos faltantes con reutilizables adicionales...`);
                
                // Buscar reutilizables adicionales de cualquier OS
                const extraAudits = await Audit.find({
                    status: { $in: reusableStatuses },
                    cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuilsSet) },
                    reusableExportedAt: { $exists: false }
                })
                    .sort({ scheduledAt: -1 })
                    .limit(canCompensate * 2)
                    .lean();

                const extraCuils = extraAudits.map(a => a.cuil).filter(Boolean);
                let extraAffiliatesBase = [];
                if (extraCuils.length > 0) {
                    extraAffiliatesBase = await Affiliate.find({
                        cuil: { $in: extraCuils },
                        _id: { $nin: setToObjectIds(usedIds) }
                    }).select('_id cuil localidad edad nombre telefono1 obraSocial').lean();
                }

                const extraMap = {};
                extraAffiliatesBase.forEach(a => {
                    if (a.cuil) extraMap[a.cuil] = a;
                });

                let compensated = 0;
                for (const audit of extraAudits) {
                    if (compensated >= canCompensate) break;
                    if (!audit.cuil || localReusableCuils.has(audit.cuil) || usedCuilsSet.has(audit.cuil)) continue;

                    const baseAffiliate = extraMap[audit.cuil];
                    usedAuditIds.push(audit._id);
                    usedCuilsSet.add(audit.cuil);
                    localReusableCuils.add(audit.cuil);

                    if (baseAffiliate) {
                        compensationAffiliates.push({
                            _id: baseAffiliate._id,
                            _affiliateId: baseAffiliate._id,
                            _hasBase: true,
                            _auditId: audit._id,
                            nombre: audit.nombre || baseAffiliate.nombre,
                            cuil: audit.cuil,
                            telefono1: audit.telefono || baseAffiliate.telefono1,
                            obraSocial: audit.obraSocialAnterior || audit.obraSocialVendida || baseAffiliate.obraSocial || '-',
                            localidad: baseAffiliate.localidad || 'DESCONOCIDO',
                            edad: baseAffiliate.edad || '',
                            _source: 'compensation_reusable'
                        });
                        usedIds.add(baseAffiliate._id); // ✅ FIX: Sin toString()
                        withBase++;
                    } else {
                        auditsWithoutBase.push(audit);
                        compensationAffiliates.push({
                            _id: `pending_${audit._id}`,
                            _hasBase: false,
                            _auditId: audit._id,
                            _pendingCreate: true,
                            nombre: audit.nombre || 'Sin nombre',
                            cuil: audit.cuil,
                            telefono1: audit.telefono,
                            obraSocial: audit.obraSocialAnterior || audit.obraSocialVendida || '-',
                            localidad: 'DESCONOCIDO',
                            edad: '',
                            _source: 'compensation_reusable'
                        });
                        withoutBase++;
                    }
                    compensated++;
                }
                logger.info(`🔄 Compensados: ${compensated} reutilizables adicionales`);
            }
        }

        // Compensar reutilizables faltantes con frescos adicionales
        currentTotal = freshObtained + reusableObtained + compensationAffiliates.length;
        if (reusableObtained < targetReusable && currentTotal < totalCount) {
            const reusableDeficit = targetReusable - reusableObtained - compensationAffiliates.length;
            const canCompensate = Math.min(reusableDeficit, totalCount - currentTotal);
            
            if (canCompensate > 0) {
                logger.info(`🔄 Compensando ${canCompensate} reutilizables faltantes con frescos adicionales...`);
                
                const extraFresh = await Affiliate.find({
                    active: true,
                    cuil: { $nin: [...auditsWithCuil, ...Array.from(usedCuilsSet)], $exists: true, $ne: null },
                    _id: { $nin: setToObjectIds(usedIds) },
                    dataSource: { $ne: 'reusable' },
                    isUsed: { $ne: true }
                })
                    .limit(canCompensate)
                    .sort({ uploadDate: -1 })
                    .lean();

                extraFresh.forEach(a => {
                    a._source = 'compensation_fresh';
                    usedIds.add(a._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
                });

                compensationAffiliates.push(...extraFresh);
                logger.info(`🔄 Compensados: ${extraFresh.length} frescos adicionales`);
            }
        }

        // ========== PASO 7: FALLBACK FINAL ==========
        currentTotal = freshObtained + reusableObtained + compensationAffiliates.length;
        let extraAffiliates = [];

        if (currentTotal < totalCount) {
            const stillNeeded = totalCount - currentTotal;
            logger.warn(`⚠️ DÉFICIT FINAL: Faltan ${stillNeeded} afiliados. Buscando extras...`);

            extraAffiliates = await Affiliate.find({
                active: true,
                _id: { $nin: setToObjectIds(usedIds) }
            })
                .limit(stillNeeded)
                .sort({ uploadDate: -1 })
                .lean();

            extraAffiliates.forEach(a => {
                a._source = 'extra';
                usedIds.add(a._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
            });

            logger.info(`📦 Extras obtenidos (fallback): ${extraAffiliates.length}/${stillNeeded}`);
        }

        // ========== PASO 8: COMBINAR Y MEZCLAR ==========
        const combined = [...freshAffiliates, ...reusableAffiliates, ...compensationAffiliates, ...extraAffiliates];
        const shuffled = shuffleArray(combined);

        // ========== LOGGING FINAL ==========
        const finalFresh = combined.filter(a => a._source === 'fresh').length;
        const finalReusable = combined.filter(a => a._source === 'reusable').length;
        const finalCompensation = combined.filter(a => a._source?.startsWith('compensation')).length;
        const finalExtra = combined.filter(a => a._source === 'extra').length;

        // Contar por obra social para verificar distribución
        const byObraSocial = {};
        combined.forEach(a => {
            const os = a.obraSocial || 'Sin OS';
            byObraSocial[os] = (byObraSocial[os] || 0) + 1;
        });

        logger.info(`📊 ========== RESUMEN FINAL ==========`);
        logger.info(`📊 Objetivo: ${totalCount} | Obtenido: ${shuffled.length}`);
        logger.info(`📊 Composición: Fresh=${finalFresh}, Reusable=${finalReusable}, Compensación=${finalCompensation}, Extra=${finalExtra}`);
        logger.info(`📊 Distribución por Obra Social:`);
        Object.entries(byObraSocial).sort((a, b) => b[1] - a[1]).forEach(([os, count]) => {
            logger.info(`   - ${os}: ${count} (${Math.round(count/shuffled.length*100)}%)`);
        });
        
        if (shuffled.length < totalCount) {
            logger.warn(`⚠️ NO SE ALCANZÓ EL OBJETIVO: ${shuffled.length}/${totalCount} (${Math.round(shuffled.length/totalCount*100)}%)`);
        } else {
            logger.info(`✅ OBJETIVO ALCANZADO: ${shuffled.length}/${totalCount}`);
        }
        logger.info(`📊 ========================================`);

        // ✅ Retornar objeto con metadata para procesamiento posterior
        return {
            affiliates: shuffled,
            usedAuditIds,
            auditsWithoutBase,
            usedReusableCuilsInThisCall: localReusableCuils
        };

    } catch (error) {
        logger.error("❌ Error en getMixedAffiliates:", error);
        return { affiliates: [], usedAuditIds: [], auditsWithoutBase: [] };
    }
}


/**
 * Obtener afiliados según distribución de obra social
 * @param {Array} distribution - Distribución [{obraSocial, cantidad}]
 * @param {Object} baseQuery - Query base para filtros
 * @param {Set} usedIds - IDs ya usados (para evitar duplicados)
 */
async function getAffiliatesByDistribution(distribution, baseQuery, usedIds = new Set()) {
    const affiliates = [];

    if (!distribution || distribution.length === 0) {
        // Sin distribución: obtener afiliados aleatorios
        return [];
    }

    for (const dist of distribution) {
        const query = { ...baseQuery, _id: { $nin: setToObjectIds(usedIds) } };

        if (dist.obraSocial === "*") {
            // Obtener afiliados de obras sociales NO especificadas
            const usedObraSociales = distribution
                .filter(d => d.obraSocial !== "*")
                .map(d => d.obraSocial);

            if (usedObraSociales.length > 0) {
                query.obraSocial = { $nin: usedObraSociales };
            }
        } else {
            // Obtener afiliados de obra social específica
            query.obraSocial = dist.obraSocial;
        }

        const affs = await Affiliate.find(query)
            .limit(dist.cantidad)
            .sort({ uploadDate: 1 })
            .lean();

        affiliates.push(...affs);
        affs.forEach(aff => usedIds.add(aff._id));

        if (affs.length < dist.cantidad) {
            logger.warn(`⚠️ Solo se encontraron ${affs.length}/${dist.cantidad} afiliados de ${dist.obraSocial === "*" ? "otras obras sociales" : dist.obraSocial}`);
        }
    }

    return affiliates;
}

/**
 * ============================================================
 * DISTRIBUCIÓN DINÁMICA POR OBRA SOCIAL - ENVÍOS AVANZADOS
 * ============================================================
 * Obtiene datos para una obra social específica con proporción
 * fresco/reutilizable calculada dinámicamente según stock real.
 * 
 * Algoritmo:
 * 1. Obtener stock real (frescos y reutilizables) de la obra social
 * 2. Calcular proporción dinámica: fresco% = frescos / total
 * 3. Asignar cantidades según proporción
 * 4. Si falta de un tipo, compensar con el otro tipo
 * 5. Si aún falta, activar fallback por otra obra social
 * 
 * @param {Object} obraSocialConfig - {obraSocial, cantidad}
 * @param {Set} usedIds - IDs de Affiliates ya usados
 * @param {Set} usedReusableCuils - CUILs de reutilizables ya usados
 * @param {Array} allObrasSociales - Todas las OS disponibles (para fallback)
 * @returns {Object} { affiliates, usedAuditIds, auditsWithoutBase, usedReusableCuilsInThisCall }
 */
async function getAdvancedDistribution(obraSocialConfig, usedIds = new Set(), usedReusableCuils = new Set(), allObrasSociales = []) {
    const { obraSocial, cantidad } = obraSocialConfig;
    
    logger.info(`📊 ========== DISTRIBUCIÓN AVANZADA: ${obraSocial} ==========`);
    logger.info(`📊 Cantidad solicitada: ${cantidad}`);

    // Obtener CUILs que YA están en auditorías (para excluir de frescos)
    const auditsWithCuil = await Audit.find({
        cuil: { $exists: true, $ne: null }
    }).distinct('cuil').lean();

    // ========== PASO 1: OBTENER STOCK REAL ==========
    // Stock Fresco
    const freshStock = await Affiliate.countDocuments({
        active: true,
        obraSocial: obraSocial,
        cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
        _id: { $nin: setToObjectIds(usedIds) },
        dataSource: { $ne: 'reusable' },
        isUsed: { $ne: true }
    });

    // Stock Reutilizable
    const reusableStatuses = ['No atendió', 'Tiene dudas', 'Reprogramada (falta confirmar hora)'];
    const reusableStock = await Audit.countDocuments({
        status: { $in: reusableStatuses },
        $or: [
            { obraSocialAnterior: obraSocial },
            { obraSocialVendida: obraSocial }
        ],
        cuil: { $exists: true, $ne: null, $nin: Array.from(usedReusableCuils) },
        reusableExportedAt: { $exists: false }
    });

    const totalStock = freshStock + reusableStock;
    logger.info(`📊 Stock disponible: Fresh=${freshStock}, Reusable=${reusableStock}, Total=${totalStock}`);

    if (totalStock === 0) {
        logger.warn(`⚠️ Sin stock disponible para ${obraSocial}`);
        return { affiliates: [], usedAuditIds: [], auditsWithoutBase: [], usedReusableCuilsInThisCall: new Set() };
    }

    // ========== PASO 2: CALCULAR PROPORCIÓN DINÁMICA ==========
    const freshProportion = totalStock > 0 ? freshStock / totalStock : 0.5;
    const targetFresh = Math.round(cantidad * freshProportion);
    const targetReusable = cantidad - targetFresh;

    logger.info(`📊 Proporción dinámica: ${Math.round(freshProportion * 100)}% fresco, ${Math.round((1 - freshProportion) * 100)}% reutilizable`);
    logger.info(`📊 Objetivo: Fresh=${targetFresh}, Reusable=${targetReusable}`);

    // ========== PASO 3: OBTENER DATOS FRESCOS ==========
    let freshAffiliates = [];
    const actualFreshToGet = Math.min(targetFresh, freshStock);

    if (actualFreshToGet > 0) {
        freshAffiliates = await Affiliate.find({
            active: true,
            obraSocial: obraSocial,
            cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
            _id: { $nin: setToObjectIds(usedIds) },
            dataSource: { $ne: 'reusable' },
            isUsed: { $ne: true }
        })
            .limit(actualFreshToGet)
            .sort({ uploadDate: -1 })
            .lean();

        freshAffiliates.forEach(a => {
            a._source = 'fresh';
            usedIds.add(a._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
        });
    }

    const freshObtained = freshAffiliates.length;
    logger.info(`✨ Frescos obtenidos: ${freshObtained}/${targetFresh}`);

    // ========== PASO 4: OBTENER DATOS REUTILIZABLES ==========
    let reusableAffiliates = [];
    const localReusableCuils = new Set();
    const usedAuditIds = [];
    const auditsWithoutBase = [];
    let withBase = 0;
    let withoutBase = 0;

    // Agregar CUILs de frescos a exclusión
    const usedCuilsSet = new Set([...Array.from(usedReusableCuils)]);
    freshAffiliates.forEach(a => {
        if (a.cuil) usedCuilsSet.add(a.cuil);
    });

    const actualReusableToGet = Math.min(targetReusable, reusableStock);

    if (actualReusableToGet > 0) {
        const audits = await Audit.find({
            status: { $in: reusableStatuses },
            $or: [
                { obraSocialAnterior: obraSocial },
                { obraSocialVendida: obraSocial }
            ],
            cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuilsSet) },
            reusableExportedAt: { $exists: false }
        })
            .sort({ scheduledAt: -1 })
            .limit(actualReusableToGet * 2)
            .lean();

        const cuilList = audits.map(a => a.cuil).filter(Boolean);
        let affiliatesForReusable = [];
        if (cuilList.length > 0) {
            affiliatesForReusable = await Affiliate.find({
                cuil: { $in: cuilList },
                _id: { $nin: setToObjectIds(usedIds) }
            }).select('_id cuil localidad edad nombre telefono1 obraSocial').lean();
        }

        const affiliateMap = {};
        affiliatesForReusable.forEach(a => {
            if (a.cuil) affiliateMap[a.cuil] = a;
        });

        let countReusable = 0;
        for (const audit of audits) {
            if (countReusable >= actualReusableToGet) break;
            if (!audit.cuil || localReusableCuils.has(audit.cuil) || usedCuilsSet.has(audit.cuil)) continue;

            const baseAffiliate = affiliateMap[audit.cuil];
            usedAuditIds.push(audit._id);
            usedCuilsSet.add(audit.cuil);
            localReusableCuils.add(audit.cuil);

            if (baseAffiliate) {
                reusableAffiliates.push({
                    _id: baseAffiliate._id,
                    _affiliateId: baseAffiliate._id,
                    _hasBase: true,
                    _auditId: audit._id,
                    nombre: audit.nombre || baseAffiliate.nombre,
                    cuil: audit.cuil,
                    telefono1: audit.telefono || baseAffiliate.telefono1,
                    obraSocial: obraSocial,
                    localidad: baseAffiliate.localidad || 'DESCONOCIDO',
                    edad: baseAffiliate.edad || '',
                    _source: 'reusable'
                });
                usedIds.add(baseAffiliate._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
                withBase++;
            } else {
                auditsWithoutBase.push(audit);
                reusableAffiliates.push({
                    _id: `pending_${audit._id}`,
                    _hasBase: false,
                    _auditId: audit._id,
                    _pendingCreate: true,
                    nombre: audit.nombre || 'Sin nombre',
                    cuil: audit.cuil,
                    telefono1: audit.telefono,
                    obraSocial: obraSocial,
                    localidad: 'DESCONOCIDO',
                    edad: '',
                    _source: 'reusable'
                });
                withoutBase++;
            }
            countReusable++;
        }
    }

    const reusableObtained = reusableAffiliates.length;
    logger.info(`♻️  Reutilizables obtenidos: ${reusableObtained}/${targetReusable} (${withBase} con base, ${withoutBase} sin base)`);

    // ========== PASO 5: COMPENSACIÓN INTERNA (mismo tipo) ==========
    let currentTotal = freshObtained + reusableObtained;
    let compensationAffiliates = [];

    // Si faltan frescos, compensar con más reutilizables de la misma OS
    if (freshObtained < targetFresh && currentTotal < cantidad) {
        const freshDeficit = targetFresh - freshObtained;
        const canCompensate = Math.min(freshDeficit, cantidad - currentTotal);
        
        if (canCompensate > 0) {
            logger.info(`🔄 Compensando ${canCompensate} frescos faltantes con reutilizables de ${obraSocial}...`);
            
            const extraAudits = await Audit.find({
                status: { $in: reusableStatuses },
                $or: [
                    { obraSocialAnterior: obraSocial },
                    { obraSocialVendida: obraSocial }
                ],
                cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuilsSet) },
                reusableExportedAt: { $exists: false }
            })
                .sort({ scheduledAt: -1 })
                .limit(canCompensate * 2)
                .lean();

            const extraCuils = extraAudits.map(a => a.cuil).filter(Boolean);
            let extraAffiliatesBase = [];
            if (extraCuils.length > 0) {
                extraAffiliatesBase = await Affiliate.find({
                    cuil: { $in: extraCuils },
                    _id: { $nin: setToObjectIds(usedIds) }
                }).select('_id cuil localidad edad nombre telefono1 obraSocial').lean();
            }

            const extraMap = {};
            extraAffiliatesBase.forEach(a => {
                if (a.cuil) extraMap[a.cuil] = a;
            });

            let compensated = 0;
            for (const audit of extraAudits) {
                if (compensated >= canCompensate) break;
                if (!audit.cuil || localReusableCuils.has(audit.cuil) || usedCuilsSet.has(audit.cuil)) continue;

                const baseAffiliate = extraMap[audit.cuil];
                usedAuditIds.push(audit._id);
                usedCuilsSet.add(audit.cuil);
                localReusableCuils.add(audit.cuil);

                if (baseAffiliate) {
                    compensationAffiliates.push({
                        _id: baseAffiliate._id,
                        _affiliateId: baseAffiliate._id,
                        _hasBase: true,
                        _auditId: audit._id,
                        nombre: audit.nombre || baseAffiliate.nombre,
                        cuil: audit.cuil,
                        telefono1: audit.telefono || baseAffiliate.telefono1,
                        obraSocial: obraSocial,
                        localidad: baseAffiliate.localidad || 'DESCONOCIDO',
                        edad: baseAffiliate.edad || '',
                        _source: 'compensation_reusable'
                    });
                    usedIds.add(baseAffiliate._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
                } else {
                    auditsWithoutBase.push(audit);
                    compensationAffiliates.push({
                        _id: `pending_${audit._id}`,
                        _hasBase: false,
                        _auditId: audit._id,
                        _pendingCreate: true,
                        nombre: audit.nombre || 'Sin nombre',
                        cuil: audit.cuil,
                        telefono1: audit.telefono,
                        obraSocial: obraSocial,
                        localidad: 'DESCONOCIDO',
                        edad: '',
                        _source: 'compensation_reusable'
                    });
                }
                compensated++;
            }
            logger.info(`🔄 Compensados: ${compensated} reutilizables adicionales de ${obraSocial}`);
        }
    }

    // Si faltan reutilizables, compensar con más frescos de la misma OS
    currentTotal = freshObtained + reusableObtained + compensationAffiliates.length;
    if (reusableObtained < targetReusable && currentTotal < cantidad) {
        const reusableDeficit = targetReusable - reusableObtained - compensationAffiliates.filter(a => a._source?.includes('reusable')).length;
        const canCompensate = Math.min(reusableDeficit, cantidad - currentTotal);
        
        if (canCompensate > 0) {
            logger.info(`🔄 Compensando ${canCompensate} reutilizables faltantes con frescos de ${obraSocial}...`);
            
            const extraFresh = await Affiliate.find({
                active: true,
                obraSocial: obraSocial,
                cuil: { $nin: [...auditsWithCuil, ...Array.from(usedCuilsSet)], $exists: true, $ne: null },
                _id: { $nin: setToObjectIds(usedIds) },
                dataSource: { $ne: 'reusable' },
                isUsed: { $ne: true }
            })
                .limit(canCompensate)
                .sort({ uploadDate: -1 })
                .lean();

            extraFresh.forEach(a => {
                a._source = 'compensation_fresh';
                usedIds.add(a._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
            });

            compensationAffiliates.push(...extraFresh);
            logger.info(`🔄 Compensados: ${extraFresh.length} frescos adicionales de ${obraSocial}`);
        }
    }

    // ========== PASO 6: FALLBACK POR OTRA OBRA SOCIAL ==========
    currentTotal = freshObtained + reusableObtained + compensationAffiliates.length;
    let fallbackAffiliates = [];

    if (currentTotal < cantidad && allObrasSociales.length > 0) {
        const stillNeeded = cantidad - currentTotal;
        logger.warn(`⚠️ Faltan ${stillNeeded} datos. Buscando en otras obras sociales...`);

        // Obtener otras OS con stock, priorizando mayor stock
        const otherOS = allObrasSociales.filter(os => os !== obraSocial);
        
        for (const os of otherOS) {
            if (fallbackAffiliates.length >= stillNeeded) break;
            
            // Buscar frescos de esta OS
            const osFresh = await Affiliate.find({
                active: true,
                obraSocial: os,
                cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
                _id: { $nin: setToObjectIds(usedIds) },
                dataSource: { $ne: 'reusable' },
                isUsed: { $ne: true }
            })
                .limit(stillNeeded - fallbackAffiliates.length)
                .sort({ uploadDate: -1 })
                .lean();

            osFresh.forEach(a => {
                a._source = 'fallback_fresh';
                usedIds.add(a._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
            });
            
            fallbackAffiliates.push(...osFresh);
            
            if (fallbackAffiliates.length >= stillNeeded) break;

            // Buscar reutilizables de esta OS
            const osAudits = await Audit.find({
                status: { $in: reusableStatuses },
                $or: [
                    { obraSocialAnterior: os },
                    { obraSocialVendida: os }
                ],
                cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuilsSet) },
                reusableExportedAt: { $exists: false }
            })
                .sort({ scheduledAt: -1 })
                .limit((stillNeeded - fallbackAffiliates.length) * 2)
                .lean();

            const osCuils = osAudits.map(a => a.cuil).filter(Boolean);
            let osAffiliatesBase = [];
            if (osCuils.length > 0) {
                osAffiliatesBase = await Affiliate.find({
                    cuil: { $in: osCuils },
                    _id: { $nin: setToObjectIds(usedIds) }
                }).select('_id cuil localidad edad nombre telefono1 obraSocial').lean();
            }

            const osMap = {};
            osAffiliatesBase.forEach(a => {
                if (a.cuil) osMap[a.cuil] = a;
            });

            for (const audit of osAudits) {
                if (fallbackAffiliates.length >= stillNeeded) break;
                if (!audit.cuil || localReusableCuils.has(audit.cuil) || usedCuilsSet.has(audit.cuil)) continue;

                const baseAffiliate = osMap[audit.cuil];
                usedAuditIds.push(audit._id);
                usedCuilsSet.add(audit.cuil);
                localReusableCuils.add(audit.cuil);

                if (baseAffiliate) {
                    fallbackAffiliates.push({
                        _id: baseAffiliate._id,
                        _affiliateId: baseAffiliate._id,
                        _hasBase: true,
                        _auditId: audit._id,
                        nombre: audit.nombre || baseAffiliate.nombre,
                        cuil: audit.cuil,
                        telefono1: audit.telefono || baseAffiliate.telefono1,
                        obraSocial: os,
                        localidad: baseAffiliate.localidad || 'DESCONOCIDO',
                        edad: baseAffiliate.edad || '',
                        _source: 'fallback_reusable'
                    });
                    usedIds.add(baseAffiliate._id); // ✅ FIX: Sin toString() para compatibilidad ObjectId
                } else {
                    auditsWithoutBase.push(audit);
                    fallbackAffiliates.push({
                        _id: `pending_${audit._id}`,
                        _hasBase: false,
                        _auditId: audit._id,
                        _pendingCreate: true,
                        nombre: audit.nombre || 'Sin nombre',
                        cuil: audit.cuil,
                        telefono1: audit.telefono,
                        obraSocial: os,
                        localidad: 'DESCONOCIDO',
                        edad: '',
                        _source: 'fallback_reusable'
                    });
                }
            }
        }
        
        if (fallbackAffiliates.length > 0) {
            logger.info(`📦 Fallback: ${fallbackAffiliates.length} datos de otras obras sociales`);
        }
    }

    // ========== COMBINAR RESULTADOS ==========
    const combined = [...freshAffiliates, ...reusableAffiliates, ...compensationAffiliates, ...fallbackAffiliates];
    const shuffled = shuffleArray(combined);

    // ========== LOGGING FINAL ==========
    const finalFresh = combined.filter(a => a._source === 'fresh').length;
    const finalReusable = combined.filter(a => a._source === 'reusable').length;
    const finalCompensation = combined.filter(a => a._source?.startsWith('compensation')).length;
    const finalFallback = combined.filter(a => a._source?.startsWith('fallback')).length;

    logger.info(`📊 ========== RESUMEN ${obraSocial} ==========`);
    logger.info(`📊 Solicitado: ${cantidad} | Obtenido: ${shuffled.length}`);
    logger.info(`📊 Composición: Fresh=${finalFresh}, Reusable=${finalReusable}, Compensación=${finalCompensation}, Fallback=${finalFallback}`);
    
    if (shuffled.length < cantidad) {
        logger.warn(`⚠️ NO SE ALCANZÓ EL OBJETIVO: ${shuffled.length}/${cantidad}`);
    } else {
        logger.info(`✅ OBJETIVO ALCANZADO: ${shuffled.length}/${cantidad}`);
    }

    return {
        affiliates: shuffled,
        usedAuditIds,
        auditsWithoutBase,
        usedReusableCuilsInThisCall: localReusableCuils
    };
}

/**
 * Generar archivo XLSX con afiliados
 */
async function generateXLSXFile(supervisor, affiliates, uploadDir) {
    // Enrich with contribution data (trim pagos, last period, padron)
    const contribMap = {};
    const validIds = affiliates
        .filter(a => a._id && mongoose.Types.ObjectId.isValid(String(a._id)))
        .map(a => a._id);
    if (validIds.length) {
        const contribs = await AffiliateContribution.find(
            { affiliateId: { $in: validIds } },
            { affiliateId: 1, lastContributionPeriod: 1, last3ClosedMonthsPaidCount: 1, padron: 1 }
        ).lean();
        for (const c of contribs) { contribMap[String(c.affiliateId)] = c; }
    }

    const formattedData = affiliates.map(aff => {
        const contrib = contribMap[String(aff._id)];
        return {
            nombre: aff.nombre || '-',
            cuil: aff.cuil || '-',
            obraSocial: aff.obraSocial || '-',
            telefono1: aff.telefono1 || '-',
            telefono2: aff.telefono2 || '-',
            localidad: aff.localidad || '-',
            edad: aff.edad || '-',
            trimPagos: contrib?.last3ClosedMonthsPaidCount != null ? contrib.last3ClosedMonthsPaidCount : '-',
            ultimoPeriodo: contrib?.lastContributionPeriod || '-',
            padron: formatPadron(contrib?.padron),
        };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Afiliados');

    worksheet.columns = [
        { header: 'Nombre', key: 'nombre', width: 30 },
        { header: 'CUIL', key: 'cuil', width: 15 },
        { header: 'Obra Social', key: 'obraSocial', width: 25 },
        { header: 'Teléfono 1', key: 'telefono1', width: 15 },
        { header: 'Teléfono 2', key: 'telefono2', width: 15 },
        { header: 'Localidad', key: 'localidad', width: 20 },
        { header: 'Edad', key: 'edad', width: 8 },
        { header: 'Trim. pagos', key: 'trimPagos', width: 12 },
        { header: 'Últ. Período Aporte', key: 'ultimoPeriodo', width: 20 },
        { header: 'Padrón', key: 'padron', width: 18 },
    ];

    formattedData.forEach(row => worksheet.addRow(row));

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };

    const filename = `afiliados_${supervisor._id}_${Date.now()}.xlsx`;
    const filePath = path.join(uploadDir, filename);

    await workbook.xlsx.writeFile(filePath);

    return { filename, filePath, count: affiliates.length };
}

/**
 * Generar y enviar archivos XLSX de afiliados a supervisores
 * ✅ Soporte para envío MASIVO y AVANZADO
 * ✅ Distribución por obra social
 */
async function generateAndSendAffiliateCSVs() {
    try {
        logger.info("🔄 Iniciando generación programada de archivos XLSX de afiliados...");

        const config = await AffiliateExportConfig.findOne({ active: true });

        if (!config) {
            logger.info("⏸️ No hay configuración activa de exportación");
            return;
        }

        // ========== VERIFICAR CANCELACIÓN ==========
        if (config.cancellation?.type === 'indefinite') {
            logger.info("🛑 Exports cancelled indefinitely");
            return;
        }

        if (config.cancellation?.type === 'today' && config.cancellation.skipDate) {
            const skipDate = new Date(config.cancellation.skipDate);
            const today = new Date();
            if (
                skipDate.getDate() === today.getDate() &&
                skipDate.getMonth() === today.getMonth() &&
                skipDate.getFullYear() === today.getFullYear()
            ) {
                logger.info("🛑 Exports cancelled for today - Resetting cancellation");
                config.cancellation.type = 'none';
                config.cancellation.skipDate = null;
                await config.save();
                return;
            }
        }

        // Verificar si es hora de ejecutar
        const now = new Date();
        const [hours, minutes] = config.scheduledTime.split(":");
        const scheduledHour = parseInt(hours);
        const scheduledMinute = parseInt(minutes);

        if (now.getHours() !== scheduledHour || now.getMinutes() !== scheduledMinute) {
            return;
        }

        // Verificar si ya se ejecutó hoy
        if (config.lastExecuted) {
            const lastExecDate = new Date(config.lastExecuted);
            const today = new Date();
            if (
                lastExecDate.getDate() === today.getDate() &&
                lastExecDate.getMonth() === today.getMonth() &&
                lastExecDate.getFullYear() === today.getFullYear()
            ) {
                logger.info("✅ Ya se ejecutó hoy, saltando...");
                return;
            }
        }

        logger.info(`⏰ Ejecutando exportación programada (${config.scheduledTime})`);
        logger.info(`📋 Tipo de envío: ${config.sendType}`);

        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");
        await fs.mkdir(uploadDir, { recursive: true });

        const batchId = `batch_${Date.now()}`;
        const savedFiles = [];
        const usedAffiliateIds = new Set();

        // NOTA: La clasificación de frescos/reutilizables/usados se basa en si el CUIL
        // aparece en Auditorías, NO en campos isUsed/dataSource. Ver leadAssignmentRecycleJob.js

        // Query base para filtros globales
        // exported: { $ne: true } incluye false, null, undefined
        const baseQuery = { active: true, exported: { $ne: true } };
        if (config.filters) {
            if (config.filters.localidad) baseQuery.localidad = config.filters.localidad;
            if (config.filters.minAge || config.filters.maxAge) {
                baseQuery.edad = {};
                if (config.filters.minAge) baseQuery.edad.$gte = config.filters.minAge;
                if (config.filters.maxAge) baseQuery.edad.$lte = config.filters.maxAge;
            }
        }

        // ── TASK 2: Filtro lastContributionPeriod = mes anterior ─────────────
        {
            const now = new Date();
            const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const mm = String(prevMonth.getMonth() + 1).padStart(2, '0');
            const yyyy = prevMonth.getFullYear();
            const prevMonthStr = `${mm}/${yyyy}`;
            logger.info(`📅 Filtro periodo anterior: ${prevMonthStr}`);

            const prevMonthContribs = await AffiliateContribution.find(
                { lastContributionPeriod: prevMonthStr },
                { affiliateId: 1 }
            ).lean();
            const prevMonthIds = prevMonthContribs.map(c => c.affiliateId);
            baseQuery._id = { $in: prevMonthIds };
            logger.info(`📅 Afiliados con periodo anterior (${prevMonthStr}): ${prevMonthIds.length}`);
        }

        // ── Filtro Padrón: excluir afiliados activos en padrón SSSalud ─────
        {
            const foundActiveContribs = await AffiliateContribution.find(
                { "padron.status": "found_active" },
                { affiliateId: 1 }
            ).lean();
            if (foundActiveContribs.length > 0) {
                const foundActiveIds = foundActiveContribs.map(c => c.affiliateId);
                const existingIn = baseQuery._id?.$in;
                if (existingIn) {
                    const excludeSet = new Set(foundActiveIds.map(String));
                    baseQuery._id.$in = existingIn.filter(id => !excludeSet.has(String(id)));
                } else {
                    baseQuery._id = { $nin: foundActiveIds };
                }
                logger.info(`🚫 Excluidos del export ${foundActiveContribs.length} afiliados con padrón activo`);
            }
        }

        // ── TASK 5: Filtro por fecha de carga (createdAt) ────────────────────
        if (config.createdAtFilter && config.createdAtFilter !== 'sin_filtro') {
            const now = new Date();
            switch (config.createdAtFilter) {
                case 'hoy': {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
                    baseQuery.createdAt = { $gte: start };
                    break;
                }
                case 'ultimos_7': {
                    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    baseQuery.createdAt = { $gte: start };
                    break;
                }
                case 'ultimos_30': {
                    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    baseQuery.createdAt = { $gte: start };
                    break;
                }
                case 'mes_actual': {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1);
                    baseQuery.createdAt = { $gte: start };
                    break;
                }
                case 'mes_anterior': {
                    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                    baseQuery.createdAt = { $gte: start, $lte: end };
                    break;
                }
            }
            logger.info(`📅 Filtro fecha carga aplicado: ${config.createdAtFilter}`);
        }

        // ========== ENVÍO MASIVO ==========
        if (config.sendType === "masivo") {
            logger.info("📤 Modo: Envío Masivo");

            const supervisors = await User.find({ role: { $in: ["supervisor", "independiente"] }, active: true }).lean();

            if (supervisors.length === 0) {
                logger.warn("⚠️ No hay supervisores ni independientes activos");
                config.lastExecuted = new Date();
                await config.save();
                return;
            }

            logger.info(`👥 Supervisores e Independientes activos: ${supervisors.length}`);
            
            // ✅ FIX: Set compartido para evitar que supervisores reciban los mismos reutilizables
            const sharedUsedReusableCuils = new Set();

            for (const supervisor of supervisors) {
                // ========== ✅ LIMPIEZA POR SUPERVISOR ==========
                // Antes de asignar nuevos datos, devolver los no utilizados al pool
                const cleanupResult = await cleanupSupervisorUnusedData(supervisor._id, batchId);
                if (cleanupResult.freshReturned > 0 || cleanupResult.reusableReturned > 0) {
                    logger.info(`🧹 ${supervisor.nombre}: Devueltos al pool - ${cleanupResult.freshReturned} frescos, ${cleanupResult.reusableReturned} reutilizables`);
                }

                let affiliates = [];
                let mixResult = null; // Para guardar metadata de mezcla

                // ===== NUEVA LÓGICA: MEZCLA DE DATOS =====
                if (config.dataSourceMix?.enabled) {
                    logger.info(`🎲 Usando mezcla de datos para ${supervisor.nombre}`);
                    mixResult = await getMixedAffiliates(
                        {
                            freshPercentage: config.dataSourceMix.freshPercentage,
                            reusablePercentage: config.dataSourceMix.reusablePercentage
                        },
                        config.affiliatesPerFile,
                        usedAffiliateIds,
                        sharedUsedReusableCuils // ✅ Pasar Set compartido
                    );
                    affiliates = mixResult.affiliates;
                    
                    // ✅ Agregar CUILs usados al Set compartido para el próximo supervisor
                    if (mixResult.usedReusableCuilsInThisCall) {
                        mixResult.usedReusableCuilsInThisCall.forEach(cuil => sharedUsedReusableCuils.add(cuil));
                    }
                }
                // Con distribución de obras sociales (modo antiguo)
                else if (config.obraSocialDistribution && config.obraSocialDistribution.length > 0) {
                    logger.info(`📊 Distribución por OS para ${supervisor.nombre}`);
                    affiliates = await getAffiliatesByDistribution(
                        config.obraSocialDistribution,
                        baseQuery,
                        usedAffiliateIds
                    );
                } else {
                    // Sin distribución: aleatorio (modo antiguo)
                    const query = { ...baseQuery, _id: { $nin: Array.from(usedAffiliateIds) } };
                    affiliates = await Affiliate.find(query)
                        .limit(config.affiliatesPerFile)
                        .sort({ uploadDate: 1 })
                        .lean();

                    affiliates.forEach(aff => usedAffiliateIds.add(aff._id));
                }

                if (affiliates.length === 0) {
                    logger.warn(`⚠️ No hay afiliados disponibles para ${supervisor.nombre}`);
                    continue;
                }

                const fileInfo = await generateXLSXFile(supervisor, affiliates, uploadDir);
                
                // ✅ FIX: Separar IDs por fuente para updateMany diferenciado
                // Solo incluir IDs válidos de Affiliate (no los de Audit)
                const freshIds = affiliates
                    .filter(a => a._source === 'fresh' || !a._source)
                    .map(a => a._id)
                    .filter(id => typeof id !== 'string' || !id.startsWith('audit_'));
                    
                const reusableIds = affiliates
                    .filter(a => a._source === 'reusable' && a._hasBase !== false)
                    .map(a => a._affiliateId || a._id)
                    .filter(id => id && (typeof id !== 'string' || !id.startsWith('audit_')));
                    
                const extraIds = affiliates
                    .filter(a => a._source === 'extra')
                    .map(a => a._id)
                    .filter(id => typeof id !== 'string' || !id.startsWith('audit_'));
                
                savedFiles.push({
                    ...fileInfo,
                    supervisor,
                    affiliates: affiliates.map(a => a._id),
                    freshIds,
                    reusableIds,
                    extraIds,
                    // ✅ Metadata para crear Affiliates y marcar Audits
                    mixResult: mixResult || null
                });

                logger.info(`✅ Archivo generado para ${supervisor.nombre}: ${affiliates.length} afiliados`);
            }
        }

        // ========== ENVÍO AVANZADO ==========
        else if (config.sendType === "avanzado") {
            logger.info("⚙️ Modo: Envío Avanzado");

            if (!config.supervisorConfigs || config.supervisorConfigs.length === 0) {
                logger.warn("⚠️ No hay configuraciones de supervisores");
                config.lastExecuted = new Date();
                await config.save();
                return;
            }
            
            // ✅ FIX: Set compartido para evitar que supervisores reciban los mismos reutilizables
            const sharedUsedReusableCuils = new Set();

            for (const supConfig of config.supervisorConfigs) {
                const supervisor = await User.findById(supConfig.supervisorId).lean();

                if (!supervisor || !supervisor.active) {
                    logger.warn(`⚠️ Supervisor ${supConfig.supervisorId} no encontrado o inactivo`);
                    continue;
                }

                // ========== ✅ LIMPIEZA POR SUPERVISOR ==========
                // Antes de asignar nuevos datos, devolver los no utilizados al pool
                const cleanupResult = await cleanupSupervisorUnusedData(supervisor._id, batchId);
                if (cleanupResult.freshReturned > 0 || cleanupResult.reusableReturned > 0) {
                    logger.info(`🧹 ${supervisor.nombre}: Devueltos al pool - ${cleanupResult.freshReturned} frescos, ${cleanupResult.reusableReturned} reutilizables`);
                }

                let affiliates = [];
                let mixResult = null; // Para guardar metadata de mezcla

                // ===== DISTRIBUCIÓN AVANZADA POR OBRA SOCIAL (NUEVA LÓGICA) =====
                // Usa proporción dinámica fresco/reutilizable basada en stock real
                if (supConfig.obraSocialDistribution && supConfig.obraSocialDistribution.length > 0) {
                    logger.info(`📊 Distribución avanzada para ${supervisor.nombre}`);
                    
                    // Obtener todas las obras sociales para fallback
                    const allObrasSociales = await Affiliate.distinct("obraSocial", {
                        active: true,
                        exported: { $ne: true }
                    });
                    
                    // Procesar cada obra social configurada
                    for (const osConfig of supConfig.obraSocialDistribution) {
                        const osResult = await getAdvancedDistribution(
                            { obraSocial: osConfig.obraSocial, cantidad: osConfig.cantidad },
                            usedAffiliateIds,
                            sharedUsedReusableCuils,
                            allObrasSociales
                        );
                        
                        affiliates.push(...osResult.affiliates);
                        
                        // Agregar CUILs usados al Set compartido
                        if (osResult.usedReusableCuilsInThisCall) {
                            osResult.usedReusableCuilsInThisCall.forEach(cuil => sharedUsedReusableCuils.add(cuil));
                        }
                        
                        // Guardar metadata de mezcla (usar el último)
                        if (!mixResult) {
                            mixResult = { usedAuditIds: [], auditsWithoutBase: [], usedReusableCuilsInThisCall: new Set() };
                        }
                        if (osResult.usedAuditIds) mixResult.usedAuditIds.push(...osResult.usedAuditIds);
                        if (osResult.auditsWithoutBase) mixResult.auditsWithoutBase.push(...osResult.auditsWithoutBase);
                    }
                    
                    logger.info(`📊 Total para ${supervisor.nombre}: ${affiliates.length} afiliados de ${supConfig.obraSocialDistribution.length} obras sociales`);
                }
                // Con mezcla de datos personalizada (porcentaje fijo)
                else if (supConfig.dataSourceMix) {
                    logger.info(`🎲 Usando mezcla personalizada para ${supervisor.nombre}`);
                    mixResult = await getMixedAffiliates(
                        {
                            freshPercentage: supConfig.dataSourceMix.freshPercentage,
                            reusablePercentage: supConfig.dataSourceMix.reusablePercentage
                        },
                        supConfig.affiliatesPerFile,
                        usedAffiliateIds,
                        sharedUsedReusableCuils // ✅ Pasar Set compartido
                    );
                    affiliates = mixResult.affiliates;
                    
                    // ✅ Agregar CUILs usados al Set compartido para el próximo supervisor
                    if (mixResult.usedReusableCuilsInThisCall) {
                        mixResult.usedReusableCuilsInThisCall.forEach(cuil => sharedUsedReusableCuils.add(cuil));
                    }
                } else {
                    // Sin distribución: aleatorio (modo antiguo)
                    const query = { ...baseQuery, _id: { $nin: Array.from(usedAffiliateIds) } };
                    affiliates = await Affiliate.find(query)
                        .limit(supConfig.affiliatesPerFile)
                        .sort({ uploadDate: 1 })
                        .lean();

                    affiliates.forEach(aff => usedAffiliateIds.add(aff._id));
                }

                if (affiliates.length === 0) {
                    logger.warn(`⚠️ No hay afiliados disponibles para ${supervisor.nombre}`);
                    continue;
                }

                const fileInfo = await generateXLSXFile(supervisor, affiliates, uploadDir);
                
                // ✅ FIX: Separar IDs por fuente para updateMany diferenciado
                // Solo incluir IDs válidos de Affiliate (no los de Audit)
                const freshIds = affiliates
                    .filter(a => a._source === 'fresh' || !a._source)
                    .map(a => a._id)
                    .filter(id => typeof id !== 'string' || !id.startsWith('audit_'));
                    
                const reusableIds = affiliates
                    .filter(a => a._source === 'reusable' && a._hasBase !== false)
                    .map(a => a._affiliateId || a._id)
                    .filter(id => id && (typeof id !== 'string' || !id.startsWith('audit_')));
                    
                const extraIds = affiliates
                    .filter(a => a._source === 'extra')
                    .map(a => a._id)
                    .filter(id => typeof id !== 'string' || !id.startsWith('audit_'));
                
                savedFiles.push({
                    ...fileInfo,
                    supervisor,
                    affiliates: affiliates.map(a => a._id),
                    freshIds,
                    reusableIds,
                    extraIds,
                    // ✅ Metadata para crear Affiliates y marcar Audits
                    mixResult: mixResult || null
                });

                logger.info(`✅ Archivo generado para ${supervisor.nombre}: ${affiliates.length} afiliados`);
            }
        }

        if (savedFiles.length === 0) {
            logger.warn("⚠️ No se generaron archivos");
            config.lastExecuted = new Date();
            await config.save();
            return;
        }

        logger.info(`✅ ${savedFiles.length} archivos XLSX generados`);

        // ========== CREAR AFFILIATES NUEVOS Y MARCAR AUDITS ==========
        for (const fileInfo of savedFiles) {
            if (fileInfo.mixResult) {
                const { usedAuditIds, auditsWithoutBase } = fileInfo.mixResult;
                const newAffiliateIds = []; // Mover fuera del if para acceso posterior
                const processedAuditIds = []; // IDs de audits procesadas exitosamente
                
                // 1. Crear Affiliates nuevos para reutilizables sin base
                if (auditsWithoutBase && auditsWithoutBase.length > 0) {
                    
                    for (const audit of auditsWithoutBase) {
                        try {
                            // Verificar si ya existe un Affiliate con este CUIL (unique constraint)
                            const existingAffiliate = await Affiliate.findOne({ cuil: audit.cuil });
                            
                            if (existingAffiliate) {
                                // Ya existe - actualizar en lugar de crear
                                existingAffiliate.exported = true;
                                existingAffiliate.exportedAt = new Date();
                                existingAffiliate.exportedTo = fileInfo.supervisor._id;
                                existingAffiliate.exportBatchId = batchId;
                                existingAffiliate.assignedTo = fileInfo.supervisor._id;
                                existingAffiliate.dataSource = 'reusable';
                                existingAffiliate.leadStatus = 'Asignado';
                                existingAffiliate.assignedAt = new Date();
                                existingAffiliate.active = true;
                                await existingAffiliate.save();
                                newAffiliateIds.push(existingAffiliate._id);
                                processedAuditIds.push(audit._id); // ✅ Marcar como exitoso
                            } else {
                                // No existe - crear nuevo
                                const newAffiliate = new Affiliate({
                                    // Campos requeridos básicos
                                    nombre: audit.nombre || 'Sin nombre',
                                    cuil: audit.cuil,
                                    telefono1: audit.telefono || '0000000000',
                                    obraSocial: audit.obraSocialAnterior || audit.obraSocialVendida || 'Sin especificar',
                                    localidad: 'DESCONOCIDO',
                                    // Campos requeridos de metadata
                                    uploadedBy: fileInfo.supervisor._id,
                                    sourceFile: 'audit_reusable',
                                    batchId: `reusable_${batchId}`,
                                    // Estado
                                    active: true,
                                    // Marcadores especiales para trazabilidad
                                    createdFromAudit: true,
                                    sourceAuditId: audit._id,
                                    // Datos de exportación
                                    exported: true,
                                    exportedAt: new Date(),
                                    exportedTo: fileInfo.supervisor._id,
                                    exportBatchId: batchId,
                                    assignedTo: fileInfo.supervisor._id,
                                    dataSource: 'reusable',
                                    leadStatus: 'Asignado',
                                    assignedAt: new Date()
                                });
                                await newAffiliate.save();
                                newAffiliateIds.push(newAffiliate._id);
                                processedAuditIds.push(audit._id); // ✅ Marcar como exitoso
                            }
                        } catch (err) {
                            logger.warn(`⚠️ No se pudo procesar Affiliate para CUIL ${audit.cuil}: ${err.message}`);
                        }
                    }
                    
                    if (newAffiliateIds.length > 0) {
                        logger.info(`✅ Creados ${newAffiliateIds.length} Affiliates nuevos para ${fileInfo.supervisor.nombre}`);
                        // Agregar a reusableIds para que se cuenten correctamente
                        fileInfo.reusableIds = [...(fileInfo.reusableIds || []), ...newAffiliateIds];
                    }
                }
                
                // 2. Marcar SOLO las Audits que se procesaron exitosamente
                // Combinar: audits sin base que se procesaron + audits con base (siempre exitosas)
                const auditsWithBaseIds = usedAuditIds.filter(id => 
                    !auditsWithoutBase || !auditsWithoutBase.some(a => a._id.toString() === id.toString())
                );
                
                const allSuccessfulAuditIds = [...processedAuditIds, ...auditsWithBaseIds];
                
                if (allSuccessfulAuditIds.length > 0) {
                    await Audit.updateMany(
                        { _id: { $in: allSuccessfulAuditIds } },
                        { 
                            $set: { 
                                reusableExportedAt: new Date(),
                                reusableExportedTo: fileInfo.supervisor._id
                            }
                        }
                    );
                    logger.info(`🔒 Marcadas ${allSuccessfulAuditIds.length} Audits como exportadas para ${fileInfo.supervisor.nombre} (${processedAuditIds.length} sin base + ${auditsWithBaseIds.length} con base)`);
                }
            }
        }

        // Marcar afiliados como exportados Y ASIGNADOS
        // ✅ FIX: Separar updates por fuente para preservar dataSource
        for (const fileInfo of savedFiles) {
            const baseUpdate = {
                exported: true,
                exportedAt: new Date(),
                exportedTo: fileInfo.supervisor._id,
                exportBatchId: batchId,
                assignedTo: fileInfo.supervisor._id,
                leadStatus: 'Asignado',
                assignedAt: new Date()
            };

            // Actualizar FRESCOS
            if (fileInfo.freshIds && fileInfo.freshIds.length > 0) {
                await Affiliate.updateMany(
                    { _id: { $in: fileInfo.freshIds } },
                    { $set: { ...baseUpdate, dataSource: 'fresh' } }
                );
            }

            // Actualizar REUTILIZABLES
            if (fileInfo.reusableIds && fileInfo.reusableIds.length > 0) {
                await Affiliate.updateMany(
                    { _id: { $in: fileInfo.reusableIds } },
                    { $set: { ...baseUpdate, dataSource: 'reusable' } }
                );
            }

            // Actualizar EXTRAS (fallback)
            if (fileInfo.extraIds && fileInfo.extraIds.length > 0) {
                await Affiliate.updateMany(
                    { _id: { $in: fileInfo.extraIds } },
                    { $set: { ...baseUpdate, dataSource: 'extra' } }
                );
            }

            // Fallback: si no hay IDs separados (modo antiguo sin mezcla)
            if (!fileInfo.freshIds && !fileInfo.reusableIds && !fileInfo.extraIds) {
                await Affiliate.updateMany(
                    { _id: { $in: fileInfo.affiliates } },
                    { $set: { ...baseUpdate, dataSource: 'fresh' } }
                );
            }
        }

        // Enviar notificaciones
        // 1. Buscar remitente (Daniel Fandiño)
        let senderUser = await User.findOne({ email: "ing.danielfandino@gmail.com" });
        if (!senderUser) {
            // Fallback a admin si no existe
            const admins = await User.find({ role: "administrativo", active: true }).limit(1);
            senderUser = admins[0];
        }

        if (senderUser) {
            const subject = `📊 Tu Listado de Afiliados - ${new Date().toLocaleDateString("es-AR")}`;
            const io = global.io;
            const summaryLines = [];

            // 2. Notificar a Supervisores
            for (const fileInfo of savedFiles) {
                const content = `¡Hola ${fileInfo.supervisor.nombre}!

Se ha generado tu listado de afiliados programado para hoy y se te han asignado los leads correspondientes.

👥 Afiliados asignados: ${fileInfo.count}
📅 Fecha: ${new Date().toLocaleDateString("es-AR")}

Los datos ya están disponibles en tu sección "Contactar Afiliados" para su gestión y distribución.

🔹 Pasos:
1. Ve a: Contactar Afiliados
2. Selecciona "Administración de datos" para distribuir los leads a tus asesores.

Att. Sistema Dann Salud`;

                const message = new InternalMessage({
                    from: senderUser._id,
                    to: fileInfo.supervisor._id,
                    subject,
                    content,
                    read: false
                });

                await message.save();

                if (io) {
                    io.to(`user_${fileInfo.supervisor._id}`).emit("new_message", {
                        _id: message._id,
                        from: { nombre: senderUser.nombre, email: senderUser.email },
                        subject: message.subject,
                        content: message.content.substring(0, 100) + "...",
                        createdAt: message.createdAt,
                        hasAttachments: false
                    });
                }

                logger.info(`📨 Mensaje enviado a: ${fileInfo.supervisor.nombre}`);
                summaryLines.push(`- ${fileInfo.supervisor.nombre}: ${fileInfo.count} afiliados`);
            }

            // 3. Notificar a Gerencia (Confirmación al remitente)
            const summaryContent = `¡Hola Daniel!

La distribución programada de datos se ha completado exitosamente.

📅 Fecha: ${new Date().toLocaleDateString("es-AR")}
📊 Resumen de asignación:

${summaryLines.join("\n")}

Total distribuido: ${savedFiles.reduce((acc, curr) => acc + curr.count, 0)} afiliados.

Los supervisores han sido notificados y los leads asignados.

Att. Sistema Dann Salud`;

            const summaryMessage = new InternalMessage({
                from: senderUser._id, // De sí mismo
                to: senderUser._id,   // Para sí mismo
                subject: `✅ Resumen de Distribución - ${new Date().toLocaleDateString("es-AR")}`,
                content: summaryContent,
                read: false
            });

            await summaryMessage.save();

            if (io) {
                io.to(`user_${senderUser._id}`).emit("new_message", {
                    _id: summaryMessage._id,
                    from: { nombre: senderUser.nombre, email: senderUser.email },
                    subject: summaryMessage.subject,
                    content: summaryMessage.content.substring(0, 100) + "...",
                    createdAt: summaryMessage.createdAt,
                    hasAttachments: false
                });
            }
        }

        config.lastExecuted = new Date();
        await config.save();

        logger.info(`✅ Exportación completada: ${savedFiles.length} supervisor(es)`);

    } catch (error) {
        logger.error("❌ Error en generación programada:", error);
    }
}

/**
 * Obtener archivos XLSX generados disponibles para descarga
 * @param {Object} user - Usuario que solicita (para filtrar por supervisor)
 */
async function getAvailableExports(user = null) {
    try {
        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");

        try {
            await fs.access(uploadDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(uploadDir);

        // Filtrar archivos XLSX
        const xlsxFiles = files.filter(f => f.endsWith('.xlsx'));

        const filesInfo = await Promise.all(
            xlsxFiles.map(async (filename) => {
                const filePath = path.join(uploadDir, filename);
                const stats = await fs.stat(filePath);

                // Extraer supervisor ID del filename (formato: afiliados_SUPERVISORID_timestamp.xlsx)
                const match = filename.match(/afiliados_([a-f0-9]+)_\d+\.xlsx/);
                const supervisorId = match ? match[1] : null;

                // Obtener nombre del supervisor
                let supervisorName = "Desconocido";
                if (supervisorId) {
                    try {
                        const supervisor = await User.findById(supervisorId).select('nombre').lean();
                        if (supervisor) {
                            supervisorName = supervisor.nombre;
                        }
                    } catch (err) {
                        logger.warn(`No se pudo obtener nombre del supervisor ${supervisorId}`);
                    }
                }

                // Contar afiliados en el archivo
                let affiliateCount = 0;
                try {
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.readFile(filePath);
                    const worksheet = workbook.getWorksheet('Afiliados');
                    if (worksheet) {
                        affiliateCount = worksheet.rowCount - 1; // -1 para excluir header
                    }
                } catch (err) {
                    logger.warn(`No se pudo contar afiliados en ${filename}`);
                }

                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    downloadUrl: `/affiliates/download-export/${filename}`,
                    supervisorId,
                    supervisorName,
                    affiliateCount
                };
            })
        );

        // ✅ Filtrar por supervisor si es necesario
        let filtered = filesInfo;
        if (user && (user.role || '').toLowerCase() === 'supervisor') {
            filtered = filesInfo.filter(f => f.supervisorId === user._id.toString());
        }

        return filtered.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
        logger.error("Error obteniendo exportaciones disponibles:", error);
        return [];
    }
}

module.exports = {
    generateAndSendAffiliateCSVs,
    getAvailableExports
};
