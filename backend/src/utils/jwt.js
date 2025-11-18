// backend/src/utils/jwt.js

const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d"; // 30 días para evitar deslogueos frecuentes

if (!JWT_SECRET || JWT_SECRET === "dev_secret_change_me") {
  logger.error("FATAL ERROR: JWT_SECRET no está definido o es inseguro. Por favor, configúrelo en su archivo .env");
  process.exit(1);
}

function signToken(user) {
  const role = user.role || user.rol || "asesor";
  const nombre = user.nombre || user.name || user.email || "Usuario";
  return jwt.sign(
    { 
      sub: user._id.toString(), 
      role,
      nombre,
      email: user.email 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };