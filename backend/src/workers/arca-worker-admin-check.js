/**
 * ============================================================
 * ARCA WORKER — ADMIN CHECK (arca-worker-admin-check.js)
 * ============================================================
 * Proceso PM2 dedicado para verificación de aportes ARCA
 * en el módulo "Chequeado Administrativo".
 *
 * Ejecución PARALELA (CUIL) o Fase 2 (DNI):
 *   Escucha sesiones donde status: "processing" y
 *   stageStatus.arca: "pending"
 *
 * Extrae: trabaja, ultimoAporte, trimPagos, inicioLaboral
 * Requiere CUIL normalizado (provisto por CODEM en modo DNI).
 *
 * Al finalizar llama a checkAndAdvance("arca").
 */

"use strict";

require("dotenv").config();

const os   = require("os");
const path = require("path");

const connectDB = require("../config/db");
const logger    = require("../utils/logger").getLogger("arca-admin-check");

const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");
const { checkAndAdvance } = require("../services/adminCheckOrchestrator");

const { BrowserSession, scrapeCuilWithSession } = require("../services/contributionScraper.service");

const MAX_CONCURRENT_SESSIONS = 2;
const POLL_INTERVAL_MS        = 5000;
const INTER_CUIL_DELAY_MS     = 800;

let isShuttingDown = false;
let activeSessions = 0;

/* ─── Graceful shutdown ──────────────────────────────────── */

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[ARCA-AC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);
    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }
    logger.info("[ARCA-AC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[ARCA-AC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[ARCA-AC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Procesamiento de una sesión ─────────────────────── */

async function processSession(session) {
    activeSessions++;
    const sessionId = String(session._id);
    const TAG       = `[ARCA][session:${sessionId}]`;

    logger.info(`${TAG} Iniciando procesamiento ARCA | modo: ${session.mode} | total filas: ${session.totalRows}`);

    let browserSession = null;

    try {
        // Filas con CUIL válido
        const rows = await AdminCheckRow.find({
            sessionId: session._id,
            "arca.status": "pending",
        }).sort({ rowIndex: 1 });

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para ARCA, avanzando orquestador`);
            await checkAndAdvance(sessionId, "arca", "done");
            return;
        }

        // Clasificar filas con/sin CUIL
        const rowsConCuil = rows.filter(r => r.cuilNormalized && r.cuilNormalized.length >= 10);
        const rowsSinCuil = rows.filter(r => !r.cuilNormalized || r.cuilNormalized.length < 10);

        logger.info(`${TAG} Registros a procesar: ${rowsConCuil.length} con CUIL | ${rowsSinCuil.length} sin CUIL (skipped)`);

        // Marcar sin CUIL como skipped_missing_cuil inmediatamente
        if (rowsSinCuil.length > 0) {
            await AdminCheckRow.updateMany(
                { _id: { $in: rowsSinCuil.map(r => r._id) } },
                {
                    $set: {
                        "arca.status":       "skipped_missing_cuil",
                        "arca.trabaja":      false,
                        "arca.errorMessage": "CUIL inválido o ausente — CODEM no proveyó CUIL",
                        "arca.checkedAt":    new Date(),
                    },
                }
            );
            logger.info(`${TAG} ${rowsSinCuil.length} filas marcadas como skipped_missing_cuil (sin CUIL de CODEM)`);
        }

        if (rowsConCuil.length === 0) {
            logger.info(`${TAG} Sin filas con CUIL válido para ARCA, avanzando orquestador`);
            await checkAndAdvance(sessionId, "arca", "done");
            return;
        }

        // Usar perfil de browser aislado para admin-check
        const originalEnv = process.env.ARCA_USER_DATA_DIR;
        process.env.ARCA_USER_DATA_DIR = path.join(os.homedir(), ".arca-admin-check-profile");

        try {
            browserSession = await BrowserSession.create();
        } finally {
            if (originalEnv) process.env.ARCA_USER_DATA_DIR = originalEnv;
            else delete process.env.ARCA_USER_DATA_DIR;
        }

        logger.info(`${TAG} Sesión de browser ARCA abierta correctamente`);

        let processed = 0;
        let errors    = 0;

        for (const row of rowsConCuil) {
            if (isShuttingDown) {
                logger.warn(`${TAG} Shutdown solicitado, sesión parcial (${processed}/${rowsConCuil.length})`);
                break;
            }

            const cuil   = row.cuilNormalized;
            const rowTag = `[ARCA][session:${sessionId}][fila:${row.rowIndex}]`;

            logger.info(`${rowTag}[CUIL:${cuil}] Consultando aportes ARCA...`);

            try {
                const result = await scrapeCuilWithSession(cuil, browserSession);

                const updateData = {
                    "arca.status":        result.ok === false ? "error" : "success",
                    "arca.trabaja":       result.trabaja ?? null,
                    "arca.ultimoAporte":  result.lastContributionPeriod || null,
                    "arca.inicioLaboral": result.inicioLaboral || null,
                    "arca.trimPagos":     typeof result.last3ClosedMonthsPaidCount === "number"
                                              ? result.last3ClosedMonthsPaidCount
                                              : null,
                    "arca.errorMessage":  result.errorMessage || null,
                    "arca.checkedAt":     new Date(),
                };

                await AdminCheckRow.findByIdAndUpdate(row._id, { $set: updateData });

                if (result.ok !== false) {
                    logger.info(
                        `${rowTag} HTML de aportes obtenido correctamente | ` +
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
                await AdminCheckRow.findByIdAndUpdate(row._id, {
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

            await AdminCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.arca.processed": processed,
                    "progress.arca.errors":    errors,
                },
            });

            if (processed < rowsConCuil.length) {
                await new Promise(r => setTimeout(r, INTER_CUIL_DELAY_MS + Math.floor(Math.random() * 400)));
            }
        }

        const totalProcessed = processed + rowsSinCuil.length;
        logger.info(
            `${TAG} ✅ ARCA finalizado | procesados con CUIL: ${processed} | skipped sin CUIL: ${rowsSinCuil.length} | errores: ${errors}`
        );

        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.arca.processed": totalProcessed,
                "progress.arca.errors":    errors,
            },
        });

        await checkAndAdvance(sessionId, "arca", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal en ARCA: ${err.message}`);
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
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

/* ─── Loop principal — escucha stageStatus.arca ──────────── */

async function workerLoop() {
    if (isShuttingDown) return;
    try {
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
            return;
        }

        const session = await AdminCheckSession.findOneAndUpdate(
            { status: "processing", "stageStatus.arca": "pending" },
            { $set: { "stageStatus.arca": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            logger.info(`[ARCA-AC-WORKER] 🎯 Sesión reclamada: ${session._id} (modo: ${session.mode})`);
            processSession(session).catch(err => {
                logger.error(`[ARCA-AC-WORKER] Error inesperado: ${err.message}`);
            });
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[ARCA-AC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [ARCA-AC-WORKER] Iniciando worker ARCA Admin Check...");
        await connectDB();
        logger.info("✅ [ARCA-AC-WORKER] Conexión a BD establecida");

        // Recuperar huérfanas: stageStatus.arca atascado en "processing"
        const orphans = await AdminCheckSession.updateMany(
            { status: "processing", "stageStatus.arca": "processing" },
            { $set: { "stageStatus.arca": "pending" } }
        );
        if (orphans.modifiedCount > 0) {
            logger.warn(`⚠️ [ARCA-AC-WORKER] ${orphans.modifiedCount} sesiones huérfanas ARCA recuperadas`);
        }

        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[ARCA-AC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [ARCA-AC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();
    } catch (err) {
        logger.error("❌ [ARCA-AC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
