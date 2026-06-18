/**
 * ============================================================
 * MODELO DE ASIGNACIÓN DE LEADS (LeadAssignment)
 * ============================================================
 * Gestiona la asignación de afiliados (leads) a asesores para
 * contacto diario. Registra el estado de cada lead y el historial
 * de interacciones realizadas.
 * 
 * Usado en la interfaz "Datos del día" para que los asesores
 * gestionen sus leads asignados y registren resultados.
 */

const mongoose = require('mongoose');

const leadAssignmentSchema = new mongoose.Schema({
    /** Referencia al afiliado asignado */
    affiliate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Affiliate',
        required: true
    },
    /** Asesor al que está asignado el lead */
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    /** Usuario que realizó la asignación */
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    /** Supervisor stock assignment consumed to create this advisor lead */
    sourceStockAssignment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AffiliateAssignment',
        default: null
    },
    /** Operational state snapshot that made the affiliate sellable */
    operationalState: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AffiliateOperationalState',
        default: null,
        index: true
    },
    /** Check/extract job that produced the supervisor stock */
    sourceCheckJob: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AffiliateCheckJob',
        default: null,
        index: true
    },
    /** Supervisor that owned the stock before advisor distribution */
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true
    },
    /** Fecha de asignación */
    assignedAt: {
        type: Date,
        default: Date.now
    },
    /** 
     * Estado actual del lead:
     * - Pendiente: Sin gestionar
     * - Llamando: En proceso de contacto
     * - Venta: Venta concretada
     * - No le interesa: Rechazado por el afiliado
     * - No contesta: Sin respuesta
     * - Spam: Número inválido o spam
     * - Reasignada: Transferido a otro usuario
     */
    status: {
        type: String,
        enum: [
            'Pendiente',
            'Llamando',
            'Venta', 
            'No le interesa',
            'No contesta',
            'Spam',
            'Reasignada'
        ],
        default: 'Pendiente',
        index: true
    },
    /** Sub-estado para detalles adicionales (ej: "Buzón de voz") */
    subStatus: {
        type: String,
        default: ''
    },
    /** Historial de interacciones con el lead */
    interactions: [{
        type: {
            type: String,
            enum: ['Llamada', 'WhatsApp', 'Nota', 'Cambio Estado', 'Reasignación'],
            required: true
        },
        note: String,
        statusFrom: String,
        statusTo: String,
        idempotencyKey: {
            type: String,
            trim: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    /** Último resultado registrado por el asesor en Datos del Día */
    lastOutcomeAt: {
        type: Date,
        default: null,
        index: true
    },
    lastOutcomeBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    lastOutcomeNote: {
        type: String,
        default: '',
        trim: true
    },
    /** Fecha programada para seguimiento */
    dueDate: { type: Date },
    /** Origen del dato: fresh (nuevo) o reusable (reciclado) */
    sourceType: {
        type: String,
        enum: ['fresh', 'reusable'],
        default: 'fresh'
    },
    /** Estado activo del registro */
    active: {
        type: Boolean,
        default: true
    },
    /** Supervisor al que se reasignó (si aplica) */
    reassignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    /** Hora programada para contacto (formato HH:mm) */
    scheduledHour: { type: String },
    /** Indica si es un lead prioritario */
    isPriority: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
leadAssignmentSchema.index({ assignedTo: 1, status: 1 });
leadAssignmentSchema.index({ affiliate: 1 });
leadAssignmentSchema.index({ assignedAt: 1 });
leadAssignmentSchema.index({ reassignedTo: 1, isPriority: -1 });
leadAssignmentSchema.index(
    { sourceStockAssignment: 1 },
    {
        unique: true,
        partialFilterExpression: {
            active: true,
            sourceStockAssignment: { $type: "objectId" }
        }
    }
);

module.exports = mongoose.model('LeadAssignment', leadAssignmentSchema);
