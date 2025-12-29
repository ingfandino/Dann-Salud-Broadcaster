/**
 * ============================================================
 * MODELO DE TRABAJO DE ENVÍO (SendJob)
 * ============================================================
 * Representa una campaña de envío masivo de mensajes por WhatsApp.
 * Almacena la configuración del envío, lista de contactos, estado
 * de ejecución, y estadísticas de progreso.
 * 
 * Estados posibles:
 * - pendiente: Esperando ejecución
 * - ejecutando: Enviando mensajes activamente
 * - pausado: Detenido manualmente
 * - completado: Todos los mensajes enviados
 * - fallido: Error crítico que detuvo el envío
 * - cancelado: Cancelado por el usuario
 * - descanso: Pausa automática entre lotes
 */

const mongoose = require("mongoose");

const sendJobSchema = new mongoose.Schema({
    /** Nombre identificador de la campaña */
    name: {
        type: String,
        required: true,
        trim: true,
    },
    /** Lista de contactos a los que se enviará */
    contacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true,
    }],
    /** Mensaje a enviar (puede contener variables) */
    message: {
        type: String,
        required: true,
    },
    /** Plantilla utilizada (opcional) */
    template: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
        required: false,
    },
    /** Estado actual del trabajo */
    status: {
        type: String,
        enum: ["pendiente", "ejecutando", "pausado", "completado", "fallido", "cancelado", "descanso"],
        default: "pendiente",
    },
    
    /* ========== PARÁMETROS DE ENVÍO ========== */
    
    /** Retraso mínimo entre mensajes (segundos) */
    delayMin: { type: Number, default: 2 },
    /** Retraso máximo entre mensajes (segundos) */
    delayMax: { type: Number, default: 5 },
    /** Cantidad de mensajes por lote */
    batchSize: { type: Number, default: 10 },
    /** Pausa entre lotes (minutos) */
    pauseBetweenBatchesMinutes: { type: Number, default: 1 },
    
    /* ========== ESTADÍSTICAS ========== */
    
    stats: {
        total: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
    },
    
    /* ========== METADATA ========== */
    
    /** Usuario que creó el trabajo */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    /** Fecha programada para inicio */
    scheduledFor: { type: Date },
    /** Fecha de inicio real */
    startedAt: Date,
    /** Fecha de finalización */
    finishedAt: Date,
    /** Fecha de completado exitoso */
    completedAt: Date,
    /** Índice actual en la lista de contactos */
    currentIndex: {
        type: Number,
        default: 0,
    },
    /** Contador de intentos para evitar bucles infinitos */
    attempts: {
        type: Number,
        default: 0,
    },
    /** Timestamp de fin de descanso para auto-reanudación */
    restBreakUntil: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
sendJobSchema.index({ status: 1, scheduledFor: 1 });
sendJobSchema.index({ createdBy: 1, updatedAt: -1 });

module.exports = mongoose.model("SendJob", sendJobSchema);