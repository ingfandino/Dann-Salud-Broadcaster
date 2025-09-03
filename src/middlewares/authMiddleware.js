// src/middlewares/authMiddleware.js

const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

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
      role: user.role || user.rol || "asesor",
      supervisor: user.supervisor,
    };
    next();
  } catch (_err) {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};