// backend/src/config/db.js

const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
    try {
        // Opciones optimizadas para entorno local en producción
        const options = {
            serverSelectionTimeoutMS: 5000, // Timeout más corto para entorno local
            socketTimeoutMS: 45000, // Tiempo de espera para operaciones
            maxPoolSize: 50, // Conexiones máximas para mejor rendimiento
            minPoolSize: 10, // Conexiones mínimas para respuesta rápida
        };
        
        const conn = await mongoose.connect(process.env.MONGO_URI, options);
        logger.info(`✅ MongoDB conectado: ${conn.connection.host}`);
        
        // Manejadores de eventos para monitorear la conexión
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