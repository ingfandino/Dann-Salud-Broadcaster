/**
 * ============================================================
 * RUTAS DE USUARIOS (userRoutes.js)
 * ============================================================
 * CRUD de usuarios y gestión de equipos.
 * 
 * Permisos por rol:
 * - Gerencia: acceso total
 * - RR.HH: editar usuarios, cambiar equipos
 * - Supervisores: ver usuarios de su equipo
 * - Asesores: solo su propio usuario
 */

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { createUserValidator } = require("../validators/userValidator");
const { updateUserValidator } = require("../validators/updateUserValidator");
const validateRequest = require("../middlewares/validateRequest");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

/* ========== RUTAS ADMIN ========== */
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
    permit("gerencia", "RR.HH"),
    updateUserValidator,
    validateRequest,
    userController.updateUser
);

router.delete(
    "/:id",
    requireAuth,
    permit("gerencia"),
    userController.deleteUser
);

// Ruta específica para actualizar solo la contraseña
router.put(
    "/:id/password",
    requireAuth,
    permit("gerencia"),
    userController.updateUserPassword
);


router.get(
    "/",
    requireAuth,
    permit("supervisor", "administrativo", "auditor", "gerencia", "RR.HH", "asesor", "recuperador", "encargado", "independiente"),
    userController.getUsers
);

router.get(
    "/:id",
    requireAuth,
    permit("supervisor", "administrativo", "gerencia", "RR.HH"),
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
    permit("gerencia", "administrativo", "auditor", "supervisor", "RR.HH", "encargado"),
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

// ✅ Team History Management Routes
router.post(
    "/:id/team-change",
    requireAuth,
    permit("gerencia", "administrativo", "RR.HH", "encargado"),
    userController.addTeamChange
);

router.put(
    "/:id/team-history/:periodId",
    requireAuth,
    permit("gerencia", "administrativo", "RR.HH", "encargado"),
    userController.editTeamPeriod
);

router.delete(
    "/:id/team-history/:periodId",
    requireAuth,
    permit("gerencia", "administrativo", "RR.HH", "encargado"),
    userController.deleteTeamPeriod
);

// ✅ Suspension Management Routes (Solo Gerencia)
router.post(
    "/:id/suspend",
    requireAuth,
    permit("gerencia"),
    userController.suspendUser
);

router.delete(
    "/:id/suspend",
    requireAuth,
    permit("gerencia"),
    userController.cancelSuspension
);

module.exports = router;