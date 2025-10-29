// src/services/connectionManager.js

const EventEmitter = require('events');
EventEmitter.defaultMaxListeners = 50;
const path = require('path');
const logger = require('../utils/logger');
const { clients } = require('./whatsappManager');

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
      
      const client = await this.initializeClient(userId);
      resolve(client);
    } catch (error) {
      logger.error(`[ConnectionManager] Error al inicializar cliente para ${userId}:`, error.message);
      reject(error);
    } finally {
      this.activeConnections--;
      this.processQueue(); // Procesar siguiente en la cola
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