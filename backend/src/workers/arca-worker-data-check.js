/**
 * ============================================================
 * ARCA WORKER — DATA CHECK (arca-worker-data-check.js)
 * ============================================================
 * Proceso PM2 dedicado para verificación de aportes ARCA
 * en el módulo "Chequeo de datos".
 *
 * AISLAMIENTO TOTAL:
 *   - Reutiliza: BrowserSession, scrapeCuilWithSession (scrapers puros)
 *   - NO usa: saveResult, verifyBatch, runArcaTask (escritores de BD productiva)
 *   - User data dir: ~/.arca-data-check-profile (separado de producción)
 *   - Escribe SOLO en TemporaryDataCheckRow.arca
 *
 * Concurrencia: Procesa múltiples sesiones simultáneamente
 * (hasta MAX_CONCURRENT_SESSIONS).
 */

"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger    = require("../utils/logger").getLogger("arca-data-check");

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const TemporaryDataCheckRow     = require("../models/TemporaryDataCheckRow");
const { checkAndAdvance }       = require("../services/dataCheckOrchestrator");

const { BrowserSession, scrapeCuilWithSession } = require("../services/contributionScraper.service");

const MAX_CONCURRENT_SESSIONS = 2;
const POLL_INTERVAL_MS        = 5000;
const INTER_CUIL_DELAY_MS     = 800;

let isShuttingDown   = false;
let activeSessions   = 0;

