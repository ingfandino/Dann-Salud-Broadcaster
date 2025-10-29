// backend/src/routes/whatsappRoutes.js

const express = require("express");
const router = express.Router();
const { whatsappEvents, isReady, getCurrentQR } = require("../config/whatsapp");
const { authenticate } = require('../middlewares/auth');

const { relink, logout, getStatus } = require("../controllers/whatsappController");
const { permit } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

let lastQR = null;

// Ruta para inicializar la conexión
router.get('/init', authenticate, whatsappController.init);

// Ruta para verificar el estado
router.get('/status', authenticate, whatsappController.getStatus);

// Ruta para obtener el QR
router.get("/qr", authenticate, async (req, res) => {
    try {
        if (lastQR) {
            return res.json({ qr: lastQR });
        }
        const qr = whatsappController.getCurrentQR();
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
router.post("/relink", permit("admin"), relink);
router.post("/logout", permit("admin"), logout);

module.exports = router;