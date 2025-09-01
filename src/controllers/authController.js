// src/controllers/authController.js

const User = require("../models/User");
const { signToken } = require("../utils/jwt");

// Registro
exports.register = async (req, res) => {
  try {
    const { nombre, email, password, rol, supervisor } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email ya registrado" });

    // 🔒 Restricción de roles
    let finalRol = "asesor"; // por defecto
    let finalSupervisor = supervisor || null;

    if (rol && rol !== "asesor") {
      // Solo admin autenticado puede crear supervisores/admins
      if (!req.user || req.user.rol !== "admin") {
        return res.status(403).json({ error: "No autorizado para crear usuarios con rol alto" });
      }
      finalRol = rol;
    }

    const user = new User({
      nombre,
      email,
      password,
      rol: finalRol,
      supervisor: finalSupervisor,
    });
    await user.save();

    const token = signToken(user);
    res.status(201).json({
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        supervisor: user.supervisor || null,
      },
      token,
    });
  } catch (err) {
    console.error("❌ Error en register:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = signToken(user);
    res.json({
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        supervisor: user.supervisor || null,
      },
      token,
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    res.status(500).json({ error: "Error interno" });
  }
};

// WhoAmI
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("supervisor", "nombre email rol");
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      supervisor: user.supervisor || null,
    });
  } catch (err) {
    console.error("❌ Error en me:", err);
    res.status(500).json({ error: "Error interno" });
  }
};