/* ─── Graceful shutdown ──────────────────────────────────── */

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[ARCA-DC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);

    // Esperar hasta 30s para que terminen las sesiones activas
    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }

    logger.info("[ARCA-DC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[ARCA-DC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[ARCA-DC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Procesamiento de una sesión ─────────────────────── */

async function processSession(session) {
    activeSessions++;
    const sessionId = String(session._id);
    const TAG       = `[ARCA][session:${sessionId}]`;
    logger.info(`${TAG} Iniciando procesamiento ARCA | total filas: ${session.totalRows}`);

    let browserSession = null;

    try {
        // Obtener filas pendientes de ARCA
        const rows = await TemporaryDataCheckRow.find({
            sessionId: session._id,
            "arca.status": "pending",
        }).sort({ rowIndex: 1 });

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para ARCA, avanzando orquestador`);
            await checkAndAdvance(sessionId, "arca", "done");
            return;
        }

        logger.info(`${TAG} Registros a procesar con ARCA: ${rows.length}`);

        // Crear sesión de browser con perfil aislado
        const originalEnv = process.env.ARCA_USER_DATA_DIR;
        const os   = require("os");
        const path = require("path");
        process.env.ARCA_USER_DATA_DIR = path.join(os.homedir(), ".arca-data-check-profile");

        try {
            browserSession = await BrowserSession.create();
        } finally {
            // Restaurar env original
            if (originalEnv) process.env.ARCA_USER_DATA_DIR = originalEnv;
            else delete process.env.ARCA_USER_DATA_DIR;
        }

        logger.info(`${TAG} Sesión de browser ARCA abierta correctamente`);

        let processed = 0;
        let errors    = 0;

        for (const row of rows) {
            if (isShuttingDown) {
                logger.warn(`${TAG} Shutdown durante procesamiento, sesión parcial (${processed}/${rows.length})`);
                break;
            }

            const cuil   = row.cuilNormalized;
            const rowTag = `[ARCA][session:${sessionId}][fila:${row.rowIndex}]`;

            if (!cuil || cuil.length < 10) {
                logger.warn(`${rowTag} CUIL inválido o ausente, omitiendo fila`);
                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "arca.status":       "skipped",
                        "arca.errorMessage": "CUIL inválido o ausente",
                        "arca.checkedAt":    new Date(),
                    },
                });
                processed++;
                continue;
            }

            logger.info(`${rowTag}[CUIL:${cuil}] Consultando aportes ARCA...`);

            try {
                const result = await scrapeCuilWithSession(cuil, browserSession);

                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "arca.status":        result.ok === false ? "error" : "success",
                        "arca.trabaja":       result.trabaja ?? null,
                        "arca.ultimoAporte":  result.lastContributionPeriod || null,
                        "arca.inicioLaboral": result.inicioLaboral || null,
                        "arca.trimPagos":     typeof result.last3ClosedMonthsPaidCount === "number" ? result.last3ClosedMonthsPaidCount : null,
                        "arca.errorMessage":  result.errorMessage || null,
                        "arca.checkedAt":     new Date(),
                    },
                });

                if (result.ok !== false) {
                    logger.info(
                        `${rowTag} HTML de aportes obtenido | ` +
                        `Trabaja: ${result.trabaja ?? "desconocido"} | ` +
                        `Último aporte: ${result.lastContributionPeriod || "ninguno"} | ` +
                        `Inicio laboral: ${result.inicioLaboral || "ninguno"} | ` +
                        `Trim. pagos: ${result.last3ClosedMonthsPaidCount ?? 0}`
                    );
                    logger.info(`${rowTag} Finalizado correctamente`);
                } else {
                    logger.warn(`${rowTag} ARCA retornó error: ${result.errorMessage || result.status}`);
                    errors++;
                }
                processed++;

            } catch (scrapeErr) {
                logger.error(`${rowTag} Error scraping ARCA: ${scrapeErr.message}`);
                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "arca.status":       "error",
                        "arca.errorMessage": scrapeErr.message,
                        "arca.checkedAt":    new Date(),
                    },
                });
                errors++;
                processed++;

                const msg = (scrapeErr.message || "").toLowerCase();
                if (msg.includes("closed") || msg.includes("destroyed")) {
                    logger.warn(`${TAG} Browser cerrado, recreando sesión ARCA...`);
                    try { await browserSession.close(); } catch (_) {}
                    browserSession = await BrowserSession.create();
                    logger.info(`${TAG} Sesión de browser ARCA recreada`);
                }
            }

            // Actualizar progreso en la sesión
            await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.arca.processed": processed,
                    "progress.arca.errors":    errors,
                },
            });

            // Delay entre CUILs para evitar rate limiting
            if (processed < rows.length) {
                await new Promise(r => setTimeout(r, INTER_CUIL_DELAY_MS + Math.floor(Math.random() * 400)));
            }
        }

        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.arca.processed": processed,
                "progress.arca.errors":    errors,
            },
        });

        logger.info(`${TAG} ✅ ARCA finalizado | procesados: ${processed} | errores: ${errors}`);
        await checkAndAdvance(sessionId, "arca", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal en ARCA: ${err.message}`);
        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error ARCA: ${err.message}` },
        });
        try { await checkAndAdvance(sessionId, "arca", "error"); } catch (_) {}
    } finally {
        if (browserSession) {
            try { await browserSession.close(); } catch (_) {}
        }
        activeSessions--;
    }
}

/* ─── Loop principal ──────────────────────────────────── */

async function workerLoop() {
    if (isShuttingDown) return;

    try {
        // Solo buscar si hay slots disponibles
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
            return;
        }

        // Reclamar sesión atómicamente
        const session = await TemporaryDataCheckSession.findOneAndUpdate(
            { status: "processing", "stageStatus.arca": "pending" },
            { $set: { "stageStatus.arca": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            // Procesar en background, no esperar para seguir buscando
            processSession(session).catch(err => {
                logger.error(`[ARCA-DC] Error inesperado procesando sesión: ${err.message}`);
            });

            // Buscar inmediatamente la siguiente si hay slots
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[ARCA-DC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [ARCA-DC-WORKER] Iniciando worker ARCA Data Check...");
        await connectDB();
        logger.info("✅ [ARCA-DC-WORKER] Conexión a BD establecida");

        // Recuperar sesiones huérfanas
        const orphans = await TemporaryDataCheckSession.updateMany(
            { status: "processing", "stageStatus.arca": "processing" },
            { $set: { "stageStatus.arca": "pending" } }
        );
        if (orphans.modifiedCount > 0) {
            logger.warn(`⚠️ [ARCA-DC-WORKER] ${orphans.modifiedCount} sesiones huérfanas de ARCA recuperadas`);
        }

        // Health check periódico
        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[ARCA-DC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [ARCA-DC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();

    } catch (err) {
        logger.error("❌ [ARCA-DC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
