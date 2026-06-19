/**
 * ============================================================
 * CONTRIBUTION SYNC SERVICE
 * ============================================================
 * Orquesta la verificación de aportes para uno o varios afiliados.
 * Interactúa con el scraper y persiste resultados en AffiliateContribution.
 */

const AffiliateContribution = require("../models/AffiliateContribution");
const Affiliate = require("../models/Affiliate");
const { scrapeCuil, scrapeCuilWithSession, BrowserSession, randomDelay } = require("./contributionScraper.service");
const { syncPadronBatch, evaluateNeedsPadronCheck } = require("./padronSync.service");
const { enrichAgeBatch } = require("./dateasBot.service");
const { computeAndUpdateCanSell } = require("../utils/canSellUtils");
const logger = require("../utils/logger").getLogger("arca");
const { resolveFilteredAffiliateIds, classifyArcaCandidate } = require("./affiliateFilter.service");

/**
 * Guarda o actualiza el resultado de verificación para un afiliado.
 *
 * @param {string} affiliateId
 * @param {string} cuil
 * @param {object} scraperResult - resultado de scrapeCuil()
 * @param {object} options - { executionType, executionId, checkedBy }
 */
async function saveResult(affiliateId, cuil, scraperResult, options = {}) {
    const { executionType = "cron", executionId = null, checkedBy = "system" } = options;

    const verificationData = {
        status: scraperResult.status,
        checkedAt: scraperResult.checkedAt,
        checkedBy,
        executionType,
        executionId,
        source: "arca_mis_aportes",
        errorMessage: scraperResult.errorMessage || null,
    };

    await AffiliateContribution.findOneAndUpdate(
        { affiliateId },
        {
            $set: {
                cuil,
                lastContributionPeriod: scraperResult.lastContributionPeriod,
                last3ClosedMonthsPaidCount: scraperResult.last3ClosedMonthsPaidCount ?? null,
                verification: verificationData,
            },
        },
        { upsert: true, new: true }
    );

    // 🔁 RECOMPUTE CanSell after ALL ARCA results (success, no_data, error, captcha, etc.)
    // This ensures the persisted canSell always reflects current reality
    const canSellResult = await computeAndUpdateCanSell(String(affiliateId));
    
    if (!canSellResult.success) {
        logger.error(
            `❌ [CONTRIBUTION-SYNC] CanSell computation failed | affiliateId=${affiliateId} | ` +
            `arcaStatus=${scraperResult.status} | error=${canSellResult.error}`
        );
        // Return the error info so caller can track it
        return { canSellError: canSellResult.error, canSellSuccess: false };
    }
    
    // Return canSell info for tracking
    return { canSell: canSellResult.canSell, canSellSuccess: true };
}

/**
 * Verifica un único afiliado por su ObjectId.
 *
 * @param {string|ObjectId} affiliateId
 * @param {object} options - { executionType, executionId, checkedBy }
 * @returns {Promise<object>} resultado del scraper
 */
async function verifyAffiliate(affiliateId, options = {}) {
    const affiliate = await Affiliate.findById(affiliateId).lean();
    if (!affiliate) {
        logger.warn(`⚠️ [CONTRIBUTION-SYNC] Afiliado no encontrado: ${affiliateId}`);
        return { status: "error", errorMessage: "Afiliado no encontrado" };
    }

    const result = await scrapeCuil(affiliate.cuil, { executionId: options.executionId || "manual" });
    await saveResult(String(affiliateId), affiliate.cuil, result, options);
    return result;
}

/**
 * Verifica una lista de afiliados en secuencia usando una BrowserSession compartida.
 * Aplica delays aleatorios entre cada CUIL y detiene el batch al detectar CAPTCHA.
 *
 * @param {Array<{ _id: string, cuil: string }>} affiliates
 * @param {object} options - { executionType, executionId, checkedBy, minDelayMs, maxDelayMs }
 * @returns {Promise<{ processed: number, success: number, no_data: number, captcha: number, error: number, captchaDetected: boolean, captchaPausedAt: number }>}
 */
