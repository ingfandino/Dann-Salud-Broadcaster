// backend/src/controllers/authController.js

const User = require("../models/User");
const { envConfig } = require("../config");
const { createUserValidator } = require("../validators/userValidator");
const logger = require("../utils/logger");
const { handleControllerError } = require("../utils/controllerUtils");
const { signToken } = require("../utils/jwt");
const crypto = require("crypto");
const { hasSmtpConfig, sendPasswordResetEmail } = require("../services/emailService");

// Registro
exports.register = async (req, res) => {
  try {

    const { username, nombre, email, password, numeroEquipo } = req.body;

    // Validar duplicados
    let userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        ok: false,
        code: "EMAIL_IN_USE",
        message: "El email ya está registrado"
      });
    }
    userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({
        ok: false,
        code: "USERNAME_IN_USE",
        message: "El nombre de usuario ya está en uso"
      });
    }

    // Crear nuevo usuario
    const user = new User({
      username,
      nombre,
      email,
      password,
      numeroEquipo,
      role: "asesor", // por defecto
      supervisor: null,
    });

    await user.save();

    return res.status(201).json({
      ok: true,
      message: "Registro exitoso. Un administrador debe activar su cuenta.",
    });
  } catch (err) {
    handleControllerError(err, res, "registro de usuario");
  }
};

// Solicitar recuperación de contraseña
// POST /api/auth/forgot-password { email }
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, message: "Email es requerido" });

    const user = await User.findOne({ email }).select("_id email active resetPasswordToken resetPasswordExpires");
    // Siempre responder 200 para no filtrar existencia de emails
    if (!user) {
      return res.json({ ok: true, message: "Si el email existe, se generó un enlace de recuperación." });
    }

    // Generar token y hash
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const ttlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES || 60);
    const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = expires;
    await user.save({ validateBeforeSave: false });

    // Intentar enviar email si hay SMTP configurado
    let emailSent = false;
    if (hasSmtpConfig()) {
      const baseUrl = process.env.FRONTEND_BASE_URL || process.env.APP_URL || `${req.protocol}://${req.get("host")}`;
      const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        const r = await sendPasswordResetEmail(user.email, resetUrl);
        emailSent = !!r?.sent;
      } catch { }
    }

    // En desarrollo devolvemos el token para facilitar pruebas. En producción NUNCA.
    const isDev = process.env.NODE_ENV === 'development';
    return res.json({
      ok: true,
      resetToken: isDev ? rawToken : undefined,
      expiresAt: isDev ? expires.toISOString() : undefined,
      emailSent
    });
  } catch (err) {
    handleControllerError(err, res, "solicitud de recuperación");
  }
};

// Resetear contraseña
// POST /api/auth/reset-password { token, password }
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ ok: false, message: "Token y nueva contraseña son requeridos" });
    if (String(password).length < 8) return res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 8 caracteres" });

    const hash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const user = await User.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: now }
    }).select("+password +resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ ok: false, message: "Token inválido o expirado" });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({ ok: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    handleControllerError(err, res, "reseteo de contraseña");
  }
};

// Login
exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Credenciales inválidas"
      });
    }

    if (!user.active) {
      return res.status(403).json({
        ok: false,
        code: "ACCOUNT_INACTIVE",
        message: "Cuenta inactiva. Espere activación por un administrador.",
      });
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      return res.status(401).json({
        ok: false,
        code: "INVALID_CREDENTIALS",
        message: "Credenciales inválidas"
      });
    }

    const token = signToken(user);

    return res.json({
      ok: true,
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        numeroEquipo: user.numeroEquipo, // ✅ Agregar numeroEquipo
        supervisor: user.supervisor || null,
        active: user.active,
      },
      token,
    });
  } catch (err) {
    handleControllerError(err, res, "autenticación de usuario");
  }
};

// Perfil
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "supervisor",
      "nombre email role"
    );
    if (!user) {
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "Usuario no encontrado"
      });
    }
    return res.json({
      ok: true,
      user: {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role,
        numeroEquipo: user.numeroEquipo, // ✅ Agregar numeroEquipo
        supervisor: user.supervisor || null,
        active: user.active,
      }
    });
  } catch (err) {
    handleControllerError(err, res, "obtención de perfil");
  }
};