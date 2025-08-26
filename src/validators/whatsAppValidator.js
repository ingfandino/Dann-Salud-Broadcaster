// src/validators/whatsAppValidator.js

const { body } = require("express-validator");

exports.sendMessageValidator = [
    body("to")
        .notEmpty().withMessage("El número de destino es obligatorio")
        .matches(/^549\d{10}$/).withMessage("El número debe comenzar con 549 y tener exactamente 13 dígitos (ej: 54 9 11 22334455)"),

    body("message")
        .notEmpty().withMessage("El mensaje no puede estar vacío")
        .isLength({ max: 1000 }).withMessage("El mensaje no puede exceder 1000 caracteres")
];