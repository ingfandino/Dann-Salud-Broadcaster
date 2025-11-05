// backend/src/models/BannedWord.js

const mongoose = require("mongoose");

const bannedWordSchema = new mongoose.Schema(
    {
        word: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true, // Almacenar en minúsculas para comparación case-insensitive
            index: true
        },
        category: {
            type: String,
            enum: ["ofensiva", "legal", "competencia", "otra"],
            default: "otra"
        },
        severity: {
            type: String,
            enum: ["baja", "media", "alta", "crítica"],
            default: "media"
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        active: {
            type: Boolean,
            default: true
        },
        notes: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

// Índices para búsquedas eficientes
bannedWordSchema.index({ active: 1, word: 1 });
bannedWordSchema.index({ addedBy: 1, createdAt: -1 });

module.exports = mongoose.model("BannedWord", bannedWordSchema);
