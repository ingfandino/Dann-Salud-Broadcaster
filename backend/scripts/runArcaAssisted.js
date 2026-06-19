const path = require("path");
const fs   = require("fs");
const { execSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

// ── Playwright auto-install ───────────────────────────────────────
;(function ensurePlaywright() {
    try {
        const { chromium } = require("playwright");
        const execPath = chromium.executablePath();
        if (!fs.existsSync(execPath)) {
            console.log(`[${new Date().toISOString()}] ⚠️  Chromium no encontrado. Instalando...`);
            execSync("npx playwright install chromium", {
                stdio: "inherit",
                cwd: path.join(__dirname, ".."),
                env: { ...process.env },
            });
            console.log(`[${new Date().toISOString()}] ✅ Chromium instalado`);
        }
    } catch (e) {
        console.error(`[${new Date().toISOString()}] ERROR: No se pudo instalar Playwright: ${e.message}`);
        process.exit(1);
    }
}());

const mongoose = require("mongoose");
const parseArgs = require("minimist");
const connectDB = require("../src/config/db");
const Affiliate = require("../src/models/Affiliate");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const ArcaAssistedTask = require("../src/models/ArcaAssistedTask");
const { BrowserSession, scrapeCuilWithSession, ArcaSessionExpiredError } = require("../src/services/contributionScraper.service");
const { buildAffiliateBatch } = require("../src/services/affiliateBatchService");
const { evaluateNeedsPadronCheck, syncPadronBatch } = require("../src/services/padronSync.service");
const { enrichAgeBatch } = require("../src/services/dateasBot.service");

// Helper to log with timestamp
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const logErr = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

// ── Session-health helpers ────────────────────────────────────────────────────

/** Patterns that indicate the shared Playwright browser/page/context has died. */
const SESSION_CLOSED_PATTERNS = [
    "target page, context or browser has been closed",
    "target closed",
    "browser has been closed",
    "context closed",
    "page closed",
    "has been closed",
];

/** Returns true when the error is a session-level (browser/context/page) closure. */
function isSessionClosedError(err) {
    if (!err || !err.message) return false;
    const msg = err.message.toLowerCase();
    return SESSION_CLOSED_PATTERNS.some(p => msg.includes(p));
}

/**
 * Closes the stale session safely and creates a fresh BrowserSession.
 * Throws if the new session cannot be created.
 */
async function rebuildSession(oldSession) {
    log(`🔄 [ARCA-SESSION] Recreating browser session...`);
    if (oldSession) {
        try { await oldSession.close(); } catch (_) { /* already dead — ignore */ }
    }
    const fresh = await BrowserSession.create();
    log(`✅ [ARCA-SESSION] Session rebuilt successfully`);
    return fresh;
}

/**
 * Returns true only when the session and its underlying Playwright objects are
 * still open and usable. Never throws — safe to call at any time.
 *
 * Note: BrowserSession uses launchPersistentContext, so context.browser()
 * returns null and must NOT be used for health checks.
 */
function isSessionUsable(session) {
    if (!session) return false;
    try {
        // 1. Page must exist and be open
        const pg = session.page;
        if (!pg || pg.isClosed()) return false;
        // 2. Context must exist and respond to a synchronous call
        const ctx = session.context;
        if (!ctx) return false;
        // context.pages() is synchronous and throws if the context is closed
        ctx.pages();
        return true;
    } catch (_) {
        return false;
    }
}

/** Persists an affiliate-level error to DB without throwing. */
async function persistError(affiliateId, cuil, errorMessage) {
    if (!affiliateId) return;
    try {
        await AffiliateContribution.findOneAndUpdate(
            { affiliateId },
            { $set: { cuil, verification: { status: "error", checkedAt: new Date(), errorMessage: errorMessage || "Error desconocido" } } },
            { upsert: true }
        );
    } catch (dbErr) {
        logErr(`DB save failed for CUIL ${cuil}: ${dbErr.message}`);
    }
}

async function processCuil(cuil, affiliateId, session) {
    log(`--------------------------------------------------`);
    log(`Processing CUIL: ${cuil} (Affiliate: ${affiliateId || 'none'})`);

    // ── Scrape (isolated) ─────────────────────────────────────────────────────
    let result;
    try {
        result = await scrapeCuilWithSession(cuil, session, { executionId: "manual-assisted", assistedMode: true });
    } catch (scrapeErr) {
        // Session-closed and ARCA session-expired errors must bubble up to the loop.
        // All other scrape errors are handled here as normal per-record failures.
        if (isSessionClosedError(scrapeErr)) throw scrapeErr;
        if (scrapeErr instanceof ArcaSessionExpiredError) throw scrapeErr;
        logErr(`Scrape threw for CUIL ${cuil}: ${scrapeErr.message}`);
        result = {
            status: "error",
            lastContributionPeriod: null,
            errorMessage: scrapeErr.message || "Error inesperado en scraping",
        };
    }

    log(`Result for ${cuil}: ${result.status} ${result.lastContributionPeriod ? `(Period: ${result.lastContributionPeriod})` : ''} | last3ClosedMonthsPaidCount=${result.last3ClosedMonthsPaidCount ?? 'null'}`);

    // ── Persist (isolated — DB failure must NOT stop the batch) ───────────────
    if (affiliateId) {
        try {
            console.log(`[TRIM-PAGOS] saving for ${cuil}: last3ClosedMonthsPaidCount=${result.last3ClosedMonthsPaidCount ?? 'null'}`);
            await AffiliateContribution.findOneAndUpdate(
                { affiliateId: affiliateId },
                {
                    $set: {
                        cuil: cuil,
                        lastContributionPeriod: result.lastContributionPeriod,
                        last3ClosedMonthsPaidCount: result.last3ClosedMonthsPaidCount ?? null,
                        verification: {
                            status: result.status,
                            checkedAt: new Date(),
                            errorMessage: result.errorMessage || null,
                        },
                        rawResponse: result.rawResponse || null,
                    }
                },
                { upsert: true, new: true }
            );
            log(`Saved result to database for affiliate ${affiliateId}`);
        } catch (dbErr) {
            logErr(`DB save failed for CUIL ${cuil} (result: ${result.status}): ${dbErr.message}`);
        }
    } else {
        log(`No affiliate ID provided, result not saved to DB.`);
    }

    return result.status;
}

async function runTask(task, session) {
    log(`--------------------------------------------------`);
    log(`Starting Task: ${task._id} | Mode: ${task.mode}`);
    
    // Update task status to running
    await ArcaAssistedTask.findByIdAndUpdate(task._id, { status: "running", startedAt: new Date() });
    
    let affiliatesToProcess = [];
    
    // 0 or falsy limit → process all matching records (no cap)
    const effectiveLimit = (task.limit && task.limit > 0) ? task.limit : null;

    if (task.mode === "single" && task.cuil) {
        const affiliate = await Affiliate.findOne({ cuil: task.cuil }).lean();
        if (affiliate) {
            affiliatesToProcess.push(affiliate);
        } else {
            log(`Warning: CUIL ${task.cuil} not found in DB. Will process anyway.`);
            affiliatesToProcess.push({ _id: null, cuil: task.cuil });
        }
    } else if (task.mode === "selected" && task.affiliateIds && task.affiliateIds.length > 0) {
        affiliatesToProcess = await Affiliate.find({ _id: { $in: task.affiliateIds } }).lean();
        if (effectiveLimit) affiliatesToProcess = affiliatesToProcess.slice(0, effectiveLimit);
    } else if (task.mode === "byObraSocial") {
        const groups = task.groups || [];
        log(`[ARCA-BY-OS] groups received: ${JSON.stringify(groups)}`);
        if (groups.length === 0) {
            log(`[ARCA-BY-OS] No groups defined — skipping task`);
        } else {
            affiliatesToProcess = await buildAffiliateBatch({
                mode: "byObraSocial",
                groups,
                limit: 0,
            });
            log(`[ARCA-BY-OS] Total affiliates matched across all groups: ${affiliatesToProcess.length}`);
        }
        if (effectiveLimit) affiliatesToProcess = affiliatesToProcess.slice(0, effectiveLimit);
    } else if (task.mode === "filtered") {
        log(`[ARCA-FILTERED] filters: ${JSON.stringify(task.filters)}`);
        affiliatesToProcess = await buildAffiliateBatch({
            mode: "filtered",
            filters: task.filters || {},
            limit: effectiveLimit || 0,
        });
        log(`[ARCA-FILTERED] Matched ${affiliatesToProcess.length} affiliates`);
    } else if (task.mode === "pending") {
        const pipeline = [
            {
                $lookup: {
                    from: "affiliatecontributions",
                    localField: "_id",
                    foreignField: "affiliateId",
                    as: "contribution"
                }
            },
            {
                $unwind: {
                    path: "$contribution",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    $or: [
                        { contribution: { $exists: false } },
                        { "contribution.verification.status": "pending" },
                        { "contribution.verification.status": "error" }
                    ]
                }
            },
            { $project: { _id: 1, cuil: 1, nombre: 1 } }
        ];
        if (effectiveLimit) pipeline.push({ $limit: effectiveLimit });
        affiliatesToProcess = await Affiliate.aggregate(pipeline);
    }
    
    log(`Found ${affiliatesToProcess.length} affiliates to process for task.`);
    
    if (affiliatesToProcess.length === 0) {
        await ArcaAssistedTask.findByIdAndUpdate(task._id, { 
            status: "completed", 
            completedAt: new Date(),
            errorMessage: "No affiliates to process" 
        });
        return;
    }
    
    const stats = { success: 0, captcha: 0, no_data: 0, not_found: 0, error: 0, total: 0 };
    // Mutable local reference — may be replaced if the session dies mid-batch
    let currentSession = session;

    // ── Live progress initialisation (fire-and-forget) ─────────────────────
    ArcaAssistedTask.findByIdAndUpdate(task._id, {
        $set: { "progress.total": affiliatesToProcess.length, "progress.phase": "arca",
                "progress.processed": 0, "progress.success": 0, "progress.captcha": 0, "progress.error": 0 }
    }).catch(() => {});

    for (const [index, affiliate] of affiliatesToProcess.entries()) {
        log(`[Task ${task._id}] [${index + 1}/${affiliatesToProcess.length}] Processing ${affiliate.cuil}...`);

        // ── Per-record isolation with session self-healing ────────────────────
        let status;
        try {
            status = await processCuil(affiliate.cuil, affiliate._id, currentSession);
        } catch (perRecordErr) {
            if (perRecordErr instanceof ArcaSessionExpiredError) {
                // ── ARCA web session expired: close browser, restart via public portal ──
                // Only triggered for true application-session expiry (not browser crashes).
                // Resumes with the remaining pending records; no restart from scratch.
                log(`⚠️ [ARCA-SESSION] ARCA web session expired. Restarting via main portal (https://www.afip.gob.ar/aportesenlinea/)...`);
                try {
                    try { await currentSession.close(); } catch (_) {}
                    log(`🔄 [ARCA-SESSION] Closing browser and reopening through public portal`);
                    currentSession = await BrowserSession.createViaPublicPortal();
                    log(`� [ARCA-SESSION] Retrying current affiliate after recovery`);
                    log(`�🔁 [ARCA-RUNNER] Retrying ${affiliate.cuil} after portal restart`);
                    try {
                        status = await processCuil(affiliate.cuil, affiliate._id, currentSession);
                    } catch (retryErr) {
                        log(`❌ [ARCA-SESSION] Recovery retry failed for current affiliate`);
                        logErr(`CUIL ${affiliate.cuil} failed after portal restart: ${retryErr.message}`);
                        await persistError(affiliate._id, affiliate.cuil, `Error tras reinicio de portal: ${retryErr.message}`);
                        status = "error";
                    }
                } catch (restartErr) {
                    logErr(`❌ [ARCA-SESSION] Portal restart failed: ${restartErr.message}. Saving affiliate as error.`);
                    await persistError(affiliate._id, affiliate.cuil, `Portal restart failed: ${restartErr.message}`);
                    status = "error";
                }
            } else if (isSessionClosedError(perRecordErr)) {
                // ── Session-level failure: rebuild and retry this affiliate once ──
                log(`⚠️ [ARCA-SESSION] Shared session appears closed. Rebuilding before retry...`);
                try {
                    currentSession = await rebuildSession(currentSession);
                    log(`🔁 [ARCA-RUNNER] Retrying ${affiliate.cuil} after session rebuild`);
                    try {
                        status = await processCuil(affiliate.cuil, affiliate._id, currentSession);
                    } catch (retryErr) {
                        logErr(`CUIL ${affiliate.cuil} failed even after session rebuild: ${retryErr.message}`);
                        await persistError(affiliate._id, affiliate.cuil, retryErr.message || "Error tras reconstrucción de sesión");
                        status = "error";
                    }
                } catch (rebuildErr) {
                    logErr(`❌ [ARCA-SESSION] Session rebuild failed: ${rebuildErr.message}. Saving affiliate as error.`);
                    await persistError(affiliate._id, affiliate.cuil, `Sesión irrecuperable: ${perRecordErr.message}`);
                    status = "error";
                }
            } else {
                // ── Normal per-record failure ─────────────────────────────────
                logErr(`Unhandled per-record error for CUIL ${affiliate.cuil}: ${perRecordErr.message}. Saving as error and continuing.`);
                await persistError(affiliate._id, affiliate.cuil, perRecordErr.message || "Error no manejado");
                status = "error";
            }
        }

        stats.total++;
        if (stats[status] !== undefined) {
            stats[status]++;
        } else {
            stats.error++;
        }

        // ── Live progress increment (fire-and-forget) ─────────────────────────
        ;(() => {
            const inc = { "progress.processed": 1 };
            const tracked = ["success", "captcha", "error"];
            const s = tracked.includes(status) ? status : (status === "not_found" || status === "no_data" ? null : "error");
            if (s) inc[`progress.${s}`] = 1;
            ArcaAssistedTask.findByIdAndUpdate(task._id, { $inc: inc }).catch(() => {});
        })();

        if (status === "captcha") {
            log(`[Task ${task._id}] CUIL ${affiliate.cuil} → captcha timeout. Record saved, continuing with next affiliate...`);
        }
        if (status === "not_found") {
            log(`[Task ${task._id}] CUIL ${affiliate.cuil} → not_found (no activo en ARCA). Record saved, continuing.`);
        }

        // Wait a bit between requests if there are more
        if (index < affiliatesToProcess.length - 1) {
            const delay = Math.floor(Math.random() * 3000) + 2000;
            log(`Waiting ${delay}ms before next...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    // ── Padrón sync para afiliados exitosos ─────────────────────────────────
    if (stats.success > 0) {
        const forcePadron = task.mode === "selected";
        log(`🔍 [ARCA-WATCH] Evaluando afiliados para check de padrón (${stats.success} éxitos${forcePadron ? ', modo FORZADO' : ''})...`);
        const pendingPadronList = [];
        try {
            const processedIds = affiliatesToProcess.map(a => String(a._id)).filter(Boolean);
            const contribs = await AffiliateContribution.find(
                { affiliateId: { $in: processedIds }, "verification.status": "success" },
                { affiliateId: 1, cuil: 1, last3ClosedMonthsPaidCount: 1, lastContributionPeriod: 1, padron: 1 }
            ).lean();
            for (const c of contribs) {
                if (forcePadron || evaluateNeedsPadronCheck(c.last3ClosedMonthsPaidCount, c.lastContributionPeriod, c.padron)) {
                    const aff = affiliatesToProcess.find(a => String(a._id) === String(c.affiliateId));
                    if (aff) pendingPadronList.push({ _id: aff._id, cuil: aff.cuil || c.cuil });
                }
            }
            if (pendingPadronList.length > 0) {
                // ── DATEAS phase: enrich affiliate ages (age-only, non-blocking) ──────
                log(`🌐 [ARCA-WATCH] Iniciando enriquecimiento de edad DATEAS para ${pendingPadronList.length} afiliado(s)...`);
                ArcaAssistedTask.findByIdAndUpdate(task._id, { $set: { "progress.phase": "dateas" } }).catch(() => {});
                try {
                    const dateasStats = await enrichAgeBatch(pendingPadronList);
                    log(`✅ [ARCA-WATCH] DATEAS completado | enriquecidos=${dateasStats.enriched} omitidos=${dateasStats.skipped} errores=${dateasStats.errors}`);
                } catch (dateasErr) {
                    log(`⚠️ [ARCA-WATCH] DATEAS falló (Padrón continuará igualmente): ${dateasErr.message}`);
                }

                // ── Padron phase ──────────────────────────────────────────────────────
                log(`🔍 [ARCA-WATCH] Iniciando check de padrón para ${pendingPadronList.length} afiliado(s)...`);
                ArcaAssistedTask.findByIdAndUpdate(task._id, { $set: { "progress.phase": "padron" } }).catch(() => {});
                await syncPadronBatch(pendingPadronList);
                log(`✅ [ARCA-WATCH] Check de padrón completado`);
            } else {
                log(`ℹ️ [ARCA-WATCH] Ningún afiliado requiere check de padrón en este momento`);
            }
        } catch (padronErr) {
            log(`❌ [ARCA-WATCH] Error en sincronización de padrón: ${padronErr.message}`);
        }
    }

    // Task always completes after iterating through all affiliates
    await ArcaAssistedTask.findByIdAndUpdate(task._id, {
        status: "completed",
        completedAt: new Date(),
        resultSummary: stats
    });

    log(`Task ${task._id} finished. Stats: success=${stats.success} no_data=${stats.no_data} not_found=${stats.not_found} captcha=${stats.captcha} error=${stats.error} total=${stats.total}`);

    // Return the (potentially rebuilt) session so the watch loop can reuse it
    return currentSession;
}

async function watchMode() {
    log(`Starting ARCA Assisted Watch Mode...`);

    // ── Queue-consumer guard ───────────────────────────────────────────────────
    // runArcaAssisted.js --watch must NOT compete with pm2 arca-worker for tasks
    // during normal operation. Set ARCA_WATCH_ENABLED=true explicitly to re-enable
    // queue consumption (manual override / debug only).
    if (process.env.ARCA_WATCH_ENABLED !== "true") {
        log(`⛔ [ARCA-WATCH] Queue consumption disabled.`);
        log(`   pm2 arca-worker is the designated executor for ArcaAssistedTask.`);
        log(`   Set ARCA_WATCH_ENABLED=true to re-enable this watcher (debug/override only).`);
        return;
    }

    log(`⚠️  [ARCA-WATCH] ARCA_WATCH_ENABLED=true — this instance will compete with pm2 arca-worker for tasks.`);
    log(`Polling MongoDB for pending tasks...`);

    // Connect DB
    await connectDB();

    // Force headful
    process.env.PLAYWRIGHT_HEADLESS = "false";
    
    // session is ALWAYS null at the start of each task iteration (Option A: always-fresh).
    // This prevents any stale/dead session reference from poisoning the next queued task.
    let session = null;

    /** Closes and discards the current session safely, then resets to null. */
    async function closeAndResetSession() {
        if (!session) return;
        log(`🔒 [ARCA-WATCH] Closing task session after task completion`);
        try { await session.close(); } catch (_) { /* already dead — ignore */ }
        session = null;
        log(`🟢 [ARCA-WATCH] Session reset complete`);
    }

    try {
        while (true) {
            // Find a pending task
            const pendingTask = await ArcaAssistedTask.findOneAndUpdate(
                { status: "pending" },
                { status: "running", startedAt: new Date() },
                { sort: { requestedAt: 1 }, new: true }
            );

            if (pendingTask) {
                log(`Found pending task: ${pendingTask._id}.`);

                // ── Option A: always start with a fresh session per task ────────────
                // Even if a session somehow survived from a previous iteration,
                // dispose it before creating the new one.
                if (session) {
                    log(`🧹 [ARCA-WATCH] Discarding stale session before starting task`);
                    await closeAndResetSession();
                }

                log(`♻️ [ARCA-WATCH] Creating fresh browser session for new task`);
                try {
                    session = await BrowserSession.create();
                    log(`✅ [ARCA-WATCH] Fresh session ready`);
                } catch (sessionCreateErr) {
                    logErr(`Failed to create browser session for task ${pendingTask._id}: ${sessionCreateErr.message}`);
                    // Mark the task as failed so it isn't stuck in 'running'
                    await ArcaAssistedTask.findByIdAndUpdate(pendingTask._id, {
                        status: "error",
                        completedAt: new Date(),
                        errorMessage: `No se pudo crear la sesión del navegador: ${sessionCreateErr.message}`,
                    });
                    await new Promise(r => setTimeout(r, 5000));
                    continue;
                }

                // runTask returns the (potentially intra-task-rebuilt) session.
                // We always discard it immediately after the task finishes.
                session = await runTask(pendingTask, session);

                // ── Always close and null the session after each task ──────────────
                // This is the key guard: no stale reference survives task boundaries.
                await closeAndResetSession();

                log(`Task ${pendingTask._id} handled. Waiting a moment before next check...`);
                await new Promise(r => setTimeout(r, 5000));
            } else {
                // No pending task — session is always null here (closed after the last task).
                await new Promise(r => setTimeout(r, 10000));
            }
        }
    } catch (err) {
        logErr(`Watch loop error: ${err.stack}`);
    } finally {
        // Defensive close in case the catch path left a session open
        await closeAndResetSession();
        await mongoose.disconnect();
    }
}

async function run() {
    log(`Starting ARCA Assisted Execution...`);
    
    // Parse CLI args
    const argv = parseArgs(process.argv.slice(2));
    const isWatch = argv.watch === true;
    const cuilArg = argv.cuil ? String(argv.cuil) : null;
    const mode = argv.mode;
    const limit = parseInt(argv.limit, 10) || 1;
    
    if (isWatch) {
        return await watchMode();
    }
    
    if (!cuilArg && mode !== "pending") {
        logErr("You must provide either --cuil <number> or --mode pending");
        process.exit(1);
    }

    // Connect DB
    await connectDB();

    let affiliatesToProcess = [];
    // 0 or not provided → no limit (process all matching)
    const effectiveLimit = (limit && limit > 0) ? limit : null;

    if (cuilArg) {
        log(`Mode: Single CUIL`);
        const affiliate = await Affiliate.findOne({ cuil: cuilArg }).lean();
        if (affiliate) {
            affiliatesToProcess.push(affiliate);
        } else {
            log(`Warning: CUIL ${cuilArg} not found in database. Will process anyway without saving.`);
            affiliatesToProcess.push({ _id: null, cuil: cuilArg });
        }
    } else if (mode === "pending") {
        log(`Mode: Pending (Limit: ${effectiveLimit ?? "todos"})`);

        // Find affiliates without contribution records or with pending status
        const pipeline = [
            {
                $lookup: {
                    from: "affiliatecontributions",
                    localField: "_id",
                    foreignField: "affiliateId",
                    as: "contribution"
                }
            },
            {
                $unwind: {
                    path: "$contribution",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    $or: [
                        { contribution: { $exists: false } },
                        { "contribution.verification.status": "pending" },
                        { "contribution.verification.status": "error" }
                    ]
                }
            },
            { $project: { _id: 1, cuil: 1, nombre: 1 } }
        ];
        if (effectiveLimit) pipeline.push({ $limit: effectiveLimit });

        affiliatesToProcess = await Affiliate.aggregate(pipeline);
        log(`Found ${affiliatesToProcess.length} pending affiliates.`);
    }
    
    if (affiliatesToProcess.length === 0) {
        log(`No affiliates to process. Exiting.`);
        process.exit(0);
    }
    
    // Ensure headful mode is forced
    process.env.PLAYWRIGHT_HEADLESS = "false";
    
    log(`Initializing Playwright session (visible browser)...`);
    // let so it can be replaced mid-batch on session death
    let session = await BrowserSession.create();

    const stats = { success: 0, captcha: 0, no_data: 0, not_found: 0, error: 0, total: 0 };

    try {
        for (const [index, affiliate] of affiliatesToProcess.entries()) {
            log(`[${index + 1}/${affiliatesToProcess.length}] --------------------------------`);

            // ── Per-record isolation with session self-healing ───────────────────
            let status;
            try {
                status = await processCuil(affiliate.cuil, affiliate._id, session);
            } catch (perRecordErr) {
                if (perRecordErr instanceof ArcaSessionExpiredError) {
                    log(`⚠️ [ARCA-SESSION] ARCA web session expired. Restarting via main portal...`);
                    try {
                        try { await session.close(); } catch (_) {}
                        log(`🔄 [ARCA-SESSION] Closing browser and reopening through public portal`);
                        session = await BrowserSession.createViaPublicPortal();
                        log(`� [ARCA-SESSION] Retrying current affiliate after recovery`);
                        log(`�🔁 [ARCA-RUNNER] Retrying ${affiliate.cuil} after portal restart`);
                        try {
                            status = await processCuil(affiliate.cuil, affiliate._id, session);
                        } catch (retryErr) {
                            log(`❌ [ARCA-SESSION] Recovery retry failed for current affiliate`);
                            logErr(`CUIL ${affiliate.cuil} failed after portal restart: ${retryErr.message}`);
                            await persistError(affiliate._id, affiliate.cuil, `Error tras reinicio de portal: ${retryErr.message}`);
                            status = "error";
                        }
                    } catch (restartErr) {
                        logErr(`❌ [ARCA-SESSION] Portal restart failed: ${restartErr.message}. Saving affiliate as error.`);
                        await persistError(affiliate._id, affiliate.cuil, `Portal restart failed: ${restartErr.message}`);
                        status = "error";
                    }
                } else if (isSessionClosedError(perRecordErr)) {
                    // ── Session-level failure: rebuild and retry once ───────────
                    log(`⚠️ [ARCA-SESSION] Shared session appears closed. Rebuilding before retry...`);
                    try {
                        session = await rebuildSession(session);
                        log(`🔁 [ARCA-RUNNER] Retrying ${affiliate.cuil} after session rebuild`);
                        try {
                            status = await processCuil(affiliate.cuil, affiliate._id, session);
                        } catch (retryErr) {
                            logErr(`CUIL ${affiliate.cuil} failed even after session rebuild: ${retryErr.message}`);
                            await persistError(affiliate._id, affiliate.cuil, retryErr.message || "Error tras reconstrucción de sesión");
                            status = "error";
                        }
                    } catch (rebuildErr) {
                        logErr(`❌ [ARCA-SESSION] Session rebuild failed: ${rebuildErr.message}. Saving affiliate as error.`);
                        await persistError(affiliate._id, affiliate.cuil, `Sesión irrecuperable: ${perRecordErr.message}`);
                        status = "error";
                    }
                } else {
                    // ── Normal per-record failure ───────────────────────────
                    logErr(`Unhandled per-record error for CUIL ${affiliate.cuil}: ${perRecordErr.message}. Saving as error and continuing.`);
                    await persistError(affiliate._id, affiliate.cuil, perRecordErr.message || "Error no manejado");
                    status = "error";
                }
            }

            stats.total++;
            if (stats[status] !== undefined) {
                stats[status]++;
            } else {
                stats.error++;
            }

            if (status === "captcha") {
                log(`CUIL ${affiliate.cuil} → captcha timeout. Record saved, continuing with next affiliate...`);
            }
            if (status === "not_found") {
                log(`CUIL ${affiliate.cuil} → not_found (no activo en ARCA). Record saved, continuing.`);
            }

            // Wait a bit between requests if there are more
            if (index < affiliatesToProcess.length - 1) {
                const delay = Math.floor(Math.random() * 3000) + 2000;
                log(`Waiting ${delay}ms before next...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }

        // ── Padrón sync para afiliados exitosos ───────────────────────────────
        if (stats.success > 0) {
            log(`🔍 [ARCA] Evaluando afiliados para check de padrón (${stats.success} éxitos)...`);
            const pendingPadronList = [];
            try {
                const processedIds = affiliatesToProcess.map(a => String(a._id)).filter(Boolean);
                const contribs = await AffiliateContribution.find(
                    { affiliateId: { $in: processedIds }, "verification.status": "success" },
                    { affiliateId: 1, cuil: 1, last3ClosedMonthsPaidCount: 1, lastContributionPeriod: 1, padron: 1 }
                ).lean();
                for (const c of contribs) {
                    if (evaluateNeedsPadronCheck(c.last3ClosedMonthsPaidCount, c.lastContributionPeriod, c.padron)) {
                        const aff = affiliatesToProcess.find(a => String(a._id) === String(c.affiliateId));
                        if (aff) pendingPadronList.push({ _id: aff._id, cuil: aff.cuil || c.cuil });
                    }
                }
                if (pendingPadronList.length > 0) {
                    log(`🔍 [ARCA] Iniciando check de padrón para ${pendingPadronList.length} afiliado(s)...`);
                    await syncPadronBatch(pendingPadronList);
                    log(`✅ [ARCA] Check de padrón completado`);
                } else {
                    log(`ℹ️ [ARCA] Ningún afiliado requiere check de padrón en este momento`);
                }
            } catch (padronErr) {
                log(`❌ [ARCA] Error en sincronización de padrón: ${padronErr.message}`);
            }
        }
    } finally {
        log(`==================================================`);
        log(`Summary:`);
        log(`Total processed: ${stats.total}`);
        log(`Success:         ${stats.success}`);
        log(`No Data:         ${stats.no_data}`);
        log(`CAPTCHA:         ${stats.captcha}`);
        log(`Errors:          ${stats.error}`);
        log(`Not found:       ${stats.not_found}`);
        log(`==================================================`);

        log(`Closing session...`);
        await session.close();

        log(`Disconnecting from DB...`);
        await mongoose.disconnect();

        log(`Done.`);
    }
}

run().catch(err => {
    logErr(`Fatal error: ${err.stack}`);
    process.exit(1);
});
