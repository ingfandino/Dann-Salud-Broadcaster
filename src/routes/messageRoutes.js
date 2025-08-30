// src/routes/messageRoutes.js

const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  previewMessage,
  previewMessageFromImport
} = require("../controllers/messageController");
const { createMessageValidator } = require("../validators/messageValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD de mensajes
router.post("/", createMessageValidator, validateRequest, createMessage);   //Crear y validar
router.get("/", getMessages);                                               //Listar todos
router.get("/:id", getMessageById);                                         //Obtener uno
router.put("/:id", createMessageValidator, validateRequest, updateMessage); //Actualizar y validar
router.delete("/:id", deleteMessage);                                       //Eliminar

// Vista previa de mensajes con placeholders
router.post("/preview", previewMessage);
router.post("/previewFromImport", previewMessageFromImport);

module.exports = router;