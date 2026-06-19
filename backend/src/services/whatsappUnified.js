/**
 * ============================================================
 * WRAPPER UNIFICADO DE WHATSAPP (whatsappUnified.js)
 * ============================================================
 * Abstrae la implementación de WhatsApp (whatsapp-web.js o Baileys).
 * Permite cambiar de motor sin modificar el código de la aplicación.
 */

const logger = require('../utils/logger');

/* ========== CONFIGURACIÓN ========== */
const USE_BAILEYS = process.env.USE_BAILEYS === 'true';
const USE_MULTI = process.env.USE_MULTI_SESSION !== 'false';

logger.info(`🔧 WhatsApp Unified - Usando: ${USE_BAILEYS ? 'Baileys' : 'whatsapp-web.js'}, Multi: ${USE_MULTI}`);

let implementation;

function getActiveEngine() {
  if (USE_BAILEYS) return 'baileys';
  return USE_MULTI ? 'whatsapp-webjs' : 'single-webjs';
}

function createWhatsAppError(message, code, status = 'failed') {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.engine = getActiveEngine();
  return error;
}

function normalizeSendResult(result) {
  const engine = getActiveEngine();
  return {
    success: true,
    status: 'accepted',
    engine,
    messageId: result?.messageId || result?.id?._serialized || result?.id || result?.key?.id || null,
    to: result?.to || null,
  };
}

if (USE_BAILEYS) {
  // Usar Baileys
  implementation = require('./baileys/baileysManager');
  logger.info('✅ Baileys cargado como implementación de WhatsApp');
} else {
  // Usar whatsapp-web.js
  if (USE_MULTI) {
    implementation = require('./whatsappManager');
    logger.info('✅ whatsapp-web.js (multi-sesión) cargado como implementación');
  } else {
    const singleClient = require('../config/whatsapp');
    
    // Adapter para whatsapp-web.js single session
    implementation = {
      getOrInitClient: async () => {
        const client = singleClient.getWhatsappClient();
        if (!client) {
          throw new Error('Cliente de WhatsApp no está inicializado');
        }
        return client;
      },
      isReady: () => singleClient.isReady(),
      getCurrentQR: () => {
        const client = singleClient.getWhatsappClient();
        return client?._qr || null;
      },
      sendMessage: async (userId, to, content) => {
        const client = singleClient.getWhatsappClient();
        if (!client) throw createWhatsAppError('Cliente no está listo', 'WHATSAPP_NOT_CONNECTED', 'not_connected');
        
        const result = await client.sendMessage(to, content);
        return normalizeSendResult({ ...result, to });
      },
      logoutUser: async () => {
        await singleClient.forceNewSessionSingle();
      },
      destroyClient: async () => {
        // No-op para single session
      },
    };
    
    logger.info('✅ whatsapp-web.js (single-session) cargado como implementación');
  }
}

/**
 * Interfaz unificada que funciona con ambas implementaciones
 */

/**
 * Obtener o inicializar cliente
 * @param {string} userId - ID del usuario (solo relevante en multi-sesión)
 */
