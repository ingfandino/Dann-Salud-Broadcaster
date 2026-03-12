/**
 * ============================================================
 * MODELO DE BAJO RENDIMIENTO (LowPerformance)
 * ============================================================
 * Registra histórico de supervisores con bajo rendimiento.
 * Cada registro representa un periodo de 2 semanas laborales
 * (viernes 00:00 a jueves 23:00) donde el supervisor tuvo
 * menos de 6 ventas con estado "QR hecho".
 * 
 * Usado por el módulo de RR.HH para detección de bajo desempeño.
 */

const mongoose = require('mongoose');

const lowPerformanceSchema = new mongoose.Schema({
    /** Referencia al supervisor */
    supervisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    /* ========== PERIODO EVALUADO ========== */

    /** Fecha de inicio del periodo (viernes 00:00) */
    periodStart: {
        type: Date,
        required: true
    },
    /** Fecha de fin del periodo */
    periodEnd: {
        type: Date,
        required: true
    },
    /** Identificador del periodo (formato: YYYY-MM para mensuales) */
    periodKey: {
        type: String,
        required: true,
        index: true
    },

    /* ========== ROL EVALUADO ========== */

    /** Rol del usuario al momento de la infracción (supervisor o asesor) */
    role: {
        type: String,
        enum: ['supervisor', 'asesor'],
        required: true,
        default: 'supervisor'
    },

    /* ========== MÉTRICAS ========== */

    /** Cantidad de ventas con estado "QR hecho" en el periodo */
    qrHechoCount: {
        type: Number,
        required: true,
        default: 0
    },
    /** Umbral mínimo requerido para el periodo */
    threshold: {
        type: Number,
        required: true
    },
    /** Diferencia entre umbral y cantidad real (cuánto faltó) */
    deficit: {
        type: Number,
        default: 0
    },

    /* ========== METADATA ========== */

    /** Fecha en que se generó este registro */
    evaluatedAt: {
        type: Date,
        default: Date.now
    },
    /** Usuario que generó la evaluación (puede ser sistema) */
    evaluatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    /** Notas adicionales */
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */

// Índice compuesto para evitar duplicados del mismo supervisor en el mismo periodo
lowPerformanceSchema.index({ supervisorId: 1, periodKey: 1 }, { unique: true });

// Índice para búsquedas por periodo
lowPerformanceSchema.index({ periodStart: -1 });

// Índice para conteo de apariciones por supervisor
lowPerformanceSchema.index({ supervisorId: 1, createdAt: -1 });

/* ========== MÉTODOS ESTÁTICOS ========== */

/**
 * Obtiene el conteo de veces que un supervisor ha aparecido en bajo rendimiento
 */
lowPerformanceSchema.statics.getAppearanceCount = async function (supervisorId) {
    return this.countDocuments({ supervisorId });
};

/**
 * Obtiene el historial completo de un supervisor
 */
lowPerformanceSchema.statics.getSupervisorHistory = async function (supervisorId) {
    return this.find({ supervisorId })
        .sort({ periodStart: -1 })
        .populate('supervisorId', 'nombre email numeroEquipo');
};

/**
 * Calcula las fechas del periodo mensual actual
 * @returns {{ periodStart: Date, periodEnd: Date, periodKey: string }}
 */
lowPerformanceSchema.statics.getCurrentPeriodDates = function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    // Primer día del mes
    const periodStart = new Date(year, month, 1);
    periodStart.setHours(0, 0, 0, 0);

    // Último día del mes
    const periodEnd = new Date(year, month + 1, 0); // Día 0 del siguiente mes es el último de este
    periodEnd.setHours(23, 59, 59, 999);

    // Generar clave única del periodo (YYYY-MM)
    const periodKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;

    return { periodStart, periodEnd, periodKey };
};

module.exports = mongoose.model('LowPerformance', lowPerformanceSchema);
