// src/middlewares/authMiddleware.js

const { verifyToken } = require("../utils/jwt");
const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

// Verifica JWT. Debe ir antes de checks de rol
exports.requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: "Usuario no válido" });

    req.user = {
      _id: user._id,
      rol: user.rol,
      supervisor: user.supervisor,
    };
    next();
  } catch (_err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};