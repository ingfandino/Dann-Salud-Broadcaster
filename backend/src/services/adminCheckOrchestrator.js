/**
 * ============================================================
 * ADMIN CHECK ORCHESTRATOR (adminCheckOrchestrator.js)
 * ============================================================
 * Servicio compartido entre los 4 workers de Admin Check.
 *
 * checkAndAdvance(sessionId, completedStage):
 *   1. Marca la etapa como "done".
 *   2. En modo DNI, cuando CODEM finaliza:
 *      desbloquea ARCA y Padrón → "pending".
 *   3. Si todas las etapas terminaron:
 *      genera Excel y persiste resultados.
 *
 * Usa findOneAndUpdate atómico para evitar race conditions.
 */

"use strict";

const AdminCheckSession = require("../models/AdminCheckSession");
require("../models/User"); // Required for populate during excel generation or persistence
const logger = require("../utils/logger").getLogger("admin-check-orchestrator");

/**
 * Llamado por cada worker al finalizar su etapa.
 * Maneja transiciones de fase y la finalización global.
 *
 * @param {string} sessionId
 * @param {string} stage - "codem" | "dateas" | "arca" | "padron"
 * @param {"done"|"error"} result - resultado de la etapa
 */
async function checkAndAdvance(sessionId, stage, result = "done") {
    const TAG = `[ORCHESTRATOR][session:${sessionId}]`;

    // 1. Marcar la etapa como completada (atómico)
    const stageField = `stageStatus.${stage}`;
    await AdminCheckSession.findByIdAndUpdate(sessionId, {
        $set: { [stageField]: result },
    });
    logger.info(`${TAG} Etapa ${stage.toUpperCase()} → ${result}`);

    // Re-leer sesión para decisiones
    const session = await AdminCheckSession.findById(sessionId).lean();
    if (!session || session.status !== "processing") {
        logger.info(`${TAG} Sesión no está en 'processing' (status=${session?.status}), sin acción adicional.`);
        return;
    }

    const ss = session.stageStatus || {};

    // 2. En modo DNI: cuando CODEM termina, desbloquear ARCA y Padrón
    if (session.mode === "dni" && stage === "codem" && result === "done") {
        if (ss.arca === "waiting_cuil" || ss.padron === "waiting_cuil") {
            const unlockUpdate = {};
            if (ss.arca === "waiting_cuil")   unlockUpdate["stageStatus.arca"]   = "pending";
            if (ss.padron === "waiting_cuil") unlockUpdate["stageStatus.padron"] = "pending";

            await AdminCheckSession.findByIdAndUpdate(sessionId, { $set: unlockUpdate });
            logger.info(`${TAG} Modo DNI: CODEM completó → ARCA/Padrón desbloqueados a pending.`);
        }
    }

    // 3. Verificar si TODAS las etapas terminaron (done o error)
    //    Re-leer stageStatus actualizado
    const fresh = await AdminCheckSession.findById(sessionId).lean();
    if (!fresh || fresh.status !== "processing") return;

    const fs = fresh.stageStatus || {};
    const allFinished = ["codem", "dateas", "arca", "padron"].every(
        s => fs[s] === "done" || fs[s] === "error"
    );

    if (!allFinished) {
        const pending = ["codem", "dateas", "arca", "padron"]
            .filter(s => fs[s] !== "done" && fs[s] !== "error")
            .map(s => `${s}=${fs[s]}`);
        logger.info(`${TAG} Etapas pendientes: ${pending.join(", ")}`);
        return;
    }

    // 4. Reclamar la transición a generating_excel (atómico, evita doble ejecución)
    const claimed = await AdminCheckSession.findOneAndUpdate(
        { _id: sessionId, status: "processing" },
        { $set: { status: "generating_excel" } },
        { new: true }
    );

    if (!claimed) {
        logger.info(`${TAG} Otro worker ya reclamó la finalización, saliendo.`);
        return;
    }

    logger.info(`${TAG} ✅ Todas las etapas completadas. Generando Excel y persistiendo...`);

    try {
        // Fase A: Generar Excel
        const { generateAdminCheckExcel } = require("./adminCheckExcelGenerator");
        const resultPath = await generateAdminCheckExcel(sessionId);

        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: { resultFilePath: resultPath },
        });
        logger.info(`${TAG} 📊 Excel generado: ${resultPath}`);

        // Fase B: Persistir en Affiliate
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "persisting" },
        });

        const { persistAdminCheckRows } = require("./adminCheckPersistence");
        const stats = await persistAdminCheckRows(sessionId);

        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: {
                status: "completed",
                "persistenceStats.created": stats.created,
                "persistenceStats.updated": stats.updated,
                "persistenceStats.skipped": stats.skipped,
                "persistenceStats.errors":  stats.errors,
            },
        });

        logger.info(
            `${TAG} ✅ Sesión completada. Persistencia: created=${stats.created}, ` +
            `updated=${stats.updated}, skipped=${stats.skipped}, errors=${stats.errors}`
        );
    } catch (err) {
        logger.error(`${TAG} ❌ Error en finalización: ${err.message}`);
        await AdminCheckSession.findByIdAndUpdate(sessionId, {
            $set: { status: "error", errorMessage: `Error Excel/Persistencia: ${err.message}` },
        });
    }
}

module.exports = { checkAndAdvance };
