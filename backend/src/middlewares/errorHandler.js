// backend/src/middlewares/errorHandler.js

const isProduction = process.env.NODE_ENV === "production";
const crypto = require("crypto");
const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
    // Log detallado del error para monitoreo interno
    const status = err.statusCode || err.status || 500;
    const code = err.code || (status === 500 ? "INTERNAL_ERROR" : "UNHANDLED_ERROR");
    const message = isProduction && status === 500 ? "Internal Server Error" : (err.message || "Error");

    const traceId = crypto.randomUUID();

    logger.error(`[${new Date().toISOString()}] [${traceId}] Error:`, {
        message: err.message,
        stack: err.stack,
        route: req.originalUrl,
        method: req.method,
        user: req.user ? req.user._id : 'no autenticado',
        ip: req.ip
    });
    
    // Errores de validación de express-validator
    if (err.array && typeof err.array === 'function') {
        return res.status(400).json({ 
            ok: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Datos inválidos",
                traceId,
                details: isProduction ? "Revise los datos enviados" : err.array()
            }
        });
    }
    
    // Errores de Mongoose
    if (err.name === 'ValidationError') {
        return res.status(400).json({ 
            ok: false,
            error: {
                code: "VALIDATION_ERROR",
                message: "Error de validación",
                traceId,
                details: isProduction 
                    ? "Los datos no cumplen con los requisitos" 
                    : Object.values(err.errors).map(e => e.message)
            }
        });
    }
    
    if (err.name === 'CastError') {
        return res.status(400).json({ 
            ok: false,
            error: {
                code: "INVALID_FORMAT",
                message: "Formato de datos inválido",
                traceId,
                details: isProduction ? "Formato incorrecto" : err.message
            }
        });
    }
    
    // Errores de conexión a MongoDB
    if (err.name === 'MongoServerError' || err.name === 'MongoNetworkError') {
        logger.error('Error crítico de base de datos', { error: err });
        return res.status(503).json({ 
            ok: false,
            error: {
                code: "SERVICE_UNAVAILABLE",
                message: "Servicio temporalmente no disponible",
                traceId,
                retry: true
            }
        });
    }
    
    // Errores de JWT
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
            ok: false,
            error: {
                code: "INVALID_TOKEN",
                message: "Token inválido",
                traceId
            }
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
            ok: false,
            error: {
                code: "TOKEN_EXPIRED",
                message: "Token expirado",
                traceId
            }
        });
    }

    res.status(status).json({
        ok: false,
        error: {
            code,
            message,
            traceId,
            ...(err.details && !isProduction ? { details: err.details } : {})
        }
    });
}

module.exports = errorHandler;