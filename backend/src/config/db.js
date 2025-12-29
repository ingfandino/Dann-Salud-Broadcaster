/**
 * ============================================================
 * CONEXIÓN A BASE DE DATOS MONGODB
 * ============================================================
 * Este archivo gestiona la conexión a MongoDB usando Mongoose.
 * Configura opciones de rendimiento y monitorea el estado de la conexión.
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { envConfig } = require("./index");

/**
 * Establece la conexión con la base de datos MongoDB.
 * Configura opciones de pool de conexiones para optimizar el rendimiento.
 * Si la conexión falla, el servidor se detiene con código de error.
 */
const connectDB = async () => {
    try {
        if (!envConfig.MONGO_URI) {
            throw new Error("MONGODB_URI no está configurado en las variables de entorno");
        }
        
        logger.info(`🔌 Conectando a MongoDB: ${envConfig.MONGO_URI.replace(/\/\/.*:.*@/, '//****:****@')}`);
        
        /** Opciones de conexión optimizadas para rendimiento */
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 50,
            minPoolSize: 10,
        };
        
        const conn = await mongoose.connect(envConfig.MONGO_URI, options);
        logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);
        
        /** Monitoreo de eventos de conexión para detectar desconexiones */
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB desconectado. Intentando reconectar...');
        });
        
        mongoose.connection.on('error', (err) => {
            logger.error(`Error en la conexión MongoDB: ${err.message}`);
        });
        
    } catch (error) {
        logger.error("❌ Error conectando a MongoDB:", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;