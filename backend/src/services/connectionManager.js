/**
 * ============================================================
 * MANAGER DE CONEXIONES (connectionManager.js)
 * ============================================================
 * Gestiona la cola de conexiones de WhatsApp.
 * Limita conexiones simultáneas para evitar sobrecarga.
 */

const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50;
const path = require('path');
const logger = require('../utils/logger');
const { clients } = require('./whatsappManager');

/** Gestor de cola de conexiones */
class ConnectionManager {
  constructor() {
    this.connectionQueue = [];
    this.activeConnections = 0;
    this.maxConcurrent = 3; // Ajustar según capacidad del servidor
  }

  async addToQueue(userId) {
    return new Promise((resolve, reject) => {
      this.connectionQueue.push({ userId, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.activeConnections >= this.maxConcurrent || this.connectionQueue.length === 0) {
      return;
    }

    const { userId, resolve, reject } = this.connectionQueue.shift();
    this.activeConnections++;

    try {
      logger.info(`[ConnectionManager] Procesando conexión para usuario ${userId} (${this.activeConnections}/${this.maxConcurrent} conexiones activas)`);
      
      // ✅ CORRECCIÓN: Delay aleatorio entre 1-3 segundos antes de inicializar
      // Esto evita que WhatsApp detecte múltiples conexiones simultáneas desde la misma IP
      const randomDelay = 1000 + Math.random() * 2000; // 1-3 segundos
      logger.info(`[ConnectionManager] Esperando ${Math.round(randomDelay)}ms antes de inicializar...`);
      await new Promise(r => setTimeout(r, randomDelay));
      
      const client = await this.initializeClient(userId);
      resolve(client);
    } catch (error) {
      logger.error(`[ConnectionManager] Error al inicializar cliente para ${userId}:`, error.message);
      reject(error);
    } finally {
      this.activeConnections--;
      // ✅ CORRECCIÓN: Delay adicional de 2 segundos antes de procesar siguiente
      setTimeout(() => this.processQueue(), 2000);
    }
  }

  async initializeClient(userId) {
    const { initClientForUser } = require('./whatsappManager');
    return initClientForUser(userId);
  }

  getQueueStatus() {
    return {
      inQueue: this.connectionQueue.length,
      activeConnections: this.activeConnections,
      maxConcurrent: this.maxConcurrent
    };
  }
}

module.exports = new ConnectionManager();