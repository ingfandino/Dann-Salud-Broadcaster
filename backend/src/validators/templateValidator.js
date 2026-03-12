// src/validators/templateValidator.js

const { body } = require("express-validator");

// Validaciones para crear plantilla
exports.createTemplateValidator = [
    body("nombre")
        .notEmpty()
        .withMessage("El campo 'nombre' es obligatorio")
        .isLength({ max: 100 })
        .withMessage("El nombre no puede superar los 100 caracteres"),

    body("contenido")
        .notEmpty()
        .withMessage("El campo 'contenido' es obligatorio")
        .isLength({ max: 2000 })
        .withMessage("El contenido no puede superar los 2000 caracteres"),
];

// Validaciones para actualizar plantilla
exports.updateTemplateValidator = [
    body("nombre")
        .optional()
        .notEmpty()
        .withMessage("El nombre no puede estar vacío")
        .isLength({ max: 100 })
        .withMessage("El nombre no puede superar los 100 caracteres"),

    body("contenido")
        .optional()
        .notEmpty()
        .withMessage("El contenido no puede estar vacío")
        .isLength({ max: 2000 })
        .withMessage("El contenido no puede superar los 2000 caracteres"),
];