/**
 * ============================================================
 * MODELO DE MENSAJE (Message)
 * ============================================================
 * Registra cada mensaje enviado o recibido por WhatsApp.
 * Permite tracking del estado de entrega y métricas de campañas.
 * 
 * Estados posibles:
 * - pendiente: Encolado para envío
 * - enviado: Enviado exitosamente
 * - fallido: Error en el envío
 * - recibido: Mensaje entrante recibido
 * - entregado: Confirmación de entrega
 * - leido: Confirmación de lectura
 */

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        /** Referencia al contacto destinatario */
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact",
            required: false,
        },
        /** Usuario que inició el envío */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        /** Trabajo de envío al que pertenece */
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SendJob",
            required: false,
        },
        /** Contenido del mensaje */
        contenido: {
            type: String,
            required: false,
        },
        /** Estado actual del mensaje */
        status: {
            type: String,
            enum: ["pendiente", "enviado", "fallido", "recibido", "entregado", "leido"],
            default: "pendiente",
        },
        /** Número de origen */
        from: { type: String },
        /** Número de destino */
        to: { type: String },
        /** Cuerpo del mensaje */
        body: { type: String },
        /** Dirección: inbound (entrante) u outbound (saliente) */
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            default: "outbound",
        },
        /** Timestamp del mensaje */
        timestamp: { type: Date },
        /** Indica si el destinatario respondió */
        respondio: { 
            type: Boolean, 
            default: false,
            index: true 
        },
    },
    { timestamps: true }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
messageSchema.index({ job: 1, status: 1 });
messageSchema.index({ job: 1, direction: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ direction: 1 });
messageSchema.index({ to: 1, direction: 1 });

/** Índice único para prevenir mensajes duplicados al mismo destino en un job */
messageSchema.index(
    { job: 1, to: 1, direction: 1 }, 
    { 
        unique: true, 
        sparse: true,
        partialFilterExpression: { 
            direction: 'outbound',
            job: { $exists: true },
            to: { $exists: true }
        }
    }
);

/** Índice para deduplicación global entre campañas */
messageSchema.index(
    { to: 1, direction: 1, timestamp: -1, status: 1 },
    { 
        name: 'global_dedup_index',
        background: true
    }
);

module.exports = mongoose.model("Message", messageSchema);