async function verifyBatch(affiliates, options = {}) {
    const { minDelayMs = 2000, maxDelayMs = 5000 } = options;
    const stats = { processed: 0, success: 0, no_data: 0, captcha: 0, error: 0, canSellFailures: 0, captchaDetected: false, captchaPausedAt: null };
    const pendingPadronList = [];

    logger.info(`📦 [CONTRIBUTION-SYNC] Batch iniciado | total=${affiliates.length}`);

    let session = null;
    try {
        session = await BrowserSession.create();
        logger.info(`♻️ [CONTRIBUTION-SYNC] Sesión de browser compartida creada`);

        for (let i = 0; i < affiliates.length; i++) {
            const affiliate = affiliates[i];
            if (stats.processed > 0) {
                const delayMs = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
                logger.info(`⏱️ [CONTRIBUTION-SYNC] Delay ${delayMs}ms antes de CUIL ${affiliate.cuil}`);
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }

            try {
                const result = await scrapeCuilWithSession(affiliate.cuil, session, { executionId: options.executionId || "batch" });
                
                // saveResult now returns { canSell, canSellSuccess } or { canSellError, canSellSuccess: false }
                const saveResultInfo = await saveResult(String(affiliate._id), affiliate.cuil, result, options);
                
                stats.processed++;
                stats[result.status] = (stats[result.status] || 0) + 1;
                
                // 🔍 Track CanSell computation failures
                if (saveResultInfo && !saveResultInfo.canSellSuccess) {
                    stats.canSellFailures++;
                    if (typeof options.onCanSellFail === "function") {
                        options.onCanSellFail();
                    }
                }

                if (result.status === "success") {
                    const contrib = await AffiliateContribution.findOne(
                        { affiliateId: String(affiliate._id) },
                        { last3ClosedMonthsPaidCount: 1 }
                    ).lean();
                    if (contrib && contrib.last3ClosedMonthsPaidCount != null && contrib.last3ClosedMonthsPaidCount > 0) {
                        pendingPadronList.push({ _id: affiliate._id, cuil: affiliate.cuil });
                        logger.info(`🔍 [CONTRIBUTION-SYNC] CUIL ${affiliate.cuil} encolado para check de padrón (trim=${contrib.last3ClosedMonthsPaidCount})`);
                    }
                }

                 if (result.status === "captcha") {
                    logger.warn(`⚠️ [CONTRIBUTION-SYNC] CAPTCHA detectado en registro | cuil=${affiliate.cuil} | Continuando con próximo registro...`);
                }
            } catch (err) {
                if (err.name === "ArcaSessionExpiredError" || (err.message && err.message.includes("Session-level Playwright failure"))) {
                    logger.warn(`♻️ [CONTRIBUTION-SYNC] Sesión expirada/cerrada. Reconstruyendo sesión y reintentando CUIL actual...`);
                    try {
                        if (session) await session.close().catch(() => {});
                        session = await BrowserSession.createViaPublicPortal();
                        i--; // Retry the current record
                        continue;
                    } catch (rebuildErr) {
                        logger.error(`❌ [CONTRIBUTION-SYNC] Error fatal reconstruyendo sesión: ${rebuildErr.message}. Abortando batch.`);
                        break;
                    }
                } else {
                    logger.error(`❌ [CONTRIBUTION-SYNC] Error procesando CUIL ${affiliate.cuil}: ${err.message}`);
                    stats.error++;
                    stats.processed++;
                }
            }
            
            if (typeof options.onProgress === "function") {
                await options.onProgress(stats).catch(e => logger.warn(`[CONTRIBUTION-SYNC] onProgress falló: ${e.message}`));
            }
        }
        // Padrón is intentionally NOT called here.
        // The full post-batch pipeline (DATEAS → Padrón) is orchestrated by
        // runArcaTask() after verifyBatch() returns, to preserve the correct order.
        // 
        // Note: canSellFailures are now tracked in stats.canSellFailures for visibility
    } finally {
        if (session) await session.close();
        logger.info(`📦 [CONTRIBUTION-SYNC] Batch finalizado | ${JSON.stringify(stats)}`);
    }

    return stats;
}

/**
 * Obtiene los afiliados candidatos para verificación ARCA, ordenados por prioridad:
 *   Grupo 1 — never_reviewed:    sin AffiliateContribution, o sin verification.checkedAt
 *   Grupo 2 — retryable_failure: verification.status ∈ { pending, captcha, error }
 *   Grupo 3 — stale_terminal:    status ∈ { success, no_data }, checkedAt > ARCA_STALE_AFTER_DAYS días
 * Los registros terminales procesados recientemente (dentro de la ventana) quedan excluidos.
 * no_data y success son TERMINALES: no son retryable inmediatos.
 * Dentro de cada grupo: uploadDate DESC, _id ASC como desempate.
 *
 * @returns {Promise<Array<{ _id: ObjectId, cuil: string, uploadDate: Date }>>}
 */
