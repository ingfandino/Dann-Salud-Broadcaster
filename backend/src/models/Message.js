// backend/src/models/Message.js

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact",
            required: false,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SendJob",
            required: false,
        },
        contenido: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            enum: ["pendiente", "enviado", "fallido", "recibido", "entregado", "leido"],
            default: "pendiente",
        },
        from: { type: String },
        to: { type: String },
        body: { type: String },
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            default: "outbound",
        },
        timestamp: { type: Date },
        respondio: { 
            type: Boolean, 
            default: false,
            index: true 
        },
    },
    { timestamps: true }
);

// Índices para acelerar consultas de métricas y progreso
messageSchema.index({ job: 1, status: 1 });
messageSchema.index({ job: 1, direction: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ direction: 1 });
messageSchema.index({ to: 1, direction: 1 });

// ✅ CORRECCIÓN BUG 1: Índice único para prevenir duplicados
// Previene múltiples mensajes outbound al mismo destino en el mismo job
messageSchema.index(
    { job: 1, to: 1, direction: 1 }, 
    { 
        unique: true, 
        sparse: true, // Permite documentos sin job o to
        partialFilterExpression: { 
            direction: 'outbound',
            job: { $exists: true },
            to: { $exists: true }
        }
    }
);

// 🚨 ÍNDICE PARA DEDUPLICACIÓN GLOBAL
// Optimiza búsqueda de mensajes recientes a un número (previene duplicados entre campañas)
messageSchema.index(
    { to: 1, direction: 1, timestamp: -1, status: 1 },
    { 
        name: 'global_dedup_index',
        background: true // Crear en segundo plano sin bloquear
    }
);

module.exports = mongoose.model("Message", messageSchema);