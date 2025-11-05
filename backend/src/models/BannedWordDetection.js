// backend/src/models/BannedWordDetection.js

const mongoose = require("mongoose");

const bannedWordDetectionSchema = new mongoose.Schema(
    {
        word: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        wordId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BannedWord",
            required: true
        },
        detectedIn: {
            type: String,
            enum: ["bulk_message", "campaign", "template"],
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        campaignName: {
            type: String,
            trim: true
        },
        messageContent: {
            type: String, // Fragmento del mensaje donde se detectó
            required: true
        },
        fullContext: {
            type: String // Mensaje completo (opcional, para auditoría)
        },
        notifiedUsers: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            notifiedAt: {
                type: Date,
                default: Date.now
            },
            role: String
        }],
        resolved: {
            type: Boolean,
            default: false
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        resolvedAt: Date,
        notes: String
    },
    {
        timestamps: true
    }
);

// Índices para búsquedas y reportes
bannedWordDetectionSchema.index({ userId: 1, createdAt: -1 });
bannedWordDetectionSchema.index({ word: 1, createdAt: -1 });
bannedWordDetectionSchema.index({ resolved: 1, createdAt: -1 });
bannedWordDetectionSchema.index({ "notifiedUsers.userId": 1 });

module.exports = mongoose.model("BannedWordDetection", bannedWordDetectionSchema);
