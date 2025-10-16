// backend/src/routes/templateRoutes.js

const express = require("express");
const router = express.Router();
const templateController = require("../controllers/templateController");
const { createTemplateValidator, updateTemplateValidator } = require("../validators/templateValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD
router.post("/", createTemplateValidator, validateRequest, templateController.createTemplate);
router.get("/", templateController.getTemplates);
router.get("/:id", templateController.getTemplateById);
router.put("/:id", updateTemplateValidator, validateRequest, templateController.updateTemplate);
router.delete("/:id", templateController.deleteTemplate);

// Enviar plantilla
router.post("/:id/send", templateController.sendTemplate);

module.exports = router;