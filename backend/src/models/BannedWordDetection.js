/**
 * ============================================================
 * MODELO DE DETECCIÓN DE PALABRA PROHIBIDA
 * ============================================================
 * Registra cada vez que se detecta una palabra prohibida en un mensaje.
 * Permite auditoría, notificación a supervisores, y gestión de incidentes.
 */

const mongoose = require("mongoose");

const bannedWordDetectionSchema = new mongoose.Schema(
    {
        /** Palabra detectada */
        word: { type: String, required: true, trim: true, lowercase: true },
        /** Referencia a la regla de palabra prohibida */
        wordId: { type: mongoose.Schema.Types.ObjectId, ref: "BannedWord", required: true },
        /** Contexto donde se detectó */
        detectedIn: { type: String, enum: ["bulk_message", "campaign", "template", "individual_message"], required: true },
        /** Usuario que intentó usar la palabra */
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        /** Teléfono del afiliado destinatario (para mensajes individuales) */
        affiliatePhone: { type: String, trim: true },
        /** Nombre de la campaña (si aplica) */
        campaignName: { type: String, trim: true },
        /** Fragmento del mensaje donde se detectó */
        messageContent: { type: String, required: true },
        /** Mensaje completo para auditoría */
        fullContext: { type: String },
        /** Usuarios notificados sobre la detección */
        notifiedUsers: [{
            userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            notifiedAt: { type: Date, default: Date.now },
            role: String
        }],
        /** Estado de resolución del incidente */
        resolved: { type: Boolean, default: false },
        /** Usuario que resolvió el incidente */
        resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        /** Fecha de resolución */
        resolvedAt: Date,
        /** Notas sobre la resolución */
        notes: String
    },
    { timestamps: true }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
bannedWordDetectionSchema.index({ userId: 1, createdAt: -1 });
bannedWordDetectionSchema.index({ word: 1, createdAt: -1 });
bannedWordDetectionSchema.index({ resolved: 1, createdAt: -1 });
bannedWordDetectionSchema.index({ "notifiedUsers.userId": 1 });

module.exports = mongoose.model("BannedWordDetection", bannedWordDetectionSchema);
