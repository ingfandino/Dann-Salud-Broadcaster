// backend/src/routes/messageRoutes.js

const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");

// Vista previa
router.post("/preview", messageController.previewMessage);
router.post("/preview/import", messageController.previewMessageFromImport);

// CRUD mensajes
router.post("/", messageController.createMessage);
router.get("/", messageController.getMessages);
router.get("/:id", messageController.getMessageById);
router.put("/:id", messageController.updateMessage);
router.delete("/:id", messageController.deleteMessage);

module.exports = router;