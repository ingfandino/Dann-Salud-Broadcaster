// src/models/Message.js

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact",
            required: false, // 🔹 en entrantes aún no siempre tendremos contacto registrado
        },
        ownerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false, // 🔹 en entrantes no necesariamente sabemos qué usuario "dueño"
        },
        contenido: {
            type: String,
            required: false, // 🔹 porque los mensajes entrantes pueden ser multimedia
        },
        status: {
            type: String,
            enum: ["pendiente", "enviado", "fallido", "recibido"],
            default: "pendiente",
        },
        from: { type: String },        // número origen (ej: 5491122334455@c.us)
        to: { type: String },          // destinatario (puede ser "me" si entrante)
        body: { type: String },        // texto puro del mensaje
        direction: {
            type: String,
            enum: ["inbound", "outbound"],
            default: "outbound",
        },
        timestamp: { type: Date },     // fecha/hora del mensaje
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);