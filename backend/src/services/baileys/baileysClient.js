// src/services/baileys/baileysClient.js

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');
const { getIO } = require('../../config/socket');

class BaileysClient {
  constructor(userId) {
    this.userId = String(userId);
    this.sock = null;
    this.ready = false;
    this.qrCode = null;
    this.authFolder = path.join(process.env.WHATSAPP_SESSION_BASE || '/home/dann-salud/.baileys_auth', this.userId);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.intentionalLogout = false;
  }

  async initialize() {
    try {
      logger.info(`[Baileys][${this.userId}] 🚀 Inicializando cliente...`);

      // Crear carpeta de autenticación si no existe
      if (!fs.existsSync(this.authFolder)) {
        fs.mkdirSync(this.authFolder, { recursive: true });
      }

      // Cargar estado de autenticación (multi-device)
      const { state, saveCreds } = await useMultiFileAuthState(this.authFolder);

      // Obtener última versión de Baileys/WhatsApp
      const { version } = await fetchLatestBaileysVersion();
      logger.info(`[Baileys][${this.userId}] Versión WhatsApp: ${version.join('.')}`);

      // Crear socket de WhatsApp
      this.sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false, // Lo manejamos nosotros vía Socket.IO
        logger: pino({ level: 'silent' }), // Silenciar logs internos de Baileys
        browser: ['Dann Salud Broadcaster', 'Chrome', '120.0.0'], // Identificador del navegador

        // Configuración optimizada para multi-dispositivo
        syncFullHistory: false, // No sincronizar historial completo (más rápido)
        markOnlineOnConnect: true, // Marcar como online al conectar

        // Configuración de reconexión
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,

        // Configuración de generación de mensajes
        generateHighQualityLinkPreview: false, // Más rápido
        getMessage: async () => undefined, // No necesitamos obtener mensajes históricos
      });

      // ✅ Guardar credenciales automáticamente
      this.sock.ev.on('creds.update', saveCreds);

