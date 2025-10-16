// backend/src/services/whatsappManager.js

const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");
const Message = require("../models/Message");
const Autoresponse = require("../models/Autoresponse");
const AutoResponseLog = require("../models/AutoResponseLog");
const { getIO } = require("../config/socket");

// Mapa de clientes por usuario
const clients = new Map(); // userId -> { client, ready, currentQR, qrTimeout }

function getSessionPathForUser(userId) {
  const base = process.env.WHATSAPP_SESSION_BASE || path.resolve(process.cwd(), ".wwebjs_auth_multi");
  const userPath = path.join(base, String(userId));
  return userPath;
}

async function initClientForUser(userId) {
  const existing = clients.get(String(userId));
  if (existing?.client) {
    try { await existing.client.destroy(); } catch {}
  }

  const state = { client: null, ready: false, currentQR: null, qrTimeout: null };
  clients.set(String(userId), state);

  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: getSessionPathForUser(userId) }),
    puppeteer: { headless: true, args: ["--no-sandbox"] },
  });

  // Encapsular room por usuario
  const room = `user_${userId}`;

  client.on("qr", (qr) => {
    logger.info(`[WA][${userId}] QR recibido`);
    state.currentQR = qr;
    // Emitir solo al usuario dueño
    try { getIO().to(room).emit("qr", qr); } catch {}
    if (state.qrTimeout) clearTimeout(state.qrTimeout);
    state.qrTimeout = setTimeout(() => {
      logger.warn(`[WA][${userId}] QR expirado, regenerando...`);
      try { getIO().to(room).emit("qr_expired"); } catch {}
      forceNewSessionForUser(userId);
    }, 60000);
  });

  client.on("authenticated", () => {
    logger.info(`[WA][${userId}] Autenticado`);
    try { getIO().to(room).emit("authenticated"); } catch {}
  });

  client.on("ready", () => {
    if (state.qrTimeout) { clearTimeout(state.qrTimeout); state.qrTimeout = null; }
    state.ready = true;
    state.currentQR = null;
    logger.info(`[WA][${userId}] Ready`);
    try { getIO().to(room).emit("ready"); } catch {}
  });

  client.on("disconnected", (reason) => {
    state.ready = false;
    state.currentQR = null;
    logger.warn(`[WA][${userId}] Disconnected: ${reason}`);
    try { getIO().to(room).emit("disconnected", { reason }); } catch {}
  });

  client.on("auth_failure", (msg) => {
    state.ready = false;
    state.currentQR = null;
    logger.error(`[WA][${userId}] Auth failure: ${msg}`);
    try { getIO().to(room).emit("auth_failure", { message: msg }); } catch {}
  });

  // Reemitir y procesar mensajes entrantes por usuario (auto-respuestas)
  client.on("message", async (msg) => {
    try { getIO().to(room).emit("message", msg); } catch {}
    try {
      if (msg.fromMe) return;
      const enviado = await Message.findOne({ to: msg.from, direction: "outbound" });
      if (!enviado) {
        logger.info(`[WA][${userId}] Mensaje entrante ignorado (no corresponde a campaña): ${msg.from}`);
        return;
      }
      await Message.updateMany({ to: msg.from, direction: "outbound" }, { $set: { respondio: true } });
      logger.info(`[WA][${userId}] Respuesta recibida de contacto de campaña: ${msg.from}`);

      // Cargar reglas activas del propietario de esta sesión
      const reglas = await Autoresponse.find({ createdBy: userId, active: true });
      if (reglas.length) {
        const normalize = (s) => (s || "").toLowerCase().trim();
        const bodyNorm = normalize(msg.body);
        const matched = reglas.find(r => {
          const kw = normalize(r.keyword);
          if (!kw) return false;
          const mt = r.matchType || "contains";
          return mt === "exact" ? bodyNorm === kw : bodyNorm.includes(kw);
        });
        const rule = matched || reglas.find(r => r.isFallback);
        if (rule) {
          // Anti-spam: evitar múltiples auto-respuestas en ventana de tiempo
          const windowMinutes = Number(process.env.AUTORESPONSE_WINDOW_MINUTES || 30);
          const since = new Date(Date.now() - windowMinutes * 60 * 1000);
          const recent = await AutoResponseLog.findOne({
            createdBy: userId,
            chatId: msg.from,
            respondedAt: { $gte: since },
          }).sort({ respondedAt: -1 }).lean();
          if (recent) {
            logger.info(`[WA][${userId}] Anti-spam: ya se respondió recientemente a ${msg.from}, omitiendo.`);
            return;
          }
          try {
            await client.sendMessage(msg.from, rule.response);
            logger.info(`[WA][${userId}] Auto-respuesta enviada (${rule.keyword || "fallback"})`);
            // Registrar envío en log
            try {
              await AutoResponseLog.create({ createdBy: userId, chatId: msg.from, ruleId: rule._id, respondedAt: new Date() });
            } catch (logErr) {
              logger.warn(`[WA][${userId}] No se pudo registrar AutoResponseLog: ${logErr?.message}`);
            }
          } catch (e) {
            logger.warn(`[WA][${userId}] Error enviando auto-respuesta: ${e?.message}`);
          }
        }
      }
    } catch (err) {
      logger.error(`[WA][${userId}] Error procesando mensaje entrante: ${err?.message}`);
    }
  });

  logger.info(`[WA][${userId}] Inicializando cliente...`);
  // Retry con backoff
  const maxAttempts = Number(process.env.WA_INIT_MAX_ATTEMPTS || 3);
  let attempt = 0;
  let lastErr = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      await client.initialize();
      logger.info(`[WA][${userId}] Cliente inicializado (intento ${attempt}/${maxAttempts})`);
      break;
    } catch (err) {
      lastErr = err;
      const waitMs = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
      logger.warn(`[WA][${userId}] Falló initialize() intento ${attempt}/${maxAttempts}: ${err?.message}. Reintentando en ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  if (!client.info?.wid && lastErr && !state.ready) {
    logger.error(`[WA][${userId}] No se pudo inicializar el cliente tras ${maxAttempts} intentos: ${lastErr?.message}`);
  }
  
  state.client = client;
  return client;
}

async function getOrInitClient(userId) {
  const state = clients.get(String(userId));
  if (state?.client) return state.client;
  return initClientForUser(userId);
}

function getState(userId) {
  return clients.get(String(userId));
}

function isReady(userId) {
  const s = getState(userId);
  return !!(s && s.ready && s.client);
}

function getCurrentQR(userId) {
  const s = getState(userId);
  return s?.currentQR || null;
}

async function forceNewSessionForUser(userId) {
  logger.info(`[WA][${userId}] Forzando nueva sesión...`);
  const s = getState(userId);
  if (s?.client) {
    try { await s.client.destroy(); } catch (e) { logger.warn(`[WA][${userId}] destroy error: ${e?.message}`); }
    s.client = null;
  }
  if (s?.qrTimeout) { clearTimeout(s.qrTimeout); s.qrTimeout = null; }
  s && (s.ready = false, s.currentQR = null);
  await new Promise(r => setTimeout(r, 1000));
  // Backoff y límites para re-init en caso de fallo
  const maxResets = Number(process.env.WA_RESET_MAX_ATTEMPTS || 2);
  let resets = 0;
  let lastErr = null;
  while (resets < maxResets) {
    resets++;
    try {
      await initClientForUser(userId);
      logger.info(`[WA][${userId}] Reinit exitoso de sesión (intento ${resets}/${maxResets})`);
      return;
    } catch (err) {
      lastErr = err;
      const waitMs = Math.min(60000, 2000 * Math.pow(2, resets - 1));
      logger.warn(`[WA][${userId}] Reinit fallo intento ${resets}/${maxResets}: ${err?.message}. Esperando ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
  logger.error(`[WA][${userId}] No fue posible reinicializar la sesión tras ${maxResets} intentos: ${lastErr?.message}`);
}

async function logoutForUser(userId) {
  const s = getState(userId);
  if (s?.client) {
    try { await s.client.logout(); } catch {}
  }
  const p = getSessionPathForUser(userId);
  try { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); } catch {}
  await forceNewSessionForUser(userId);
}

module.exports = {
  getOrInitClient,
  initClientForUser,
  forceNewSessionForUser,
  logoutForUser,
  isReady,
  getCurrentQR,
  getSessionPathForUser,
};
