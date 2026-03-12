// backend/src/validators/userValidator.js

const { body } = require("express-validator");
const User = require("../models/User");

exports.createUserValidator = [
    // 🔹 Validar username
    body("username")
        .notEmpty().withMessage("El nombre de usuario es obligatorio")
        .isLength({ min: 3 }).withMessage("El nombre de usuario debe tener al menos 3 caracteres")
        .custom(async (value) => {
            const existingUser = await User.findOne({ username: value });
            if (existingUser) {
                throw new Error("El nombre de usuario ya está en uso");
            }
            return true;
        }),

    // 🔹 Validar nombre (no único, pero obligatorio)
    body("nombre")
        .notEmpty().withMessage("El nombre completo es obligatorio"),

    // 🔹 Validar email
    body("email")
        .isEmail().withMessage("Debe ser un email válido")
        .custom(async (value) => {
            const existingEmail = await User.findOne({ email: value });
            if (existingEmail) {
                throw new Error("El email ya está registrado");
            }
            return true;
        }),

    // 🔹 Validar password
    body("password")
        .isLength({ min: 6 }).withMessage("La clave debe tener mínimo 6 caracteres")
        .matches(/[a-z]/).withMessage("La clave debe contener al menos una minúscula")
        .matches(/[A-Z]/).withMessage("La clave debe contener al menos una mayúscula")
        .matches(/[0-9]/).withMessage("La clave debe contener al menos un número"),

    // 🔹 Validar número de equipo (opcional)
    body("numeroEquipo")
        .optional()
        .isString().withMessage("El número de equipo debe ser texto"),
];