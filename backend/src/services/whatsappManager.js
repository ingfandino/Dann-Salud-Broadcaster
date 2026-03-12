/**
 * ============================================================
 * MANAGER DE WHATSAPP (whatsappManager.js)
 * ============================================================
 * Gestiona múltiples sesiones de WhatsApp usando whatsapp-web.js.
 * Maneja conexión, reconexión, QR y mensajes entrantes.
 */

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

/* ========== SISTEMA DE COLA DE CONEXIONES ========== */
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
const clients = new Map(); // userId -> { client, ready, currentQR, qrTimeout, lastActivity }

// Cleanup de clientes inactivos cada 30 minutos
const CLEANUP_INTERVAL = 30 * 60 * 1000;
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora de inactividad

function getSessionPathForUser(userId) {
  const base = process.env.WHATSAPP_SESSION_BASE || path.resolve(process.cwd(), ".wwebjs_auth_multi");
  const userPath = path.join(base, String(userId));
  return userPath;
}

async function initClientForUser(userId) {
  const userIdStr = String(userId);
  const existing = clients.get(userIdStr);
  const room = `user_${userId}`;

  // ✅ CORRECCIÓN: Prevenir inicializaciones concurrentes
  if (existing?.initializing) {
    logger.warn(`[WA][${userId}] Ya hay una inicialización en progreso, esperando...`);
    return existing.client;
  }

  // ✅ CORRECCIÓN: Limpiar cliente existente adecuadamente
  if (existing?.client) {
    logger.info(`[WA][${userId}] Limpiando cliente existente antes de reinicializar...`);
    try {
      // Limpiar event listeners antes de destruir
      if (existing.eventListeners) {
        existing.eventListeners.forEach(({ event, handler }) => {
          try {
            existing.client.removeListener(event, handler);
          } catch (e) { }
        });
      }
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
    maxReconnectAttempts: 3,
    lastActivity: Date.now(),
    eventListeners: [], // Para rastrear listeners y poder limpiarlos
    initializing: true, // Flag para prevenir inicializaciones concurrentes
    intentionalLogout: false // Flag para prevenir reconexión después de logout intencional
  };

  clients.set(userIdStr, state);

  // ✅ CORRECCIÓN: Generar User-Agent único por usuario para evitar detección de WhatsApp
  const userAgentVariations = [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
  ];

  // Seleccionar User-Agent basado en hash del userId para consistencia
  const userIdHash = String(userId).split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
  const userAgent = userAgentVariations[Math.abs(userIdHash) % userAgentVariations.length];

  // Configuración de Puppeteer optimizada para Linux servidor
  const puppeteerArgs = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--no-zygote",
    "--single-process", // Importante para servidores sin GUI
    "--disable-gpu",
    "--disable-web-security",
    "--disable-features=IsolateOrigins,site-per-process",
    "--disable-blink-features=AutomationControlled",
    "--ignore-certificate-errors",
    "--disable-extensions",
    "--disable-default-apps",
    "--mute-audio",
    "--no-first-run",
    `--user-agent=${userAgent}` // User-Agent único por usuario
  ];

  // ✅ CORRECCIÓN: Soporte para proxy por usuario (variable de entorno)
  // Formato: PROXY_USER_<userId>=http://proxy.com:8080 (sin autenticación para proxies locales)
  const userProxy = process.env[`PROXY_USER_${userId}`] || process.env.HTTPS_PROXY;

  if (userProxy) {
    try {
      const proxyUrl = new URL(userProxy);
      const proxyHost = `${proxyUrl.hostname}:${proxyUrl.port}`;

      puppeteerArgs.push(`--proxy-server=${proxyHost}`);
      logger.info(`[WA][${userId}] Usando proxy: ${proxyHost}`);
    } catch (error) {
      logger.error(`[WA][${userId}] Error parseando URL del proxy:`, error.message);
      logger.error(`[WA][${userId}] Proxy configurado: ${userProxy}`);
      // Intentar usar el proxy tal cual
      puppeteerArgs.push(`--proxy-server=${userProxy}`);
    }
  }

  const puppeteerConfig = {
    headless: true,
    args: puppeteerArgs,
    timeout: 60000,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false
  };

  // Solo usar executablePath si está explícitamente configurado
  // Puppeteer usará su propia versión de Chromium si no se especifica
  if (process.env.WHATSAPP_CHROME_PATH) {
    puppeteerConfig.executablePath = process.env.WHATSAPP_CHROME_PATH;
    logger.info(`[WA][${userId}] Usando Chrome personalizado: ${process.env.WHATSAPP_CHROME_PATH}`);
  } else {
    logger.info(`[WA][${userId}] Usando Chromium de Puppeteer (descarga automática)`);
  }

  const clientConfig = {
    authStrategy: new LocalAuth({
      clientId: String(userId),
      dataPath: getSessionPathForUser(userId)
    }),
    puppeteer: puppeteerConfig,
    // ✅ CORRECCIÓN: Deshabilitar webVersionCache para evitar errores de red
    // WhatsApp Web.js usará la versión más reciente disponible localmente
    webVersionCache: {
      type: 'none'
    }
  };

  const client = new Client(clientConfig);

  // Manejo de eventos del cliente
  const onQr = (qr) => {
    state.lastActivity = Date.now();

    // ✅ CORRECCIÓN CRÍTICA: Ignorar QRs después de estar conectado
    if (state.ready) {
      logger.warn(`[WA][${userId}] QR recibido pero cliente ya está Ready, ignorando (comportamiento normal de WhatsApp después de autenticar)`);
      return;
    }

    logger.info(`[WA][${userId}] QR recibido`);
    state.currentQR = qr;

    // ✅ CORRECCIÓN: Cancelar timeout anterior si existe antes de crear uno nuevo
    if (state.qrTimeout) {
      clearTimeout(state.qrTimeout);
      state.qrTimeout = null;
    }

    try {
      getIO().to(room).emit('qr', qr);
    } catch (error) {
      logger.error(`[WA][${userId}] Error emitiendo evento QR:`, error.message);
    }

    // Configurar expiración del QR (60 segundos)
    state.qrTimeout = setTimeout(() => {
      // ✅ CORRECCIÓN: No regenerar si ya está conectado
      if (state.ready) {
        logger.info(`[WA][${userId}] QR expiró pero cliente ya está conectado, ignorando`);
        return;
      }

      logger.warn(`[WA][${userId}] QR expirado, regenerando...`);
      try {
        getIO().to(room).emit('qr_expired');
        forceNewSessionForUser(userId);
      } catch (error) {
        logger.error(`[WA][${userId}] Error manejando expiración de QR:`, error.message);
      }
    }, 60000);
  };
  client.on('qr', onQr);
  state.eventListeners.push({ event: 'qr', handler: onQr });

  const onReady = () => {
    // ✅ CORRECCIÓN: Prevenir ejecuciones múltiples del mismo evento
    if (state.ready) {
      logger.warn(`[WA][${userId}] Ready ya procesado, ignorando evento duplicado`);
      return;
    }

    state.lastActivity = Date.now();
    logger.info(`[WA][${userId}] Ready`);
    state.ready = true;
    state.currentQR = null;
    state.reconnectAttempts = 0; // Reiniciar contador en conexión exitosa

    // ✅ CORRECCIÓN CRÍTICA: Cancelar timeout del QR cuando se conecta exitosamente
    if (state.qrTimeout) {
      clearTimeout(state.qrTimeout);
      state.qrTimeout = null;
      logger.info(`[WA][${userId}] Timeout de QR cancelado (conexión exitosa)`);
    }

    try {
      getIO().to(room).emit('ready');
    } catch (error) {
      logger.error(`[WA][${userId}] Error emitiendo evento ready:`, error.message);
    }
  };

  // ✅ CORRECCIÓN CRÍTICA: Usar .once() para ready ya que solo debe ejecutarse una vez
  client.once('ready', onReady);
  state.eventListeners.push({ event: 'ready', handler: onReady });

  const onMessage = async (msg) => {
    state.lastActivity = Date.now();
    try {
      logger.info(`[WA][${userId}] Mensaje recibido: from = ${msg.from}, fromMe = ${msg.fromMe}, body = "${msg.body}"`);

      if (msg.fromMe) return;

      // Notificar al frontend
      try {
        getIO().to(room).emit('message', msg);
      } catch (error) {
        logger.error(`[WA][${userId}] Error emitiendo mensaje: `, error.message);
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const enviado = await Message.findOne({ 
        to: msg.from, 
        direction: "outbound",
        timestamp: { $gte: twentyFourHoursAgo }
      }).sort({ timestamp: -1 });
      
      if (!enviado) {
        logger.info(`[WA][${userId}] Mensaje entrante ignorado(no corresponde a campaña): ${msg.from} `);
        return;
      }

      // Marcar mensaje outbound como respondido
      await Message.updateMany(
        { to: msg.from, direction: "outbound" },
        { $set: { respondio: true } }
      );

      // Obtener el creador de la campaña para buscar sus auto-respuestas
      let jobCreatorId = userId;
      if (enviado.job) {
        const job = await SendJob.findById(enviado.job).select('createdBy').lean();
        if (job?.createdBy) {
          jobCreatorId = job.createdBy;
          logger.info(`[WA][${userId}] Job ${enviado.job} creado por usuario ${jobCreatorId}`);
        }
      }

      try {
        await Message.create({
          contact: enviado.contact,
          createdBy: jobCreatorId,
          job: enviado.job,
          contenido: msg.body || '',
          direction: 'inbound',
          status: 'recibido',
          timestamp: new Date(),
          to: userId,
          from: msg.from
        });
        logger.info(`[WA][${userId}] Mensaje inbound registrado de ${msg.from} (job: ${enviado.job})`);

        try {
          getIO().to('jobs').emit('campaign:reply', {
            campaignId: enviado.job,
            jobId: enviado.job,
            contact: enviado.contact,
            timestamp: new Date()
          });
        } catch (e) {
          logger.warn(`[WA][${userId}] Error emitiendo evento campaign:reply:`, e.message);
        }

      } catch (e) {
        logger.error(`[WA][${userId}] Error registrando mensaje inbound: `, e.message);
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
            try {
              await client.sendMessage(msg.from, rule.response);
              logger.info(`[WA][${userId}] Auto-respuesta enviada (${rule.keyword || "fallback"}) para campaña de usuario ${jobCreatorId}`);

              // Registrar en log con detalles completos
              const logEntry = await AutoResponseLog.create({
                createdBy: jobCreatorId,
                chatId: msg.from,
                ruleId: rule._id,
                respondedAt: new Date(),
                // ✅ MEJORA 3: Datos adicionales para reporte
                job: enviado.job,
                contact: enviado.contact,
                keyword: rule.keyword || null,
                response: rule.response,
                isFallback: rule.isFallback || false,
                userMessage: msg.body || ''
              });

              // ✅ Notificar al frontend
              try {
                getIO().to(room).emit('auto_response:sent', {
                  contact: enviado.contact,
                  keyword: rule.keyword || "Fallback",
                  response: rule.response,
                  timestamp: new Date()
                });
              } catch (e) {
                logger.warn(`[WA][${userId}] Error emitiendo evento auto_response: sent: `, e.message);
              }

            } catch (e) {
              logger.warn(`[WA][${userId}] Error enviando auto - respuesta: `, e.message);
            }
          }
        }
      }
    } catch (err) {
      logger.error(`[WA][${userId}] Error procesando mensaje: `, err.message);
    }
  };
  client.on('message', onMessage);
  state.eventListeners.push({ event: 'message', handler: onMessage });

  const onDisconnected = async (reason) => {
    logger.warn(`[WA][${userId}]Disconnected: ${reason} `);
    state.ready = false;

    // ✅ CORRECCIÓN: No reconectar en ciertos casos
    // LOGOUT es una desconexión intencional o conflicto de sesión
    if (reason === 'LOGOUT' || reason === 'CONFLICT') {
      logger.warn(`[WA][${userId}] Desconexión por ${reason}, no se reintentará automáticamente`);
      state.reconnectAttempts = state.maxReconnectAttempts; // Prevenir más intentos
      state.intentionalLogout = true; // Marcar como logout intencional
      return;
    }

    // ✅ CORRECCIÓN: No reconectar si fue un logout intencional del usuario
    if (state.intentionalLogout) {
      logger.warn(`[WA][${userId}] Sesión marcada como logout intencional, no se reconectará`);
      return;
    }

    // Lógica de reconexión automática solo para desconexiones accidentales
    if (state.reconnectAttempts < state.maxReconnectAttempts) {
      state.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 30000); // Backoff exponencial
      logger.info(`[WA][${userId}] Intentando reconexión ${state.reconnectAttempts}/${state.maxReconnectAttempts} en ${delay}ms...`);

      setTimeout(() => {
        if (!state.ready && !state.initializing && !state.intentionalLogout) {
          initClientForUser(userId).catch(err => {
            logger.error(`[WA][${userId}] Error en reconexión:`, err.message);
          });
        }
      }, delay);
    } else {
      logger.error(`[WA][${userId}] Máximo de intentos de reconexión alcanzado`);
    }
  };
  client.on('disconnected', onDisconnected);
  state.eventListeners.push({ event: 'disconnected', handler: onDisconnected });

  const onAuthFailure = (msg) => {
    logger.error(`[WA][${userId}] Error de autenticación:`, msg);
    state.ready = false;
  };
  client.on('auth_failure', onAuthFailure);
  state.eventListeners.push({ event: 'auth_failure', handler: onAuthFailure });

  try {
    state.client = client;
    await client.initialize();
    state.initializing = false; // ✅ CORRECCIÓN: Marcar como no inicializando
    logger.info(`[WA][${userId}] Cliente inicializado exitosamente`);
    return client;
  } catch (error) {
    state.initializing = false; // ✅ CORRECCIÓN: Marcar como no inicializando incluso si falla
    logger.error(`[WA][${userId}] ❌ Error al inicializar cliente:`);
    logger.error(`[WA][${userId}] Mensaje: ${error.message || 'Sin mensaje'}`);
    logger.error(`[WA][${userId}] Nombre: ${error.name || 'Sin nombre'}`);
    logger.error(`[WA][${userId}] Código: ${error.code || 'Sin código'}`);
    if (error.stack) {
      logger.error(`[WA][${userId}] Stack:`, error.stack.split('\n').slice(0, 5).join('\n'));
    }
    // Log adicional si hay más propiedades
    const errorKeys = Object.keys(error).filter(k => !['message', 'name', 'stack', 'code'].includes(k));
    if (errorKeys.length > 0) {
      logger.error(`[WA][${userId}] Propiedades adicionales:`, errorKeys.map(k => `${k}=${error[k]}`).join(', '));
    }
    // Remover del mapa si falla completamente
    clients.delete(String(userId));
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

  // ✅ CORRECCIÓN: No destruir si ya está conectado y listo
  if (s?.ready && s?.client) {
    logger.warn(`[WA][${userId}] Cliente ya está conectado y listo, ignorando forceNewSession`);
    return;
  }

  if (s?.client) {
    try { await s.client.destroy(); } catch (e) { logger.warn(`[WA][${userId}] destroy error: ${e?.message}`); }
    s.client = null;
  }
  if (s?.qrTimeout) { clearTimeout(s.qrTimeout); s.qrTimeout = null; }
  s && (s.ready = false, s.currentQR = null, s.initializing = false);
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
  const userIdStr = String(userId);
  logger.info(`[WA][${userId}] Iniciando logout completo...`);

  const s = getState(userIdStr);

  // 1. Cerrar sesión en WhatsApp (logout remoto)
  if (s?.client) {
    try {
      await s.client.logout();
      logger.info(`[WA][${userId}] Logout ejecutado en cliente`);
    } catch (err) {
      logger.warn(`[WA][${userId}] Error en logout del cliente:`, err.message);
    }
  }

  // 2. Destruir cliente completamente (limpia listeners, timeouts, etc)
  await destroyClient(userIdStr);

  // 3. Eliminar archivos de sesión del disco
  const p = getSessionPathForUser(userIdStr);
  try {
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      logger.info(`[WA][${userId}] Sesión eliminada del disco: ${p}`);
    }
  } catch (err) {
    logger.warn(`[WA][${userId}] Error eliminando sesión del disco:`, err.message);
  }

  // 4. Emitir evento de logout exitoso
  try {
    getIO().to(`user_${userId}`).emit('logout_success');
    logger.info(`[WA][${userId}] Evento logout_success emitido`);
  } catch (err) {
    logger.warn(`[WA][${userId}] Error emitiendo logout_success:`, err.message);
  }

  logger.info(`[WA][${userId}] ✅ Logout completo finalizado`);
}

