// src/models/ImportLog.js

const mongoose = require("mongoose");

const importLogSchema = new mongoose.Schema({
    filename: String,
    type: { type: String, enum: ["csv", "json"], required: true },
    content: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ImportLog", importLogSchema);