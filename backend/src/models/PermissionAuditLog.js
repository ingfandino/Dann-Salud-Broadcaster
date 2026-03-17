/**
 * ============================================================
 * MODELO DE AUDITORÍA DE PERMISOS (PermissionAuditLog)
 * ============================================================
 * Registra cada modificación de privilegios para trazabilidad.
 */

const mongoose = require("mongoose");

const permissionAuditLogSchema = new mongoose.Schema(
    {
        /** Usuario que realizó el cambio */
        changedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        /** Rol cuyo permiso fue modificado */
        role: {
            type: String,
            required: true,
        },
        /** Módulo padre afectado */
        moduleId: {
            type: String,
            required: true,
        },
        /** Interfaz específica afectada */
        interfaceId: {
            type: String,
            required: true,
        },
        /** Nivel del cambio */
        level: {
            type: String,
            enum: ["module", "interface"],
            default: "interface",
        },
        /** Estado de permisos antes del cambio */
        previousPermissions: {
            type: Object,
            default: null,
        },
        /** Estado de permisos después del cambio */
        newPermissions: {
            type: Object,
            required: true,
        },
        /** Timestamp del cambio */
        timestamp: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

permissionAuditLogSchema.index({ role: 1, timestamp: -1 });
permissionAuditLogSchema.index({ changedBy: 1, timestamp: -1 });

module.exports = mongoose.model("PermissionAuditLog", permissionAuditLogSchema);
