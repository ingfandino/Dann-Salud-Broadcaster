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
        const { mode = "pending", affiliateIds = [], cuil, filters = {}, limit = 1 } = req.body;
        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 1, 500));
        
        // En lugar de disparar el scraper aquí, encolamos una tarea
        const newTask = new ArcaAssistedTask({
            mode,
            cuil: mode === "single" ? cuil?.trim() : null,
            affiliateIds: mode === "selected" ? affiliateIds : [],
            filters: mode === "filtered" ? filters : {},
            limit: safeLimit,
            requestedBy: req.user ? req.user.id : null,
        });

        await newTask.save();
        
        logger.info(`🚀 [CONTRIBUTION-RUN] Tarea ARCA encolada | taskId=${newTask._id} | mode=${mode} | limit=${safeLimit}`);

        res.json({
            taskId: newTask._id,
            queued: true,
            message: `Tarea encolada correctamente. Por favor ejecuta el script local asistido para procesarla.`,
        });

    } catch (err) {
        logger.error("❌ [CONTRIBUTION-RUN] Error en runVerification:", err);
        res.status(500).json({ error: err.message });
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
