// backend/src/models/InternalMessage.js

const mongoose = require("mongoose");

const internalMessageSchema = new mongoose.Schema(
    {
        from: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        to: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        subject: {
            type: String,
            default: "(Sin asunto)"
        },
        content: {
            type: String,
            required: true
        },
        attachments: [{
            filename: String,
            originalName: String,
            mimetype: String,
            size: Number,
            path: String,
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }],
        read: {
            type: Boolean,
            default: false,
            index: true
        },
        readAt: {
            type: Date
        },
        starred: {
            type: Boolean,
            default: false
        },
        archived: {
            type: Boolean,
            default: false
        },
        deletedBy: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "InternalMessage"
        },
        isForward: {
            type: Boolean,
            default: false
        },
        forwardedFrom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
);

// Índices compuestos para consultas eficientes
internalMessageSchema.index({ to: 1, read: 1, createdAt: -1 });
internalMessageSchema.index({ from: 1, createdAt: -1 });
internalMessageSchema.index({ to: 1, archived: 1, createdAt: -1 });

module.exports = mongoose.model("InternalMessage", internalMessageSchema);
