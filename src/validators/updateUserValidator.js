// src/validators/updateUserValidator.js

const { body, param } = require("express-validator");
const User = require("../models/User");

exports.updateUserValidator = [
    param("id").isMongoId().withMessage("ID de usuario inválido"),

    body("nombre")
        .optional()
        .notEmpty().withMessage("El nombre no puede estar vacío")
        .custom(async (value, { req }) => {
            const existingUser = await User.findOne({ nombre: value });
            if (existingUser && existingUser._id.toString() !== req.params.id) {
                throw new Error("El nombre de usuario ya está en uso por otro usuario");
            }
            return true;
        }),

    body("email")
        .optional()
        .isEmail().withMessage("Debe ser un email válido")
        .custom(async (value, { req }) => {
            const existingEmail = await User.findOne({ email: value });
            if (existingEmail && existingEmail._id.toString() !== req.params.id) {
                throw new Error("El email ya está registrado por otro usuario");
            }
            return true;
        }),

    body("password")
        .optional()
        .isLength({ min: 6 }).withMessage("La clave debe tener mínimo 6 caracteres")
        .matches(/[a-z]/).withMessage("La clave debe contener al menos una minúscula")
        .matches(/[A-Z]/).withMessage("La clave debe contener al menos una mayúscula")
        .matches(/[0-9]/).withMessage("La clave debe contener al menos un número"),
];