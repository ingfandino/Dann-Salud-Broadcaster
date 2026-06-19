/**
 * ============================================================
 * PADRON WORKER — ADMIN CHECK (padron-worker-admin-check.js)
 * ============================================================
 * Proceso PM2 dedicado para consulta al Padrón SSSalud
 * en el módulo "Chequeado Administrativo".
 *
 * Ejecución PARALELA (CUIL) o Fase 2 (DNI):
 *   Escucha sesiones donde status: "processing" y
 *   stageStatus.padron: "pending"
 *
 * Al finalizar llama a checkAndAdvance("padron"), que cuando
 * detecta todas las etapas completadas genera el Excel y
 * persiste en Affiliate.
 */

"use strict";

require("dotenv").config();

const path      = require("path");
const os        = require("os");
const connectDB = require("../config/db");
const logger    = require("../utils/logger").getLogger("padron-admin-check");

const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");
require("../models/User"); // Necesario para populate en adminCheckPersistence

const { SSSaludSession, scrapeCuilWithSession, isSolverAvailable } = require("../services/sssaludScraper.service");
const { checkAndAdvance } = require("../services/adminCheckOrchestrator");

const MAX_CONCURRENT_SESSIONS = 2;
const POLL_INTERVAL_MS        = 5000;
const INTER_CUIL_DELAY_MS     = 800;

let isShuttingDown = false;
let activeSessions = 0;

/* ─── Graceful shutdown ──────────────────────────────────── */

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[PADRON-AC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);
    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }
    logger.info("[PADRON-AC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[PADRON-AC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[PADRON-AC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Procesamiento de una sesión ─────────────────────── */

async function processSession(session) {
    activeSessions++;
    const sessionId = String(session._id);
    const TAG       = `[PADRON][session:${sessionId}]`;

    logger.info(`${TAG} Iniciando procesamiento Padrón | modo: ${session.mode} | total filas: ${session.totalRows}`);

    let sssaludSession = null;

    try {
        const solverOk = await isSolverAvailable();
        if (!solverOk) {
            logger.warn(`${TAG} Microservicio CAPTCHA no disponible, abortando Padrón`);
            await AdminCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    status: "error",
                    errorMessage: "Microservicio CAPTCHA no disponible. Iniciar captcha_solver antes de procesar.",
                },
            });
            return;
        }

        // Marcar filas sin CUIL como skipped_missing_cuil
        const skippedResult = await AdminCheckRow.updateMany(
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
                    "padron.status":       "skipped_missing_cuil",
                    "padron.errorMessage": "CUIL inválido o ausente — CODEM no proveyó CUIL",
                    "padron.checkedAt":    new Date(),
                },
            }
        );

        if (skippedResult.modifiedCount > 0) {
            logger.info(`${TAG} ${skippedResult.modifiedCount} filas marcadas como skipped_missing_cuil`);
        }

        const rows = await AdminCheckRow.find({
            sessionId: session._id,
            "padron.status": "pending",
            cuilNormalized: { $ne: null, $exists: true, $ne: "" },
        }).sort({ rowIndex: 1 });

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para Padrón, avanzando orquestador`);
            await checkAndAdvance(sessionId, "padron", "done");
            return;
        }

        logger.info(`${TAG} Registros a procesar con Padrón: ${rows.length}`);

        // Usar perfil de browser aislado
        const originalEnv = process.env.SSSALUD_USER_DATA_DIR;
        process.env.SSSALUD_USER_DATA_DIR = path.join(os.homedir(), ".sssalud-admin-check-profile");

        try {
            sssaludSession = await SSSaludSession.create();
        } finally {
            if (originalEnv) process.env.SSSALUD_USER_DATA_DIR = originalEnv;
            else delete process.env.SSSALUD_USER_DATA_DIR;
        }

        logger.info(`${TAG} Sesión de browser Padrón abierta correctamente`);

        let processed = 0;
        let errors    = 0;

        for (const row of rows) {
            if (isShuttingDown) {
                logger.warn(`${TAG} Shutdown solicitado, sesión parcial (${processed}/${rows.length})`);
                break;
            }

            const cuil   = row.cuilNormalized;
            const rowTag = `[PADRON][session:${sessionId}][fila:${row.rowIndex}]`;

            logger.info(`${rowTag}[CUIL:${cuil}] Consultando Padrón SSSalud...`);

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

                    const padronDesc = result.data.canSell === false
                        ? `Con padrón hasta ${result.data.nextChangeDate || "?"}`
                        : "Puede cambiar OS";
                    logger.info(`${rowTag} Resultado Padrón: ${padronDesc} | OS: ${result.data.obraSocial || "(sin OS)"}`);
                } else if (result.status === "not_found") {
                    logger.info(`${rowTag} Resultado Padrón: No tiene padrón (not_found)`);
                } else {
                    updateData["padron.errorMessage"] = result.errorMessage || "Error desconocido";
                    logger.warn(`${rowTag} Error en Padrón: ${result.errorMessage || result.status}`);
                    errors++;
                }

                await AdminCheckRow.findByIdAndUpdate(row._id, { $set: updateData });
                processed++;
                logger.info(`${rowTag} Finalizado correctamente`);

            } catch (scrapeErr) {
                logger.warn(`${rowTag} Error scraping Padrón: ${scrapeErr.message}`);
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "padron.status":       "error",
                        "padron.errorMessage": scrapeErr.message,
                        "padron.checkedAt":    new Date(),
                    },
                });
                errors++;
                processed++;
            }

            await AdminCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.padron.processed": processed,
                    "progress.padron.errors":    errors,
                },
            });

            if (processed < rows.length) {
                await new Promise(r => setTimeout(r, INTER_CUIL_DELAY_MS + Math.floor(Math.random() * 400)));
            }
        }

        const totalProcessed = processed + (skippedResult.modifiedCount || 0);
        logger.info(
            `${TAG} ✅ Padrón finalizado | procesados: ${processed} | skipped sin CUIL: ${skippedResult.modifiedCount || 0} | errores: ${errors}`
        );

        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.padron.processed": totalProcessed,
                "progress.padron.errors":    errors,
            },
        });

        // Notificar al orquestador — si todas las etapas terminaron,
        // el orquestador generará el Excel y persistirá en Affiliate
        await checkAndAdvance(sessionId, "padron", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal en Padrón: ${err.message}`);
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
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

