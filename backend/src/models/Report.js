// src/models/Report.js

const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
    {
        fecha: { type: Date, required: true },
        telefono: { type: String, required: true },
        nombre: { type: String, required: true },
        obraSocial: { type: String },
        respondio: { type: Boolean, default: false },
        asesorNombre: { type: String, required: true },
        grupo: { type: String },
        
        // ✅ CORRECCIÓN: Integración con sistema de mensajería masiva
        job: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "SendJob",
            required: false 
        },
        contact: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Contact",
            required: false 
        },
        message: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Message",
            required: false 
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false
        },
        
        // Campos adicionales para tracking
        campaignName: { type: String },
        messageStatus: { 
            type: String, 
            enum: ["enviado", "fallido", "pendiente", "recibido"],
            default: "enviado"
        },
    },
    { timestamps: true }
);

// Índices para mejorar performance de consultas
ReportSchema.index({ fecha: -1 });
ReportSchema.index({ asesorNombre: 1 });
ReportSchema.index({ job: 1 });
ReportSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Report", ReportSchema);