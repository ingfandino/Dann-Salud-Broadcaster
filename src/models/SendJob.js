// src/models/SendJob.js

const mongoose = require("mongoose");

const sendJobSchema = new mongoose.Schema(
    {
        ownerUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        template: { type: String, required: true },
        contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Contact" }],
        status: {
            type: String,
            enum: ["pending", "running", "paused", "cancelled", "completed", "failed"],
            default: "pending",
        },
        currentIndex: { type: Number, default: 0 },   // por dónde vamos en el envío
        scheduledFor: { type: Date, default: Date.now }, // fecha/hora de ejecución programada
    },
    { timestamps: true } // agrega createdAt y updatedAt automáticamente
);

module.exports = mongoose.model("SendJob", sendJobSchema);