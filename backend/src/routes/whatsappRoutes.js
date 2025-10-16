// backend/src/routes/whatsappRoutes.js

const express = require("express");
const router = express.Router();
const { whatsappEvents, isReady, getCurrentQR } = require("../config/whatsapp");

const { relink, logout, getStatus } = require("../controllers/whatsappController");
const { permit } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

let lastQR = null;

// 📡 Al generar un nuevo QR, lo almacenamos en memoria
whatsappEvents.on("qr", (qr) => {
    lastQR = qr;
});

// 📡 Si el QR expira o se fuerza nueva sesión
whatsappEvents.on("qr_refresh", () => {
    lastQR = null;
});
whatsappEvents.on("disconnected", () => {
    lastQR = null;
});

// ✅ Estado actual de conexión
router.get("/status", getStatus);

// 🔁 Obtener QR actual (si hay)
router.get("/qr", async (req, res) => {
    try {
        if (isReady()) {
            return res.json({ connected: true });
        }
        const qr = lastQR || getCurrentQR();
        if (qr) return res.json({ qr });
        return res.json({ qr: null });

    } catch (err) {
        logger.error("Error obteniendo QR", { error: err });
        res.status(500).json({ error: "Error interno" });
    }
});

// 🔁 Forzar nueva sesión / refrescar QR
router.post("/relink", permit("admin"), relink);
router.post("/logout", permit("admin"), logout);

module.exports = router;