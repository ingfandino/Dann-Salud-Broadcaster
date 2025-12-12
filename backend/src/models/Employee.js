// backend/src/models/Employee.js

const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    // Referencia al usuario en la plataforma
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // Datos básicos
    nombreCompleto: {
        type: String,
        required: true,
        trim: true
    },

    // Teléfono personal (diferente del usuario si es necesario)
    telefonoPersonal: {
        type: String,
        trim: true
    },

    // Fechas importantes
    fechaEntrevista: {
        type: Date,
        default: null
    },

    fechaIngreso: {
        type: Date,
        default: Date.now
    },

    // Información laboral
    cargo: {
        type: String, // Rol del usuario (asesor, supervisor, auditor, etc.)
        required: true
    },

    numeroEquipo: {
        type: String,
        default: ''
    },

    // Documentación
    firmoContrato: {
        type: Boolean,
        default: false
    },

    fotoDNI: {
        type: String, // URL o path de la imagen del DNI
        default: ''
    },

    // Estado laboral
    activo: {
        type: Boolean,
        default: true
    },

    fechaBaja: {
        type: Date,
        default: null
    },

    fechaEgreso: {
        type: Date,
        default: null
    },

    motivoBaja: {
        type: String,
        default: ''
    },

    // Notas adicionales
    notas: {
        type: String,
        default: ''
    },

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true // Crea automáticamente createdAt y updatedAt
});

// Índices para búsquedas rápidas
// // employeeSchema.index({ userId: 1 }); // Removed to avoid duplicate index warning (unique: true already creates one) // Removed to avoid duplicate index warning (unique: true already creates one)
employeeSchema.index({ activo: 1 });
employeeSchema.index({ cargo: 1 });
employeeSchema.index({ numeroEquipo: 1 });

module.exports = mongoose.model('Employee', employeeSchema);
