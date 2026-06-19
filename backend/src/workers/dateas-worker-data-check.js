/**
 * ============================================================
 * DATEAS WORKER — DATA CHECK (dateas-worker-data-check.js)
 * ============================================================
 * Proceso PM2 dedicado para enriquecimiento DATEAS
 * en el módulo "Chequeo de datos".
 *
 * AISLAMIENTO TOTAL:
 *   - Reutiliza: scrapeDataeas() (scraper puro del bot)
 *   - NO usa: runBot, saveNativeAffiliate, existsInDb, enqueueTask
 *   - Usa chromium.launch() (NO persistente, evita conflicto con bot)
 *   - Escribe SOLO en TemporaryDataCheckRow.dateas
 *
 * Best-effort: si DATEAS falla para una fila, la marca como error
 * y continúa con la siguiente.
 */

"use strict";

require("dotenv").config();

const connectDB     = require("../config/db");
const logger        = require("../utils/logger").getLogger("dateas-data-check");
const { chromium }  = require("playwright");

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const TemporaryDataCheckRow     = require("../models/TemporaryDataCheckRow");
const { checkAndAdvance }       = require("../services/dataCheckOrchestrator");

/* ─── Constantes DATEAS (copiadas del bot, evita importar el servicio completo) ── */
const DATEAS_URL       = "https://www.dateas.com/es/consulta_cuit_cuil";
const HEADLESS         = process.env.PLAYWRIGHT_HEADLESS !== "false";
const NAV_TIMEOUT      = 30_000;
const ACTION_TIMEOUT   = 15_000;

const MAX_CONCURRENT_SESSIONS = 2;
const POLL_INTERVAL_MS        = 5000;
const INTER_CUIL_DELAY_MS     = 1000;

let isShuttingDown = false;
let activeSessions = 0;

/* ─── Graceful shutdown ──────────────────────────────────── */

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[DATEAS-DC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);

    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }

    logger.info("[DATEAS-DC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[DATEAS-DC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[DATEAS-DC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Scraper DATEAS aislado ─────────────────────────────── */

/**
 * Scraper DATEAS auto-contenido.
 * Réplica exacta de scrapeDataeas() de dateasBot.service.js
 * pero sin dependencias a modelos productivos.
 */
async function scrapeDataeasIsolated(page, cuil) {
    try {
        await page.goto(DATEAS_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    } catch (err) {
        logger.warn(`[DATEAS-DC] Timeout cargando Dateas: ${err.message}`);
        return null;
    }

    await new Promise(r => setTimeout(r, 600 + Math.floor(Math.random() * 600)));

    const inputSel = "#cuit-cuil-dni";
    try {
        await page.waitForSelector(inputSel, { state: "visible", timeout: ACTION_TIMEOUT });
    } catch {
        logger.warn(`[DATEAS-DC] Input del formulario no visible para CUIL ${cuil}`);
        return null;
    }

    const input = page.locator(inputSel).first();
    await input.click();
    await input.fill("");
    await input.pressSequentially(cuil, { delay: 150 });
    await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 300)));

    const btnSel = ".button-red-large";
    try {
        await page.waitForSelector(btnSel, { state: "visible", timeout: ACTION_TIMEOUT });
        await page.locator(btnSel).first().click();
    } catch {
        logger.warn(`[DATEAS-DC] Botón de búsqueda no visible para CUIL ${cuil}`);
        return null;
    }

    await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));

    try {
        await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT });
    } catch { /* continuar */ }

    const result = await page.evaluate(() => {
        const data = {};
        const firstDataRow = document.querySelector("table tr.odd, table tr.even");
        const cells = firstDataRow
            ? Array.from(firstDataRow.querySelectorAll("td[data-label]"))
            : Array.from(document.querySelectorAll("td[data-label]"));

        for (const cell of cells) {
            const label = (cell.getAttribute("data-label") || "").trim().toLowerCase();
            const anchors = cell.querySelectorAll("a:not(.button)");
            const value = anchors.length
                ? anchors[0].textContent.trim()
                : cell.textContent.trim();

            if (!value || label === "") continue;

            if (label.includes("nombre") || label.includes("razón") || label.includes("razon")) {
                if (!data.nombre) data.nombre = value;
            } else if (label.includes("cuit") || label.includes("cuil") || label.includes("cdi")) {
                if (!data.cuil) data.cuil = value;
            } else if (label.includes("edad")) {
                if (!data.edad) data.edad = value;
            } else if (label.includes("provincia")) {
                if (!data.provincia) data.provincia = value;
            } else if (label.includes("localidad") || label.includes("ciudad")) {
                if (!data.localidad) data.localidad = value;
            }
        }
        return data;
    });

    if (!result.cuil && !result.nombre) {
        return null;
    }

    const rawAge   = result.edad || "";
    const cleanAge = parseInt(rawAge.replace(/\D/g, ""), 10);

    return {
        nombre:    (result.nombre   || "").trim() || null,
        edad:      isNaN(cleanAge) ? null : cleanAge,
        provincia: (result.provincia || "").replace(/\s*\(pcia\.?\)/i, "").trim() || null,
        localidad: (result.localidad || "").trim() || null,
    };
}

