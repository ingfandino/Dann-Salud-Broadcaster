// backend/src/models/Affiliate.js

const mongoose = require("mongoose");

const affiliateSchema = new mongoose.Schema(
    {
        // Campos obligatorios
        nombre: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        cuil: {
            type: String,
            required: true,
            trim: true,
            index: true,
            unique: true // CUIL único
        },
        obraSocial: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        localidad: {
            type: String,
            required: true,
            trim: true
        },
        telefono1: {
            type: String,
            required: true,
            trim: true
            // index definido abajo en índices compuestos
        },
        
        // Campos opcionales
        telefono2: {
            type: String,
            trim: true
        },
        telefono3: {
            type: String,
            trim: true
        },
        telefono4: {
            type: String,
            trim: true
        },
        telefono5: {
            type: String,
            trim: true
        },
        edad: {
            type: Number,
            min: 0,
            max: 150
        },
        codigoObraSocial: {
            type: String,
            trim: true
        },
        
        // Metadata del archivo
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        uploadDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        sourceFile: {
            type: String, // Nombre del archivo original
            required: true
        },
        batchId: {
            type: String, // ID único del lote de carga
            required: true,
            index: true
        },
        
        // Estado
        active: {
            type: Boolean,
            default: true
        },
        
        // Campos adicionales dinámicos (para datos extra del Excel)
        additionalData: {
            type: Map,
            of: String
        }
    },
    {
        timestamps: true
    }
);

// Índices compuestos para búsquedas eficientes
affiliateSchema.index({ nombre: "text" }); // Búsqueda de texto
affiliateSchema.index({ telefono1: 1 }); // Índice simple para telefono1
affiliateSchema.index({ obraSocial: 1, localidad: 1 });
affiliateSchema.index({ uploadedBy: 1, uploadDate: -1 });

module.exports = mongoose.model("Affiliate", affiliateSchema);
