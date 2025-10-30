// backend/src/controllers/whatsappMeController.js

const {
  getOrInitClient,
  forceNewSessionForUser,
  logoutForUser,
  isReady: isReadyMulti,
  getCurrentQR: getCurrentQRMulti,
} = require("../services/whatsappManager");
const {
  getWhatsappClient,
  forceNewSession: forceNewSessionSingle,
  isReady: isReadySingle,
  getCurrentQR: getCurrentQRSingle,
} = require("../config/whatsapp");
const { getIO } = require("../config/socket");
const logger = require("../utils/logger");

const USE_MULTI = process.env.USE_MULTI_SESSION === 'true';

exports.getStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    if (USE_MULTI) {
      const connected = isReadyMulti(userId);
      let phoneNumber = null;
      if (connected) {
        const client = await getOrInitClient(userId);
        phoneNumber = client?.info?.wid?.user || null;
      }
      return res.json({ connected, phoneNumber });
    } else {
      const connected = isReadySingle();
      let phoneNumber = null;
      if (connected) {
        const client = getWhatsappClient();
        phoneNumber = client?.info?.wid?.user || null;
      }
      return res.json({ connected, phoneNumber });
    }
  } catch (err) {
    logger.error("[WA:me] Error en getStatus", { error: err?.message });
    res.status(500).json({ connected: false });
  }
};

exports.getQR = async (req, res) => {
  try {
    const userId = req.user._id;
    if (USE_MULTI) {
      // ✅ CORRECCIÓN: Verificar si está conectado primero
      if (isReadyMulti(userId)) {
        return res.json({ connected: true });
      }
      
      // Obtener QR actual si existe
      const qr = getCurrentQRMulti(userId);
      if (qr) {
        return res.json({ qr });
      }
      
      // ✅ CORRECCIÓN: Verificar si ya hay una sesión en proceso antes de inicializar
      const { getState } = require("../services/whatsappManager");
      const state = getState(userId);
      
      // Si ya existe un state (inicializando o esperando QR), no reinicializar
      if (state) {
        logger.debug(`[WA:me] Cliente ya existe para ${userId}, esperando QR...`);
        return res.json({ qr: null, initializing: true });
      }
      
      // Solo inicializar si no existe ningún cliente
      logger.info(`[WA:me] Inicializando nuevo cliente para ${userId}`);
      await getOrInitClient(userId);
      return res.json({ qr: getCurrentQRMulti(userId) || null });
    } else {
      if (isReadySingle()) return res.json({ connected: true });
      const qr = getCurrentQRSingle();
      return res.json({ qr: qr || null });
    }
  } catch (err) {
    logger.error("[WA:me] Error en getQR", { error: err?.message });
    res.status(500).json({ error: "Error interno" });
  }
};

exports.relink = async (req, res) => {
  try {
    const userId = req.user._id;
    if (USE_MULTI) {
      await forceNewSessionForUser(userId);
    } else {
      await forceNewSessionSingle();
    }
    res.json({ message: "Reiniciando sesión de WhatsApp, escanee el nuevo QR" });
  } catch (err) {
    logger.error("[WA:me] Error en relink", { error: err?.message });
    res.status(500).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = req.user._id;
    if (USE_MULTI) {
      await logoutForUser(userId);
      getIO().to(`user_${userId}`).emit("logout_success");
    } else {
      await forceNewSessionSingle();
      // Notificar solo al usuario actual (sigue teniendo room por JWT)
      getIO().to(`user_${userId}`).emit("logout_success");
    }
    res.json({ success: true, message: "Sesión cerrada y cliente reiniciado" });
  } catch (err) {
    logger.error("[WA:me] Error en logout", { error: err?.message });
    res.status(500).json({ error: "Error al cerrar sesión", details: err.message });
  }
};
