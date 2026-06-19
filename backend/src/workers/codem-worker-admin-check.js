/**
 * ============================================================
 * CODEM WORKER — ADMIN CHECK (codem-worker-admin-check.js)
 * ============================================================
 * Proceso PM2 dedicado para consulta CODEM en el módulo
 * "Chequeado Administrativo".
 *
 * Ejecución PARALELA: escucha sesiones donde
 *   status: "processing" y stageStatus.codem: "pending"
 *
 * Al finalizar llama a checkAndAdvance("codem"), que coordina
 * el desbloqueo de ARCA/Padrón en modo DNI y la generación
 * del Excel cuando todas las etapas terminan.
 */

"use strict";

require("dotenv").config();

const connectDB = require("../config/db");
const logger    = require("../utils/logger").getLogger("codem-admin-check");

const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");

const { createCodemSession, closeCodemSession, scrapeCodem } = require("../services/codemScraper.service");
const { checkAndAdvance } = require("../services/adminCheckOrchestrator");

const MAX_CONCURRENT_SESSIONS = 2;
const POLL_INTERVAL_MS        = 5000;
const INTER_QUERY_DELAY_MS    = 1200;

let isShuttingDown = false;
let activeSessions = 0;

/* ─── Graceful shutdown ──────────────────────────────────── */

async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`[CODEM-AC-WORKER] Recibido ${signal}, esperando sesiones activas (${activeSessions})...`);

    const maxWait = 30_000;
    const start = Date.now();
    while (activeSessions > 0 && Date.now() - start < maxWait) {
        await new Promise(r => setTimeout(r, 1000));
    }

    logger.info("[CODEM-AC-WORKER] Shutdown completo");
    process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT",  () => gracefulShutdown("SIGINT"));
process.on("uncaughtException", (err) => {
    logger.error("[CODEM-AC-WORKER] Uncaught Exception:", err);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    logger.error("[CODEM-AC-WORKER] Unhandled Rejection:", reason);
});

/* ─── Procesamiento de una sesión ─────────────────────── */

