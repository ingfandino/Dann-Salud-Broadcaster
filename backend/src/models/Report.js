// src/models/Report.js

const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
    {
        fecha: { type: Date, required: true },
        telefono: { type: String, required: true },
        nombre: { type: String, required: true },
        obraSocial: { type: String, required: true },
        respondio: { type: Boolean, default: false },
        asesorNombre: { type: String, required: true },
        grupo: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Report", ReportSchema);