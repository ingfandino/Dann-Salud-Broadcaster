// backend/src/models/Audit.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditSchema = new Schema({
    nombre: { type: String, required: true },
    cuil: { type: String, required: false }, // Opcional
    telefono: { type: String, required: true },
    tipoVenta: { type: String, enum: ['alta', 'cambio'], default: 'alta' },
    obraSocialAnterior: { type: String },
    obraSocialVendida: { type: String, enum: ['Binimed', 'Meplife', 'TURF'], required: true },
    scheduledAt: { type: Date, required: true },
    asesor: { type: Schema.Types.ObjectId, ref: 'User' },
    validador: { type: Schema.Types.ObjectId, ref: 'User' }, // ✅ Usuario que valida la venta
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditor: { type: Schema.Types.ObjectId, ref: 'User' },
    administrador: { type: Schema.Types.ObjectId, ref: 'User' }, // ✅ Admin que realiza el QR
    status: { type: String, default: '' },
    statusUpdatedAt: { type: Date, default: Date.now },
    recoveryEligibleAt: { type: Date, default: null },
    isRecovery: { type: Boolean, default: false },
    recoveryMovedAt: { type: Date, default: null },
    recoveryMonth: { type: String, default: null }, // Formato: YYYY-MM (ej: 2025-11)
    recoveryDeletedAt: { type: Date, default: null }, // Timestamp del soft-delete de Recuperación
    isLiquidacion: { type: Boolean, default: false }, // Marcada para Liquidación
    liquidacionMonth: { type: String, default: null }, // Formato: YYYY-MM
    liquidacionDeletedAt: { type: Date, default: null }, // Timestamp del soft-delete de Liquidación
    isRecuperada: { type: Boolean, default: false }, // ¿Recuperada? (solo Gerencia puede marcar)
    followUpNotificationSent: { type: Boolean, default: false }, // Para tracking de notificaciones de seguimiento después de 12h
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },

    multimedia: {
        images: { type: [String], default: [] },
        video: { type: String, default: null },
        afiliadoKey: { type: String, default: null },
        afiliadoKeyDefinitiva: { type: String, default: null },
        audioBackup: { type: String, default: null }
    },

    datosExtra: { type: String, default: "" },
    isComplete: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Audit', AuditSchema);