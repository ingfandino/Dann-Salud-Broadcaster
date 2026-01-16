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
const AutoResponseLog = require("../models/AutoResponseLog");
const SendJob = require("../models/SendJob");
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
const { getIO } = require("../config/socket");

/** Listener de mensajes entrantes - procesa auto-respuestas */
whatsappEvents.on("message", async (msg) => {
    try {
        if (msg.fromMe) return;

        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const enviado = await Message.findOne({ 
            to: msg.from, 
            direction: "outbound",
            timestamp: { $gte: twentyFourHoursAgo }
        }).sort({ timestamp: -1 });
        
        if (!enviado) {
            logger.info(`⚠️ Mensaje entrante ignorado (no corresponde a campaña): ${msg.from}`);
            return;
        }

        await Message.updateMany(
            { to: msg.from, direction: "outbound" },
            { $set: { respondio: true } }
        );
        logger.info(`📩 Respuesta recibida de contacto de campaña: ${msg.from}`);

        // Obtener el creador de la campaña para buscar sus auto-respuestas
        let jobCreatorId = null;
        if (enviado.job) {
            const job = await SendJob.findById(enviado.job).select('createdBy').lean();
            if (job?.createdBy) {
                jobCreatorId = job.createdBy;
                logger.info(`📌 Job ${enviado.job} creado por usuario ${jobCreatorId}`);
            }
        }

        if (!jobCreatorId) {
            logger.warn(`⚠️ No se pudo determinar el creador de la campaña para ${msg.from}`);
            return;
        }

        // Registrar mensaje inbound
        try {
            await Message.create({
                contact: enviado.contact,
                createdBy: jobCreatorId,
                job: enviado.job,
                contenido: msg.body || '',
                direction: 'inbound',
                status: 'recibido',
                timestamp: new Date(),
                from: msg.from
            });
            logger.info(`📥 Mensaje inbound registrado de ${msg.from} (job: ${enviado.job})`);

            try {
                getIO().to('jobs').emit('campaign:reply', {
                    campaignId: enviado.job,
                    jobId: enviado.job,
                    contact: enviado.contact,
                    timestamp: new Date()
                });
            } catch (e) {
                logger.warn(`⚠️ Error emitiendo evento campaign:reply:`, e.message);
            }
        } catch (e) {
            logger.error(`❌ Error registrando mensaje inbound:`, e.message);
        }

        // Cargar reglas de auto-respuesta del creador de la campaña
        const reglas = await Autoresponse.find({ createdBy: jobCreatorId, active: true });
        if (reglas.length) {
            const normalize = (s) => (s || "").toLowerCase().trim();
            const bodyNorm = normalize(msg.body);
            
            const matched = reglas.find(r => {
                const kw = normalize(r.keyword);
                if (!kw) return false;
                const mt = r.matchType || "contains";
                if (mt === "exact") return bodyNorm === kw;
                if (mt === "startsWith") return bodyNorm.startsWith(kw);
                if (mt === "endsWith") return bodyNorm.endsWith(kw);
                return bodyNorm.includes(kw);
            });
            
            const rule = matched || reglas.find(r => r.isFallback);
            if (rule) {
                // Anti-spam: verificar por creador de la campaña
                const windowMinutes = Number(process.env.AUTORESPONSE_WINDOW_MINUTES || 30);
                const since = new Date(Date.now() - windowMinutes * 60 * 1000);
                const recent = await AutoResponseLog.findOne({
                    createdBy: jobCreatorId,
                    chatId: msg.from,
                    respondedAt: { $gte: since },
                }).sort({ respondedAt: -1 }).lean();

                if (!recent) {
                    const client = getWhatsappClient();
                    if (client) {
                        try {
                            await client.sendMessage(msg.from, rule.response);
                            logger.info(`🤖 Auto-respuesta enviada (${rule.keyword || "fallback"}) para campaña de usuario ${jobCreatorId}`);

                            await AutoResponseLog.create({
                                createdBy: jobCreatorId,
                                chatId: msg.from,
                                ruleId: rule._id,
                                respondedAt: new Date(),
                                job: enviado.job,
                                contact: enviado.contact,
                                keyword: rule.keyword || null,
                                response: rule.response,
                                isFallback: rule.isFallback || false,
                                userMessage: msg.body || ''
                            });

                            try {
                                getIO().emit('auto_response:sent', {
                                    contact: enviado.contact,
                                    keyword: rule.keyword || "Fallback",
                                    response: rule.response,
                                    timestamp: new Date()
                                });
                            } catch (e) {
                                logger.warn(`⚠️ Error emitiendo evento auto_response:sent:`, e.message);
                            }
                        } catch (e) {
                            logger.warn(`⚠️ Error enviando auto-respuesta:`, e.message);
                        }
                    }
                } else {
                    logger.info(`⏸️ Auto-respuesta omitida (anti-spam) para ${msg.from}`);
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