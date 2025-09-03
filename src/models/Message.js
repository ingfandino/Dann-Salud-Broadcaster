// src/models/Message.js

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact",
            required: false,
        },
        ownerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
        },
        job: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SendJob",
            required: false,
        },
        contenido: {
            type: String,
            required: false,
        },
        status: {
            type: String,
            enum: ["pendiente", "enviado", "fallido", "recibido"],
            default: "pendiente",
        },
        from: { type: String },
        to: { type: String },
        body: { type: String },
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            default: "outbound",
        },
        timestamp: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);