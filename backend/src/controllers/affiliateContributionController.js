/**
 * ============================================================
 * AFFILIATE CONTRIBUTION CONTROLLER
 * ============================================================
 * Expone el endpoint manual para disparar verificación de aportes.
 * POST /api/affiliate-contributions/run
 */

const { v4: uuidv4 } = require("uuid");
const AffiliateContribution = require("../models/AffiliateContribution");
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
        const executionId = uuidv4();
        const checkedBy = req.user?.nombre || req.user?.email || "manual";

        const options = {
            executionType: "manual",
            executionId,
            checkedBy,
            minDelayMs: 2000,
            maxDelayMs: 5000,
        };

        // ── single CUIL ──
        if (mode === "single") {
            if (!cuil?.trim()) {
                return res.status(400).json({ error: "Se requiere 'cuil' para el modo 'single'" });
            }
            const affiliate = await Affiliate.findOne({ cuil: cuil.trim(), active: true }, { _id: 1, cuil: 1 }).lean();
            if (!affiliate) {
                return res.status(404).json({ error: `CUIL ${cuil} no encontrado o inactivo` });
            }

            logger.info(`🚀 [CONTRIBUTION-RUN] Modo single | executionId=${executionId} | cuil=${cuil.trim()}`);
            res.json({ executionId, queued: 1, message: `Verificación iniciada para CUIL ${cuil.trim()}. ID: ${executionId}` });

            setImmediate(async () => {
                try {
                    const stats = await verifyBatch([affiliate], options);
                    logger.info(`✅ [CONTRIBUTION-RUN] ${executionId} completado: ${JSON.stringify(stats)}`);
                } catch (err) {
                    logger.error(`❌ [CONTRIBUTION-RUN] ${executionId} error: ${err.message}`);
                }
            });
            return;
        }

        let affiliates = [];

        if (mode === "selected") {
            if (!affiliateIds.length) {
                return res.status(400).json({ error: "Debe proveer affiliateIds para el modo 'selected'" });
            }
            affiliates = await Affiliate.find({ _id: { $in: affiliateIds }, active: true }, { _id: 1, cuil: 1 }).lean();

        } else if (mode === "filtered") {
            const filter = { active: true };
            if (cuil) filter.cuil = { $regex: cuil.trim(), $options: "i" };
            if (filters.obraSocial)  filter.obraSocial  = { $regex: filters.obraSocial,  $options: "i" };
            if (filters.localidad)   filter.localidad   = { $regex: filters.localidad,   $options: "i" };
            affiliates = await Affiliate.find(filter, { _id: 1, cuil: 1 }).lean();

        } else {
            affiliates = await getPendingAffiliates();
        }

        // Apply limit
        affiliates = affiliates.slice(0, safeLimit);

        if (!affiliates.length) {
            return res.json({
                executionId,
                queued: 0,
                message: "No hay afiliados para verificar",
            });
        }

        logger.info(`🚀 [CONTRIBUTION-RUN] Ejecución manual iniciada | ID=${executionId} | mode=${mode} | queued=${affiliates.length} | limit=${safeLimit}`);

        res.json({
            executionId,
            queued: affiliates.length,
            message: `Verificación iniciada para ${affiliates.length} afiliado(s). ID: ${executionId}`,
        });

        setImmediate(async () => {
            try {
                const stats = await verifyBatch(affiliates, options);
                logger.info(`✅ [CONTRIBUTION-RUN] ${executionId} completado: ${JSON.stringify(stats)}`);
                if (stats.captchaDetected) {
                    logger.warn(`⚠️ [CONTRIBUTION-RUN] ${executionId} paused por CAPTCHA en posición ${stats.captchaPausedAt}`);
                }
            } catch (err) {
                logger.error(`❌ [CONTRIBUTION-RUN] ${executionId} error: ${err.message}`);
            }
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
