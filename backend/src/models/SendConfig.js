/**
 * ============================================================
 * MODELO DE CONFIGURACIÓN DE ENVÍOS (SendConfig)
 * ============================================================
 * Almacena los parámetros globales para el envío masivo de mensajes.
 * Estos valores se aplican por defecto a nuevos trabajos de envío.
 */

const mongoose = require("mongoose");

const sendConfigSchema = new mongoose.Schema({
    /** Retraso mínimo entre mensajes (segundos) */
    minDelay: { type: Number, default: 3 },
    /** Retraso máximo entre mensajes (segundos) */
    maxDelay: { type: Number, default: 8 },
    /** Cantidad de mensajes por lote */
    batchSize: { type: Number, default: 20 },
    /** Pausa entre lotes (segundos) */
    batchPause: { type: Number, default: 60 }
}, { timestamps: true });

module.exports = mongoose.model("SendConfig", sendConfigSchema);