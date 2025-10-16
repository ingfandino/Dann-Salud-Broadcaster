// backend/src/routes/contactRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const contactController = require("../controllers/contactController");
const { createContactValidator } = require("../validators/contactValidator");
const validateRequest = require("../middlewares/validateRequest");

const upload = multer({
    dest: "uploads/",
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            "text/csv",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ];
        const allowedExts = [".csv", ".xls", ".xlsx"];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Formato inválido. Solo se aceptan .csv, .xls, .xlsx."), false);
        }
    },
});

// CRUD de contactos
router.post("/", ...createContactValidator, validateRequest, async (req, res) => {
    await contactController.createContact(req, res);
});
router.get("/", async (req, res) => {
    await contactController.getContacts(req, res);
});
router.get("/:id", async (req, res) => {
    await contactController.getContactById(req, res);
});
router.put("/:id", ...createContactValidator, validateRequest, async (req, res) => {
    await contactController.updateContact(req, res);
});
router.delete("/:id", async (req, res) => {
    await contactController.deleteContact(req, res);
});

// Import masivo
router.post("/import", upload.single("file"), async (req, res) => {
    await contactController.importContacts(req, res);
});

// Logs
router.get("/logs", async (req, res) => {
    await contactController.listImportLogs(req, res);
});
router.get("/logs/:id", async (req, res) => {
    await contactController.downloadImportLog(req, res);
});

router.get("/headers", async (req, res) => {
    await contactController.getLastImportHeaders(req, res);
});

module.exports = router;