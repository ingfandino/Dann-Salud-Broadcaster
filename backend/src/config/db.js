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
        
        /** Opciones de conexión optimizadas para rendimiento y estabilidad
         * NOTE: keepAlive is enabled by default in MongoDB driver v4+
         */
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 60000,
            maxPoolSize: 50,
            minPoolSize: 10,
            // Connection retry settings
            retryWrites: true,
            retryReads: true,
        };
        
        const conn = await mongoose.connect(envConfig.MONGO_URI, options);
        logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);
        
        /** Monitoreo de eventos de conexión para detectar desconexiones */
        mongoose.connection.on('disconnected', () => {
            logger.warn('[DIAGNOSTIC] MongoDB desconectado - posible causa de cascada de 500s');
        });
        
        mongoose.connection.on('error', (err) => {
            logger.error(`[DIAGNOSTIC] MongoDB connection error - posible causa de cascada: ${err.message}`, {
                name: err.name,
                code: err.code,
                stack: err.stack
            });
        });
        
        mongoose.connection.on('reconnected', () => {
            logger.info('[DIAGNOSTIC] MongoDB reconectado - sistema debe recuperarse');
        });
        
        mongoose.connection.on('connecting', () => {
            logger.info('[DIAGNOSTIC] MongoDB intentando conectar...');
        });
        
        mongoose.connection.on('close', () => {
            logger.warn('[DIAGNOSTIC] MongoDB connection cerrada');
        });
        
    } catch (error) {
        // DIAGNOSTIC: Capture full error details for connection failures
        const errorDetails = {
            message: error?.message || 'No error message',
            name: error?.name || 'Unknown',
            code: error?.code,
            stack: error?.stack,
            uri: envConfig.MONGO_URI ? envConfig.MONGO_URI.replace(/\/\/.*:.*@/, '//****:****@') : 'NO_URI_SET'
        };
        // Use console as fallback in case logger isn't working
        console.error("[DB] ❌ Error conectando a MongoDB:", errorDetails);
        logger.error("❌ Error conectando a MongoDB:", errorDetails);
        process.exit(1);
    }
};

module.exports = connectDB;