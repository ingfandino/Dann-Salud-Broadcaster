/**
 * ============================================================
 * MODELO DE REPORTE (Report)
 * ============================================================
 * Almacena reportes de mensajes enviados para análisis y métricas.
 * Integra información del contacto, asesor, y estado del mensaje.
 * Se usa para generar estadísticas de campañas.
 */

const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
    {
        /* ========== DATOS DEL CONTACTO ========== */
        
        /** Fecha del envío */
        fecha: { type: Date, required: true },
        /** Teléfono del destinatario */
        telefono: { type: String, required: true },
        /** Nombre del destinatario */
        nombre: { type: String, required: true },
        /** Obra social del destinatario */
        obraSocial: { type: String },
        /** Indica si el destinatario respondió */
        respondio: { type: Boolean, default: false },
        
        /* ========== DATOS DEL ASESOR ========== */
        
        /** Nombre del asesor que envió el mensaje */
        asesorNombre: { type: String, required: true },
        /** Grupo o equipo del asesor */
        grupo: { type: String },
        
        /* ========== REFERENCIAS A OTROS MODELOS ========== */
        
        /** Trabajo de envío asociado */
        job: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "SendJob",
            required: false 
        },
        /** Contacto asociado */
        contact: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Contact",
            required: false 
        },
        /** Mensaje asociado */
        message: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Message",
            required: false 
        },
        /** Usuario que creó el reporte */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false
        },
        
        /* ========== TRACKING DE CAMPAÑA ========== */
        
        /** Nombre de la campaña */
        campaignName: { type: String },
        /** Estado del mensaje */
        messageStatus: { 
            type: String, 
            enum: ["enviado", "fallido", "pendiente", "recibido"],
            default: "enviado"
        },
    },
    { timestamps: true }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
ReportSchema.index({ fecha: -1 });
ReportSchema.index({ asesorNombre: 1 });
ReportSchema.index({ job: 1 });
ReportSchema.index({ createdBy: 1 });

module.exports = mongoose.model("Report", ReportSchema);