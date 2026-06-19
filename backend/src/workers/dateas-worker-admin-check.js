/**
 * ============================================================
 * DATEAS WORKER — ADMIN CHECK (dateas-worker-admin-check.js)
 * ============================================================
 * Proceso PM2 dedicado para enriquecimiento DATEAS
 * en el módulo "Chequeado Administrativo".
 *
 * Ejecución PARALELA: escucha sesiones donde
 *   status: "processing" y stageStatus.dateas: "pending"
 *
 * Identificador usado:
 *   - Modo CUIL: usa cuilNormalized
 *   - Modo DNI:  usa dniNormalized (corre en Fase 1 con CODEM)
 *
 * Al finalizar llama a checkAndAdvance("dateas").
 */

"use strict";

require("dotenv").config();

const connectDB     = require("../config/db");
const logger        = require("../utils/logger").getLogger("dateas-admin-check");
const { chromium }  = require("playwright");

const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");
const { checkAndAdvance } = require("../services/adminCheckOrchestrator");

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
    logger.info(`[DATEAS-AC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);
    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }
    logger.info("[DATEAS-AC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[DATEAS-AC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[DATEAS-AC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Scraper DATEAS aislado ─────────────────────────────── */

async function scrapeDataeasIsolated(page, identifier) {
    try {
        await page.goto(DATEAS_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    } catch (err) {
        logger.warn(`[DATEAS-AC] Timeout cargando Dateas: ${err.message}`);
        return null;
    }

    await new Promise(r => setTimeout(r, 600 + Math.floor(Math.random() * 600)));

    const inputSel = "#cuit-cuil-dni";
    try {
        await page.waitForSelector(inputSel, { state: "visible", timeout: ACTION_TIMEOUT });
    } catch {
        logger.warn(`[DATEAS-AC] Input no visible para identificador ${identifier}`);
        return null;
    }

    const input = page.locator(inputSel).first();
    await input.click();
    await input.fill("");
    await input.pressSequentially(identifier, { delay: 150 });
    await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 300)));

    const btnSel = ".button-red-large";
    try {
        await page.waitForSelector(btnSel, { state: "visible", timeout: ACTION_TIMEOUT });
        await page.locator(btnSel).first().click();
    } catch {
        logger.warn(`[DATEAS-AC] Botón de búsqueda no visible para ${identifier}`);
        return null;
    }

    await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));
    try { await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT }); } catch {}

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

    if (!result.cuil && !result.nombre) return null;

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
    const TAG       = `[DATEAS][session:${sessionId}]`;

    logger.info(`${TAG} Iniciando procesamiento DATEAS | modo: ${session.mode} | total filas: ${session.totalRows}`);

    let browser = null;
    let context = null;
    let page    = null;

    try {
        const rows = await AdminCheckRow.find({
            sessionId: session._id,
            "dateas.status": "pending",
        }).sort({ rowIndex: 1 });

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para DATEAS, avanzando orquestador`);
            await checkAndAdvance(sessionId, "dateas", "done");
            return;
        }

        logger.info(`${TAG} Registros a procesar con DATEAS: ${rows.length}`);

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

        logger.info(`${TAG} Browser DATEAS iniciado correctamente`);

        let processed = 0;
        let errors    = 0;
        let omitidos  = 0;

        for (const row of rows) {
            if (isShuttingDown) {
                logger.warn(`${TAG} Shutdown solicitado, sesión parcial (${processed}/${rows.length})`);
                break;
            }

            // En modo CUIL usar cuilNormalized; en modo DNI usar dniNormalized
            // DATEAS puede funcionar con ambos identificadores
            const identifier = row.cuilNormalized || row.dniNormalized;
            const idType     = row.cuilNormalized ? "CUIL" : "DNI";

            const rowTag = `[DATEAS][session:${sessionId}][fila:${row.rowIndex}]`;

            if (!identifier || identifier.length < 7) {
                logger.warn(`${rowTag} Identificador inválido o ausente, omitiendo fila`);
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "dateas.status":       "skipped",
                        "dateas.errorMessage": "CUIL/DNI inválido o ausente",
                        "dateas.checkedAt":    new Date(),
                    },
                });
                processed++;
                omitidos++;
                continue;
            }

            logger.info(`${rowTag}[${idType}:${identifier}] Consultando datos personales en DATEAS...`);

            try {
                const result = await scrapeDataeasIsolated(page, identifier);

                if (result && (result.edad !== null || result.nombre)) {
                    await AdminCheckRow.findByIdAndUpdate(row._id, {
                        $set: {
                            "dateas.status":    "success",
                            "dateas.edad":      result.edad,
                            "dateas.nombre":    result.nombre,
                            "dateas.provincia": result.provincia,
                            "dateas.localidad": result.localidad,
                            "dateas.checkedAt": new Date(),
                        },
                    });
                    logger.info(
                        `${rowTag} Datos detectados — ` +
                        `Nombre: ${result.nombre || "(sin nombre)"} | ` +
                        `Edad: ${result.edad ?? "(sin edad)"} | ` +
                        `Localidad: ${result.localidad || "(sin localidad)"}`
                    );
                } else {
                    await AdminCheckRow.findByIdAndUpdate(row._id, {
                        $set: {
                            "dateas.status":       "error",
                            "dateas.errorMessage": "Sin resultados en DATEAS",
                            "dateas.checkedAt":    new Date(),
                        },
                    });
                    logger.warn(`${rowTag} Sin resultados en DATEAS para ${identifier}`);
                    errors++;
                }
                processed++;

            } catch (scrapeErr) {
                logger.warn(`${rowTag} Error scraping DATEAS: ${scrapeErr.message}`);
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "dateas.status":       "error",
                        "dateas.errorMessage": scrapeErr.message,
                        "dateas.checkedAt":    new Date(),
                    },
                });
                errors++;
                processed++;
            }

            await AdminCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.dateas.processed": processed,
                    "progress.dateas.errors":    errors,
                },
            });

            if (processed < rows.length) {
                await new Promise(r => setTimeout(r, INTER_CUIL_DELAY_MS + Math.floor(Math.random() * 500)));
            }
        }

        logger.info(
            `${TAG} ✅ DATEAS finalizado | procesados: ${processed} | errores: ${errors} | omitidos: ${omitidos}`
        );

        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.dateas.processed": processed,
                "progress.dateas.errors":    errors,
            },
        });

        await checkAndAdvance(sessionId, "dateas", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal en DATEAS: ${err.message}`);
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error DATEAS: ${err.message}` },
        });
        try { await checkAndAdvance(sessionId, "dateas", "error"); } catch (_) {}
    } finally {
        if (context) { try { await context.close(); } catch (_) {} }
        if (browser) { try { await browser.close(); } catch (_) {} }
        activeSessions--;
    }
}

