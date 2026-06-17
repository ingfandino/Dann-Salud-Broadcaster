/**
 * ============================================================
 * RUTAS DE TRABAJOS DE ENVÍO (sendJobRoutes.js)
 * ============================================================
 * Gestión de campañas de envío masivo de mensajes.
 * Crear, pausar, reanudar, cancelar y monitorear trabajos.
 */

const express = require("express");
const router = express.Router();
const sendJobController = require("../controllers/sendJobController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

/* ========== VALIDADORES ========== */
const { createJobValidator } = require("../validators/jobValidator");
const validateRequest = require("../middlewares/validateRequest");

// Crear y arrancar
router.post(
    "/start",
    async (req, res, next) => {
logger.info("🚦 [sendJobRoutes] Recibida petición POST /send-jobs/start", { headers: req.headers, body: req.body });
      next();
    },
    requireAuth,
    permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"),
    ...createJobValidator,   // 🔹 validaciones dinámicas (templateId o message libre)
    validateRequest,         // 🔹 middleware centralizado de manejo de errores
    async (req, res) => {
logger.info("➡️ [sendJobRoutes] Llamando a sendJobController.startJob()");
        await sendJobController.startJob(req, res);
    }
);

// Controles
router.post("/:id/pause", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
logger.info(`🚦 [sendJobRoutes] POST /send-jobs/${req.params.id}/pause`);
    await sendJobController.pauseJob(req, res);
});
router.post("/:id/resume", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
    logger.info(`🚦 [sendJobRoutes] POST /send-jobs/${req.params.id}/resume`);
    await sendJobController.resumeJob(req, res);
});

// 🗑️ Cancelar/eliminar job
router.delete("/:id/cancel", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
    logger.info(`🚦 [sendJobRoutes] DELETE /send-jobs/${req.params.id}/cancel`);
    await sendJobController.cancelJob(req, res);
});

// Consultas
router.get("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
    logger.info(`🚦 [sendJobRoutes] GET /send-jobs/${req.params.id}`);
    await sendJobController.getJob(req, res);
});
router.get("/:id/export", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
    await sendJobController.exportJobResultsExcel(req, res);
});
// 🔹 MEJORA 3: Exportar reporte de auto-respuestas
router.get("/:id/autoresponse-report", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
    logger.info(`🚦 [sendJobRoutes] GET /send-jobs/${req.params.id}/autoresponse-report`);
    await sendJobController.exportAutoResponseReport(req, res);
});
router.get("/", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia", "recuperador", "encargado", "independiente"), async (req, res) => {
    logger.info("🚦 [sendJobRoutes] GET /send-jobs/");
    await sendJobController.listJobs(req, res);
});

module.exports = router;