      // ✅ Manejar actualizaciones de conexión
      this.sock.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(update);
      });

      // ✅ Manejar mensajes entrantes
      this.sock.ev.on('messages.upsert', async ({ messages }) => {
        await this.handleIncomingMessages(messages);
      });

      // ✅ Manejar actualizaciones de presencia
      this.sock.ev.on('presence.update', (update) => {
        logger.debug(`[Baileys][${this.userId}] Presencia actualizada:`, update.id);
      });

      return this.sock;
    } catch (error) {
      logger.error(`[Baileys][${this.userId}] ❌ Error inicializando:`, error.message);
      throw error;
    }
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    // 📱 QR Code generado
    if (qr) {
      this.qrCode = qr;
      logger.info(`[Baileys][${this.userId}] 📱 Código QR generado`);

      // Emitir QR al frontend vía Socket.IO
      try {
        getIO().to(`user_${this.userId}`).emit('qr', qr);
      } catch (e) {
        logger.error(`[Baileys][${this.userId}] Error emitiendo QR:`, e.message);
      }
    }

    // 🔌 Conexión cerrada
    if (connection === 'close') {
      this.ready = false;
      this.qrCode = null;

      const statusCode = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output?.statusCode
        : null;

      const reason = DisconnectReason[statusCode] || 'unknown';
      logger.warn(`[Baileys][${this.userId}] 🔌 Conexión cerrada. Razón: ${reason} (${statusCode})`);

      // 🚫 NO reconectar si la conexión fue reemplazada (indica múltiples instancias)
      if (statusCode === DisconnectReason.connectionReplaced) {
        logger.warn(`[Baileys][${this.userId}] ⚠️ Conexión reemplazada por otra instancia. No se reconectará.`);
        return;
      }

      // Determinar si debemos reconectar
      const shouldReconnect =
        !this.intentionalLogout &&
        statusCode !== DisconnectReason.loggedOut &&
        this.reconnectAttempts < this.maxReconnectAttempts;

      if (shouldReconnect) {
        this.reconnectAttempts++;
        const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
        logger.info(`[Baileys][${this.userId}] 🔄 Reintentando conexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms...`);

        setTimeout(async () => {
          try {
            await this.initialize();
          } catch (err) {
            logger.error(`[Baileys][${this.userId}] Error en reconexión:`, err.message);
          }
        }, delay);
      } else if (statusCode === DisconnectReason.loggedOut) {
        logger.warn(`[Baileys][${this.userId}] ⚠️ Usuario cerró sesión. Limpiando credenciales...`);
        this.intentionalLogout = true;
        // Limpiar carpeta de autenticación
        try {
          if (fs.existsSync(this.authFolder)) {
            fs.rmSync(this.authFolder, { recursive: true, force: true });
          }
        } catch (e) {
          logger.error(`[Baileys][${this.userId}] Error limpiando auth:`, e.message);
        }
      } else {
        logger.error(`[Baileys][${this.userId}] ❌ Máximo de intentos alcanzado o logout intencional`);
      }
    }

    // ✅ Conexión abierta (listo)
    else if (connection === 'open') {
      this.ready = true;
      this.qrCode = null;
      this.reconnectAttempts = 0;
      this.intentionalLogout = false;

      logger.info(`[Baileys][${this.userId}] ✅ Conexión establecida exitosamente`);

      // Emitir ready al frontend
      try {
        getIO().to(`user_${this.userId}`).emit('ready');
        getIO().to(`user_${this.userId}`).emit('wa_status', { connected: true, ready: true });
      } catch (e) {
        logger.error(`[Baileys][${this.userId}] Error emitiendo ready:`, e.message);
      }
    }

    // 🔄 Conectando...
    else if (connection === 'connecting') {
      logger.info(`[Baileys][${this.userId}] 🔄 Conectando a WhatsApp...`);
    }
  }

  async handleIncomingMessages(messages) {
    const Message = require('../../models/Message');
    const Autoresponse = require('../../models/Autoresponse');
    const AutoResponseLog = require('../../models/AutoResponseLog');

    for (const msg of messages) {
      // Ignorar mensajes vacíos o propios
      if (!msg.message || msg.key.fromMe) continue;

      try {
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');

        // Extraer texto del mensaje
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          msg.message.videoMessage?.caption ||
          '';

        logger.info(`[Baileys][${this.userId}] 📨 Mensaje de ${from}: "${text.substring(0, 50)}..."`);

        // ✅ LÓGICA DE AUTO-RESPUESTAS
        try {
          // Normalizar JID para búsqueda (quitar @s.whatsapp.net)
          const phoneNumber = from.split('@')[0];
          const searchJid = `${phoneNumber}@c.us`; // Formato de BD

          // Verificar si este contacto recibió mensajes de campaña
          // ✅ MEJORA: Buscar el mensaje outbound MÁS RECIENTE para asociar job correctamente
          const enviado = await Message.findOne({
            to: searchJid,
            direction: "outbound",
            createdBy: this.userId
          }).sort({ timestamp: -1 });  // Más reciente primero

          if (!enviado) {
            logger.debug(`[Baileys][${this.userId}] Mensaje ignorado (no corresponde a campaña): ${from}`);
            // Emitir al frontend de todos modos
            try {
              getIO().to(`user_${this.userId}`).emit('message_received', {
                from,
                text,
                isGroup,
                timestamp: msg.messageTimestamp,
              });
            } catch (e) { }
            continue;
          }

          // Marcar que el contacto respondió
          await Message.updateMany(
            { to: searchJid, direction: "outbound", createdBy: this.userId },
            { $set: { respondio: true } }
          );
          logger.info(`[Baileys][${this.userId}] ✓ Contacto ${phoneNumber} marcado como respondido`);

          // ✅ CORRECCIÓN BUG 5: Crear registro del mensaje inbound
          try {
            await Message.create({
              contact: enviado.contact,
              createdBy: this.userId,
              job: enviado.job,
              contenido: text || '',
              direction: 'inbound',
              status: 'recibido',
              timestamp: new Date(),
              to: searchJid,
              from: this.userId
            });
            logger.info(`[Baileys][${this.userId}] Mensaje inbound registrado de ${phoneNumber} (job: ${enviado.job})`);
          } catch (e) {
            logger.error(`[Baileys][${this.userId}] Error registrando mensaje inbound:`, e.message);
          }

          // Cargar reglas de auto-respuesta activas
          const reglas = await Autoresponse.find({ createdBy: this.userId, active: true });

          if (reglas.length > 0) {
            const normalize = (s) => (s || "").toLowerCase().trim();
            const bodyNorm = normalize(text);

            // Buscar regla que coincida
            const matched = reglas.find(r => {
              const kw = normalize(r.keyword);
              if (!kw) return false;
              const mt = r.matchType || "exact"; // ✅ Default a exact (comparación exacta)
              return mt === "exact" ? bodyNorm === kw : bodyNorm.includes(kw);
            });

            const rule = matched || reglas.find(r => r.isFallback);

            if (rule) {
              // Anti-spam: verificar ventana de tiempo
              const windowMinutes = Number(process.env.AUTORESPONSE_WINDOW_MINUTES || 30);
              const since = new Date(Date.now() - windowMinutes * 60 * 1000);

              const recent = await AutoResponseLog.findOne({
                createdBy: this.userId,
                chatId: searchJid,
                respondedAt: { $gte: since },
              }).sort({ respondedAt: -1 }).lean();

              if (!recent) {
                try {
                  // Enviar auto-respuesta
                  await this.sendMessage(from, rule.response);
                  logger.info(`[Baileys][${this.userId}] 🤖 Auto-respuesta enviada (${rule.keyword || "fallback"})`);

                  // Registrar en log con detalles completos
                  await AutoResponseLog.create({
                    createdBy: this.userId,
                    chatId: searchJid,
                    ruleId: rule._id,
                    respondedAt: new Date(),
                    // ✅ MEJORA 3: Datos adicionales para reporte
                    job: enviado.job,
                    contact: enviado.contact,
                    keyword: rule.keyword || null,
                    response: rule.response,
                    isFallback: rule.isFallback || false,
                    userMessage: text || ''
                  });
                } catch (e) {
                  logger.warn(`[Baileys][${this.userId}] Error enviando auto-respuesta:`, e.message);
                }
              } else {
                logger.debug(`[Baileys][${this.userId}] Auto-respuesta omitida (ventana anti-spam)`);
              }
            }
          }
        } catch (autoErr) {
          logger.error(`[Baileys][${this.userId}] Error en auto-respuestas:`, autoErr.message);
        }

        // Emitir al frontend
        try {
          getIO().to(`user_${this.userId}`).emit('message_received', {
            from,
            text,
            isGroup,
            timestamp: msg.messageTimestamp,
          });
        } catch (e) {
          logger.error(`[Baileys][${this.userId}] Error emitiendo mensaje:`, e.message);
        }
      } catch (err) {
        logger.error(`[Baileys][${this.userId}] Error procesando mensaje:`, err.message);
      }
    }
  }

  /**
   * Enviar mensaje de texto
   */
  async sendMessage(to, content) {
    if (!this.ready || !this.sock) {
      throw new Error('Cliente no está listo para enviar mensajes');
    }

    try {
      // Normalizar JID: convertir @c.us (whatsapp-web.js) a @s.whatsapp.net (Baileys)
      let jid = to;
      if (to.includes('@c.us')) {
        jid = to.replace('@c.us', '@s.whatsapp.net');
      } else if (!to.includes('@')) {
        jid = `${to.replace(/\D/g, '')}@s.whatsapp.net`;
      }

      // ✅ VERIFICAR si el número tiene WhatsApp activo
      const phoneNumber = jid.split('@')[0];
      try {
        const [result] = await this.sock.onWhatsApp(phoneNumber);
        if (!result || !result.exists) {
          logger.warn(`[Baileys][${this.userId}] ⚠️ Número ${phoneNumber} NO tiene WhatsApp activo`);
          throw new Error(`Número ${phoneNumber} no tiene WhatsApp`);
        }
        logger.debug(`[Baileys][${this.userId}] ✓ Número ${phoneNumber} verificado en WhatsApp`);
      } catch (verifyError) {
        logger.error(`[Baileys][${this.userId}] ❌ Error verificando número ${phoneNumber}:`, verifyError.message);
        throw verifyError;
      }

      // 🤖 Simular comportamiento humano (CRÍTICO para evitar detección de spam)
      try {
        await this.sock.presenceSubscribe(jid);
        await new Promise(resolve => setTimeout(resolve, 300)); // Delay breve

        await this.sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simular escritura

        await this.sock.sendPresenceUpdate('paused', jid);
      } catch (presenceError) {
        // Si falla la presencia, continuar (no es crítico)
        logger.debug(`[Baileys][${this.userId}] Presence update falló: ${presenceError.message}`);
      }

      // Enviar mensaje y esperar resultado
      const result = await this.sock.sendMessage(jid, { text: content });

      // Verificar que el mensaje fue aceptado
      if (!result) {
        throw new Error('WhatsApp no retornó confirmación del mensaje');
      }

      logger.info(`[Baileys][${this.userId}] ✅ Mensaje enviado a ${jid}`);

      return { success: true, to: jid, messageId: result.key?.id };
    } catch (error) {
      logger.error(`[Baileys][${this.userId}] ❌ Error enviando mensaje a ${to}:`, error.message);
      throw error;
    }
  }

  /**
   * Enviar mensaje con media (imagen, video, documento)
   */
  async sendMediaMessage(to, mediaBuffer, options = {}) {
    if (!this.ready || !this.sock) {
      throw new Error('Cliente no está listo');
    }

    try {
      const jid = to.includes('@') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;

      const message = {
        [options.type || 'image']: mediaBuffer,
        caption: options.caption || '',
        mimetype: options.mimetype,
        fileName: options.fileName,
      };

      await this.sock.sendMessage(jid, message);
      logger.info(`[Baileys][${this.userId}] ✅ Media enviado a ${jid}`);

      return { success: true };
    } catch (error) {
      logger.error(`[Baileys][${this.userId}] ❌ Error enviando media:`, error.message);
      throw error;
    }
  }

  /**
   * Obtener información del usuario
   */
  async getUserInfo() {
    if (!this.ready || !this.sock) {
      return null;
    }

    try {
      const info = this.sock.user;
      return {
        id: info.id,
        name: info.name,
        pushName: info.name,
      };
    } catch (error) {
      logger.error(`[Baileys][${this.userId}] Error obteniendo info:`, error.message);
      return null;
    }
  }

  /**
   * Logout y limpiar sesión
   */
  async logout() {
    logger.info(`[Baileys][${this.userId}] 🚪 Cerrando sesión...`);

    this.intentionalLogout = true;

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        logger.warn(`[Baileys][${this.userId}] Error en logout:`, e.message);
      }
    }

    // Limpiar archivos de autenticación
    try {
      if (fs.existsSync(this.authFolder)) {
        fs.rmSync(this.authFolder, { recursive: true, force: true });
        logger.info(`[Baileys][${this.userId}] 🧹 Credenciales eliminadas`);
      }
    } catch (e) {
      logger.error(`[Baileys][${this.userId}] Error limpiando credenciales:`, e.message);
    }

    this.ready = false;
    this.qrCode = null;

    // Emitir logout al frontend
    try {
      getIO().to(`user_${this.userId}`).emit('logout_success');
      getIO().to(`user_${this.userId}`).emit('wa_status', { connected: false, ready: false });
    } catch (e) {
      logger.error(`[Baileys][${this.userId}] Error emitiendo logout:`, e.message);
    }
  }

  /**
   * Destruir cliente sin hacer logout
   */
  async destroy() {
    logger.info(`[Baileys][${this.userId}] 💥 Destruyendo cliente...`);

    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (e) {
        logger.warn(`[Baileys][${this.userId}] Error destruyendo socket:`, e.message);
      }
    }

    this.sock = null;
    this.ready = false;
    this.qrCode = null;
  }

  /**
   * Verificar si el cliente está listo
   */
  isReady() {
    return this.ready && this.sock !== null;
  }

  /**
   * Obtener QR code actual
   */
  getQR() {
    return this.qrCode;
  }

  /**
   * Verificar si un número está registrado en WhatsApp
   */
  async isRegistered(phoneNumber) {
    if (!this.ready || !this.sock) {
      throw new Error('Cliente no está listo');
    }

    try {
      const [result] = await this.sock.onWhatsApp(phoneNumber);
      return result?.exists || false;
    } catch (error) {
      logger.error(`[Baileys][${this.userId}] Error verificando número:`, error.message);
      return false;
    }
  }
}

module.exports = BaileysClient;
