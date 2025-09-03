// src/models/SendJob.js

const mongoose = require("mongoose");

const sendJobSchema = new mongoose.Schema({
    name: String,
    contacts: [String],
    message: String,
    status: {
        type: String,
        enum: ["pending", "running", "paused", "completed", "canceled", "failed"],
        default: "pending"
    },
    stats: {
        sent: { type: Number, default: 0 },
        failed: { type: Number, default: 0 },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startedAt: Date,
    finishedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("SendJob", sendJobSchema);