/**
 * ============================================================
 * RUTAS DE WHATSAPP POR USUARIO (whatsappMeRoutes.js)
 * ============================================================
 * Gestión de sesiones individuales de WhatsApp.
 * Estado, QR, reconexión y cierre de sesión.
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/whatsappMeController");

/* ========== RUTAS PROTEGIDAS (vía routes/index.js) ========== */
router.get("/status", ctrl.getStatus);
router.get("/qr", ctrl.getQR);
router.post("/relink", ctrl.relink);
router.post("/logout", ctrl.logout);

module.exports = router;
