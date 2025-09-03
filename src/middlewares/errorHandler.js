// src/middlewares/errorHandler.js

const isProduction = process.env.NODE_ENV === "production";

function errorHandler(err, req, res, next) {
    // Normalize
    const status = err.statusCode || err.status || 500;
    const code = err.code || (status === 500 ? "INTERNAL_ERROR" : "UNHANDLED_ERROR");
    const message = isProduction && status === 500 ? "Internal Server Error" : (err.message || "Error");

    // Log estructurado
    console.error(`[${new Date().toISOString()}] Error:`, {
        message: err.message,
        stack: err.stack,
        route: req.originalUrl,
        method: req.method,
        user: req.user ? req.user._id : null
    });

    res.status(status).json({
        ok: false,
        error: {
            code,
            message,
            ...(err.details ? { details: err.details } : {})
        }
    });
}

module.exports = errorHandler;