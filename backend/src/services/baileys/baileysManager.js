// src/services/baileys/baileysManager.js

const BaileysClient = require('./baileysClient');
const logger = require('../../utils/logger');
const { getIO } = require('../../config/socket');

// Mapa de clientes: userId -> BaileysClient
const clients = new Map();

// 🔒 Lock de inicialización para prevenir múltiples inicializaciones simultáneas
const initializingClients = new Map(); // userId -> Promise

/**
 * Obtener o inicializar cliente para un usuario
 */
async function getOrInitClient(userId) {
  const userIdStr = String(userId);
  
  // Si ya existe y está listo, devolverlo
  if (clients.has(userIdStr)) {
    const client = clients.get(userIdStr);
    if (client.isReady()) {
      logger.debug(`[BaileysManager] Cliente para ${userId} ya está listo`);
      return client;
    }
    // Si existe pero no está listo, puede estar inicializando
    logger.debug(`[BaileysManager] Cliente existe pero no está listo aún`);
    return client;
  }
  
  // 🔒 Si ya hay una inicialización en progreso, esperar a que termine
  if (initializingClients.has(userIdStr)) {
    logger.debug(`[BaileysManager] Ya hay inicialización en progreso para ${userId}, esperando...`);
    await initializingClients.get(userIdStr);
    // Después de esperar, devolver el cliente
    return clients.get(userIdStr);
  }
  
  // Crear promesa de inicialización
  const initPromise = (async () => {
    try {
      logger.info(`[BaileysManager] 🚀 Inicializando nuevo cliente para usuario ${userId}`);
      
      // Crear nuevo cliente
      const client = new BaileysClient(userId);
      clients.set(userIdStr, client);
      
      // Inicializar (esto es asíncrono pero no bloquea)
      await client.initialize();
      return client;
    } catch (error) {
      logger.error(`[BaileysManager] Error inicializando cliente para ${userId}:`, error.message);
      // No eliminar el cliente, puede estar esperando QR
      return clients.get(userIdStr);
    } finally {
      // Limpiar lock después de 30 segundos (tiempo suficiente para generar QR)
      setTimeout(() => {
        initializingClients.delete(userIdStr);
      }, 30000);
    }
  })();
  
  // Guardar promesa en el lock
  initializingClients.set(userIdStr, initPromise);
  
  return await initPromise;
}

/**
 * Verificar si un usuario está listo
 */
function isReady(userId) {
  const client = clients.get(String(userId));
  return client ? client.isReady() : false;
}

/**
 * Obtener cliente existente (sin inicializar si no existe)
 */
function getClient(userId) {
  return clients.get(String(userId));
}

/**
 * Obtener QR code actual de un usuario
 */
function getCurrentQR(userId) {
  const client = clients.get(String(userId));
  return client ? client.getQR() : null;
}

/**
 * Obtener información del usuario conectado
 */
async function getUserInfo(userId) {
  const client = clients.get(String(userId));
  if (!client || !client.isReady()) {
    return null;
  }
  
  try {
    return await client.getUserInfo();
  } catch (error) {
    logger.error(`[BaileysManager] Error obteniendo info de ${userId}:`, error.message);
    return null;
  }
}

/**
 * Enviar mensaje de texto
 */
async function sendMessage(userId, to, content) {
  const client = clients.get(String(userId));
  
  if (!client || !client.isReady()) {
    throw new Error(`Cliente para usuario ${userId} no está listo`);
  }
  
  return await client.sendMessage(to, content);
}

/**
 * Enviar mensaje con media
 */
async function sendMediaMessage(userId, to, mediaBuffer, options) {
  const client = clients.get(String(userId));
  
  if (!client || !client.isReady()) {
    throw new Error(`Cliente para usuario ${userId} no está listo`);
  }
  
  return await client.sendMediaMessage(to, mediaBuffer, options);
}

/**
 * Verificar si un número está registrado en WhatsApp
 */
async function isRegisteredNumber(userId, phoneNumber) {
  const client = clients.get(String(userId));
  
  if (!client || !client.isReady()) {
    throw new Error(`Cliente para usuario ${userId} no está listo`);
  }
  
  return await client.isRegistered(phoneNumber);
}

/**
 * Hacer logout de un usuario
 */
async function logoutUser(userId) {
  const userIdStr = String(userId);
  const client = clients.get(userIdStr);
  
  if (client) {
    logger.info(`[BaileysManager] 🚪 Logout de usuario ${userId}`);
    await client.logout();
    clients.delete(userIdStr);
  } else {
    logger.warn(`[BaileysManager] No hay cliente para hacer logout: ${userId}`);
  }
}

/**
 * Destruir cliente sin hacer logout
 */
async function destroyClient(userId) {
  const userIdStr = String(userId);
  const client = clients.get(userIdStr);
  
  if (client) {
    logger.info(`[BaileysManager] 💥 Destruyendo cliente ${userId}`);
    await client.destroy();
    clients.delete(userIdStr);
  }
}

/**
 * Forzar nueva sesión (logout + reiniciar)
 */
async function forceNewSession(userId) {
  const userIdStr = String(userId);
  
  logger.info(`[BaileysManager] 🔄 Forzando nueva sesión para ${userId}`);
  
  // Hacer logout si existe
  await logoutUser(userIdStr);
  
  // Esperar un momento
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Reinicializar
  return await getOrInitClient(userIdStr);
}

/**
 * Obtener estado de todos los clientes
 */
function getAllClientsStatus() {
  const status = [];
  
  for (const [userId, client] of clients.entries()) {
    status.push({
      userId,
      ready: client.isReady(),
      hasQR: !!client.getQR(),
    });
  }
  
  return status;
}

/**
 * Cleanup de clientes inactivos (llamar periódicamente)
 */
async function cleanupInactiveClients() {
  const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas
  const now = Date.now();
  
  for (const [userId, client] of clients.entries()) {
    // Por ahora solo limpiamos clientes que no están listos y no tienen QR
    // (es decir, sesiones que fallaron completamente)
    if (!client.isReady() && !client.getQR()) {
      // Verificar si tiene archivos de sesión
      const hasSession = require('fs').existsSync(client.authFolder);
      
      if (!hasSession) {
        logger.info(`[BaileysManager] 🧹 Limpiando cliente inactivo: ${userId}`);
        await destroyClient(userId);
      }
    }
  }
}

// Ejecutar cleanup cada 30 minutos
setInterval(() => {
  cleanupInactiveClients().catch(err => {
    logger.error('[BaileysManager] Error en cleanup:', err.message);
  });
}, 30 * 60 * 1000);

module.exports = {
  getOrInitClient,
  getClient,
  isReady,
  getCurrentQR,
  getUserInfo,
  sendMessage,
  sendMediaMessage,
  isRegisteredNumber,
  logoutUser,
  destroyClient,
  forceNewSession,
  getAllClientsStatus,
  cleanupInactiveClients,
  clients,
};
