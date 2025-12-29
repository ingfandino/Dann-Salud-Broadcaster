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
const User = require("../models/User");
const InternalMessage = require("../models/InternalMessage");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs").promises;
const ExcelJS = require("exceljs");

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
 * Obtener afiliados mezclados de fuentes frescas y reutilizables
 * ✅ FIX: Con fallback para garantizar cantidad configurada
 * @param {Object} mixConfig - Configuración {freshPercentage, reusablePercentage}
 * @param {Number} totalCount - Total de afiliados necesarios
 * @param {Set} usedIds - IDs de Affiliates ya usados (para evitar duplicados)
 * @param {Set} usedReusableCuils - CUILs de audits ya usadas como reutilizables (para evitar compartir entre supervisores)
 * @returns {Object} { affiliates, usedAuditIds, auditsWithoutBase }
 */
async function getMixedAffiliates(mixConfig, totalCount, usedIds = new Set(), usedReusableCuils = new Set()) {
    try {
        const freshPercentage = mixConfig.freshPercentage || 50;
        const reusablePercentage = mixConfig.reusablePercentage || 50;

        // Calcular cantidades objetivo
        const targetFresh = Math.floor(totalCount * (freshPercentage / 100));
        const targetReusable = totalCount - targetFresh;

        logger.info(`📊 ========== INICIO MEZCLA DE DATOS ==========`);
        logger.info(`📊 Configuración: ${totalCount} total (${freshPercentage}% fresh = ${targetFresh}, ${reusablePercentage}% reusable = ${targetReusable})`);

        // ========== PASO 1: OBTENER DATOS FRESCOS ==========
        // Obtener CUILs que YA están en auditorías
        const auditsWithCuil = await Audit.find({
            cuil: { $exists: true, $ne: null }
        }).distinct('cuil').lean();

        logger.info(`📋 CUILs ya en auditorías: ${auditsWithCuil.length}`);

        // Buscar afiliados cuyo CUIL NO esté en auditorías (datos "frescos")
        // ✅ FIX: Excluir los que fueron marcados como 'reusable' por limpieza
        const freshAffiliates = await Affiliate.find({
            active: true,
            cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
            _id: { $nin: Array.from(usedIds) },
            dataSource: { $ne: 'reusable' },  // ✅ Excluir datos limpiados
            isUsed: { $ne: true }             // ✅ Excluir datos ya usados
        })
            .limit(targetFresh)
            .sort({ uploadDate: -1 })
            .lean();

        // Marcar frescos como _source: 'fresh'
        freshAffiliates.forEach(a => {
            a._source = 'fresh';
            usedIds.add(a._id.toString());
        });

        const freshObtained = freshAffiliates.length;
        logger.info(`✨ Fresh obtenidos: ${freshObtained}/${targetFresh}`);

        // ========== PASO 2: OBTENER DATOS REUTILIZABLES ==========
        // Calcular cuántos reutilizables necesitamos (puede ser más si faltan frescos)
        const reusableNeeded = Math.max(targetReusable, totalCount - freshObtained);

        // Estados para reutilizables (mismos que usa la interfaz "Datos Reutilizables")
        const reusableStatuses = [
            'No atendió', 
            'Tiene dudas', 
            'Reprogramada (falta confirmar hora)'
        ];

        // ✅ FIX: Buscar en Audits (fuente de reutilizables)
        // Excluir: CUILs usados como frescos + CUILs ya usados por otros supervisores + Audits ya exportadas
        const usedCuils = new Set([
            ...freshAffiliates.map(a => a.cuil).filter(Boolean),
            ...Array.from(usedReusableCuils) // ✅ CUILs ya usados por otros supervisores en esta ejecución
        ]);

        const audits = await Audit.find({
            status: { $in: reusableStatuses },
            cuil: { $exists: true, $ne: null, $nin: Array.from(usedCuils) },
            // ✅ SEGURIDAD: Excluir Audits ya exportadas como reutilizables
            reusableExportedAt: { $exists: false }
        })
            .sort({ scheduledAt: -1 }) // Más recientes primero
            .limit(reusableNeeded * 2) // Pedir más porque algunos se filtrarán
            .lean();

        logger.info(`♻️  Audits reutilizables disponibles (no exportadas antes): ${audits.length}`);

        // Obtener datos de Affiliates para los CUILs de auditorías
        const cuilList = audits.map(a => a.cuil).filter(Boolean);
        const affiliatesForReusable = await Affiliate.find({
            cuil: { $in: cuilList },
            _id: { $nin: Array.from(usedIds) }
        }).select('_id cuil localidad edad nombre telefono1 obraSocial').lean();

        logger.info(`♻️  Affiliates base para reutilizables: ${affiliatesForReusable.length}`);

        // Crear mapa para búsqueda rápida
        const affiliateMap = {};
        affiliatesForReusable.forEach(a => {
            if (a.cuil) affiliateMap[a.cuil] = a;
        });

        // Debug: Ver qué CUILs hay en el mapa vs qué CUILs tienen los audits
        const mapCuils = Object.keys(affiliateMap);
        const auditCuils = audits.slice(0, 20).map(a => a.cuil).filter(Boolean);
        const matchingCuils = auditCuils.filter(c => affiliateMap[c]);
        logger.info(`🔍 Debug: Map tiene ${mapCuils.length} CUILs, Audits tienen ${auditCuils.length} CUILs, Coincidencias: ${matchingCuils.length}`);
        if (matchingCuils.length === 0 && mapCuils.length > 0 && auditCuils.length > 0) {
            logger.info(`🔍 Muestra Map CUILs: ${mapCuils.slice(0, 3).join(', ')}`);
            logger.info(`🔍 Muestra Audit CUILs: ${auditCuils.slice(0, 3).join(', ')}`);
        }

        // Normalizar datos reutilizables
        // Guardar IDs de Audits usadas para marcarlas después
        let reusableAffiliates = [];
        const localReusableCuils = new Set();
        const usedAuditIds = []; // ✅ Para marcar Audits como exportadas
        const auditsWithoutBase = []; // ✅ Para crear Affiliates nuevos
        let withBase = 0;
        let withoutBase = 0;

        for (const audit of audits) {
            if (reusableAffiliates.length >= reusableNeeded) break;
            if (!audit.cuil || localReusableCuils.has(audit.cuil)) continue;
            
            const baseAffiliate = affiliateMap[audit.cuil];
            
            // Guardar ID de Audit para marcarla después
            usedAuditIds.push(audit._id);
            
            if (baseAffiliate) {
                // Tiene affiliate base - usar datos combinados
                const affiliateData = {
                    _id: baseAffiliate._id,
                    _hasBase: true,
                    _auditId: audit._id,
                    nombre: audit.nombre || baseAffiliate.nombre,
                    cuil: audit.cuil,
                    telefono1: audit.telefono || baseAffiliate.telefono1,
                    obraSocial: audit.obraSocialAnterior || audit.obraSocialVendida || baseAffiliate.obraSocial || '-',
                    localidad: baseAffiliate.localidad || 'DESCONOCIDO',
                    edad: baseAffiliate.edad || '',
                    _source: 'reusable'
                };
                reusableAffiliates.push(affiliateData);
                usedIds.add(baseAffiliate._id.toString());
                withBase++;
            } else {
                // No tiene affiliate base - guardar para crear después
                auditsWithoutBase.push(audit);
                // Placeholder temporal (se reemplazará con el ID real después de crear)
                reusableAffiliates.push({
                    _id: `pending_${audit._id}`,
                    _hasBase: false,
                    _auditId: audit._id,
                    _pendingCreate: true, // Marcar para crear
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
            
            localReusableCuils.add(audit.cuil);
        }

        logger.info(`♻️  Reutilizables: ${withBase} con base, ${withoutBase} sin base (se crearán)`);
        const reusableObtained = reusableAffiliates.length;
        logger.info(`♻️  Reusable obtenidos: ${reusableObtained}/${reusableNeeded}`);

        // ========== PASO 3: FALLBACK FINAL - COMPLETAR CON CUALQUIER AFILIADO ==========
        const currentTotal = freshObtained + reusableObtained;
        let extraAffiliates = [];

        if (currentTotal < totalCount) {
            const stillNeeded = totalCount - currentTotal;
            logger.warn(`⚠️ DÉFICIT: Faltan ${stillNeeded} afiliados. Buscando extras...`);

            // Buscar cualquier afiliado activo que no se haya usado
            extraAffiliates = await Affiliate.find({
                active: true,
                _id: { $nin: Array.from(usedIds) }
            })
                .limit(stillNeeded)
                .sort({ uploadDate: -1 })
                .lean();

            extraAffiliates.forEach(a => {
                a._source = 'extra';
                usedIds.add(a._id.toString());
            });

            logger.info(`📦 Extras obtenidos (fallback): ${extraAffiliates.length}/${stillNeeded}`);
        }

        // ========== PASO 4: COMBINAR Y MEZCLAR ==========
        const combined = [...freshAffiliates, ...reusableAffiliates, ...extraAffiliates];
        const shuffled = shuffleArray(combined);

        // ========== LOGGING FINAL ==========
        const finalFresh = combined.filter(a => a._source === 'fresh').length;
        const finalReusable = combined.filter(a => a._source === 'reusable').length;
        const finalExtra = combined.filter(a => a._source === 'extra').length;

        logger.info(`📊 ========== RESUMEN FINAL ==========`);
        logger.info(`📊 Objetivo: ${totalCount} | Obtenido: ${shuffled.length}`);
        logger.info(`📊 Composición: Fresh=${finalFresh}, Reusable=${finalReusable}, Extra=${finalExtra}`);
        
        if (shuffled.length < totalCount) {
            logger.warn(`⚠️ NO SE ALCANZÓ EL OBJETIVO: ${shuffled.length}/${totalCount} (${Math.round(shuffled.length/totalCount*100)}%)`);
        } else {
            logger.info(`✅ OBJETIVO ALCANZADO: ${shuffled.length}/${totalCount}`);
        }
        logger.info(`📊 ========================================`);

        // ✅ Retornar objeto con metadata para procesamiento posterior
        return {
            affiliates: shuffled,
            usedAuditIds,        // IDs de Audits a marcar como exportadas
            auditsWithoutBase,   // Datos de Audits para crear Affiliates nuevos
            usedReusableCuilsInThisCall: localReusableCuils // CUILs usados en esta llamada (para compartir entre supervisores)
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
        const query = { ...baseQuery, _id: { $nin: Array.from(usedIds) } };

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
 * Generar archivo XLSX con afiliados
 */
async function generateXLSXFile(supervisor, affiliates, uploadDir) {
    const formattedData = affiliates.map(aff => ({
        telefono: aff.telefono1,
        nombre: aff.nombre,
        cuil: aff.cuil,
        obra_social: aff.obraSocial,
        localidad: aff.localidad
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Afiliados');

    worksheet.columns = [
        { header: 'telefono', key: 'telefono', width: 15 },
        { header: 'nombre', key: 'nombre', width: 30 },
        { header: 'cuil', key: 'cuil', width: 15 },
        { header: 'obra_social', key: 'obra_social', width: 25 },
        { header: 'localidad', key: 'localidad', width: 20 }
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

        // ========== ENVÍO MASIVO ==========
        if (config.sendType === "masivo") {
            logger.info("📤 Modo: Envío Masivo");

            const supervisors = await User.find({ role: "supervisor", active: true }).lean();

            if (supervisors.length === 0) {
                logger.warn("⚠️ No hay supervisores activos");
                config.lastExecuted = new Date();
                await config.save();
                return;
            }

            logger.info(`👥 Supervisores activos: ${supervisors.length}`);
            
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

                // ===== NUEVA LÓGICA: MEZCLA DE DATOS POR SUPERVISOR =====
                if (supConfig.dataSourceMix) {
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
                }
                // Con distribución de obras sociales (modo antiguo)
                else if (supConfig.obraSocialDistribution && supConfig.obraSocialDistribution.length > 0) {
                    logger.info(`📊 Distribución personalizada para ${supervisor.nombre}`);
                    affiliates = await getAffiliatesByDistribution(
                        supConfig.obraSocialDistribution,
                        baseQuery,
                        usedAffiliateIds
                    );
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
