/**
 * ============================================================
 * MIDDLEWARE DE AUTENTICACIÓN (authMiddleware.js)
 * ============================================================
 * Valida tokens JWT y adjunta el usuario al request.
 * Protege rutas que requieren autenticación.
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger").getLogger("session");
const { verifyToken } = require("../utils/jwt");

/** Middleware que protege rutas requiriendo JWT válido */
exports.requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const traceId = require("crypto").randomUUID();
  
  if (!authHeader) {
    logger.debug(`[DIAGNOSTIC] [${traceId}] Auth: No authorization header - ${req.originalUrl}`);
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    // Unificar verificación usando util compartido y aceptar `id` o `sub`.
    const decoded = verifyToken(token);

    // En el controller usamos `id`, y en utils usamos `sub`
    const userId = decoded.id || decoded.sub || decoded._id;
    if (!userId) {
      logger.warn(`[DIAGNOSTIC] [${traceId}] Auth: Token sin userId - ${req.originalUrl}`);
      return res.status(401).json({ error: "Token inválido (sin id)" });
    }

    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`[DIAGNOSTIC] [${traceId}] Auth: Usuario no encontrado - ${userId} - ${req.originalUrl}`);
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    // ✅ Verificar suspensión temporal
    if (user.suspensionStart && user.suspensionEnd) {
      const now = new Date();
      const suspStart = new Date(user.suspensionStart);
      const suspEnd = new Date(user.suspensionEnd);
      
      if (now >= suspStart && now <= suspEnd) {
        logger.warn(`⛔ Acceso denegado: Usuario ${user.email} suspendido hasta ${suspEnd.toLocaleDateString()}`);
        return res.status(403).json({ 
          error: "Cuenta suspendida", 
          code: "ACCOUNT_SUSPENDED",
          message: `Tu cuenta se encuentra suspendida temporalmente hasta el ${suspEnd.toLocaleDateString('es-AR')}.`,
          suspensionEnd: suspEnd
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    // Manejar específicamente el token expirado
    if (err.name === 'TokenExpiredError') {
      logger.warn(`[DIAGNOSTIC] [${traceId}] Auth: Token expirado - ${req.originalUrl}`);
      return res.status(401).json({ 
        error: "Sesión expirada", 
        code: "TOKEN_EXPIRED",
        message: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente." 
      });
    }
    
    // DIAGNOSTIC: Log full error details for auth failures that might precede 500s
    logger.error(`[DIAGNOSTIC] [${traceId}] Auth: Error inesperado - ${req.originalUrl}`, {
      message: err.message,
      name: err.name,
      stack: err.stack,
      tokenPresent: !!token
    });
    return res.status(401).json({ error: "Token inválido" });
  }
};