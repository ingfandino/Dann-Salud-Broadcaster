// src/routes/contactRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const contactController = require("../controllers/contactController");
const { createContactValidator } = require("../validators/contactValidator");
const validateRequest = require("../middlewares/validateRequest");

const upload = multer({ dest: "uploads/" });

// CRUD de contactos
router.post(
    "/",
    ...createContactValidator,
    validateRequest,
    contactController.createContact
);

router.get("/", contactController.getContacts);
router.get("/:id", contactController.getContactById);

router.put(
    "/:id",
    ...createContactValidator,
    validateRequest,
    contactController.updateContact
);

router.delete("/:id", contactController.deleteContact);

// Import masivo
router.post(
    "/import",
    upload.single("file"),
    (req, res, next) => {
        console.log("📩 Campos recibidos en import:", req.body);
        next();
    },
    contactController.importContacts
);

// 📂 Listar logs de importación
router.get("/logs", contactController.listImportLogs);

// 📥 Descargar log específico
router.get("/logs/:filename", contactController.downloadImportLog);

// 🔹 Headers detectados en la última importación
router.get("/headers", contactController.getLastImportHeaders);

module.exports = router;