// backend/src/utils/controllerUtils.js
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Utilidad para manejar errores en controladores de forma consistente
 * @param {Error} error - El error capturado
 * @param {Object} res - Objeto de respuesta Express
 * @param {string} operacion - Descripción de la operación que falló
 * @param {number} statusCode - Código de estado HTTP (opcional, default 500)
 */
exports.handleControllerError = (error, res, operacion, statusCode = 500) => {
  const traceId = uuidv4();
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Determinar si es un error de MongoDB
  const isMongoError = error.name === 'MongoError' || 
                       error.name === 'MongoServerError' ||
                       error.name === 'MongoNetworkError';
  
  // En caso de error de conexión a MongoDB, devolver 503
  if (isMongoError && (error.code === 'ECONNREFUSED' || error.message.includes('connect'))) {
    logger.error(`❌ Error de conexión a MongoDB [${traceId}]: ${operacion}`, error);
    return res.status(503).json({
      ok: false,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Servicio de base de datos no disponible',
      traceId
    });
  }
  
  // Log detallado del error
  logger.error(`❌ Error en ${operacion} [${traceId}]:`, error);
  
  // Respuesta al cliente
  return res.status(statusCode).json({
    ok: false,
    code: isMongoError ? 'DATABASE_ERROR' : 'SERVER_ERROR',
    message: isProduction 
      ? 'Ha ocurrido un error en el servidor' 
      : error.message || 'Error interno del servidor',
    traceId,
    ...(isProduction ? {} : { stack: error.stack })
  });
};