async function getPendingAffiliates() {
    const now = Date.now();
    const staleDays = parseInt(process.env.ARCA_STALE_AFTER_DAYS || "30", 10);
    const staleMs = staleDays * 24 * 60 * 60 * 1000;

    const [allAffiliates, contributions] = await Promise.all([
        Affiliate.find({ active: true }, { _id: 1, cuil: 1, uploadDate: 1 }).lean(),
        AffiliateContribution.find({}, { affiliateId: 1, "verification.status": 1, "verification.checkedAt": 1 }).lean(),
    ]);

    const contribMap = new Map();
    for (const c of contributions) {
        contribMap.set(String(c.affiliateId), c);
    }

    const groups = { never_reviewed: [], retryable_failure: [], stale_terminal: [] };

    for (const aff of allAffiliates) {
        const contrib = contribMap.get(String(aff._id)) || null;
        const cls = classifyArcaCandidate(contrib, staleMs, now);
        if (!cls.exclude) {
            groups[cls.group].push(aff);
        }
    }

    const sortGroup = (arr) =>
        arr.sort((a, b) => {
            const tDiff = new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
            if (tDiff !== 0) return tDiff;
            return String(a._id) < String(b._id) ? -1 : 1;
        });

    logger.info(
        `📊 [ARCA-PENDING] Candidatos clasificados | ` +
        `never_reviewed=${groups.never_reviewed.length} ` +
        `retryable_failure=${groups.retryable_failure.length} ` +
        `stale_terminal=${groups.stale_terminal.length} ` +
        `stale_days=${staleDays}`
    );

    return [
        ...sortGroup(groups.never_reviewed),
        ...sortGroup(groups.retryable_failure),
        ...sortGroup(groups.stale_terminal),
    ];
}

/**
 * Ejecuta una tarea ArcaAssistedTask completa.
 * Procesa según el modo: single, selected, filtered, pending, byObraSocial
 * 
 * @param {object} task - Documento ArcaAssistedTask
 * @returns {Promise<void>}
 */
