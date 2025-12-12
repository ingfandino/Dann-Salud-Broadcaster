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
    datosExtraHistory: {
        type: [
            {
                value: { type: String, default: "" },
                updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
                updatedAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    statusHistory: {
        type: [
            {
                value: { type: String, default: "" },
                updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
                updatedAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    asesorHistory: {
        type: [
            {
                previousAsesor: { type: Schema.Types.ObjectId, ref: 'User' },
                newAsesor: { type: Schema.Types.ObjectId, ref: 'User' },
                changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
                changedAt: { type: Date, default: Date.now }
            }
        ],
        default: []
    },
    isComplete: { type: Boolean, default: false },
    fechaCreacionQR: { type: Date, default: null },

    // ✅ Snapshot del supervisor al momento de la venta (para historial de equipos)
    supervisorSnapshot: {
        _id: { type: Schema.Types.ObjectId, ref: 'User' },
        nombre: { type: String },
        numeroEquipo: { type: String }
    },

    createdAt: { type: Date, default: Date.now }
});

// ✅ Pre-save hook: Calcular supervisorSnapshot automáticamente
AuditSchema.pre('save', async function (next) {
    try {
        // Solo calcular si:
        // 1. Es un documento nuevo, O
        // 2. El asesor cambió, O
        // 3. fechaCreacionQR cambió, O
        // 4. groupId cambió (para recalcular supervisor del nuevo equipo)
        const shouldCalculate = this.isNew ||
            this.isModified('asesor') ||
            this.isModified('fechaCreacionQR') ||
            this.isModified('groupId');

        if (!shouldCalculate) {
            return next();
        }

        // Si no hay asesor NI groupId, no podemos calcular supervisor
        if (!this.asesor && !this.groupId) {
            return next();
        }

        const { getSupervisorSnapshotForAudit } = require('../utils/supervisorHelper');
        const User = require('./User');

        // Obtener asesor con teamHistory (puede ser null si solo hay groupId)
        let asesor = null;
        if (this.asesor) {
            asesor = await User.findById(this.asesor).lean();

            if (!asesor) {
                const logger = require('../utils/logger');
                logger.warn(`[AUDIT_HOOK] Asesor ${this.asesor} no encontrado para audit ${this._id}`);
                // Continuar sin asesor, intentará usar groupId
            }
        }

        // Calcular snapshot (función ahora acepta asesor = null y usa groupId como fallback)
        const snapshot = await getSupervisorSnapshotForAudit(this, asesor);

        if (snapshot) {
            this.supervisorSnapshot = snapshot;
        }

        next();
    } catch (error) {
        const logger = require('../utils/logger');
        logger.error(`[AUDIT_HOOK] Error calculando supervisorSnapshot para audit ${this._id}:`, error.message);
        next(); // Continuar sin bloquear el save
    }
});

module.exports = mongoose.model('Audit', AuditSchema);