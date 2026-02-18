/**
 * ============================================================
 * MODELO DE MENSAJE INTERNO (InternalMessage)
 * ============================================================
 * Sistema de mensajería interna entre usuarios de la plataforma.
 * Permite comunicación privada, adjuntos, y organización de mensajes.
 */

const mongoose = require("mongoose");

const internalMessageSchema = new mongoose.Schema(
    {
        /** Usuario remitente */
        from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        /** Usuario destinatario */
        to: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        /** Asunto del mensaje */
        subject: { type: String, default: "(Sin asunto)" },
        /** Contenido del mensaje */
        content: { type: String, required: true },
        /** Indica si el contenido es HTML (para notificaciones del sistema) */
        isHtml: { type: Boolean, default: false },
        /** Archivos adjuntos */
        attachments: [{
            filename: String,
            originalName: String,
            mimetype: String,
            size: Number,
            path: String,
            uploadedAt: { type: Date, default: Date.now }
        }],
        /** Estado de lectura */
        read: { type: Boolean, default: false, index: true },
        /** Fecha de lectura */
        readAt: { type: Date },
        /** Marcado como favorito */
        starred: { type: Boolean, default: false },
        /** Archivado */
        archived: { type: Boolean, default: false },
        /** Usuarios que eliminaron este mensaje */
        deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        /** Mensaje al que responde */
        replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "InternalMessage" },
        /** Indica si es un reenvío */
        isForward: { type: Boolean, default: false },
        /** Usuario que reenvió el mensaje original */
        forwardedFrom: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },
    { timestamps: true }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
internalMessageSchema.index({ to: 1, read: 1, createdAt: -1 });
internalMessageSchema.index({ from: 1, createdAt: -1 });
internalMessageSchema.index({ to: 1, archived: 1, createdAt: -1 });

module.exports = mongoose.model("InternalMessage", internalMessageSchema);
