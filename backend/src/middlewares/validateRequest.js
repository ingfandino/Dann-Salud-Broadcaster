/**
 * ============================================================
 * MIDDLEWARE DE VALIDACIÓN (validateRequest.js)
 * ============================================================
 * Procesa errores de express-validator y devuelve
 * respuesta estructurada con detalles de cada error.
 */

const { validationResult } = require("express-validator");

/** Middleware que procesa errores de validación */
const validateRequest = (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const errors = result.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value === undefined ? null : err.value
    }));

    return res.status(400).json({
        ok: false,
        error: {
            code: "VALIDATION_ERROR",
            message: "Errores de validación",
            details: errors
        }
    });
};

module.exports = validateRequest;