async function getOrInitClient(userId = null) {
  if (!USE_MULTI && !userId) {
    // Single session, ignorar userId
    return await implementation.getOrInitClient();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return await implementation.getOrInitClient(userId);
}

/**
 * Verificar si está listo
 */
function isReady(userId = null) {
  if (!USE_MULTI) {
    return implementation.isReady();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return implementation.isReady(userId);
}

/**
 * Obtener QR code actual
 */
function getCurrentQR(userId = null) {
  if (!USE_MULTI) {
    return implementation.getCurrentQR();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return implementation.getCurrentQR(userId);
}

/**
 * Enviar mensaje
 */
async function sendMessage(userId, to, content) {
  if (!implementation || typeof implementation.sendMessage !== 'function') {
    throw createWhatsAppError(
      'El adaptador de WhatsApp activo no tiene metodo de envio disponible',
      'WHATSAPP_SEND_UNAVAILABLE',
      'unavailable'
    );
  }

  if (!USE_MULTI) {
    try {
      const result = await implementation.sendMessage(null, to, content);
      return normalizeSendResult(result);
    } catch (error) {
      if (error.code && error.status) throw error;
      throw createWhatsAppError(error.message || 'Error enviando mensaje', 'WHATSAPP_SEND_FAILED', 'failed');
    }
  }
  
  if (!userId) {
    throw createWhatsAppError('userId es requerido en modo multi-sesion', 'WHATSAPP_USER_REQUIRED', 'failed');
  }
  
  try {
    const result = await implementation.sendMessage(userId, to, content);
    return normalizeSendResult(result);
  } catch (error) {
    if (error.code && error.status) throw error;
    throw createWhatsAppError(error.message || 'Error enviando mensaje', 'WHATSAPP_SEND_FAILED', 'failed');
  }
}

/**
 * Enviar mensaje con media (solo Baileys y whatsapp-web.js multi)
 */
async function sendMediaMessage(userId, to, mediaBuffer, options) {
  if (!USE_MULTI) {
    throw new Error('sendMediaMessage no soportado en single session');
  }
  
  if (!implementation.sendMediaMessage) {
    throw new Error('sendMediaMessage no soportado en esta implementación');
  }
  
  return await implementation.sendMediaMessage(userId, to, mediaBuffer, options);
}

/**
 * Logout
 */
async function logoutUser(userId = null) {
  if (!USE_MULTI) {
    return await implementation.logoutUser();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return await implementation.logoutUser(userId);
}

/**
 * Destruir cliente
 */
async function destroyClient(userId = null) {
  if (!USE_MULTI) {
    return await implementation.destroyClient();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return await implementation.destroyClient(userId);
}

/**
 * Forzar nueva sesión
 */
async function forceNewSession(userId = null) {
  if (!implementation.forceNewSession) {
    // Fallback: logout + reinit
    await logoutUser(userId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await getOrInitClient(userId);
  }
  
  if (!USE_MULTI) {
    return await implementation.forceNewSession();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return await implementation.forceNewSession(userId);
}

/**
 * Obtener información del usuario
 */
async function getUserInfo(userId = null) {
  if (!implementation.getUserInfo) {
    throw new Error('getUserInfo no soportado en esta implementación');
  }
  
  if (!USE_MULTI) {
    return await implementation.getUserInfo();
  }
  
  if (!userId) {
    throw new Error('userId es requerido en modo multi-sesión');
  }
  
  return await implementation.getUserInfo(userId);
}

/**
 * Verificar si un número está registrado
 */
async function isRegisteredNumber(userId, phoneNumber) {
  if (!implementation.isRegisteredNumber) {
    // Fallback: asumir que está registrado
    logger.warn('isRegisteredNumber no soportado, asumiendo número válido');
    return true;
  }
  
  if (!USE_MULTI) {
    return await implementation.isRegisteredNumber(null, phoneNumber);
  }
  
  return await implementation.isRegisteredNumber(userId, phoneNumber);
}

/**
 * Obtener estado de todos los clientes (solo multi-sesión)
 */
function getAllClientsStatus() {
  if (!USE_MULTI || !implementation.getAllClientsStatus) {
    return [];
  }
  
  return implementation.getAllClientsStatus();
}

module.exports = {
  // Metadatos
  USE_BAILEYS,
  USE_MULTI,
  getActiveEngine,
  
  // Funciones principales
  getOrInitClient,
  isReady,
  getCurrentQR,
  sendMessage,
  sendMediaMessage,
  logoutUser,
  destroyClient,
  forceNewSession,
  getUserInfo,
  isRegisteredNumber,
  getAllClientsStatus,
  
  // Acceso directo a la implementación (para casos avanzados)
  implementation,
};
