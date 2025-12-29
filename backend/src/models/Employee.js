/**
 * ============================================================
 * MODELO DE EMPLEADO (Employee)
 * ============================================================
 * Extiende la información del usuario con datos de Recursos Humanos.
 * Almacena información laboral, documentación, y estado del empleado.
 * 
 * Usado por el módulo de RR.HH para gestión de personal.
 */

const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    /** Referencia al usuario en la plataforma */
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    /* ========== DATOS PERSONALES ========== */
    
    /** Nombre completo del empleado */
    nombreCompleto: {
        type: String,
        required: true,
        trim: true
    },
    /** Teléfono personal de contacto */
    telefonoPersonal: {
        type: String,
        trim: true
    },

    /* ========== FECHAS LABORALES ========== */
    
    /** Fecha de la entrevista inicial */
    fechaEntrevista: {
        type: Date,
        default: null
    },
    /** Fecha de ingreso a la empresa */
    fechaIngreso: {
        type: Date,
        default: Date.now
    },

    /* ========== INFORMACIÓN LABORAL ========== */
    
    /** Cargo o puesto del empleado */
    cargo: {
        type: String,
        required: true
    },
    /** Número de equipo asignado */
    numeroEquipo: {
        type: String,
        default: ''
    },

    /* ========== DOCUMENTACIÓN ========== */
    
    /** Indica si firmó el contrato */
    firmoContrato: {
        type: Boolean,
        default: false
    },
    /** URL de la foto del DNI */
    fotoDNI: {
        type: String,
        default: ''
    },

    /* ========== ESTADO LABORAL ========== */
    
    /** Estado activo/inactivo del empleado */
    activo: {
        type: Boolean,
        default: true
    },
    /** Fecha de baja (si aplica) */
    fechaBaja: {
        type: Date,
        default: null
    },
    /** Fecha de egreso definitivo */
    fechaEgreso: {
        type: Date,
        default: null
    },
    /** Motivo de la baja */
    motivoBaja: {
        type: String,
        default: ''
    },

    /* ========== NOTAS Y METADATA ========== */
    
    /** Notas adicionales sobre el empleado */
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

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
employeeSchema.index({ activo: 1 });
employeeSchema.index({ cargo: 1 });
employeeSchema.index({ numeroEquipo: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
