const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const { createUserValidator } = require("../validators/userValidator");
const { updateUserValidator } = require("../validators/updateUserValidator");
const validateRequest = require("../middlewares/validateRequest");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");


// 🔹 Autoregistro (asesores por defecto)
router.post("/register", authController.register);

// 🔹 Solo admin puede crear usuarios (supervisores, admins o asesores manualmente)
router.post(
    "/",
    requireAuth,
    permit("admin"),
    createUserValidator,
    validateRequest,
    userController.createUser
);

// 🔹 Admin ve todos los usuarios; supervisor solo su equipo (luego se filtra en controller)
router.get("/", requireAuth, permit("supervisor", "admin"), userController.getUsers);

// 🔹 Obtener un usuario específico
router.get("/:id", requireAuth, permit("supervisor", "admin"), userController.getUserById);

// 🔹 Actualizar usuario
router.put(
    "/:id",
    requireAuth,
    permit("admin"),
    updateUserValidator,
    validateRequest,
    userController.updateUser
);

// 🔹 Eliminar usuario
router.delete("/:id", requireAuth, permit("admin"), userController.deleteUser);

module.exports = router;