/* ─── Loop principal — escucha stageStatus.padron ───────── */

async function workerLoop() {
    if (isShuttingDown) return;
    try {
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
            return;
        }

        const session = await AdminCheckSession.findOneAndUpdate(
            { status: "processing", "stageStatus.padron": "pending" },
            { $set: { "stageStatus.padron": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            logger.info(`[PADRON-AC-WORKER] 🎯 Sesión reclamada: ${session._id} (modo: ${session.mode})`);
            processSession(session).catch(err => {
                logger.error(`[PADRON-AC-WORKER] Error inesperado: ${err.message}`);
            });
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[PADRON-AC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [PADRON-AC-WORKER] Iniciando worker Padrón Admin Check...");
        await connectDB();
        logger.info("✅ [PADRON-AC-WORKER] Conexión a BD establecida");

        // Recuperar huérfanas: stageStatus.padron atascado en "processing"
        const orphansPadron = await AdminCheckSession.updateMany(
            { status: "processing", "stageStatus.padron": "processing" },
            { $set: { "stageStatus.padron": "pending" } }
        );
        if (orphansPadron.modifiedCount > 0) {
            logger.warn(`⚠️ [PADRON-AC-WORKER] ${orphansPadron.modifiedCount} sesiones huérfanas Padrón recuperadas`);
        }

        // Recuperar sesiones que quedaron atascadas en generating_excel o persisting
        // El orquestador las retoma marcando todas las etapas como done y re-reclamando
        const orphansExcel = await AdminCheckSession.find({
            status: { $in: ["generating_excel", "persisting"] },
        }).lean();

        for (const orphan of orphansExcel) {
            logger.warn(`⚠️ [PADRON-AC-WORKER] Sesión ${orphan._id} huérfana en ${orphan.status}, re-activando orquestador`);
            await AdminCheckSession.findByIdAndUpdate(orphan._id, {
                $set: {
                    status: "processing",
                    "stageStatus.codem":  "done",
                    "stageStatus.dateas": "done",
                    "stageStatus.arca":   "done",
                    "stageStatus.padron": "done",
                },
            });
            // Llamar al orquestador directamente para re-generar Excel
            const { checkAndAdvance: orchestrate } = require("../services/adminCheckOrchestrator");
            orchestrate(String(orphan._id), "padron", "done").catch(e =>
                logger.error(`⚠️ Error re-activando orquestador para ${orphan._id}: ${e.message}`)
            );
        }

        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[PADRON-AC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [PADRON-AC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();
    } catch (err) {
        logger.error("❌ [PADRON-AC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
