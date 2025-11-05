// backend/src/routes/affiliates.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const affiliateController = require("../controllers/affiliateController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { getAvailableExports } = require("../services/affiliateExportService");

// Configuración de multer para subir archivos .xlsx
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../../uploads/affiliates");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        cb(null, "affiliate-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB máximo (sin límite práctico)
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== ".xlsx" && ext !== ".xls") {
            return cb(new Error("Solo se permiten archivos .xlsx o .xls"));
        }
        cb(null, true);
    }
});

// 🔐 Todas las rutas requieren autenticación + rol Gerencia
router.use(requireAuth);
router.use(affiliateController.requireGerencia);

// 📤 Subir archivo de afiliados
router.post("/upload", upload.single("file"), affiliateController.uploadAffiliates);

// 📥 Descargar reporte de duplicados
router.get("/download-report/:filename", affiliateController.downloadReport);

// 🔍 Buscar/filtrar afiliados
router.get("/search", affiliateController.searchAffiliates);

// 📊 Obtener estadísticas
router.get("/stats", affiliateController.getStats);

// ⚙️ Configurar exportación programada
router.post("/export-config", affiliateController.configureExport);

// 📋 Obtener configuración actual
router.get("/export-config", affiliateController.getExportConfig);

// 📁 Obtener lista de exportaciones disponibles
router.get("/exports", async (req, res) => {
    try {
        const exports = await getAvailableExports();
        res.json({ exports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📥 Descargar archivo CSV exportado
router.get("/download-export/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, "../../uploads/affiliate-exports", filename);

        // Seguridad: verificar que el archivo existe
        const fs = require("fs").promises;
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        res.download(filePath, filename);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🗑️ Eliminar afiliado
router.delete("/:id", affiliateController.deleteAffiliate);

module.exports = router;
