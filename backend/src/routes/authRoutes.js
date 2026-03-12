/**
 * ============================================================
 * RUTAS DE AUTENTICACIÓN (authRoutes.js)
 * ============================================================
 * Endpoints públicos para autenticación de usuarios.
 * 
 * POST /api/auth/register - Registro de nuevo usuario
 * POST /api/auth/login - Inicio de sesión (devuelve JWT)
 * GET  /api/auth/me - Perfil del usuario autenticado
 * POST /api/auth/forgot-password - Solicitar reset de contraseña
 * POST /api/auth/reset-password - Completar reset de contraseña
 */

const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { createUserValidator } = require("../validators/userValidator");
const { body } = require("express-validator");
const { validationResult } = require("express-validator");

/** Middleware para manejar errores de validación */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }
    next();
};

// Registro
router.post("/register", createUserValidator, validate, authController.register);

// Login
router.post(
    "/login",
    [
        body("email").isEmail().withMessage("Debe ser un email válido"),
        body("password").notEmpty().withMessage("La clave es obligatoria"),
    ],
    validate,
    authController.login
);

// Perfil
router.get("/me", requireAuth, authController.me);

// Recuperación de contraseña
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Debe ser un email válido")],
  validate,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  [
    body("token").isString().notEmpty().withMessage("Token es requerido"),
    body("password").isString().isLength({ min: 8 }).withMessage("La contraseña debe tener al menos 8 caracteres"),
  ],
  validate,
  authController.resetPassword
);

module.exports = router;