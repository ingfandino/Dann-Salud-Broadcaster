/**
 * ============================================================
 * ADMIN CHECK ROUTES (adminCheckRoutes.js)
 * ============================================================
 * Endpoints para "Chequeado Administrativo".
 * Acceso: administrativo, encargado, gerencia, desarrollador
 */

"use strict";

const express = require("express");
const router  = express.Router();
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");

const { permit }     = require("../middlewares/roleMiddleware");

const controller = require("../controllers/adminCheckController");

const ALLOWED_ROLES = ["administrativo", "encargado", "gerencia"];

/* ─── Multer config ────────────────────────────────────── */

const uploadDir = path.join(__dirname, "../../uploads/admin-check");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${timestamp}_${safeName}`);
    },
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".xlsx" || ext === ".xls") {
        cb(null, true);
    } else {
        cb(new Error("Solo archivos .xlsx o .xls son permitidos"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

/* ─── Routes ───────────────────────────────────────────── */

const allowedRoles = permit(...ALLOWED_ROLES);

router.post("/upload", allowedRoles, upload.single("file"), controller.uploadFile);
router.get("/sessions", allowedRoles, controller.listSessions);
router.get("/sessions/:id", allowedRoles, controller.getSession);
router.post("/sessions/:id/start", allowedRoles, controller.startProcessing);
router.get("/sessions/:id/download", allowedRoles, controller.downloadResult);
router.delete("/sessions/:id", allowedRoles, controller.deleteSession);
router.post("/sessions/:id/retry", allowedRoles, controller.retrySession);

module.exports = router;
