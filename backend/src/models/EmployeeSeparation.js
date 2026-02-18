/**
 * ============================================================
 * MODELO DE BAJA/SEPARACIÓN DE EMPLEADO (EmployeeSeparation)
 * ============================================================
 * Representa un evento de baja de empleado con su liquidación.
 * Cada baja genera un registro independiente, permitiendo
 * múltiples bajas del mismo empleado en distintos momentos.
 * 
 * Usado por la interfaz "Bajas y liquidaciones" de RR.HH.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const employeeSeparationSchema = new Schema({
    /* ========== REFERENCIAS ========== */

    /** Referencia al empleado */
    employeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    /** Referencia al usuario (para queries rápidas) */
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    /* ========== DATOS DEL EMPLEADO (SNAPSHOT) ========== */

    /** Nombre del empleado al momento de la baja */
    nombreEmpleado: {
        type: String,
        required: true,
        trim: true
    },
    /** Cargo al momento de la baja */
    cargo: {
        type: String,
        default: ''
    },
    /** Número de equipo al momento de la baja */
    numeroEquipo: {
        type: String,
        default: ''
    },

    /* ========== PERÍODO DE TRABAJO ========== */

    /** Fecha de inicio del período (fechaReingreso o fechaIngreso original) */
    fechaInicio: {
        type: Date,
        required: true
    },
    /** Fecha de baja */
    fechaBaja: {
        type: Date,
        required: true
    },
    /** Motivo de la baja (texto libre histórico) */
    motivoBaja: {
        type: String,
        default: ''
    },
    /** Motivo de baja normalizado (para lógica de negocio) */
    motivoBajaNormalizado: {
        type: String,
        enum: [
            null,
            'Renuncia',
            'Despido por bajo rendimiento',
            'Despido por inasistencias'
        ],
        default: null
    },

    /* ========== MÉTRICAS DE VENTAS ========== */

    /** Total histórico de ventas con estado "QR hecho" */
    ventasQRHistorico: {
        type: Number,
        default: 0
    },
    /** Ventas "QR hecho" correspondientes al mes de la baja */
    ventasQRMesBaja: {
        type: Number,
        default: 0
    },

    /* ========== LIQUIDACIÓN ========== */

    /** Indica si la liquidación fue pagada */
    liquidacionPagada: {
        type: Boolean,
        default: false
    },
    /** Fecha en que se pagó la liquidación */
    fechaPagoLiquidacion: {
        type: Date,
        default: null
    },
    /** Usuario que marcó como pagada */
    pagadaPor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    /* ========== METADATA ========== */

    /** Usuario que creó el registro (generalmente sistema) */
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
employeeSeparationSchema.index({ employeeId: 1 });
employeeSeparationSchema.index({ userId: 1 });
employeeSeparationSchema.index({ fechaBaja: -1 });
employeeSeparationSchema.index({ liquidacionPagada: 1, fechaBaja: -1 });

module.exports = mongoose.model('EmployeeSeparation', employeeSeparationSchema);
