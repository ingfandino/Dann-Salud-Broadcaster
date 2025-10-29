// backend/src/services/whatsappManager.js

const { Client, LocalAuth } = require("whatsapp-web.js");
const EventEmitter = require("events");
EventEmitter.defaultMaxListeners = 50;
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");
const SendJob = require("../models/SendJob");
const { emitJobsUpdate } = require("../config/socket");
const Message = require("../models/Message");
const Autoresponse = require("../models/Autoresponse");
const AutoResponseLog = require("../models/AutoResponseLog");
const { getIO } = require("../config/socket");

// Sistema de cola de conexiones
const connectionQueue = [];
let activeConnections = 0;
const MAX_CONCURRENT_CONNECTIONS = 5;

async function processQueue() {
  if (activeConnections >= MAX_CONCURRENT_CONNECTIONS || connectionQueue.length === 0) return;

  activeConnections++;
  const { userId, resolve, reject } = connectionQueue.shift();

  try {
    const client = await initClientForUser(userId);
    resolve(client);
  } catch (error) {
    reject(error);
  } finally {
    activeConnections--;
    processQueue(); // Procesar siguiente en la cola
  }
}

logger.info(`[Connection Manager] Estado: ${activeConnections}/${MAX_CONCURRENT_CONNECTIONS} conexiones activas`);

function queueConnection(userId) {
  return new Promise((resolve, reject) => {
    connectionQueue.push({ userId, resolve, reject });
    if (activeConnections < MAX_CONCURRENT_CONNECTIONS) {
      processQueue();
    }
  });
}

// Mapa de clientes por usuario
const clients = new Map(); // userId -> { client, ready, currentQR, qrTimeout }

function getSessionPathForUser(userId) {
  const base = process.env.WHATSAPP_SESSION_BASE || path.resolve(process.cwd(), ".wwebjs_auth_multi");
  const userPath = path.join(base, String(userId));
  return userPath;
}

async function initClientForUser(userId) {
  const existing = clients.get(String(userId));
  const room = `user_${userId}`;
  if (existing?.client) {
    try {
      await existing.client.destroy();
    } catch (error) {
      logger.warn(`[WA][${userId}] Error al destruir cliente existente:`, error.message);
    }
  }

  const state = {
    client: null,
    ready: false,
    currentQR: null,
    qrTimeout: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 3
  };

  clients.set(String(userId), state);

  // Configuración de Puppeteer...
  const puppeteerArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--no-zygote",
    "--ignore-certificate-errors",
  ];

  if (process.env.HTTPS_PROXY) {
    puppeteerArgs.push(`--proxy-server=${process.env.HTTPS_PROXY}`);
  }

  const puppeteerConfig = {
    headless: true,
    args: puppeteerArgs,
    timeout: 60000 // Aumentar tiempo de espera
  };

  if (process.env.WHATSAPP_CHROME_PATH) {
    puppeteerConfig.executablePath = process.env.WHATSAPP_CHROME_PATH;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: String(userId),
      dataPath: getSessionPathForUser(userId)
    }),
    puppeteer: puppeteerConfig,
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    }
  });

  // Manejo de eventos del cliente
  client.on('qr', (qr) => {
    logger.info(`[WA][${userId}] QR recibido`);
    state.currentQR = qr;
    state.ready = false;
    clearTimeout(state.qrTimeout);

    try {
      getIO().to(room).emit('qr', { qr });
    } catch (error) {
      logger.error(`[WA][${userId}] Error emitiendo evento QR:`, error.message);
    }

    // Configurar expiración del QR
    state.qrTimeout = setTimeout(() => {
      logger.warn(`[WA][${userId}] QR expirado, regenerando...`);
      try {
        getIO().to(room).emit('qr_expired');
        forceNewSessionForUser(userId);
      } catch (error) {
        logger.error(`[WA][${userId}] Error manejando expiración de QR:`, error.message);
      }
    }, 60000);
  });

  client.on('ready', () => {
    logger.info(`[WA][${userId}] Ready`);
    state.ready = true;
    state.currentQR = null;
    state.reconnectAttempts = 0; // Reiniciar contador en conexión exitosa
    try {
      getIO().to(room).emit('ready');
    } catch (error) {
      logger.error(`[WA][${userId}] Error emitiendo evento ready:`, error.message);
    }
  });

  client.on('message', async (msg) => {
    try {
      if (msg.fromMe) return;

      // Notificar al frontend
      try {
        getIO().to(room).emit('message', msg);
      } catch (error) {
        logger.error(`[WA][${userId}] Error emitiendo mensaje:`, error.message);
      }

      // Lógica de auto-respuestas
      const enviado = await Message.findOne({ to: msg.from, direction: "outbound" });
      if (!enviado) {
        logger.info(`[WA][${userId}] Mensaje entrante ignorado (no corresponde a campaña): ${msg.from}`);
        return;
      }

      await Message.updateMany(
        { to: msg.from, direction: "outbound" },
        { $set: { respondio: true } }
      );

      // Cargar reglas de auto-respuesta
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
          // Anti-spam
          const windowMinutes = Number(process.env.AUTORESPONSE_WINDOW_MINUTES || 30);
          const since = new Date(Date.now() - windowMinutes * 60 * 1000);
          const recent = await AutoResponseLog.findOne({
            createdBy: userId,
            chatId: msg.from,
            respondedAt: { $gte: since },
          }).sort({ respondedAt: -1 }).lean();

          if (!recent) {
            try {
              await client.sendMessage(msg.from, rule.response);
              logger.info(`[WA][${userId}] Auto-respuesta enviada (${rule.keyword || "fallback"})`);

              // Registrar en log
              await AutoResponseLog.create({
                createdBy: userId,
                chatId: msg.from,
                ruleId: rule._id,
                respondedAt: new Date()
              });
            } catch (e) {
              logger.warn(`[WA][${userId}] Error enviando auto-respuesta:`, e.message);
            }
          }
        }
      }
    } catch (err) {
      logger.error(`[WA][${userId}] Error procesando mensaje:`, err.message);
    }
  });

  client.on('disconnected', async (reason) => {
    logger.warn(`[WA][${userId}] Disconnected: ${reason}`);
    state.ready = false;

    // Lógica de reconexión automática
    if (state.reconnectAttempts < state.maxReconnectAttempts) {
      state.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000); // Backoff exponencial
      logger.info(`[WA][${userId}] Intentando reconexión ${state.reconnectAttempts}/${state.maxReconnectAttempts} en ${delay}ms...`);

      setTimeout(() => {
        if (!state.ready) {
          initClientForUser(userId).catch(err => {
            logger.error(`[WA][${userId}] Error en reconexión:`, err.message);
          });
        }
      }, delay);
    } else {
      logger.error(`[WA][${userId}] Máximo de intentos de reconexión alcanzado`);
    }
  });

  client.on('auth_failure', (msg) => {
    logger.error(`[WA][${userId}] Error de autenticación:`, msg);
    state.ready = false;
  });

  try {
    state.client = client;
    await client.initialize();
    return client;
  } catch (error) {
    logger.error(`[WA][${userId}] Error al inicializar cliente:`, error.message);
    throw error;
  }
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
    try { await s.client.logout(); } catch { }
  }
  const p = getSessionPathForUser(userId);
  try { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); } catch { }
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
