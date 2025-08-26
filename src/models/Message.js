const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        contact: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Contact",
            required: true,
        },
        ownerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        contenido: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pendiente", "enviado", "fallido"],
            default: "pendiente",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);