/**
 * ============================================================
 * MODELO DE AUDITORÍA (Audit)
 * ============================================================
 * Representa el registro de una venta o proceso de auditoría.
 * Almacena toda la información del afiliado vendido, el asesor que
 * realizó la venta, el auditor asignado, y el historial completo
 * de estados y cambios.
 * 
 * Ciclo de vida típico:
 * 1. Creación (pautar venta) - Estado inicial
 * 2. Auditoría (seguimiento por auditor)
 * 3. Completada o Rechazada
 * 4. Opcional: Recuperación (si aplica) o Liquidación
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditSchema = new Schema({
    /* ========== DATOS DEL AFILIADO ========== */
    
    /** Nombre completo del afiliado */
    nombre: { type: String, required: true },
    /** CUIL del afiliado (opcional) */
    cuil: { type: String, required: false },
    /** Teléfono de contacto */
    telefono: { type: String, required: true },
    /** Tipo de operación: alta nueva o cambio de obra social */
    tipoVenta: { type: String, enum: ['alta', 'cambio'], default: 'alta' },
    /** Obra social de la que proviene (si es cambio) */
    obraSocialAnterior: { type: String },
    /** Obra social a la que se afilia */
    obraSocialVendida: { type: String, enum: ['Binimed', 'Meplife', 'TURF'], required: true },
    
    /* ========== PROGRAMACIÓN Y ASIGNACIONES ========== */
    
    /** Fecha y hora programada para la auditoría */
    scheduledAt: { type: Date, required: true },
    /** Asesor que realizó la venta */
    asesor: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Usuario que validó la venta */
    validador: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Usuario que creó el registro */
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Auditor asignado para el seguimiento */
    auditor: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Administrador que realizó el QR */
    administrador: { type: Schema.Types.ObjectId, ref: 'User' },
    /** Grupo/equipo al que pertenece */
    groupId: { type: Schema.Types.ObjectId, ref: 'Group' },
    
    /* ========== ESTADO Y SEGUIMIENTO ========== */
    
    /** Estado actual de la auditoría */
    status: { type: String, default: '' },
    /** Última actualización del estado */
    statusUpdatedAt: { type: Date, default: Date.now },
    /** Indica si la auditoría está completa */
    isComplete: { type: Boolean, default: false },
    /** Fecha de creación del QR (si aplica) */
    fechaCreacionQR: { type: Date, default: null },
    /** Flag para notificaciones de seguimiento 12h */
    followUpNotificationSent: { type: Boolean, default: false },
    
    /* ========== RECUPERACIÓN ========== */
    
    /** Fecha a partir de la cual es elegible para recuperación */
    recoveryEligibleAt: { type: Date, default: null },
    /** Indica si está en proceso de recuperación */
    isRecovery: { type: Boolean, default: false },
    /** Fecha en que se movió a recuperación */
    recoveryMovedAt: { type: Date, default: null },
    /** Mes de recuperación (formato YYYY-MM) */
    recoveryMonth: { type: String, default: null },
    /** Fecha de eliminación lógica de recuperación */
    recoveryDeletedAt: { type: Date, default: null },
    /** Indica si fue recuperada exitosamente (solo Gerencia) */
    isRecuperada: { type: Boolean, default: false },
    
    /* ========== LIQUIDACIÓN ========== */
    
    /** Indica si está marcada para liquidación */
    isLiquidacion: { type: Boolean, default: false },
    /** Mes de liquidación (formato YYYY-MM) */
    liquidacionMonth: { type: String, default: null },
    /** Fecha de eliminación lógica de liquidación */
    liquidacionDeletedAt: { type: Date, default: null },

    /* ========== ARCHIVOS MULTIMEDIA ========== */
    
    multimedia: {
        /** Imágenes de documentación */
        images: { type: [String], default: [] },
        /** Video de la auditoría */
        video: { type: String, default: null },
        /** Clave temporal del afiliado */
        afiliadoKey: { type: String, default: null },
        /** Clave definitiva del afiliado */
        afiliadoKeyDefinitiva: { type: String, default: null },
        /** Audio de respaldo */
        audioBackup: { type: String, default: null }
    },

    /* ========== NOTAS Y DATOS ADICIONALES ========== */
    
    /** Notas adicionales sobre la auditoría */
    datosExtra: { type: String, default: "" },
    /** Historial de cambios en datosExtra */
    datosExtraHistory: {
        type: [{
            value: { type: String, default: "" },
            updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            updatedAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    
    /* ========== HISTORIALES DE CAMBIOS ========== */
    
    /** Historial de cambios de estado */
    statusHistory: {
        type: [{
            value: { type: String, default: "" },
            updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            updatedAt: { type: Date, default: Date.now }
        }],
        default: []
    },
    /** Historial de cambios de asesor */
    asesorHistory: {
        type: [{
            previousAsesor: { type: Schema.Types.ObjectId, ref: 'User' },
            newAsesor: { type: Schema.Types.ObjectId, ref: 'User' },
            changedBy: { type: Schema.Types.ObjectId, ref: 'User' },
            changedAt: { type: Date, default: Date.now }
        }],
        default: []
    },

    /* ========== TRAZABILIDAD DE SUPERVISOR ========== */
    
    /** Snapshot del supervisor al momento de la venta */
    supervisorSnapshot: {
        _id: { type: Schema.Types.ObjectId, ref: 'User' },
        nombre: { type: String },
        numeroEquipo: { type: String }
    },

    /** Fecha de creación del registro */
    createdAt: { type: Date, default: Date.now }
});

/**
 * Middleware pre-save: Calcula automáticamente el supervisorSnapshot
 * basándose en el asesor asignado y su historial de equipos.
 * Se ejecuta al crear o al modificar asesor/fechaCreacionQR/groupId.
 */
AuditSchema.pre('save', async function (next) {
    try {
        const shouldCalculate = this.isNew ||
            this.isModified('asesor') ||
            this.isModified('fechaCreacionQR') ||
            this.isModified('groupId');

        if (!shouldCalculate) {
            return next();
        }

        if (!this.asesor && !this.groupId) {
            return next();
        }

        const { getSupervisorSnapshotForAudit } = require('../utils/supervisorHelper');
        const User = require('./User');

        let asesor = null;
        if (this.asesor) {
            asesor = await User.findById(this.asesor).lean();

            if (!asesor) {
                const logger = require('../utils/logger');
                logger.warn(`[AUDIT_HOOK] Asesor ${this.asesor} no encontrado para audit ${this._id}`);
            }
        }

        const snapshot = await getSupervisorSnapshotForAudit(this, asesor);

        if (snapshot) {
            this.supervisorSnapshot = snapshot;
        }

        next();
    } catch (error) {
        const logger = require('../utils/logger');
        logger.error(`[AUDIT_HOOK] Error calculando supervisorSnapshot para audit ${this._id}:`, error.message);
        next();
    }
});

module.exports = mongoose.model('Audit', AuditSchema);