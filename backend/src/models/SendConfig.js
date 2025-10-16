// backend/src/models/SendConfig.js

const mongoose = require("mongoose");

const sendConfigSchema = new mongoose.Schema({
    minDelay: { type: Number, default: 3 },     // segundos
    maxDelay: { type: Number, default: 8 },
    batchSize: { type: Number, default: 20 },
    batchPause: { type: Number, default: 60 }   // segundos
}, { timestamps: true });

module.exports = mongoose.model("SendConfig", sendConfigSchema);