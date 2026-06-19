/**
 * ============================================================
 * DATA CHECK CLEANUP JOB (dataCheckCleanupJob.js)
 * ============================================================
 * Cron job que purga datos temporales del módulo "Chequeo de datos".
 *
 * Se ejecuta cada hora desde el proceso backend principal.
 *
 * Dos fases de cleanup:
 *   1. rawDataExpiresAt < now → purga TemporaryDataCheckRow (24h)
 *   2. sessionExpiresAt < now → purga Session, archivos de disco (72h)
 *
 * Los TTL indexes de MongoDB son la segunda red de seguridad.
 * Este job es la primera línea de defensa para borrar archivos
 * del disco que MongoDB TTL no puede tocar.
 */

"use strict";

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const TemporaryDataCheckRow     = require("../models/TemporaryDataCheckRow");
const logger = require("../utils/logger");
const fs     = require("fs").promises;

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora

/**
 * Ejecuta un ciclo de limpieza.
 */
async function runCleanup() {
    const now = new Date();
    logger.info(`🧹 [DATA-CHECK-CLEANUP] Iniciando ciclo de limpieza...`);

    try {
        /* ── Fase 1: Purgar filas expiradas (24h) ── */
        const rowsDeleted = await TemporaryDataCheckRow.deleteMany({
            expiresAt: { $lt: now },
        });
        if (rowsDeleted.deletedCount > 0) {
            logger.info(`🧹 [DATA-CHECK-CLEANUP] ${rowsDeleted.deletedCount} filas temporales purgadas (>24h)`);
        }

        /* ── Fase 2: Purgar sesiones expiradas (72h) ── */
        const expiredSessions = await TemporaryDataCheckSession.find({
            sessionExpiresAt: { $lt: now },
        }).lean();

        for (const session of expiredSessions) {
            // Borrar archivos de disco
            if (session.originalFilePath) {
                await fs.unlink(session.originalFilePath).catch(() => {});
            }
            if (session.resultFilePath) {
                await fs.unlink(session.resultFilePath).catch(() => {});
            }

            // Borrar filas asociadas (por si el TTL no las eliminó aún)
            await TemporaryDataCheckRow.deleteMany({ sessionId: session._id });

            // Borrar la sesión
            await TemporaryDataCheckSession.findByIdAndDelete(session._id);

            logger.info(`🧹 [DATA-CHECK-CLEANUP] Sesión ${session._id} purgada (archivo: "${session.originalFileName}")`);
        }

        if (expiredSessions.length > 0) {
            logger.info(`🧹 [DATA-CHECK-CLEANUP] ${expiredSessions.length} sesiones purgadas (>72h)`);
        }

        /* ── Fase 3: Limpiar sesiones en estado 'error' con rows expiradas ── */
        const errorSessions = await TemporaryDataCheckSession.find({
            status: "error",
            rawDataExpiresAt: { $lt: now },
        }).lean();

        for (const session of errorSessions) {
            await TemporaryDataCheckRow.deleteMany({ sessionId: session._id });
            if (session.originalFilePath) {
                await fs.unlink(session.originalFilePath).catch(() => {});
            }
            logger.info(`🧹 [DATA-CHECK-CLEANUP] Rows de sesión errónea ${session._id} purgadas`);
        }

    } catch (err) {
        logger.error(`❌ [DATA-CHECK-CLEANUP] Error durante limpieza: ${err.message}`);
    }
}

/**
 * Inicia el job de limpieza periódica.
 * Llamar una vez desde el proceso backend principal.
 */
function startCleanupJob() {
    logger.info(`🧹 [DATA-CHECK-CLEANUP] Job programado cada ${CLEANUP_INTERVAL_MS / 60000} minutos`);

    // Primera ejecución tras 5 minutos de arranque
    setTimeout(() => {
        runCleanup();
        // Ejecuciones periódicas
        setInterval(runCleanup, CLEANUP_INTERVAL_MS);
    }, 5 * 60 * 1000);
}

module.exports = { startCleanupJob, runCleanup };
