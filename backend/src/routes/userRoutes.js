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
    permit("gerencia"),
    userController.getUsersAdmin
);

router.delete(
    "/admin/users/:id",
    requireAuth,
    permit("gerencia"),
    userController.deleteUserAdmin
);

router.patch(
    "/admin/users/:id/toggle",
    requireAuth,
    permit("gerencia"),
    userController.toggleActiveUser
);

// --- CRUD genérico ---
router.post(
    "/",
    requireAuth,
    permit("gerencia"),
    createUserValidator,
    validateRequest,
    userController.createUser
);

router.put(
    "/:id",
    requireAuth,
    permit("gerencia"),
    updateUserValidator,
    validateRequest,
    userController.updateUser
);

router.get(
    "/",
    requireAuth,
    permit("supervisor", "admin", "auditor", "gerencia"),
    userController.getUsers
);

router.get(
    "/:id",
    requireAuth,
    permit("supervisor", "admin", "gerencia"),
    userController.getUserById
);

router.patch(
    "/admin/users/:id/role",
    requireAuth,
    permit("gerencia"),
    userController.updateUserRole
);

router.get(
    "/admin/grupos",
    requireAuth,
    permit("gerencia"),
    userController.getAvailableGroups
);

module.exports = router;