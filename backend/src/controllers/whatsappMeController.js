// backend/src/controllers/whatsappMeController.js

const {
  getOrInitClient,
  forceNewSessionForUser,
  logoutForUser,
  isReady,
  getCurrentQR,
} = require("../services/whatsappManager");

const logger = require("../utils/logger");

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const connected = isReady(userId);
    let phoneNumber = null;
    if (connected) {
      const client = await getOrInitClient(userId);
      phoneNumber = client?.info?.wid?.user || null;
    }
    res.json({ connected, phoneNumber });
  } catch (err) {
    logger.error("[WA:me] Error en getStatus", { error: err?.message });
    res.status(500).json({ connected: false });
  }
};

exports.getQR = async (req, res) => {
  try {
    const userId = req.user._id;
    if (isReady(userId)) return res.json({ connected: true });
    const qr = getCurrentQR(userId);
    if (qr) return res.json({ qr });
    // Si no hay cliente aún, inicializar perezosamente para forzar emisión de QR
    await getOrInitClient(userId);
    return res.json({ qr: getCurrentQR(userId) || null });
  } catch (err) {
    logger.error("[WA:me] Error en getQR", { error: err?.message });
    res.status(500).json({ error: "Error interno" });
  }
};

exports.relink = async (req, res) => {
  try {
    const userId = req.user._id;
    await forceNewSessionForUser(userId);
    res.json({ message: "Reiniciando sesión de WhatsApp, escanee el nuevo QR" });
  } catch (err) {
    logger.error("[WA:me] Error en relink", { error: err?.message });
    res.status(500).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user._id;
    await logoutForUser(userId);
    const { getIO } = require("../config/socket");
    getIO().to(`user_${userId}`).emit("logout_success");
    res.json({ success: true, message: "Sesión cerrada y cliente reiniciado" });
  } catch (err) {
    logger.error("[WA:me] Error en logout", { error: err?.message });
    res.status(500).json({ error: "Error al cerrar sesión", details: err.message });
  }
};
