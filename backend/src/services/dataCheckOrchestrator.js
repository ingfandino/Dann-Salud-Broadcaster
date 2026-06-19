"use strict";

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const logger = require("../utils/logger").getLogger("data-check-orchestrator");

/**
 * Llamado por cada worker de "Chequeo de datos" al finalizar su etapa.
 * Maneja transiciones de fase y la finalización global (paralelo).
 *
 * @param {string} sessionId
 * @param {string} stage - "arca" | "dateas" | "padron"
 * @param {"done"|"error"} result - resultado de la etapa
 */
async function checkAndAdvance(sessionId, stage, result = "done") {
    const TAG = `[ORCHESTRATOR-DC][session:${sessionId}]`;

    // 1. Marcar la etapa como completada (atómico)
    const stageField = `stageStatus.${stage}`;
    await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
        $set: { [stageField]: result },
    });
    logger.info(`${TAG} Etapa ${stage.toUpperCase()} → ${result}`);

    // Re-leer sesión para decisiones
    const session = await TemporaryDataCheckSession.findById(sessionId).lean();
    if (!session || session.status !== "processing") {
        logger.info(`${TAG} Sesión no está en 'processing' (status=${session?.status}), sin acción adicional.`);
        return;
    }

    // 2. Verificar si TODAS las etapas terminaron (done o error)
    const fs = session.stageStatus || {};
    const allFinished = ["arca", "dateas", "padron"].every(
        s => fs[s] === "done" || fs[s] === "error"
    );

    if (!allFinished) {
        const pending = ["arca", "dateas", "padron"]
            .filter(s => fs[s] !== "done" && fs[s] !== "error")
            .map(s => `${s}=${fs[s]}`);
        logger.info(`${TAG} Etapas pendientes: ${pending.join(", ")}`);
        return;
    }

    // 3. Reclamar la transición a generating_excel (atómico)
    const claimed = await TemporaryDataCheckSession.findOneAndUpdate(
        { _id: sessionId, status: "processing" },
        { $set: { status: "generating_excel" } },
        { new: true }
    );

    if (!claimed) {
        logger.info(`${TAG} Otro worker ya reclamó la finalización, saliendo.`);
        return;
    }

    logger.info(`${TAG} ✅ Todas las etapas completadas. Generando Excel...`);

    try {
        const { generateDataCheckExcel } = require("./dataCheckExcelGenerator");
        const { syncDataCheckSessionToDatabase } = require("./dataCheckPersistence.service");
        const resultPath = await generateDataCheckExcel(sessionId);
        const syncSummary = await syncDataCheckSessionToDatabase(sessionId, {
            uploadedByUserId: claimed.uploadedByUserId,
            originalFileName: claimed.originalFileName,
        });
        syncSummary.syncedAt = new Date();

        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: { 
                status: "completed",
                resultFilePath: resultPath,
                syncSummary
            },
        });
        logger.info(`${TAG} 📊 Excel generado: ${resultPath}`);

    } catch (err) {
        logger.error(`${TAG} ❌ Error en finalización: ${err.message}`);
        await TemporaryDataCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error Excel: ${err.message}` },
        });
    }
}

module.exports = { checkAndAdvance };
