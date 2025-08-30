// src/routes/whatsappRoutes.js

const express = require("express");
const router = express.Router();
const { client, isReady, whatsappEvents } = require("../config/whatsapp");
const { sendMessageValidator } = require("../validators/whatsappValidator");
const validateRequest = require("../middlewares/validateRequest");

let lastQR = null;

// Guardamos el último QR emitido por el cliente
whatsappEvents.on("qr", qr => {
    lastQR = qr;
});

// ✅ Endpoint para obtener el QR actual
router.get("/qr", (req, res) => {
    if (!lastQR) {
        return res.status(404).json({ error: "QR no disponible aún. Espera a que se genere." });
    }
    res.json({ qr: lastQR });
});

// ✅ Endpoint para enviar mensajes
router.post("/send", sendMessageValidator, validateRequest, async (req, res) => {
    try {
        if (!isReady()) {
            return res.status(503).json({ error: "WhatsApp no está listo todavía, espera a que se conecte." });
        }

        const { to, message } = req.body;
        const chatId = `${to}@c.us`;

        await client.sendMessage(chatId, message);
        res.json({ success: true, to, message });
    } catch (err) {
        console.error("❌ Error enviando mensaje:", err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;