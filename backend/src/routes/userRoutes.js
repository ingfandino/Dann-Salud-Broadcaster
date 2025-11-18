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
    permit("supervisor", "admin", "auditor", "gerencia", "rrhh"),
    userController.getUsers
);

router.get(
    "/:id",
    requireAuth,
    permit("supervisor", "admin", "gerencia", "rrhh"),
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

// Endpoint compatible con frontend (devuelve grupos como array de objetos)
router.get(
    "/groups",
    requireAuth,
    permit("gerencia", "admin", "auditor", "supervisor", "rrhh"),
    async (req, res) => {
        try {
            const User = require("../models/User");
            const grupos = await User.distinct("numeroEquipo", { 
                deletedAt: null,
                numeroEquipo: { $exists: true, $ne: null, $ne: "" }
            });
            
            // Ordenar y formatear como array de objetos con _id y nombre
            grupos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
            
            const gruposFormateados = grupos.map(g => ({
                _id: g, // usar el numeroEquipo como _id
                nombre: g,
                name: g
            }));
            
            res.json(gruposFormateados);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

module.exports = router;