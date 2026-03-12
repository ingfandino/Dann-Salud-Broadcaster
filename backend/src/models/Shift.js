/**
 * ============================================================
 * MODELO DE TURNO (Shift)
 * ============================================================
 * Define los turnos de trabajo para organizar la operación.
 * Cada turno tiene un horario y puede tener un supervisor asignado.
 */

const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
    /** Nombre del turno (ej: "Mañana", "Tarde", "Noche") */
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    /** Hora de inicio (0-23) */
    startHour: {
        type: Number,
        required: true,
        min: 0,
        max: 23
    },
    /** Hora de fin (0-23) */
    endHour: {
        type: Number,
        required: true,
        min: 0,
        max: 23
    },
    /** Supervisor a cargo del turno */
    supervisor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    /** Estado activo del turno */
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Shift', shiftSchema);
