// src/validators/contactValidator.js

const { body } = require("express-validator");

exports.createContactValidator = [
    body("nombre")
        .notEmpty().withMessage("El nombre es obligatorio"),
        
    body("telefono")
        .notEmpty().withMessage("El teléfono es obligatorio"),
    body("cuil")
        .notEmpty().withMessage("El CUIL es obligatorio"),
];