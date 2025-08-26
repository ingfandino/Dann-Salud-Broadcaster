// src/validators/userValidator.js

const { body, param } = require("express-validator");
const User = require("../models/User");

exports.createUserValidator = [
    body("nombre")
        .notEmpty().withMessage("El nombre es obligatorio")
        .custom(async (value) => {
            const existingUser = await User.findOne({ nombre: value });
            if (existingUser) {
                throw new Error("El nombre de usuario ya está en uso");
            }
            return true;
        }),

    body("email")
        .isEmail().withMessage("Debe ser un email válido")
        .custom(async (value) => {
            const existingEmail = await User.findOne({ email: value });
            if (existingEmail) {
                throw new Error("El email ya está registrado");
            }
            return true;
        }),

    body("password")
        .isLength({ min: 6 }).withMessage("La clave debe tener mínimo 6 caracteres")
        .matches(/[a-z]/).withMessage("La clave debe contener al menos una minúscula")
        .matches(/[A-Z]/).withMessage("La clave debe contener al menos una mayúscula")
        .matches(/[0-9]/).withMessage("La clave debe contener al menos un número"),
];