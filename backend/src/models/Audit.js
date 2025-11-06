// backend/src/models/Audit.js

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditSchema = new Schema({
    nombre: { type: String, required: true },
    cuil: { type: String, required: false }, // Opcional
    telefono: { type: String, required: true },
    tipoVenta: { type: String, enum: ['alta', 'cambio'], default: 'alta' },
    obraSocialAnterior: { type: String },
    obraSocialVendida: { type: String, enum: ['Binimed', 'Meplife', 'Medicenter'], required: true },
    scheduledAt: { type: Date, required: true },
    asesor: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditor: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, default: '' },
    statusUpdatedAt: { type: Date, default: Date.now },
    recoveryEligibleAt: { type: Date, default: null },
    isRecovery: { type: Boolean, default: false },
    recoveryMovedAt: { type: Date, default: null },
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