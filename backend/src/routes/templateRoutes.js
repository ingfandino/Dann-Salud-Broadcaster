/**
 * ============================================================
 * RUTAS DE PLANTILLAS (templateRoutes.js)
 * ============================================================
 * CRUD de plantillas de mensajes reutilizables.
 * Soporta variables y spintax para mensajes dinámicos.
 */

const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const { createTemplateValidator, updateTemplateValidator } = require("../validators/templateValidator");
const validateRequest = require("../middlewares/validateRequest");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

/* ========== CRUD DE PLANTILLAS ========== */
router.post("/", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), createTemplateValidator, validateRequest, templateController.createTemplate);
router.get("/", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.getTemplates);
router.get("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.getTemplateById);
router.put("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), updateTemplateValidator, validateRequest, templateController.updateTemplate);
router.delete("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.deleteTemplate);

// Enviar plantilla
router.post("/:id/send", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.sendTemplate);

module.exports = router;