// Destruir cliente y limpiar todos sus recursos
async function destroyClient(userId) {
  const state = clients.get(String(userId));
  if (!state) return;

  logger.info(`[WA][${userId}] Destruyendo cliente y limpiando recursos...`);

  // Limpiar timeout de QR
  if (state.qrTimeout) {
    clearTimeout(state.qrTimeout);
    state.qrTimeout = null;
  }

  // Remover todos los event listeners
  if (state.client && state.eventListeners) {
    state.eventListeners.forEach(({ event, handler }) => {
      try {
        state.client.removeListener(event, handler);
      } catch (e) {
        logger.warn(`[WA][${userId}] Error removiendo listener ${event}:`, e.message);
      }
    });
    state.eventListeners = [];
  }

  // Destruir cliente de WhatsApp
  if (state.client) {
    try {
      await state.client.destroy();
    } catch (e) {
      logger.warn(`[WA][${userId}] Error destruyendo cliente:`, e.message);
    }
    state.client = null;
  }

  // Remover del mapa
  clients.delete(String(userId));
  logger.info(`[WA][${userId}] Cliente destruido y recursos liberados`);
}

// Cleanup periódico de clientes inactivos
async function cleanupInactiveClients() {
  const now = Date.now();
  const toRemove = [];

  for (const [userId, state] of clients.entries()) {
    const inactive = now - state.lastActivity;
    if (inactive > INACTIVITY_TIMEOUT && !state.ready) {
      logger.info(`[WA][${userId}] Cliente inactivo por ${Math.round(inactive / 60000)} min, marcando para limpieza`);
      toRemove.push(userId);
    }
  }

  for (const userId of toRemove) {
    try {
      await destroyClient(userId);
    } catch (e) {
      logger.error(`[WA][${userId}] Error en cleanup:`, e.message);
    }
  }

  if (toRemove.length > 0) {
    logger.info(`[WA] Cleanup completado: ${toRemove.length} cliente(s) removido(s). Activos: ${clients.size}`);
  }
}

// Iniciar cleanup periódico
if (process.env.NODE_ENV !== 'test') {
  setInterval(cleanupInactiveClients, CLEANUP_INTERVAL);
  logger.info(`[WA] Sistema de cleanup automático iniciado (cada ${CLEANUP_INTERVAL / 60000} min)`);
}

module.exports = {
  getOrInitClient,
  initClientForUser,
  forceNewSessionForUser,
  logoutForUser,
  isReady,
  getCurrentQR,
  getState, // ✅ Exportar getState para verificar estado del cliente
  getSessionPathForUser,
  destroyClient,
  cleanupInactiveClients,
  clients, // Exportar para debugging/monitoreo
};
