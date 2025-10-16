// backend/src/validators/jobValidator.js

const { body } = require("express-validator");

exports.createJobValidator = [
    body("name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("El nombre no puede superar los 100 caracteres"),

    body("templateId")
        .optional()
        .isMongoId()
        .withMessage("El templateId debe ser un ObjectId válido"),

    body("message")
        .optional()
        .isLength({ min: 1, max: 2000 })
        .withMessage("El mensaje no puede estar vacío ni superar 2000 caracteres"),

    body("contacts")
        .isArray({ min: 1 })
        .withMessage("Debes especificar al menos un contacto"),

    body("createdBy")
        .notEmpty()
        .withMessage("El campo 'createdBy' es obligatorio"),

    // 🔹 Validación condicional: debe venir templateId o message
    body().custom((value) => {
        if (!value.templateId && !value.message) {
            throw new Error("Debes especificar un templateId o un mensaje libre");
        }
        return true;
    }),
];