/* ─── Loop principal — escucha stageStatus.dateas ───────── */

async function workerLoop() {
    if (isShuttingDown) return;
    try {
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
            return;
        }

        const session = await AdminCheckSession.findOneAndUpdate(
            { status: "processing", "stageStatus.dateas": "pending" },
            { $set: { "stageStatus.dateas": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            logger.info(`[DATEAS-AC-WORKER] 🎯 Sesión reclamada: ${session._id} (modo: ${session.mode})`);
            processSession(session).catch(err => {
                logger.error(`[DATEAS-AC-WORKER] Error inesperado: ${err.message}`);
            });
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[DATEAS-AC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [DATEAS-AC-WORKER] Iniciando worker DATEAS Admin Check...");
        await connectDB();
        logger.info("✅ [DATEAS-AC-WORKER] Conexión a BD establecida");

        // Recuperar huérfanas: stageStatus.dateas atascado en "processing"
        const orphans = await AdminCheckSession.updateMany(
            { status: "processing", "stageStatus.dateas": "processing" },
            { $set: { "stageStatus.dateas": "pending" } }
        );
        if (orphans.modifiedCount > 0) {
            logger.warn(`⚠️ [DATEAS-AC-WORKER] ${orphans.modifiedCount} sesiones huérfanas DATEAS recuperadas`);
        }

        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[DATEAS-AC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [DATEAS-AC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();
    } catch (err) {
        logger.error("❌ [DATEAS-AC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