async function processSession(session) {
    activeSessions++;
    const sessionId = String(session._id);
    const TAG       = `[CODEM][session:${sessionId}]`;

    logger.info(`${TAG} Iniciando procesamiento CODEM | modo: ${session.mode} | total filas: ${session.totalRows}`);

    let codemSession = null;

    try {
        const rows = await AdminCheckRow.find({
            sessionId: session._id,
            "codem.status": "pending",
        }).sort({ rowIndex: 1 });

        if (rows.length === 0) {
            logger.info(`${TAG} Sin filas pendientes para CODEM, avanzando orquestador`);
            await checkAndAdvance(sessionId, "codem", "done");
            return;
        }

        logger.info(`${TAG} Registros a procesar con CODEM: ${rows.length} (modo: ${session.mode})`);

        codemSession = await createCodemSession();
        logger.info(`${TAG} Sesión de browser CODEM abierta correctamente`);

        let processed = 0;
        let errors    = 0;
        let omitidos  = 0;

        for (const row of rows) {
            if (isShuttingDown) {
                logger.warn(`${TAG} Shutdown solicitado, sesión parcial (${processed}/${rows.length})`);
                break;
            }

            // Determinar identificador según modo
            let identifier, identifierType;
            if (session.mode === "cuil") {
                identifier     = row.cuilNormalized;
                identifierType = "cuil";
            } else {
                identifier     = row.dniNormalized;
                identifierType = "dni";
            }

            const rowTag = `[CODEM][session:${sessionId}][fila:${row.rowIndex}]`;

            if (!identifier) {
                logger.warn(`${rowTag} Identificador ausente (modo: ${session.mode}), omitiendo fila`);
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "codem.status":       "input_missing",
                        "codem.errorMessage": "Identificador ausente",
                        "codem.checkedAt":    new Date(),
                    },
                });
                processed++;
                omitidos++;
                continue;
            }

            logger.info(`${rowTag}[${identifierType.toUpperCase()}:${identifier}] Consultando CODEM...`);

            try {
                const result = await scrapeCodem(codemSession.page, identifier, identifierType);

                const updateData = {
                    "codem.status":    result.status,
                    "codem.checkedAt": new Date(),
                };

                if (result.cuil) {
                    updateData["codem.cuil"] = result.cuil;
                    if (session.mode === "dni" && !row.cuilNormalized) {
                        updateData["cuilNormalized"] = result.cuil;
                        logger.info(`${rowTag} CUIL extraído y normalizado de CODEM: ${result.cuil}`);
                    }
                }

                if (result.codem) {
                    updateData["codem.codigoObraSocial"]      = result.codem.codigo || null;
                    updateData["codem.descripcionObraSocial"]  = result.codem.descripcion || null;
                    updateData["codem.situacion"]              = result.codem.situacion || null;

                    if (result.status === "success") {
                        logger.info(`${rowTag} Obra social activa detectada: ${result.codem.codigo} - ${result.codem.descripcion}`);
                    }
                }

                if (result.activeRows) {
                    updateData["codem.activeRows"] = result.activeRows;
                }

                if (result.reason) {
                    updateData["codem.errorMessage"] = result.reason;
                    logger.info(`${rowTag} Sin resultado activo — razón: ${result.reason}`);
                }

                if (result.status !== "success") {
                    errors++;
                    logger.warn(`${rowTag} Estado CODEM: ${result.status} | ${result.reason || ""}`);
                } else {
                    logger.info(`${rowTag} Finalizado correctamente (status: ${result.status})`);
                }

                await AdminCheckRow.findByIdAndUpdate(row._id, { $set: updateData });
                processed++;

            } catch (scrapeErr) {
                logger.error(`${rowTag} Error scraping CODEM: ${scrapeErr.message}`);
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "codem.status":       "error",
                        "codem.errorMessage": scrapeErr.message,
                        "codem.checkedAt":    new Date(),
                    },
                });
                errors++;
                processed++;

                const msg = (scrapeErr.message || "").toLowerCase();
                if (msg.includes("closed") || msg.includes("destroyed") || msg.includes("target")) {
                    logger.warn(`${TAG} Browser cerrado inesperadamente, recreando sesión...`);
                    await closeCodemSession(codemSession);
                    codemSession = await createCodemSession();
                    logger.info(`${TAG} Sesión de browser CODEM recreada`);
                }
            }

            // Actualizar progreso en sesión
            await AdminCheckSession.findByIdAndUpdate(sessionId, {
                $set: {
                    "progress.codem.processed": processed,
                    "progress.codem.errors":    errors,
                },
            });

            if (processed < rows.length) {
                await new Promise(r => setTimeout(r, INTER_QUERY_DELAY_MS + Math.floor(Math.random() * 600)));
            }
        }

        logger.info(
            `${TAG} ✅ CODEM finalizado | procesados: ${processed} | errores: ${errors} | omitidos: ${omitidos}`
        );

        // Actualizar progreso final
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                "progress.codem.processed": processed,
                "progress.codem.errors":    errors,
            },
        });

        // Notificar al orquestador (desbloquea ARCA+Padrón en modo DNI si aplica)
        await checkAndAdvance(sessionId, "codem", "done");

    } catch (err) {
        logger.error(`${TAG} ❌ Error fatal en CODEM: ${err.message}`);
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error CODEM: ${err.message}` },
        });
        try { await checkAndAdvance(sessionId, "codem", "error"); } catch (_) {}
    } finally {
        if (codemSession) {
            await closeCodemSession(codemSession);
        }
        activeSessions--;
    }
}

/* ─── Loop principal — escucha stageStatus.codem ────────── */

async function workerLoop() {
    if (isShuttingDown) return;

    try {
        if (activeSessions >= MAX_CONCURRENT_SESSIONS) {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
            return;
        }

        // Reclamar sesión atómicamente por stageStatus
        const session = await AdminCheckSession.findOneAndUpdate(
            { status: "processing", "stageStatus.codem": "pending" },
            { $set: { "stageStatus.codem": "processing" } },
            { new: true, sort: { createdAt: 1 } }
        );

        if (session) {
            logger.info(`[CODEM-AC-WORKER] 🎯 Sesión reclamada: ${session._id} (modo: ${session.mode})`);
            processSession(session).catch(err => {
                logger.error(`[CODEM-AC-WORKER] Error inesperado: ${err.message}`);
            });
            setImmediate(workerLoop);
        } else {
            setTimeout(workerLoop, POLL_INTERVAL_MS);
        }
    } catch (err) {
        logger.error(`[CODEM-AC-WORKER] Error en loop: ${err.message}`);
        setTimeout(workerLoop, POLL_INTERVAL_MS * 2);
    }
}

/* ─── Inicio ──────────────────────────────────────────── */

async function startWorker() {
    try {
        logger.info("🚀 [CODEM-AC-WORKER] Iniciando worker CODEM Admin Check...");
        await connectDB();
        logger.info("✅ [CODEM-AC-WORKER] Conexión a BD establecida");

        // Recuperar huérfanas: stageStatus.codem atascado en "processing"
        const orphans = await AdminCheckSession.updateMany(
            { status: "processing", "stageStatus.codem": "processing" },
            { $set: { "stageStatus.codem": "pending" } }
        );
        if (orphans.modifiedCount > 0) {
            logger.warn(`⚠️ [CODEM-AC-WORKER] ${orphans.modifiedCount} sesiones huérfanas CODEM recuperadas`);
        }

        setInterval(() => {
            const mem = process.memoryUsage();
            logger.debug(`[CODEM-AC-WORKER] Health | Memoria: ${Math.round(mem.heapUsed / 1024 / 1024)}MB | Activas: ${activeSessions}`);
        }, 60000);

        logger.info("✅ [CODEM-AC-WORKER] Worker iniciado, esperando sesiones...");
        workerLoop();

    } catch (err) {
        logger.error("❌ [CODEM-AC-WORKER] Error fatal:", err);
        process.exit(1);
    }
}

startWorker();
