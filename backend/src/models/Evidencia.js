/**
 * ============================================================
 * MODELO DE EVIDENCIA (Evidencia)
 * ============================================================
 * Representa el archivo .ZIP de evidencias asociado a una venta.
 * Gestiona el ciclo de vida de las evidencias desde carga hasta
 * finalización, con bloqueos automáticos según estado de la venta.
 * 
 * Estados:
 * - incompleta: Sin archivo ZIP cargado
 * - en_proceso: Archivo ZIP cargado pero no marcado como terminado
 * - terminada: Archivo ZIP cargado y marcado como terminado (solo si venta está exactamente en "QR hecho")
 * 
 * Reglas de bloqueo:
 * - isLocked = true cuando la venta ESTÁ en estado "QR hecho" (protege evidencias completadas)
 * - Cuando isLocked = true, no se puede reemplazar ZIP ni cambiar estado
 * - Subida/reemplazo permitido cuando venta NO está en "QR hecho"
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const EvidenciaSchema = new Schema({
    /* ========== RELACIÓN CON VENTA ========== */
    
    /** Referencia a la venta (Audit) asociada */
    ventaId: {
        type: Schema.Types.ObjectId,
        ref: 'Audit',
        required: true
    },

    /* ========== ESTADO DE LA EVIDENCIA ========== */
    
    /** Estado actual de la evidencia */
    estado: {
        type: String,
        enum: ['incompleta', 'en_proceso', 'terminada'],
        default: 'incompleta',
        required: true
    },

    /* ========== ARCHIVO ZIP ========== */
    
    /** Ruta interna del archivo en el filesystem */
    filePath: {
        type: String,
        default: null
    },

    /** Nombre original del archivo (sanitizado) */
    originalName: {
        type: String,
        default: null
    },

    /** Tamaño del archivo en KB */
    fileSizeKB: {
        type: Number,
        default: null
    },

    /* ========== TRAZABILIDAD ========== */
    
    /** Usuario que subió el archivo */
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    /** Fecha de primera carga del archivo */
    uploadedAt: {
        type: Date,
        default: null
    },

    /* ========== BLOQUEO ESTRUCTURAL ========== */
    
    /**
     * Indica si la evidencia está bloqueada para modificaciones.
     * Se activa cuando la venta ESTÁ en estado "QR hecho" (protege evidencias completadas)
     * 
     * Cuando isLocked = true:
     * - No se puede reemplazar el archivo ZIP
     * - No se puede cambiar el estado de la evidencia
     * - Solo se permite consulta según permisos de rol
     * 
     * Cuando isLocked = false (venta NO está en "QR hecho"):
     * - Se permite subir/reemplazar ZIP
     * - Se permite cambiar estado de evidencia
     */
    isLocked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

/* ========== ÍNDICES ========== */

// Índice único en ventaId para garantizar una sola evidencia por venta
EvidenciaSchema.index({ ventaId: 1 }, { unique: true });

// Índice en estado para filtros rápidos
EvidenciaSchema.index({ estado: 1 });

// Índice en uploadedAt para ordenamiento por fecha
EvidenciaSchema.index({ uploadedAt: -1 });

// Índice compuesto para consultas por estado y fecha
EvidenciaSchema.index({ estado: 1, uploadedAt: -1 });

/* ========== MÉTODOS VIRTUALES ========== */

/**
 * Virtual para verificar si existe un archivo ZIP
 */
EvidenciaSchema.virtual('hasFile').get(function() {
    return this.filePath !== null && this.filePath !== undefined && this.filePath !== '';
});

module.exports = mongoose.model('Evidencia', EvidenciaSchema);