async function runArcaTask(task) {
    const ArcaAssistedTask = require("../models/ArcaAssistedTask");
    const taskId = String(task._id);
    
    logger.info(`🚀 [ARCA-TASK] Iniciando tarea ${taskId} | modo: ${task.mode} | limit: ${task.limit || 'todos'}`);
    
    // Actualizar progreso en la tarea
    async function updateProgress(progress) {
        try {
            await ArcaAssistedTask.findByIdAndUpdate(taskId, { $set: { progress } });
        } catch (e) {
            logger.warn(`⚠️ [ARCA-TASK] Error actualizando progreso: ${e.message}`);
        }
    }
    
    // Actualizar estado final
    async function completeTask(status, resultSummary, errorMessage = null) {
        try {
            const update = {
                status,
                completedAt: new Date(),
                resultSummary,
                ...(errorMessage && { errorMessage })
            };
            await ArcaAssistedTask.findByIdAndUpdate(taskId, { $set: update });
        } catch (e) {
            logger.error(`❌ [ARCA-TASK] Error al completar tarea: ${e.message}`);
        }
    }
    
    const resultSummary = { success: 0, captcha: 0, no_data: 0, error: 0, total: 0 };
    
    try {
        let affiliatesToProcess = [];
        const isResuming = task.targetSnapshot && task.targetSnapshot.length > 0;
        
        if (isResuming) {
            logger.info(`🔄 [ARCA-TASK] Resumiendo tarea ${taskId} desde snapshot (total: ${task.targetSnapshot.length})`);
            affiliatesToProcess = task.targetSnapshot.map(s => ({
                _id: s.affiliateId,
                cuil: s.cuil
            }));
        } else {
            // Obtener lista de afiliados según el modo
            switch (task.mode) {
                case "single":
                    if (task.cuil) {
                        const affiliate = await Affiliate.findOne({ cuil: task.cuil }, { _id: 1, cuil: 1 }).lean();
                        if (affiliate) affiliatesToProcess.push(affiliate);
                    }
                    break;
                    
                case "selected":
                    if (task.affiliateIds?.length) {
                        affiliatesToProcess = await Affiliate.find(
                            { _id: { $in: task.affiliateIds } },
                            { _id: 1, cuil: 1 }
                        ).lean();
                    }
                    break;
                    
                case "filtered": {
                    const staleDays = parseInt(process.env.ARCA_STALE_AFTER_DAYS || "30", 10);
                    affiliatesToProcess = await resolveFilteredAffiliateIds(task.filters || {}, {
                        limit:   task.limit > 0 ? task.limit : 0,
                        staleMs: staleDays * 24 * 60 * 60 * 1000,
                        now:     Date.now(),
                    });
                    logger.info(
                        `📊 [ARCA-TASK] filtered | selected=${affiliatesToProcess.length} ` +
                        `(limit=${task.limit || "all"}) | filters=${JSON.stringify(task.filters || {})}`
                    );
                    break;
                }
                    
                case "byObraSocial": {
                    if (task.groups?.length) {
                        const staleDays = parseInt(process.env.ARCA_STALE_AFTER_DAYS || "30", 10);
                        const staleMs   = staleDays * 24 * 60 * 60 * 1000;
                        const now       = Date.now();
                        for (const group of task.groups) {
                            if (!group.obraSocial) continue;
                            const groupCandidates = await resolveFilteredAffiliateIds(
                                { obraSocial: group.obraSocial },
                                { limit: group.limit > 0 ? group.limit : 0, staleMs, now }
                            );
                            logger.info(
                                `📊 [ARCA-TASK] byObraSocial obraSocial="${group.obraSocial}" ` +
                                `selected=${groupCandidates.length} (limit=${group.limit || "all"})`
                            );
                            affiliatesToProcess.push(...groupCandidates);
                        }
                    }
                    break;
                }
                    
                case "pending":
                default:
                    affiliatesToProcess = await getPendingAffiliates();
                    if (task.limit > 0) affiliatesToProcess = affiliatesToProcess.slice(0, task.limit);
                    break;
            }
            
            // Congelar orden determinista y persistir snapshot para resume seguro.
            // pending/filtered/byObraSocial ya vienen pre-ordenados por prioridad ARCA
            // (never_reviewed → retryable_failure → stale_terminal, uploadDate DESC).
            // single/selected no tienen orden de prioridad → ordenar por _id para determinismo.
            if (["single", "selected"].includes(task.mode)) {
                affiliatesToProcess.sort((a, b) => (String(a._id) < String(b._id) ? -1 : 1));
            }
            task.targetSnapshot = affiliatesToProcess.map(a => ({ affiliateId: a._id, cuil: a.cuil }));
            
            await ArcaAssistedTask.updateOne(
                { _id: taskId },
                { $set: { targetSnapshot: task.targetSnapshot } }
            ).catch(e => logger.error(`[ARCA-TASK] No se pudo guardar snapshot de tarea ${taskId} - ${e.message}`));
        }
        
        resultSummary.total = affiliatesToProcess.length;
        
        if (affiliatesToProcess.length === 0) {
            logger.info(`ℹ️ [ARCA-TASK] No hay afiliados para procesar en tarea ${taskId}`);
            await completeTask("completed", resultSummary);
            return;
        }
        
        const offset = task.progress?.processed || 0;
        const pendingAffiliates = affiliatesToProcess.slice(offset);
        
        logger.info(`📋 [ARCA-TASK] Procesando ${pendingAffiliates.length} afiliados (de un total snapshot de ${affiliatesToProcess.length}). offset=${offset}`);
        
        if (!isResuming) {
            // Inicializar progreso
            await updateProgress({
                total: affiliatesToProcess.length,
                processed: 0,
                success: 0,
                captcha: 0,
                no_data: 0,
                error: 0,
                phase: "arca"
            });
        }
        
        // Procesar en batch
        // Track CanSell computation failures
        let canSellFailures = 0;
        
        const batchStats = await verifyBatch(pendingAffiliates, {
            executionType: "assisted_task",
            executionId: taskId,
            checkedBy: task.requestedBy?.toString() || "system",
            minDelayMs: 2000,
            maxDelayMs: 5000,
            onProgress: async (currentStats) => {
                await updateProgress({
                    total: affiliatesToProcess.length,
                    processed: offset + currentStats.processed,
                    success: (task.progress?.success || 0) + currentStats.success,
                    captcha: (task.progress?.captcha || 0) + currentStats.captcha,
                    no_data: (task.progress?.no_data || 0) + currentStats.no_data,
                    error:   (task.progress?.error || 0) + currentStats.error,
                    phase:   "arca",
                    canSellFailures: (task.progress?.canSellFailures || 0) + canSellFailures
                });
            },
            // Track CanSell failures per record
            onCanSellFail: () => { canSellFailures++; }
        });
        
        // Actualizar resumen sumando histórico
        resultSummary.success = (task.progress?.success || 0) + batchStats.success;
        resultSummary.captcha = (task.progress?.captcha || 0) + batchStats.captcha;
        resultSummary.error   = (task.progress?.error || 0) + batchStats.error;
        resultSummary.no_data = (task.progress?.no_data || 0) + batchStats.no_data;
        resultSummary.canSellFailures = (task.progress?.canSellFailures || 0) + canSellFailures;
        
        // Determinar estado final
        const finalStatus = "completed"; // Eliminado whole-batch pause por CAPTCHA

        // ── Post-batch: DATEAS + Padrón (solo si hay éxitos) ──────────────────
        if (resultSummary.success > 0) {
            // Construir lista de afiliados elegibles para Padrón
            const processedIds = pendingAffiliates.map(a => String(a._id)).filter(Boolean);
            let pendingPadronList = [];
            try {
                const contribs = await AffiliateContribution.find(
                    { affiliateId: { $in: processedIds }, "verification.status": "success" },
                    { affiliateId: 1, cuil: 1, last3ClosedMonthsPaidCount: 1, lastContributionPeriod: 1, padron: 1 }
                ).lean();
                for (const c of contribs) {
                    if (evaluateNeedsPadronCheck(c.last3ClosedMonthsPaidCount)) {
                        const aff = pendingAffiliates.find(a => String(a._id) === String(c.affiliateId));
                        if (aff) pendingPadronList.push({ _id: aff._id, cuil: aff.cuil || c.cuil });
                    }
                }
            } catch (listErr) {
                logger.error(`❌ [ARCA-TASK] Error construyendo lista de padrón: ${listErr.message}`);
            }

            if (pendingPadronList.length > 0) {
                // ── Fase DATEAS: enriquecer edad (no bloqueante) ──────────────
                logger.info(`🌐 [ARCA-TASK] Iniciando enriquecimiento DATEAS para ${pendingPadronList.length} afiliado(s)...`);
                await updateProgress({
                    total:     affiliatesToProcess.length,
                    processed: resultSummary.success + resultSummary.captcha + resultSummary.error + resultSummary.no_data,
                    success:   resultSummary.success,
                    captcha:   resultSummary.captcha,
                    no_data:   resultSummary.no_data,
                    error:     resultSummary.error,
                    phase:     "dateas"
                });
                try {
                    const dateasStats = await enrichAgeBatch(pendingPadronList);
                    logger.info(`✅ [ARCA-TASK] DATEAS completado | enriquecidos=${dateasStats.enriched} omitidos=${dateasStats.skipped} errores=${dateasStats.errors}`);
                } catch (dateasErr) {
                    logger.warn(`⚠️ [ARCA-TASK] DATEAS falló (Padrón continuará igualmente): ${dateasErr.message}`);
                }

                // ── Fase Padrón ───────────────────────────────────────────────
                logger.info(`🔍 [ARCA-TASK] Iniciando check de padrón para ${pendingPadronList.length} afiliado(s)...`);
                await updateProgress({
                    total:     affiliatesToProcess.length,
                    processed: resultSummary.success + resultSummary.captcha + resultSummary.error + resultSummary.no_data,
                    success:   resultSummary.success,
                    captcha:   resultSummary.captcha,
                    no_data:   resultSummary.no_data,
                    error:     resultSummary.error,
                    phase:     "padron"
                });
                try {
                    await syncPadronBatch(pendingPadronList);
                    logger.info(`✅ [ARCA-TASK] Check de padrón completado`);
                } catch (padronErr) {
                    logger.error(`❌ [ARCA-TASK] Error en sincronización de padrón: ${padronErr.message}`);
                }
            } else {
                logger.info(`ℹ️ [ARCA-TASK] Ningún afiliado requiere check de padrón en esta tarea`);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        logger.info(`✅ [ARCA-TASK] Tarea ${taskId} completada | Éxitos: ${resultSummary.success}, CAPTCHA: ${resultSummary.captcha}, Errores: ${resultSummary.error}`);

        await completeTask(finalStatus, resultSummary);
        
    } catch (error) {
        logger.error(`❌ [ARCA-TASK] Error fatal en tarea ${taskId}: ${error.message}`);
        await completeTask("error", resultSummary, error.message);
    }
}

module.exports = { verifyAffiliate, verifyBatch, getPendingAffiliates, saveResult, runArcaTask };
