/**
 * ============================================================
 * RUTAS DE AFILIADOS (affiliates.js)
 * ============================================================
 * Gestión de la base de datos de afiliados.
 * Importación, exportación, estadísticas y configuración.
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const affiliateController = require("../controllers/affiliateController");
const deliveryController = require("../controllers/deliveryController");
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

// Estado y reporte seguro de importaciones asincrónicas
router.get("/import-jobs/:jobId", affiliateController.requireGerencia, affiliateController.getAffiliateImportJob);
router.get("/import-jobs/:jobId/rejected-file", affiliateController.requireGerencia, affiliateController.downloadAffiliateImportRejectedFile);
router.get("/import-jobs/:jobId/updated-file", affiliateController.requireGerencia, affiliateController.downloadAffiliateImportUpdatedFile);

// 📥 Descargar reporte de duplicados (solo Gerencia)
router.get("/download-report/:filename", affiliateController.requireGerencia, affiliateController.downloadReport);

// 🔍 Buscar/filtrar afiliados (solo Gerencia)
router.get("/", affiliateController.searchAffiliates);
router.get("/search", affiliateController.requireGerencia, affiliateController.searchAffiliates);

// 📊 Estado de la base (Dashboard Phase 3)
router.get("/base-status", affiliateController.requireSupervisorOrGerencia, affiliateController.getBaseStatus);

// Chequeo de datos (Phase 4A: contratos, cuotas y trabajos; sin workers)
router.get("/check/config", affiliateController.requireAffiliateCheckAccess, affiliateController.getAffiliateCheckConfig);
router.put("/check/config", affiliateController.requireAffiliateCheckConfigWrite, affiliateController.updateAffiliateCheckConfig);
router.post("/check/preview", affiliateController.requireAffiliateCheckAccess, affiliateController.previewAffiliateCheck);
router.post("/check/obra-social-availability", affiliateController.requireAffiliateCheckAccess, affiliateController.getAffiliateCheckObraSocialAvailability);
router.post("/check/jobs", affiliateController.requireAffiliateCheckAccess, affiliateController.createAffiliateCheckJob);
router.post("/check/jobs/:jobId/cancel", affiliateController.requireAffiliateCheckAccess, affiliateController.cancelAffiliateCheckJob);
router.post("/check/jobs/:jobId/pause", affiliateController.requireAffiliateCheckAccess, affiliateController.pauseAffiliateCheckJob);
router.post("/check/jobs/:jobId/resume", affiliateController.requireAffiliateCheckAccess, affiliateController.resumeAffiliateCheckJob);
router.post("/check/jobs/:jobId/retry", affiliateController.requireAffiliateCheckAccess, affiliateController.retryAffiliateCheckJob);
router.get("/check/jobs/:jobId/export", affiliateController.requireAffiliateCheckAccess, affiliateController.exportAffiliateCheckJob);
router.delete("/check/jobs/:jobId", affiliateController.requireAffiliateCheckAccess, affiliateController.softDeleteAffiliateCheckJob);
router.post("/check/jobs/:jobId/process", affiliateController.requireAffiliateCheckProcessAccess, affiliateController.processAffiliateCheckJob);
router.get("/check/jobs/:jobId", affiliateController.requireAffiliateCheckAccess, affiliateController.getAffiliateCheckJob);
router.get("/check/jobs", affiliateController.requireAffiliateCheckAccess, affiliateController.listAffiliateCheckJobs);
router.post("/check/external-file", affiliateController.requireAffiliateCheckAccess, upload.single("file"), affiliateController.uploadExternalAffiliateCheckFile);
router.get("/check/external-file/:importJobId", affiliateController.requireAffiliateCheckAccess, affiliateController.getExternalAffiliateCheckImport);
router.get("/check/external-file/:importJobId/rejected-file", affiliateController.requireAffiliateCheckAccess, affiliateController.downloadExternalAffiliateCheckRejectedFile);
router.get("/check/external-file/:importJobId/updated-file", affiliateController.requireAffiliateCheckAccess, affiliateController.downloadExternalAffiliateCheckUpdatedFile);
router.post("/check/external-file/:importJobId/job", affiliateController.requireAffiliateCheckAccess, affiliateController.createExternalAffiliateCheckJob);

// 📊 Obtener estadísticas (solo Gerencia)
router.get("/stats", affiliateController.requireSupervisorOrGerencia, affiliateController.getStats);

// ⚙️ Configurar exportación programada (solo Gerencia)
router.post("/export-config", affiliateController.requireGerencia, affiliateController.configureExport);

// 📋 Obtener configuración actual (Gerencia y Supervisores)
router.get("/export-config", affiliateController.requireSupervisorOrGerencia, affiliateController.getExportConfig);

// 📊 Obtener estadísticas de supervisor
router.get("/supervisor-stats", affiliateController.requireSupervisorOrGerencia, affiliateController.getSupervisorStats);

// 📋 Obtener obras sociales disponibles (Gerencia, Supervisor y Encargado)
router.get("/obras-sociales", affiliateController.requireSupervisorOrGerencia, affiliateController.getAvailableObrasSociales);

// 📊 Obtener stock por obra social (Gerencia) - Para Envíos Avanzados
router.get("/stock-by-obra-social", affiliateController.requireGerencia, affiliateController.getStockByObraSocial);

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

        // Solo gerencia, supervisores y encargado pueden descargar
        if (!["gerencia", "supervisor", "administrativo", "encargado"].includes(userRole)) {
            return res.status(403).json({ error: "No autorizado para descargar archivos" });
        }

        const filePath = path.join(__dirname, "../../uploads/affiliate-exports", filename);

        // Seguridad: verificar que el archivo existe
        const fs = require("fs").promises;
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        // Si es supervisor o encargado, verificar que el archivo le pertenece
        if (userRole === "supervisor" || userRole === "encargado") {
            const userId = req.user._id.toString();
            // El filename debe incluir el userId del supervisor/encargado
            if (!filename.includes(userId)) {
                return res.status(403).json({ error: "No autorizado para descargar este archivo" });
            }
        }

        res.download(filePath, filename);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// � Exportación personalizada (full o filtrada) — solo usuario autorizado
router.post("/export", affiliateController.exportCustom);

// 📋 Obras sociales distintas para filtro de exportación
router.get("/distinct-obras-sociales", affiliateController.requireSupervisorOrGerencia, affiliateController.getDistinctObrasSociales);

// �🗑️ Eliminar afiliado (solo Gerencia)
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

// ✅ Limpiar datos frescos anteriores (Gerencia) - Útil antes de cargar nuevos datos
router.post("/cleanup-fresh", affiliateController.requireGerencia, affiliateController.cleanupFreshData);

// 📥 Exportar TODA la base de afiliados (solo usuario específico)
router.get("/export-all", affiliateController.exportAllAffiliates);

// ─── DISTRIBUCIÓN DE LEADS (Wizard Programar Envío) ─────────────────────────

// 📊 Stock disponible por obra social con filtros de zona, fecha y ARCA
router.get("/delivery/stock", affiliateController.requireGerencia, deliveryController.getDeliveryStock);

// 🚀 Ejecutar bloques de envío inmediato
router.post("/delivery/execute", affiliateController.requireGerencia, deliveryController.executeDeliveryBlocks);

// 👥 Supervisores disponibles para el modal
router.get("/delivery/supervisors", affiliateController.requireGerencia, deliveryController.getSupervisors);

// 📅 Obtener config programada de un supervisor
router.get("/delivery/scheduled/:supervisorId", affiliateController.requireGerencia, deliveryController.getScheduledConfig);

// 💾 Guardar config programada de un supervisor
router.post("/delivery/scheduled", affiliateController.requireGerencia, deliveryController.saveScheduledConfig);

// 🚫 Desactivar config programada de un supervisor
router.delete("/delivery/scheduled/:supervisorId", affiliateController.requireGerencia, deliveryController.deactivateScheduledConfig);

// 📤 Exportar leads usando el mismo motor que Programar Envío (fresco/reutilizable, zonas, OS)
router.post("/delivery/export", affiliateController.requireGerencia, deliveryController.exportDelivery);

module.exports = router;
