/**
 * ============================================================
 * DATA CHECK ROUTES (dataCheckRoutes.js)
 * ============================================================
 * Rutas para la herramienta "Chequeo de datos".
 *
 * Acceso: supervisor, gerencia, desarrollador, encargado
 * Prefijo: /api/data-check
 */

"use strict";

const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const { permit }     = require("../middlewares/roleMiddleware");
const dataCheckCtrl  = require("../controllers/dataCheckController");

/* ─── Multer config ──────────────────────────────────────── */

const UPLOAD_DIR = path.join(__dirname, "../../uploads/data-check");

// Asegurar que el directorio exista
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName  = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${timestamp}_${safeName}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if ([".xlsx", ".xls"].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error("Solo se permiten archivos Excel (.xlsx, .xls)"));
        }
    },
});

/* ─── Middleware de rol ──────────────────────────────────── */

const allowedRoles = permit("supervisor", "gerencia", "desarrollador", "encargado", "administrativo", "asesor", "independiente", "auditor");

/* ─── Rutas ──────────────────────────────────────────────── */

/** Subir archivo Excel */
router.post("/upload", allowedRoles, upload.single("file"), dataCheckCtrl.uploadFile);

/** Crear chequeo desde registros existentes de la base */
router.post("/from-database", allowedRoles, dataCheckCtrl.createFromDatabase);

router.get("/from-database/stock", allowedRoles, dataCheckCtrl.getDatabaseStock);

/** Listar sesiones (owner-only, gerencia ve todas) */
router.get("/sessions", allowedRoles, dataCheckCtrl.listSessions);

/** Detalle de sesión */
router.get("/sessions/:id", allowedRoles, dataCheckCtrl.getSession);

/** Iniciar procesamiento */
router.post("/sessions/:id/start", allowedRoles, dataCheckCtrl.startProcessing);

/** Descargar resultado Excel */
router.get("/sessions/:id/download", allowedRoles, dataCheckCtrl.downloadResult);

/** Eliminar sesión */
router.delete("/sessions/:id", allowedRoles, dataCheckCtrl.deleteSession);

/** Reintentar sesión fallida */
router.post("/sessions/:id/retry", allowedRoles, dataCheckCtrl.retrySession);

module.exports = router;
