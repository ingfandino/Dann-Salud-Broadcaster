// src/validators/whatsAppRoutes.js

const express = require("express");
const router = express.Router();
const { client, isReady } = require("../config/whatsapp");
const { sendMessageValidator } = require("../validators/whatsappValidator");
const validateRequest = require("../middlewares/validateRequest");

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