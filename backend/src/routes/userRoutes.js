// backend/src/routes/userRoutes.js

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { createUserValidator } = require("../validators/userValidator");
const { updateUserValidator } = require("../validators/updateUserValidator");
const validateRequest = require("../middlewares/validateRequest");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// --- Rutas admin ---
router.get(
    "/admin/users",
    requireAuth,
    permit("admin"),
    userController.getUsersAdmin
);

router.delete(
    "/admin/users/:id",
    requireAuth,
    permit("admin"),
    userController.deleteUserAdmin
);

router.patch(
    "/admin/users/:id/toggle",
    requireAuth,
    permit("admin"),
    userController.toggleActiveUser
);

// --- CRUD genérico ---
router.post(
    "/",
    requireAuth,
    permit("admin"),
    createUserValidator,
    validateRequest,
    userController.createUser
);

router.put(
    "/:id",
    requireAuth,
    permit("admin"),
    updateUserValidator,
    validateRequest,
    userController.updateUser
);

router.get(
    "/",
    requireAuth,
    permit("supervisor", "admin"),
    userController.getUsers
);

router.get(
    "/:id",
    requireAuth,
    permit("supervisor", "admin"),
    userController.getUserById
);

router.patch(
    "/admin/users/:id/role",
    requireAuth,
    permit("admin"),
    userController.updateUserRole
);

module.exports = router;