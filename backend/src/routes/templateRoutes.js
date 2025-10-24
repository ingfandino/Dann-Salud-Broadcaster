// backend/src/routes/templateRoutes.js

const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const { createTemplateValidator, updateTemplateValidator } = require("../validators/templateValidator");
const validateRequest = require("../middlewares/validateRequest");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// CRUD
router.post("/", requireAuth, permit("asesor","supervisor","admin","gerencia","revendedor"), createTemplateValidator, validateRequest, templateController.createTemplate);
router.get("/", requireAuth, permit("asesor","supervisor","admin","gerencia","revendedor"), templateController.getTemplates);
router.get("/:id", requireAuth, permit("asesor","supervisor","admin","gerencia","revendedor"), templateController.getTemplateById);
router.put("/:id", requireAuth, permit("asesor","supervisor","admin","gerencia","revendedor"), updateTemplateValidator, validateRequest, templateController.updateTemplate);
router.delete("/:id", requireAuth, permit("asesor","supervisor","admin","gerencia","revendedor"), templateController.deleteTemplate);

// Enviar plantilla
router.post("/:id/send", requireAuth, permit("asesor","supervisor","admin","gerencia","revendedor"), templateController.sendTemplate);

module.exports = router;