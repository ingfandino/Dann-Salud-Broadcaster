// backend/src/routes/internalMessageRoutes.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireAuth } = require("../middlewares/authMiddleware");
const internalMessageController = require("../controllers/internalMessageController");

// Configurar almacenamiento de archivos adjuntos
const uploadDir = path.join(__dirname, "../../uploads/internal-messages");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB máximo por archivo
    },
    fileFilter: (req, file, cb) => {
        // Permitir imágenes, documentos comunes, CSV, etc.
        const allowedMimes = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv",
            "text/plain",
            "application/zip",
            "application/x-zip-compressed"
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
        }
    }
});

// 📬 Bandeja de entrada
router.get("/inbox", requireAuth, internalMessageController.getInbox);

// 📤 Mensajes enviados
router.get("/sent", requireAuth, internalMessageController.getSent);

// ⭐ Mensajes destacados
router.get("/starred", requireAuth, internalMessageController.getStarred);

// 📊 Contador de no leídos
router.get("/unread-count", requireAuth, internalMessageController.getUnreadCount);

// 📋 Listar usuarios disponibles
router.get("/recipients", requireAuth, internalMessageController.getAvailableRecipients);

// 📩 Obtener mensaje por ID
router.get("/:id", requireAuth, internalMessageController.getMessageById);

// ✉️ Enviar mensaje (con adjuntos)
router.post("/", requireAuth, upload.array("attachments", 5), internalMessageController.sendMessage);

// 🗑️ Eliminar mensaje
router.delete("/:id", requireAuth, internalMessageController.deleteMessage);

// 🗑️ Eliminar TODOS los mensajes del usuario
router.delete("/", requireAuth, internalMessageController.deleteAllMessages);

// ⭐ Marcar/desmarcar como destacado
router.patch("/:id/starred", requireAuth, internalMessageController.toggleStarred);

// 📥 Marcar como leído/no leído
router.patch("/:id/read", requireAuth, internalMessageController.markAsRead);

// 📦 Descargar adjunto
router.get("/:messageId/attachments/:attachmentId", requireAuth, internalMessageController.downloadAttachment);

module.exports = router;
