/**
 * ============================================================
 * CONTROLADOR DE WHATSAPP (whatsappController)
 * ============================================================
 * Gestiona la conexión global de WhatsApp Web para mensajería masiva.
 * Maneja eventos de mensajes entrantes y auto-respuestas.
 * 
 * Este controlador usa la sesión compartida (config/whatsapp.js).
 * Para sesiones individuales por usuario, ver whatsappMeController.
 */

const Message = require("../models/Message");
const Autoresponse = require("../models/Autoresponse");
const fs = require("fs");
const {
    getWhatsappClient,
    initWhatsappClient,
    whatsappEvents,
    forceNewSession,
    isReady,
    getSessionPath,
} = require("../config/whatsapp");
const connectionManager = require('../services/connectionManager');
const logger = require("../utils/logger");

/** Listener de mensajes entrantes - procesa auto-respuestas */
whatsappEvents.on("message", async (msg) => {
    try {
        if (msg.fromMe) return;

        const enviado = await Message.findOne({ to: msg.from, direction: "outbound" });
        if (!enviado) {
            logger.info(`⚠️ Mensaje entrante ignorado (no corresponde a campaña): ${msg.from}`);
            return;
        }

        await Message.updateMany(
            { to: msg.from, direction: "outbound" },
            { $set: { respondio: true } }
        );
        logger.info(`📩 Respuesta recibida de contacto de campaña: ${msg.from}`);

        // ✅ CORRECCIÓN: Auto-respuestas con comparación exacta por defecto
        const reglas = await Autoresponse.find({ active: true });
        if (reglas.length) {
            const normalize = (s) => (s || "").toLowerCase().trim();
            const bodyNorm = normalize(msg.body);
            
            // Buscar regla que coincida
            const matched = reglas.find(r => {
                const kw = normalize(r.keyword);
                if (!kw) return false;
                const mt = r.matchType || "exact"; // Default a exact
                return mt === "exact" ? bodyNorm === kw : bodyNorm.includes(kw);
            });
            
            const rule = matched || reglas.find(r => r.isFallback);
            if (rule) {
                const client = getWhatsappClient();
                if (client) {
                    await client.sendMessage(msg.from, rule.response);
                    logger.info(`🤖 Auto-respuesta enviada (${rule.keyword || "fallback"}) - matchType: ${rule.matchType || "exact"}`);
                }
            }
        }
    } catch (err) {
        logger.error("❌ Error procesando mensaje entrante:", err.message);
    }
});

// Cerrar sesión
const logout = async (req, res) => {
    try {
        const client = getWhatsappClient();
        // 1) Logout del cliente si existe
        if (client) {
            try { await client.logout(); } catch {}
        }

        // 2) Borrar credenciales de LocalAuth para evitar reconexión automática
        const dataPath = getSessionPath();
        try {
            if (fs.existsSync(dataPath)) {
                fs.rmSync(dataPath, { recursive: true, force: true });
                logger.info(`🧹 Credenciales de WhatsApp eliminadas en: ${dataPath}`);
            }
        } catch (err) {
            logger.warn("No se pudieron eliminar las credenciales de WhatsApp", { error: err.message });
        }

        // 3) Re-inicializar forzando nueva sesión para generar un nuevo QR fresco y emitir eventos
        await forceNewSession();

        // 4) Notificar a los clientes que el logout fue exitoso
        const { getIO } = require("../config/socket");
        getIO().emit("logout_success");

        return res.json({ success: true, message: "Sesión cerrada y cliente reiniciado" });
    } catch (err) {
        logger.error("❌ Error al cerrar sesión:", err);
        return res.status(500).json({ error: "Error al cerrar sesión", details: err.message });
    }
};

// Forzar nueva sesión
const relink = async (req, res) => {
    try {
        await forceNewSession();
        res.json({ message: "Reiniciando sesión de WhatsApp, escanee el nuevo QR" });
    } catch (err) {
        logger.error("❌ Error en relink:", err);
        res.status(500).json({ error: err.message });
    }
};

// 🔍 Estado actual del cliente
const getStatus = async (req, res) => {
    try {
        res.json({
            connected: isReady(),
            phoneNumber: getWhatsappClient()?.info?.wid?.user || null
        });
    } catch (err) {
        logger.error("❌ Error consultando estado:", err);
        res.status(500).json({ connected: false });
    }
};

async function init(req, res) {
  try {
    const userId = req.user.id;
    logger.info(`[API] Inicializando WhatsApp para usuario ${userId}`);
    
    await connectionManager.addToQueue(userId);
    res.json({ status: 'En cola', message: 'Tu conexión está en cola para ser inicializada' });
  } catch (error) {
    logger.error('Error al inicializar WhatsApp:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getQueueStatus(req, res) {
  try {
    const status = connectionManager.getQueueStatus();
    res.json(status);
  } catch (error) {
    logger.error('Error al obtener estado de la cola:', error);
    res.status(500).json({ error: error.message });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    init,
    getQueueStatus,
    relink,
    logout,
    getStatus
  };
}