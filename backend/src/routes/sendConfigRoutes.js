/**
 * ============================================================
 * RUTAS DE CONFIGURACIÓN DE ENVÍO (sendConfigRoutes.js)
 * ============================================================
 * Configuración global de parámetros de envío masivo.
 */

const express = require("express");
const router = express.Router();
const sendConfigController = require("../controllers/sendConfigController");

/* ========== GET/PUT CONFIG ========== */
router.get("/", sendConfigController.getConfig);
router.put("/", sendConfigController.updateConfig);

module.exports = router;