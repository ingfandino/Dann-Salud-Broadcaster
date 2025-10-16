// backend/src/models/Template.js

const mongoose = require("mongoose");

const TemplateSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
    },
    contenido: {
        type: String,
        required: true, // Puede contener placeholders {{campo}} y spintax {a|b}
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });

module.exports = mongoose.model("Template", TemplateSchema);