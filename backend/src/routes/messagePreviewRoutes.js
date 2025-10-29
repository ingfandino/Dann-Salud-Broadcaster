// backend/src/routes/messagePreviewRoutes.js

const express = require("express");
const router = express.Router();
const { parseSpintax } = require("../utils/spintax");
const { requireAuth } = require("../middlewares/authMiddleware");
const logger = require("../utils/logger");
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.post("/preview", requireAuth, (req, res) => {
    try {
        const { message, contact } = req.body;
        if (!message || !contact) {
            return res.status(400).json({ error: "Faltan datos (message, contact)" });
        }

        // Reemplazo de placeholders tipo {{campo}}
        let parsed = message;
        for (const [key, value] of Object.entries(contact)) {
            const pattern = new RegExp(`{{${escapeRegex(String(key))}}}`, "g");
            parsed = parsed.replace(pattern, () => (value ?? ""));
        }

        // Expansión de spintax
        const finalMessage = parseSpintax(parsed);

        return res.json({ preview: finalMessage });
    } catch (err) {
        logger.error("Error generando vista previa:", err);
        return res.status(500).json({ error: "Error generando vista previa" });
    }
});

module.exports = router;