// backend/src/routes/templateRoutes.js

const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const { createTemplateValidator, updateTemplateValidator } = require("../validators/templateValidator");
const validateRequest = require("../middlewares/validateRequest");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// CRUD
router.post("/", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), createTemplateValidator, validateRequest, templateController.createTemplate);
router.get("/", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.getTemplates);
router.get("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.getTemplateById);
router.put("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), updateTemplateValidator, validateRequest, templateController.updateTemplate);
router.delete("/:id", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.deleteTemplate);

// Enviar plantilla
router.post("/:id/send", requireAuth, permit("asesor", "auditor", "supervisor", "administrativo", "gerencia"), templateController.sendTemplate);

module.exports = router;