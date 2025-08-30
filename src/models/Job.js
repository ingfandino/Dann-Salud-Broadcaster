// src/models/Job.js

const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
    ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    template: { type: String, required: true },
    contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact", required: true }],
    scheduledFor: { type: Date, required: true }, // 📅 fecha/hora de envío
    status: {
        type: String,
        enum: ["pendiente", "ejecutando", "completado", "fallido", "cancelado"],
        default: "pendiente",
    },
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);