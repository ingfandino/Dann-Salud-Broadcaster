// backend/src/validators/jobValidator.js

const { body } = require("express-validator");

exports.createJobValidator = [
    body("name")
        .optional()
        .isLength({ max: 100 })
        .withMessage("El nombre no puede superar los 100 caracteres"),

    body("templateId")
        .optional({ nullable: true, checkFalsy: true })
        .isMongoId()
        .withMessage("El templateId debe ser un ObjectId válido"),

    body("message")
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ min: 1, max: 2000 })
        .withMessage("El mensaje no puede estar vacío ni superar 2000 caracteres"),

    body("contacts")
        .isArray({ min: 1 })
        .withMessage("Debes especificar al menos un contacto"),

    // 🔹 Validación condicional: debe venir templateId o message
    body().custom((value) => {
        if (!value.templateId && !value.message) {
            throw new Error("Debes especificar un templateId o un mensaje libre");
        }
        return true;
    }),

    // Parámetros de envío
    body("delayMin")
        .optional()
        .isInt({ min: 0 }).withMessage("delayMin debe ser un entero >= 0"),
    body("delayMax")
        .optional()
        .isInt({ min: 1 }).withMessage("delayMax debe ser un entero >= 1"),
    body().custom((value) => {
        if (value.delayMin !== undefined || value.delayMax !== undefined) {
            const min = parseInt(value.delayMin ?? 0, 10);
            const max = parseInt(value.delayMax ?? 0, 10);
            if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
                throw new Error("delayMin no puede ser mayor que delayMax");
            }
        }
        return true;
    }),
    body("batchSize")
        .optional()
        .isInt({ min: 1 }).withMessage("batchSize debe ser un entero >= 1"),
    body("pauseBetweenBatches")
        .optional()
        .isInt({ min: 0 }).withMessage("pauseBetweenBatches (minutos) debe ser un entero >= 0"),
];