/**
 * ============================================================
 * UTILIDADES DE CONTROLADORES (controllerUtils.js)
 * ============================================================
 * Funciones helper para manejo de errores en controladores.
 * Genera traceId y respuestas estructuradas.
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

/**
 * Maneja errores en controladores de forma consistente.
 * Detecta errores de MongoDB y devuelve respuestas apropiadas.
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