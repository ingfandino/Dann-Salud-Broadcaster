// src/routes/contactRoutes.js

const express = require("express");
const router = express.Router();
const contactController = require("../controllers/contactController");
const { createContactValidator } = require("../validators/contactValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD de contactos
router.post("/", createContactValidator, validateRequest, contactController.createContact)    //Crear y validar
router.get("/", contactController.getContacts);                                               //Listar todos
router.get("/:id", contactController.getContactById);                                         //Obtener uno
router.put("/:id", createContactValidator, validateRequest, contactController.updateContact); //Actualizar y validar
router.delete("/:id", contactController.deleteContact);                                       //Eliminar

module.exports = router;  