/**
 * ============================================================
 * AFFILIATE CONTRIBUTION CONTROLLER
 * ============================================================
 * Expone el endpoint manual para disparar verificación de aportes.
 * POST /api/affiliate-contributions/run
 */

const { v4: uuidv4 } = require("uuid");
const ArcaAssistedTask = require("../models/ArcaAssistedTask");
const Affiliate = require("../models/Affiliate");
const { verifyAffiliate, verifyBatch, getPendingAffiliates, saveResult } = require("../services/contributionSync.service");
const logger = require("../utils/logger");

/**
 * POST /api/affiliate-contributions/run
 *
 * Body:
 *   - mode: "single" | "selected" | "filtered" | "pending"  (default: "pending")
 *   - limit: number   (default: 1, applied to all modes)
 *   - cuil: string    (requerido si mode === "single"; filtro si mode === "filtered")
 *   - affiliateIds: string[]  (requerido si mode === "selected")
 *   - filters: object (filtros adicionales para mode === "filtered")
 *
 * Retorna: { executionId, queued, message }
 */
exports.runVerification = async (req, res) => {
    try {
        const { mode = "pending", affiliateIds = [], cuil, filters = {}, groups = [], limit } = req.body;

        const VALID_MODES = ["single", "selected", "filtered", "pending", "byObraSocial"];
        if (!VALID_MODES.includes(mode)) {
            return res.status(400).json({ success: false, message: `Modo inválido: "${mode}".` });
        }

        if (mode === "selected" && (!affiliateIds || affiliateIds.length === 0)) {
            return res.status(400).json({ success: false, message: "El modo 'selected' requiere al menos un ID de afiliado." });
        }

        if (mode === "byObraSocial" && (!groups || groups.length === 0)) {
            return res.status(400).json({ success: false, message: "El modo 'byObraSocial' requiere al menos un grupo con obra social." });
        }

        // 0 or absent/null → stored as 0 → runner treats it as "no limit" (process all matching)
        const parsedLimit = parseInt(limit, 10);
        const safeLimit = (parsedLimit > 0) ? parsedLimit : 0;

        const newTask = new ArcaAssistedTask({
            mode,
            cuil:         mode === "single"       ? (cuil?.trim() ?? null) : null,
            affiliateIds: mode === "selected"      ? affiliateIds           : [],
            filters:      mode === "filtered"      ? filters                : {},
            groups:       mode === "byObraSocial"  ? groups                 : [],
            limit:        safeLimit,
            requestedBy:  req.user ? req.user.id   : null,
        });

        await newTask.save();

        const limitLabel = safeLimit > 0 ? String(safeLimit) : "todos";
        logger.info(`🚀 [CONTRIBUTION-RUN] Tarea ARCA encolada | taskId=${newTask._id} | mode=${mode} | limit=${limitLabel}`);

        res.json({
            taskId: newTask._id,
            queued: true,
            message: `Tarea encolada (${mode}). Ejecutá el script local asistido para procesarla.`,
        });

    } catch (err) {
        logger.error("❌ [CONTRIBUTION-RUN] Error en runVerification:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * GET /api/affiliate-contributions/active-task
 * Devuelve la tarea actualmente en ejecución con su progreso en vivo,
 * o la última tarea completada en los últimos 90 segundos.
 * También incluye el conteo de tareas en cola (status="pending").
 */
exports.getActiveTask = async (req, res) => {
    try {
        const [running, queuedCount] = await Promise.all([
            ArcaAssistedTask.findOne(
                { status: "running" },
                { status: 1, mode: 1, startedAt: 1, progress: 1, requestedAt: 1 }
            ).sort({ startedAt: -1 }).lean(),
            ArcaAssistedTask.countDocuments({ status: "pending" }),
        ]);

        if (running) {
            return res.json({ active: running, queuedCount });
        }

        const cutoff = new Date(Date.now() - 90 * 1000);
        const recent = await ArcaAssistedTask.findOne(
            { status: { $in: ["completed", "error", "captcha"] }, completedAt: { $gte: cutoff } },
            { status: 1, mode: 1, startedAt: 1, completedAt: 1, progress: 1, resultSummary: 1 }
        ).sort({ completedAt: -1 }).lean();

        res.json({ active: recent ? { ...recent, finished: true } : null, queuedCount });
    } catch (err) {
        logger.error("❌ [ACTIVE-TASK] Error:", err);
        res.json({ active: null, queuedCount: 0 });
    }
};

/**
 * GET /api/affiliate-contributions/stats
 * Devuelve un resumen de estados de verificación.
 */
exports.getStats = async (req, res) => {
    try {
        const AffiliateContribution = require("../models/AffiliateContribution");
        const stats = await AffiliateContribution.aggregate([
            {
                $group: {
                    _id: "$verification.status",
                    count: { $sum: 1 },
                },
            },
        ]);

        const total = await AffiliateContribution.countDocuments();

        res.json({ total, byStatus: stats });
    } catch (err) {
        logger.error("❌ [CONTRIBUTION-STATS] Error:", err);
        res.status(500).json({ error: err.message });
    }
};
