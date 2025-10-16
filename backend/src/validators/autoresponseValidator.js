// backend/src/validators/autoresponseValidator.js

const { body } = require("express-validator");

exports.createAutoresponseValidator = [
    body("response")
        .notEmpty()
        .withMessage("El campo 'response' es obligatorio"),

    body("isFallback")
        .optional()
        .isBoolean()
        .withMessage("'isFallback' debe ser true o false"),

    body("keyword")
        .custom((value, { req }) => {
            if (!req.body.isFallback && (!value || value.trim() === "")) {
                throw new Error("Debe especificar un 'keyword' si no es fallback");
            }
            return true;
        }),
];

exports.updateAutoresponseValidator = [
    body("response")
        .optional()
        .notEmpty()
        .withMessage("El campo 'response' no puede estar vacío"),

    body("isFallback")
        .optional()
        .isBoolean()
        .withMessage("'isFallback' debe ser true o false"),

    body("keyword")
        .custom((value, { req }) => {
            if (req.body.isFallback) return true; // si es fallback, keyword no es requerido
            if (value === undefined) return true; // no lo están actualizando → ok
            if (!value || value.trim() === "") {
                throw new Error("El 'keyword' no puede estar vacío si no es fallback");
            }
            return true;
        }),
];