/* ─── Procesamiento de una sesión ─────────────────────── */

async function processSession(session) {
    activeSessions++;
    const sessionId = String(session._id);
    const TAG       = `[DATEAS-DC][session:${sessionId}]`;
    logger.info(`${TAG} Procesando sesión ${sessionId}`);

    let browser = null;
    let context = null;
    let page    = null;

    try {
        const rows = await TemporaryDataCheckRow.find({
            sessionId: session._id,
            "dateas.status": "pending",
        }).sort({ rowIndex: 1 });

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para DATEAS, avanzando orquestador`);
            await checkAndAdvance(sessionId, "dateas", "done");
            return;
        }

        // Lanzar browser NO persistente (aislado)
        browser = await chromium.launch({
            headless: HEADLESS,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        context = await browser.newContext({
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale: "es-AR",
        });
        page = await context.newPage();
        page.setDefaultTimeout(ACTION_TIMEOUT);
        page.setDefaultNavigationTimeout(NAV_TIMEOUT);

        let processed = 0;
        let errors    = 0;

        for (const row of rows) {
            if (isShuttingDown) break;

            const cuil = row.cuilNormalized;

            if (!cuil || cuil.length < 10) {
                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "dateas.status":       "skipped",
                        "dateas.errorMessage": "CUIL inválido o ausente",
                        "dateas.checkedAt":    new Date(),
                    },
                });
                processed++;
                continue;
            }

            try {
                const result = await scrapeDataeasIsolated(page, cuil);

                if (result && (result.edad !== null || result.nombre)) {
                    await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                        $set: {
                            "dateas.status":    "success",
                            "dateas.edad":      result.edad,
                            "dateas.nombre":    result.nombre,
                            "dateas.provincia": result.provincia,
                            "dateas.localidad": result.localidad,
                            "dateas.checkedAt": new Date(),
                        },
                    });
                } else {
                    await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                        $set: {
                            "dateas.status":       "error",
                            "dateas.errorMessage": "Sin resultados en DATEAS",
                            "dateas.checkedAt":    new Date(),
                        },
                    });
                    errors++;
                }
                processed++;

            } catch (scrapeErr) {
                logger.warn(`[DATEAS-DC] Error CUIL ${cuil}: ${scrapeErr.message}`);
                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "dateas.status":       "error",
                        "dateas.errorMessage": scrapeErr.message,
                        "dateas.checkedAt":    new Date(),
                    },
                });
                errors++;
                processed++;
            }

            // Actualizar progreso
            await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.dateas.processed": processed,
                    "progress.dateas.errors":    errors,
                },
            });

            if (processed < rows.length) {
                await new Promise(r => setTimeout(r, INTER_CUIL_DELAY_MS + Math.floor(Math.random() * 500)));
            }
        }

        // Avanzar a orquestador
        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.dateas.processed": processed,
                "progress.dateas.errors":    errors,
            },
        });

        logger.info(`${TAG} ✅ DATEAS completado: ${processed} procesados, ${errors} errores`);
        await checkAndAdvance(sessionId, "dateas", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal: ${err.message}`);
        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error DATEAS: ${err.message}` },
        });
        try { await checkAndAdvance(sessionId, "dateas", "error"); } catch (_) {}
    } finally {
        if (context) { try { await context.close(); } catch (_) {} }
        if (browser) { try { await browser.close(); } catch (_) {} }
        activeSessions--;
    }
}

/* ─── Loop principal ──────────────────────────────────── */

async function workerLoop() {
    if (isShuttingDown) return;

    try {
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
            return;
        }

        const session = await TemporaryDataCheckSession.findOneAndUpdate(
            { status: "processing", "stageStatus.dateas": "pending" },
            { $set: { "stageStatus.dateas": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            processSession(session).catch(err => {
                logger.error(`[DATEAS-DC] Error inesperado: ${err.message}`);
            });
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[DATEAS-DC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [DATEAS-DC-WORKER] Iniciando worker DATEAS Data Check...");
        await connectDB();
        logger.info("✅ [DATEAS-DC-WORKER] Conexión a BD establecida");

        const orphans = await TemporaryDataCheckSession.updateMany(
            { status: "processing", "stageStatus.dateas": "processing" },
            { $set: { "stageStatus.dateas": "pending" } }
        );
        if (orphans.modifiedCount > 0) {
            logger.warn(`⚠️ [DATEAS-DC-WORKER] ${orphans.modifiedCount} sesiones huérfanas recuperadas`);
        }

        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[DATEAS-DC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [DATEAS-DC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();

    } catch (err) {
        logger.error("❌ [DATEAS-DC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
