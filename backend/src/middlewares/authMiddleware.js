// backend/src/middlewares/authMiddleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");
const { verifyToken } = require("../utils/jwt");

// Middleware para proteger rutas
exports.requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    // Unificar verificación usando util compartido y aceptar `id` o `sub`.
    const decoded = verifyToken(token);

    // En el controller usamos `id`, y en utils usamos `sub`
    const userId = decoded.id || decoded.sub || decoded._id;
    if (!userId) {
      return res.status(401).json({ error: "Token inválido (sin id)" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.error("❌ Error en requireAuth:", err);
    return res.status(401).json({ error: "Token inválido" });
  }
};