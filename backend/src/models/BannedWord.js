/**
 * ============================================================
 * MODELO DE PALABRA PROHIBIDA (BannedWord)
 * ============================================================
 * Almacena palabras o frases que no deben aparecer en los mensajes.
 * Se usa para filtrar contenido ofensivo, menciones de competencia,
 * o términos legalmente problemáticos.
 */

const mongoose = require("mongoose");

const bannedWordSchema = new mongoose.Schema(
    {
        /** Palabra o frase prohibida (almacenada en minúsculas) */
        word: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true
        },
        /** Categoría de la palabra prohibida */
        category: {
            type: String,
            enum: ["ofensiva", "legal", "competencia", "otra"],
            default: "otra"
        },
        /** Nivel de severidad para priorizar alertas */
        severity: {
            type: String,
            enum: ["baja", "media", "alta", "crítica"],
            default: "media"
        },
        /** Usuario que agregó la palabra */
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        /** Estado activo/inactivo de la regla */
        active: {
            type: Boolean,
            default: true
        },
        /** Notas adicionales sobre la palabra */
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
bannedWordSchema.index({ active: 1, word: 1 });
bannedWordSchema.index({ addedBy: 1, createdAt: -1 });

module.exports = mongoose.model("BannedWord", bannedWordSchema);
