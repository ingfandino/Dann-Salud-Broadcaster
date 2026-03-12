/**
 * ============================================================
 * CONTROLADOR DE WHATSAPP POR USUARIO (whatsappMeController)
 * ============================================================
 * Gestiona sesiones individuales de WhatsApp por usuario.
 * Permite que cada usuario tenga su propia conexión de WhatsApp.
 * 
 * Soporta múltiples implementaciones:
 * - whatsapp-web.js (Puppeteer)
 * - Baileys (WebSocket directo)
 */

const {
  getOrInitClient,
  isReady,
  getCurrentQR,
  forceNewSession,
  logoutUser,
  getUserInfo,
  USE_BAILEYS,
  USE_MULTI,
} = require("../services/whatsappUnified");
const { getIO } = require("../config/socket");
const logger = require("../utils/logger");
const QRCode = require("qrcode");

logger.info(`[WA:me] Usando ${USE_BAILEYS ? 'Baileys' : 'whatsapp-web.js'}, Multi: ${USE_MULTI}`);

/** Obtiene el estado de conexión del usuario */
exports.getStatus = async (req, res) => {
  try {
    const userId = USE_MULTI ? req.user._id : null;
    const connected = isReady(userId);
    
    let phoneNumber = null;
    if (connected) {
      try {
        const info = await getUserInfo(userId);
        phoneNumber = info?.id?.split('@')[0] || info?.pushName || null;
      } catch (err) {
        logger.warn("[WA:me] No se pudo obtener info del usuario:", err.message);
      }
    }
    
    return res.json({ 
      connected, 
      phoneNumber,
      implementation: USE_BAILEYS ? 'Baileys' : 'whatsapp-web.js'
    });
  } catch (err) {
    logger.error("[WA:me] Error en getStatus", { error: err?.message });
    res.status(500).json({ connected: false });
  }
};

exports.getQR = async (req, res) => {
  try {
    const userId = USE_MULTI ? req.user._id : null;
    
    // Verificar si ya está conectado
    if (isReady(userId)) {
      return res.json({ connected: true });
    }
    
    // Obtener QR actual si existe
    const qrText = getCurrentQR(userId);
    if (qrText) {
      // ✅ Convertir texto QR a imagen data URL
      try {
        const qrDataUrl = await QRCode.toDataURL(qrText, {
          width: 256,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        return res.json({ qr: qrDataUrl });
      } catch (qrErr) {
        logger.error("[WA:me] Error generando imagen QR:", qrErr.message);
        return res.json({ qr: null, error: "Error generando QR" });
      }
    }
    
    // 🔒 Verificar si ya existe un cliente (aunque no esté listo aún)
    const { getClient } = require("../services/whatsappUnified").implementation;
    const existingClient = getClient ? getClient(userId) : null;
    
    if (existingClient) {
      // Ya hay un cliente inicializando, no crear otro
      logger.debug(`[WA:me] Cliente ya existe para ${userId || 'single'}, esperando...`);
      return res.json({ qr: null, initializing: true });
    }
    
    // Solo inicializar si NO existe ningún cliente
    logger.info(`[WA:me] Inicializando nuevo cliente para ${userId || 'single'}`);
    getOrInitClient(userId).catch(err => {
      logger.error(`[WA:me] Error en init asíncrono:`, err.message);
    });
    
    return res.json({ qr: null, initializing: true });
  } catch (err) {
    logger.error("[WA:me] Error en getQR", { error: err?.message });
    res.status(500).json({ error: "Error interno" });
  }
};

exports.relink = async (req, res) => {
  try {
    const userId = USE_MULTI ? req.user._id : null;
    
    logger.info(`[WA:me] Forzando nueva sesión para ${userId || 'single'}`);
    await forceNewSession(userId);
    
    res.json({ message: "Reiniciando sesión de WhatsApp, escanee el nuevo QR" });
  } catch (err) {
    logger.error("[WA:me] Error en relink", { error: err?.message });
    res.status(500).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const userId = USE_MULTI ? req.user._id : null;
    
    logger.info(`[WA:me] Logout para ${userId || 'single'}`);
    await logoutUser(userId);
    
    // Baileys ya emite logout_success internamente
    // Para whatsapp-web.js single, emitir manualmente
    if (!USE_MULTI && !USE_BAILEYS) {
      getIO().to(`user_${req.user._id}`).emit("logout_success");
    }
    
    res.json({ success: true, message: "Sesión cerrada exitosamente" });
  } catch (err) {
    logger.error("[WA:me] Error en logout", { error: err?.message });
    res.status(500).json({ error: "Error al cerrar sesión", details: err.message });
  }
};
