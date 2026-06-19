/**
 * ============================================================
 * PADRON WORKER — DATA CHECK (padron-worker-data-check.js)
 * ============================================================
 * Proceso PM2 dedicado para consulta al Padrón SSSalud
 * en el módulo "Chequeo de datos".
 *
 * AISLAMIENTO TOTAL:
 *   - Reutiliza: SSSaludSession, scrapeCuilWithSession, isSolverAvailable
 *   - NO usa: savePadronResult, syncPadronBatch, computeAndUpdateCanSell
 *   - User data dir: ~/.sssalud-data-check-profile (separado de producción)
 *   - Escribe SOLO en TemporaryDataCheckRow.padron
 *
 * Regla: consulta TODOS los CUILs válidos sin filtrar por trimPagos.
 * Al finalizar, genera el Excel de resultado.
 */

"use strict";

require("dotenv").config();

const path      = require("path");
const os        = require("os");
const connectDB = require("../config/db");
const logger    = require("../utils/logger").getLogger("padron-data-check");

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const TemporaryDataCheckRow     = require("../models/TemporaryDataCheckRow");
const { checkAndAdvance }       = require("../services/dataCheckOrchestrator");

const { SSSaludSession, scrapeCuilWithSession, isSolverAvailable } = require("../services/sssaludScraper.service");

const MAX_CONCURRENT_SESSIONS = 2;
const POLL_INTERVAL_MS        = 5000;
const INTER_CUIL_DELAY_MS     = 800;

let isShuttingDown = false;
let activeSessions = 0;

