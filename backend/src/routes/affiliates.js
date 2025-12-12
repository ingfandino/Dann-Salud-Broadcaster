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

// 🔐 Todas las rutas requieren autenticación
router.use(requireAuth);

// 📤 Subir archivo de afiliados (solo Gerencia)
router.post("/upload", affiliateController.requireGerencia, upload.single("file"), affiliateController.uploadAffiliates);

// 📥 Descargar reporte de duplicados (solo Gerencia)
router.get("/download-report/:filename", affiliateController.requireGerencia, affiliateController.downloadReport);

// 🔍 Buscar/filtrar afiliados (solo Gerencia)
router.get("/", affiliateController.searchAffiliates);
router.get("/search", affiliateController.requireGerencia, affiliateController.searchAffiliates);

// 📊 Obtener estadísticas (solo Gerencia)
router.get("/stats", affiliateController.requireSupervisorOrGerencia, affiliateController.getStats);

// ⚙️ Configurar exportación programada (solo Gerencia)
router.post("/export-config", affiliateController.requireGerencia, affiliateController.configureExport);

// 📋 Obtener configuración actual (Gerencia y Supervisores)
router.get("/export-config", affiliateController.requireSupervisorOrGerencia, affiliateController.getExportConfig);

// 📊 Obtener estadísticas de supervisor
router.get("/supervisor-stats", affiliateController.requireSupervisorOrGerencia, affiliateController.getSupervisorStats);

// 📋 Obtener obras sociales disponibles (solo Gerencia)
router.get("/obras-sociales", affiliateController.requireGerencia, affiliateController.getAvailableObrasSociales);

// 📁 Obtener lista de exportaciones disponibles (Gerencia y Supervisores)
router.get("/exports", async (req, res) => {
    try {
        const exports = await getAvailableExports(req.user);
        res.json({ exports });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 📥 Descargar archivo XLSX exportado (Gerencia y Supervisores)
router.get("/download-export/:filename", async (req, res) => {
    try {
        const { filename } = req.params;
        const userRole = req.user?.role?.toLowerCase();

        // Solo gerencia y supervisores pueden descargar
        if (!["gerencia", "supervisor", "administrativo"].includes(userRole)) {
            return res.status(403).json({ error: "No autorizado para descargar archivos" });
        }

        const filePath = path.join(__dirname, "../../uploads/affiliate-exports", filename);

        // Seguridad: verificar que el archivo existe
        const fs = require("fs").promises;
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        // Si es supervisor, verificar que el archivo le pertenece
        if (userRole === "supervisor") {
            const userId = req.user._id.toString();
            // El filename debe incluir el userId del supervisor
            if (!filename.includes(userId)) {
                return res.status(403).json({ error: "No autorizado para descargar este archivo" });
            }
        }

        res.download(filePath, filename);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 🗑️ Eliminar afiliado (solo Gerencia)
router.delete("/:id", affiliateController.requireGerencia, affiliateController.deleteAffiliate);

// 🆕 RUTAS GESTIÓN DE LEADS

// Datos Frescos (Supervisor/Gerencia)
router.get("/fresh-data", affiliateController.requireSupervisorOrGerencia, affiliateController.getFreshData);

// Datos Reutilizables (Supervisor/Gerencia)
router.get("/reusable-data", affiliateController.requireSupervisorOrGerencia, affiliateController.getReusableData);

// Distribuir (Supervisor/Gerencia)
router.post("/distribute", affiliateController.requireSupervisorOrGerencia, affiliateController.distributeAffiliates);

// Mis Asignados (Asesor)
router.get("/assigned", affiliateController.getAssignedAffiliates);

// Actualizar Estado (Asesor/Gerencia)
router.put("/:id/status", affiliateController.updateAffiliateStatus);

// Fallidas (Supervisor/Gerencia)
router.get("/failed", affiliateController.requireSupervisorOrGerencia, affiliateController.getFailedAffiliations);

// Datos Re utilizables (Supervisor/Gerencia)
router.get("/reusable", affiliateController.requireSupervisorOrGerencia, affiliateController.getReusableData);

// Datos Frescos (Supervisor/Gerencia)
router.get("/fresh", affiliateController.requireSupervisorOrGerencia, affiliateController.getFreshData);

// Cancelar envíos programados (Gerencia)
router.post("/cancel-exports", affiliateController.requireGerencia, affiliateController.cancelExports);

module.exports = router;
