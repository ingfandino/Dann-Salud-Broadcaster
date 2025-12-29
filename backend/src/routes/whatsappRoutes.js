/**
 * ============================================================
 * RUTAS DE WHATSAPP (whatsappRoutes.js)
 * ============================================================
 * Gestión de la conexión global de WhatsApp Web.
 * Inicialización, estado, QR y desconexión.
 */

const express = require("express");
const router = express.Router();
const { whatsappEvents, isReady, getCurrentQR } = require("../config/whatsapp");
const { requireAuth } = require('../middlewares/authMiddleware');
const whatsappController = require("../controllers/whatsappController");
const { permit } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

let lastQR = null;

// Ruta para inicializar la conexión
router.get('/init', requireAuth, whatsappController.init);

// Ruta para verificar el estado
router.get('/status', requireAuth, whatsappController.getStatus);

// Ruta para obtener el QR
router.get("/qr", requireAuth, async (req, res) => {
    try {
        if (lastQR) {
            return res.json({ qr: lastQR });
        }
        const qr = getCurrentQR();
        if (qr) {
            return res.json({ qr });
        }
        res.status(404).json({ error: "No hay QR disponible" });
    } catch (error) {
        logger.error("Error en /qr:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔁 Forzar nueva sesión / refrescar QR
router.post("/relink", requireAuth, permit("administrativo"), whatsappController.relink);
router.post("/logout", requireAuth, permit("administrativo"), whatsappController.logout);

module.exports = router;