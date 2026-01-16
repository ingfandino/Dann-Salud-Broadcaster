/**
 * ============================================================
 * MODELO DE TELÉFONO CORPORATIVO (Phone)
 * ============================================================
 * Gestiona los teléfonos corporativos asignados a equipos de ventas.
 * Incluye historial de recargas y gastos asociados a cada dispositivo.
 * 
 * Usado por el módulo de RR.HH para gestión de teléfonos.
 */

const mongoose = require('mongoose');

/* ========== SUB-SCHEMA: RECARGA/GASTO ========== */
const rechargeSchema = new mongoose.Schema({
    /** Motivo de la recarga/gasto */
    motivo: {
        type: String,
        enum: ['Recarga', 'Otro'],
        required: true
    },
    /** Descripción adicional (solo si motivo es 'Otro') */
    descripcion: {
        type: String,
        default: ''
    },
    /** Monto de la recarga/gasto */
    monto: {
        type: Number,
        required: true,
        min: 0
    },
    /** Fecha de la recarga/gasto */
    fecha: {
        type: Date,
        default: Date.now
    },
    /** Usuario que registró la recarga */
    registradoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true, timestamps: false });

/* ========== SCHEMA PRINCIPAL: TELÉFONO ========== */
const phoneSchema = new mongoose.Schema({
    /** Supervisor responsable del teléfono */
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    /** Número de equipo al que pertenece */
    numeroEquipo: {
        type: String,
        required: true
    },
    /** Modelo del dispositivo */
    modelo: {
        type: String,
        required: true,
        trim: true
    },
    /** Número de teléfono */
    numeroTelefono: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    /** Asesor asignado al teléfono */
    asesorAsignado: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    /** Historial de recargas y gastos */
    historialRecargas: [rechargeSchema],
    /** Fecha de la última recarga (calculada automáticamente) */
    ultimaRecarga: {
        type: Date,
        default: null
    },
    /** Fecha del próximo vencimiento (calculada: ultimaRecarga + 1 mes) */
    proximoVencimiento: {
        type: Date,
        default: null
    },
    /** Indica si ya se envió notificación de vencimiento próximo */
    notificacionEnviada: {
        type: Boolean,
        default: false
    },
    /** Estado activo/inactivo del teléfono */
    activo: {
        type: Boolean,
        default: true
    },
    /** Notas adicionales */
    notas: {
        type: String,
        default: ''
    },
    /** Usuario que creó el registro */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    /** Usuario que realizó la última actualización */
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

/* ========== MÉTODOS ========== */

/**
 * Calcula y actualiza ultimaRecarga y proximoVencimiento
 * basándose en el historial de recargas
 */
phoneSchema.methods.calcularVencimiento = function() {
    // Filtrar solo recargas (no "Otro")
    const recargas = this.historialRecargas.filter(r => r.motivo === 'Recarga');
    
    if (recargas.length === 0) {
        this.ultimaRecarga = null;
        this.proximoVencimiento = null;
        this.notificacionEnviada = false;
        return;
    }

    // Obtener la recarga más reciente
    const ultimaRecargaDate = recargas.reduce((latest, r) => {
        return r.fecha > latest ? r.fecha : latest;
    }, new Date(0));

    this.ultimaRecarga = ultimaRecargaDate;
    
    // Calcular próximo vencimiento (1 mes después)
    const vencimiento = new Date(ultimaRecargaDate);
    vencimiento.setMonth(vencimiento.getMonth() + 1);
    this.proximoVencimiento = vencimiento;
    
    // Resetear notificación si se agregó nueva recarga
    this.notificacionEnviada = false;
};

/**
 * Pre-save hook para calcular vencimiento automáticamente
 */
phoneSchema.pre('save', function(next) {
    this.calcularVencimiento();
    next();
});

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
phoneSchema.index({ supervisor: 1 });
phoneSchema.index({ numeroEquipo: 1 });
phoneSchema.index({ asesorAsignado: 1 });
phoneSchema.index({ activo: 1 });
phoneSchema.index({ proximoVencimiento: 1 });
phoneSchema.index({ notificacionEnviada: 1, proximoVencimiento: 1 });

module.exports = mongoose.model('Phone', phoneSchema);