/* ─── Graceful shutdown ──────────────────────────────────── */

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[PADRON-DC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);

    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }

    logger.info("[PADRON-DC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[PADRON-DC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[PADRON-DC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Procesamiento de una sesión ─────────────────────── */

async function processSession(session) {
    activeSessions++;
    const sessionId = String(session._id);
    const TAG       = `[PADRON-DC][session:${sessionId}]`;
    logger.info(`${TAG} Procesando sesión ${sessionId}`);

    let sssaludSession = null;

    try {
        // Verificar que el microservicio CAPTCHA esté disponible
        const solverOk = await isSolverAvailable();
        if (!solverOk) {
            logger.warn(`[PADRON-DC] Microservicio CAPTCHA no disponible, sesión ${sessionId} en error`);
            await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    status: "error",
                    errorMessage: "Microservicio CAPTCHA no disponible. Iniciar captcha_solver antes de procesar.",
                },
            });
            return;
        }

        // Obtener filas pendientes de Padrón (TODOS los CUILs válidos, sin filtro trimPagos)
        const rows = await TemporaryDataCheckRow.find({
            sessionId: session._id,
            "padron.status": "pending",
            cuilNormalized: { $ne: null, $exists: true },
        }).sort({ rowIndex: 1 });

        // Marcar filas sin CUIL como skipped
        await TemporaryDataCheckRow.updateMany(
            {
                sessionId: session._id,
                "padron.status": "pending",
                $or: [
                    { cuilNormalized: null },
                    { cuilNormalized: { $exists: false } },
                    { cuilNormalized: "" },
                ],
            },
            {
                $set: {
                    "padron.status":       "skipped",
                    "padron.errorMessage": "CUIL inválido o ausente",
                    "padron.checkedAt":    new Date(),
                },
            }
        );

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para Padrón, avanzando orquestador`);
            await checkAndAdvance(sessionId, "padron", "done");
            return;
        }

        // Crear sesión SSSalud con perfil aislado
        const originalEnv = process.env.SSSALUD_USER_DATA_DIR;
        process.env.SSSALUD_USER_DATA_DIR = path.join(os.homedir(), ".sssalud-data-check-profile");

        try {
            sssaludSession = await SSSaludSession.create();
        } finally {
            if (originalEnv) process.env.SSSALUD_USER_DATA_DIR = originalEnv;
            else delete process.env.SSSALUD_USER_DATA_DIR;
        }

        let processed = 0;
        let errors    = 0;

        for (const row of rows) {
            if (isShuttingDown) break;

            const cuil = row.cuilNormalized;

            try {
                const result = await scrapeCuilWithSession(cuil, sssaludSession);

                const updateData = {
                    "padron.status":    result.status || (result.ok ? "success" : "error"),
                    "padron.checkedAt": new Date(),
                };

                if (result.found && result.data) {
                    updateData["padron.obraSocialDetectada"] = result.data.obraSocial || null;
                    updateData["padron.periodoDesde"]        = result.data.periodoDesde || null;
                    updateData["padron.canSell"]             = result.data.canSell ?? null;
                    updateData["padron.nextChangeDate"]      = result.data.nextChangeDate || null;
                    updateData["padron.monthsElapsed"]       = result.data.monthsElapsed ?? null;
                    updateData["padron.estado"]              = result.data.estado || null;
                } else if (result.status === "not_found") {
                    updateData["padron.status"] = "not_found";
                } else {
                    updateData["padron.errorMessage"] = result.errorMessage || "Error desconocido";
                    errors++;
                }

                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, { $set: updateData });
                processed++;

            } catch (scrapeErr) {
                logger.warn(`[PADRON-DC] Error CUIL ${cuil}: ${scrapeErr.message}`);
                await TemporaryDataCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "padron.status":       "error",
                        "padron.errorMessage": scrapeErr.message,
                        "padron.checkedAt":    new Date(),
                    },
                });
                errors++;
                processed++;
            }

            // Actualizar progreso
            await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.padron.processed": processed,
                    "progress.padron.errors":    errors,
                },
            });

            if (processed < rows.length) {
                await new Promise(r => setTimeout(r, INTER_CUIL_DELAY_MS + Math.floor(Math.random() * 400)));
            }
        }

        // Actualizar progreso final
        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.padron.processed": processed,
                "progress.padron.errors":    errors,
            },
        });

        logger.info(`${TAG} ✅ Padrón completado: ${processed} procesados, ${errors} errores`);
        await checkAndAdvance(sessionId, "padron", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal: ${err.message}`);
        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error Padrón: ${err.message}` },
        });
        try { await checkAndAdvance(sessionId, "padron", "error"); } catch (_) {}
    } finally {
        if (sssaludSession) {
            try { await sssaludSession.close(); } catch (_) {}
        }
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
            { status: "processing", "stageStatus.padron": "pending" },
            { $set: { "stageStatus.padron": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            processSession(session).catch(err => {
                logger.error(`[PADRON-DC] Error inesperado: ${err.message}`);
            });
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[PADRON-DC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [PADRON-DC-WORKER] Iniciando worker Padrón Data Check...");
        await connectDB();
        logger.info("✅ [PADRON-DC-WORKER] Conexión a BD establecida");

        // Recuperar huérfanas: stageStatus.padron atascado en "processing"
        const orphansPadron = await TemporaryDataCheckSession.updateMany(
            { status: "processing", "stageStatus.padron": "processing" },
            { $set: { "stageStatus.padron": "pending" } }
        );
        if (orphansPadron.modifiedCount > 0) {
            logger.warn(`⚠️ [PADRON-DC-WORKER] ${orphansPadron.modifiedCount} sesiones huérfanas recuperadas`);
        }

        // Recuperar sesiones atascadas en generating_excel
        const orphansExcel = await TemporaryDataCheckSession.find({
            status: "generating_excel"
        }).lean();

        for (const orphan of orphansExcel) {
            logger.warn(`⚠️ [PADRON-DC-WORKER] Sesión ${orphan._id} huérfana en generating_excel, re-activando orquestador`);
            await TemporaryDataCheckSession.findByIdAndUpdate(orphan._id, {
                $set: {
                    status: "processing",
                    "stageStatus.arca":   "done",
                    "stageStatus.dateas": "done",
                    "stageStatus.padron": "done",
                },
            });
            const { checkAndAdvance: orchestrate } = require("../services/dataCheckOrchestrator");
            orchestrate(String(orphan._id), "padron", "done").catch(e =>
                logger.error(`⚠️ Error re-activando orquestador para ${orphan._id}: ${e.message}`)
            );
        }

        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[PADRON-DC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [PADRON-DC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();

    } catch (err) {
        logger.error("❌ [PADRON-DC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
