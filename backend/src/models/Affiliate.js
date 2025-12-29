/**
 * ============================================================
 * MODELO DE AFILIADO (Affiliate)
 * ============================================================
 * Representa a los potenciales clientes (leads) del sistema.
 * Almacena información personal, de contacto, y el ciclo de vida
 * completo del lead desde la importación hasta la venta o rechazo.
 * 
 * Flujo típico:
 * 1. Importación desde Excel (datos frescos)
 * 2. Exportación a supervisores para distribución
 * 3. Asignación a asesores
 * 4. Gestión del lead (llamadas, seguimiento)
 * 5. Resultado final (venta, no interesa, reutilizable)
 */

const mongoose = require("mongoose");

const affiliateSchema = new mongoose.Schema(
    {
        /* ========== DATOS PERSONALES (OBLIGATORIOS) ========== */
        
        /** Nombre completo del afiliado */
        nombre: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        /** CUIL único del afiliado (identificador nacional) */
        cuil: {
            type: String,
            required: true,
            trim: true,
            index: true,
            unique: true
        },
        /** Obra social actual del afiliado */
        obraSocial: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        /** Ciudad o localidad de residencia */
        localidad: {
            type: String,
            required: true,
            trim: true
        },
        /** Teléfono principal de contacto */
        telefono1: {
            type: String,
            required: true,
            trim: true
        },

        /* ========== DATOS DE CONTACTO ADICIONALES ========== */
        
        telefono2: { type: String, trim: true },
        telefono3: { type: String, trim: true },
        telefono4: { type: String, trim: true },
        telefono5: { type: String, trim: true },
        
        /** Edad del afiliado */
        edad: {
            type: Number,
            min: 0,
            max: 150
        },
        /** Código interno de la obra social */
        codigoObraSocial: {
            type: String,
            trim: true
        },

        /* ========== METADATA DE IMPORTACIÓN ========== */
        
        /** Usuario que subió el archivo */
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        /** Fecha de importación */
        uploadDate: {
            type: Date,
            default: Date.now,
            index: true
        },
        /** Nombre del archivo Excel original */
        sourceFile: {
            type: String,
            required: true
        },
        /** Identificador único del lote de importación */
        batchId: {
            type: String,
            required: true,
            index: true
        },

        /* ========== ESTADO Y EXPORTACIÓN ========== */
        
        /** Estado activo/inactivo del registro */
        active: {
            type: Boolean,
            default: true
        },
        /** Indica si fue exportado a un supervisor */
        exported: {
            type: Boolean,
            default: false,
            index: true
        },
        /** Fecha de exportación */
        exportedAt: { type: Date },
        /** Supervisor al que se exportó */
        exportedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        /** ID del lote de exportación */
        exportBatchId: { type: String },

        /* ========== GESTIÓN DE LEADS ========== */
        
        /** Estado actual del lead en el proceso comercial */
        leadStatus: {
            type: String,
            enum: ['Pendiente', 'Asignado', 'Llamado', 'No contesta', 'No interesado', 'Venta', 'Fallido', 'Reutilizable'],
            default: 'Pendiente',
            index: true
        },
        /** Asesor actualmente asignado */
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        /** Fecha de asignación al asesor actual */
        assignedAt: { type: Date },
        /** Última interacción registrada */
        lastInteraction: { type: Date },
        /** Historial completo de interacciones */
        interactionHistory: [{
            status: String,
            note: String,
            date: { type: Date, default: Date.now },
            by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
        }],
        /** Indica si el lead ya fue utilizado en algún proceso */
        isUsed: {
            type: Boolean,
            default: false,
            index: true
        },
        
        /* ========== ORIGEN Y TRAZABILIDAD ========== */
        
        /** Origen del dato: fresh (nuevo), reusable (reciclado), extra */
        dataSource: {
            type: String,
            enum: ['fresh', 'reusable', 'extra'],
            index: true
        },
        /** Indica si fue creado desde una auditoría fallida */
        createdFromAudit: {
            type: Boolean,
            default: false
        },
        /** Referencia a la auditoría origen (si aplica) */
        sourceAuditId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Audit"
        },

        /* ========== CONTROL DE OBSOLESCENCIA ========== */
        
        /** Fecha en que se marcó como obsoleto */
        obsoletedAt: { type: Date },
        /** Batch que causó la obsolescencia */
        obsoletedByBatchId: { type: String },

        /** Datos adicionales dinámicos del Excel */
        additionalData: {
            type: Map,
            of: String
        }
    },
    {
        timestamps: true
    }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS ========== */
affiliateSchema.index({ nombre: "text" });
affiliateSchema.index({ telefono1: 1 });
affiliateSchema.index({ obraSocial: 1, localidad: 1 });
affiliateSchema.index({ uploadedBy: 1, uploadDate: -1 });

module.exports = mongoose.model("Affiliate", affiliateSchema);
