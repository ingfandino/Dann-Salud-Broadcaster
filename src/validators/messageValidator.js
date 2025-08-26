// src/validators/messageValidator.js

const { body } = require("express-validator");

exports.createMessageValidator = [
  body("contact")
    .notEmpty().withMessage("El contacto es obligatorio"),
  body("contenido")
    .notEmpty().withMessage("El contenido del mensaje no puede estar vacío"),
];