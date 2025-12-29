/**
 * ============================================================
 * RUTAS DE CONTACTOS (contactRoutes.js)
 * ============================================================
 * Gestión de contactos para campañas de mensajería.
 * Importación masiva desde archivos CSV/XLSX.
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const contactController = require("../controllers/contactController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createContactValidator } = require("../validators/contactValidator");
const validateRequest = require("../middlewares/validateRequest");

const MAX_MB = Number(process.env.CONTACTS_IMPORT_MAX_MB || 50);
const upload = multer({
    dest: "uploads/",
    limits: { fileSize: MAX_MB * 1024 * 1024 },
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

// CRUD de contactos (protegido)
router.post("/", requireAuth, ...createContactValidator, validateRequest, async (req, res) => {
    await contactController.createContact(req, res);
});
router.get("/", requireAuth, async (req, res) => {
    await contactController.getContacts(req, res);
});
router.get("/:id", requireAuth, async (req, res) => {
    await contactController.getContactById(req, res);
});
router.put("/:id", requireAuth, ...createContactValidator, validateRequest, async (req, res) => {
    await contactController.updateContact(req, res);
});
router.delete("/:id", requireAuth, async (req, res) => {
    await contactController.deleteContact(req, res);
});

// Import masivo (con manejo explícito de errores de Multer)
router.post("/import", requireAuth, (req, res) => {
    upload.single("file")(req, res, async (err) => {
        if (err) {
            if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: `Archivo demasiado grande. Límite: ${MAX_MB}MB` });
            }
            if (err.message && /Formato inválido/i.test(err.message)) {
                return res.status(400).json({ error: err.message });
            }
            return res.status(400).json({ error: "No se pudo procesar el archivo subido" });
        }
        await contactController.importContacts(req, res);
    });
});

// 🔹 Alias para /upload (para compatibilidad con frontend legacy o incorrecto)
router.post("/upload", requireAuth, (req, res) => {
    upload.single("file")(req, res, async (err) => {
        if (err) {
            if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: `Archivo demasiado grande. Límite: ${MAX_MB}MB` });
            }
            if (err.message && /Formato inválido/i.test(err.message)) {
                return res.status(400).json({ error: err.message });
            }
            return res.status(400).json({ error: "No se pudo procesar el archivo subido" });
        }
        await contactController.importContacts(req, res);
    });
});

// Logs
router.get("/logs", requireAuth, async (req, res) => {
    await contactController.listImportLogs(req, res);
});
router.get("/logs/:id", requireAuth, async (req, res) => {
    await contactController.downloadImportLog(req, res);
});

// 📥 Descargar archivo de rechazados en formato .txt
router.get("/import-logs/:id/download-txt", requireAuth, async (req, res) => {
    await contactController.downloadRejectedTxt(req, res);
});

router.get("/headers", requireAuth, async (req, res) => {
    await contactController.getLastImportHeaders(req, res);
});

module.exports = router;