// backend/src/models/SendJob.js

const mongoose = require("mongoose");

const sendJobSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    contacts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true,
    }],
    message: {
        type: String,
        required: true,
    },
    template: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Template',
        required: false,
    },
    status: {
        type: String,
        enum: ["pendiente", "ejecutando", "pausado", "completado", "fallido", "cancelado"],
        default: "pendiente",
    },
    // Parámetros de envío
    delayMin: { type: Number, default: 2 }, // segundos
    delayMax: { type: Number, default: 5 }, // segundos
    batchSize: { type: Number, default: 10 },
    pauseBetweenBatchesMinutes: { type: Number, default: 1 },
    stats: {
        total: { type: Number, default: 0 },
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
        pending: { type: Number, default: 0 },
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    scheduledFor: {
        type: Date,
    },
    startedAt: Date,
    finishedAt: Date,
    currentIndex: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model("SendJob", sendJobSchema);