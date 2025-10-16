// src/models/Contact.js

const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema(
    {
        nombre: { type: String, required: true },
        telefono: { type: String, required: true },
        cuil: { type: String, required: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        extraData: { type: Map, of: String }, // Opcionales dinámicos
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contact", ContactSchema);