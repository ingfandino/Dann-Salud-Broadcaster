// src/routes/userRoutes.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { createUserValidator } = require("../validators/userValidator");
const { updateUserValidator} = require("../validators/updateUserValidator")
const validateRequest = require("../middlewares/validateRequest");

// CRUD de usuarios
router.post("/", createUserValidator, validateRequest, userController.createUser);   //Crear y validar
router.get("/", userController.getUsers);                                            // Listar todos
router.get("/:id", userController.getUserById);                                      // Obtener uno
router.put("/:id", updateUserValidator, validateRequest, userController.updateUser); // Actualizar y validar
router.delete("/:id", userController.deleteUser);                                    // Eliminar

module.exports = router;