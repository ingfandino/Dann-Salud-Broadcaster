const mongoose = require('mongoose');

const leadAssignmentSchema = new mongoose.Schema({
    affiliate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Affiliate',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Pendiente', 'En Gestión', 'Contactado', 'Venta', 'No Interesa', 'No Contesta', 'Derivado', 'Reciclable'],
        default: 'Pendiente',
        index: true
    },
    subStatus: {
        type: String, // Para detalle extra, ej: "Buzón de voz", "Volver a llamar"
        default: ''
    },
    interactions: [{
        type: {
            type: String,
            enum: ['Llamada', 'WhatsApp', 'Nota', 'Cambio Estado'],
            required: true
        },
        note: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        performedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    dueDate: {
        type: Date // Para reprogramaciones
    },
    sourceType: {
        type: String,
        enum: ['fresh', 'reusable'],
        default: 'fresh'
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Índices para búsquedas rápidas
leadAssignmentSchema.index({ assignedTo: 1, status: 1 });
leadAssignmentSchema.index({ affiliate: 1 });
leadAssignmentSchema.index({ assignedAt: 1 });

module.exports = mongoose.model('LeadAssignment', leadAssignmentSchema);
