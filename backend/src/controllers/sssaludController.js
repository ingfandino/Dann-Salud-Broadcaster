/**
 * ============================================================
 * SSSALUD CONTROLLER
 * ============================================================
 * Expone endpoints para consultar el Padrón de Opciones de SSSalud.
 *
 * POST /api/sssalud/check-cuil          → consulta un CUIL individual
 * POST /api/sssalud/check-batch         → consulta un array de CUILs
 * GET  /api/sssalud/solver-status       → verifica que el solver Python esté activo
 */

const logger = require("../utils/logger");
const {
    SSSaludSession,
    scrapeCuilWithSession,
    isSolverAvailable,
    formatCuil,
} = require("../services/sssaludScraper.service");

// ─────────────────────────────────────────────────────────────
// GET /api/sssalud/solver-status
// ─────────────────────────────────────────────────────────────
exports.getSolverStatus = async (req, res) => {
    try {
        const available = await isSolverAvailable();
        if (available) {
            return res.json({ ok: true, message: "Microservicio CAPTCHA activo y listo." });
        }
        return res.status(503).json({
            ok: false,
            message: "Microservicio CAPTCHA no disponible. Inicialo con: cd backend/captcha_solver && python server.py",
        });
    } catch (err) {
        logger.error("❌ [SSSALUD-CTRL] Error verificando solver:", err);
        return res.status(500).json({ ok: false, message: err.message });
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/sssalud/check-cuil
// Body: { cuil: "20-12345678-9" }
// ─────────────────────────────────────────────────────────────
exports.checkCuil = async (req, res) => {
    const { cuil } = req.body;

    if (!cuil) {
        return res.status(400).json({ ok: false, message: "El campo 'cuil' es requerido." });
    }

    const solverReady = await isSolverAvailable();
    if (!solverReady) {
        return res.status(503).json({
            ok: false,
            status: "solver_unavailable",
            message: "Microservicio CAPTCHA no disponible. Inicialo con: cd backend/captcha_solver && python server.py",
        });
    }

    let session = null;
    try {
        session = await SSSaludSession.create();
        const result = await scrapeCuilWithSession(cuil, session);
        return res.json(result);
    } catch (err) {
        logger.error(`❌ [SSSALUD-CTRL] Error en checkCuil: ${err.message}`);
        return res.status(500).json({ ok: false, status: "error", message: err.message });
    } finally {
        if (session) await session.close();
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/sssalud/check-batch
// Body: { cuils: ["20-12345678-9", ...], stopOnError?: boolean }
// ─────────────────────────────────────────────────────────────
exports.checkBatch = async (req, res) => {
    const { cuils, stopOnError = false } = req.body;

    if (!cuils || !Array.isArray(cuils) || cuils.length === 0) {
        return res.status(400).json({ ok: false, message: "El campo 'cuils' debe ser un array no vacío." });
    }

    const MAX_BATCH = 100;
    if (cuils.length > MAX_BATCH) {
        return res.status(400).json({
            ok: false,
            message: `Máximo ${MAX_BATCH} CUILs por llamada. Recibido: ${cuils.length}.`,
        });
    }

    const solverReady = await isSolverAvailable();
    if (!solverReady) {
        return res.status(503).json({
            ok: false,
            status: "solver_unavailable",
            message: "Microservicio CAPTCHA no disponible. Inicialo con: cd backend/captcha_solver && python server.py",
        });
    }

    logger.info(`🚀 [SSSALUD-CTRL] Batch iniciado | total=${cuils.length}`);

    let session = null;
    const results = [];
    let processed = 0;

    try {
        session = await SSSaludSession.create();

        for (const cuil of cuils) {
            const result = await scrapeCuilWithSession(cuil, session);
            results.push({ cuil: formatCuil(cuil), ...result });
            processed++;

            logger.info(`📊 [SSSALUD-CTRL] Batch progreso: ${processed}/${cuils.length} | status=${result.status}`);

            if (stopOnError && !result.ok) {
                logger.warn(`⚠️ [SSSALUD-CTRL] stopOnError activo — deteniendo en CUIL ${cuil}`);
                break;
            }

            // Pausa entre consultas para no sobrecargar el servidor
            await new Promise(r => setTimeout(r, 800 + Math.random() * 400));
        }

        const summary = {
            total: cuils.length,
            processed,
            not_found:         results.filter(r => r.status === "not_found").length,
            found_can_sell:    results.filter(r => r.status === "found_expired").length,
            found_cannot_sell: results.filter(r => r.status === "found_active").length,
            captcha_failed:    results.filter(r => r.status === "captcha_failed").length,
            errors:            results.filter(r => r.status === "error").length,
        };

        logger.info(`✅ [SSSALUD-CTRL] Batch completado | ${JSON.stringify(summary)}`);
        return res.json({ ok: true, summary, results });

    } catch (err) {
        logger.error(`❌ [SSSALUD-CTRL] Error en checkBatch: ${err.message}`);
        return res.status(500).json({
            ok: false,
            status: "error",
            message: err.message,
            partialResults: results,
        });
    } finally {
        if (session) await session.close();
    }
};
