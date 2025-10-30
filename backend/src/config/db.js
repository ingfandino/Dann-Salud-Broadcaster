// backend/src/config/db.js

const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { envConfig } = require("./index");

const connectDB = async () => {
    try {
        // Verificar que tenemos la URI de MongoDB
        if (!envConfig.MONGO_URI) {
            throw new Error("MONGODB_URI no está configurado en las variables de entorno");
        }
        
        logger.info(`🔌 Conectando a MongoDB: ${envConfig.MONGO_URI.replace(/\/\/.*:.*@/, '//****:****@')}`);
        
        // Opciones optimizadas para entorno local en producción
        const options = {
            serverSelectionTimeoutMS: 5000, // Timeout más corto para entorno local
            socketTimeoutMS: 45000, // Tiempo de espera para operaciones
            maxPoolSize: 50, // Conexiones máximas para mejor rendimiento
            minPoolSize: 10, // Conexiones mínimas para respuesta rápida
        };
        
        const conn = await mongoose.connect(envConfig.MONGO_URI, options);
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