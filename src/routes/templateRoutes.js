// src/routes/templateRoutes.js

const express = require("express");
const router = express.Router();
const {
    createTemplate,
    getTemplates,
    getTemplateById,
    updateTemplate,
    deleteTemplate,
    sendTemplate
} = require("../controllers/templateController");
const { createTemplateValidator, updateTemplateValidator } = require("../validators/templateValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD
router.post("/", createTemplateValidator, validateRequest, createTemplate);
router.get("/", getTemplates);
router.get("/:id", getTemplateById);
router.put("/:id", updateTemplateValidator, validateRequest, updateTemplate);
router.delete("/:id", deleteTemplate);

// Enviar plantilla a contactos
router.post("/:id/send", sendTemplate);

module.exports = router;