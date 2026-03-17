/**
 * ============================================================
 * MODELO DE PERMISOS POR ROL (RolePermission)
 * ============================================================
 * Almacena los permisos dinámicos configurados para cada rol
 * en cada módulo e interfaz de la plataforma.
 */

const mongoose = require("mongoose");

const permissionsSchema = new mongoose.Schema({
    acceder:  { type: Boolean, default: false },
    ver:      { type: Boolean, default: false },
    editar:   { type: Boolean, default: false },
    eliminar: { type: Boolean, default: false },
}, { _id: false });

const rolePermissionSchema = new mongoose.Schema(
    {
        /** Rol al que aplica este registro */
        role: {
            type: String,
            required: true,
            trim: true,
        },
        /** ID del módulo padre (e.g. "auditorias") */
        moduleId: {
            type: String,
            required: true,
            trim: true,
        },
        /** ID de la interfaz específica (e.g. "auditorias-seguimiento").
         *  Si aplica a nivel módulo es igual a moduleId. */
        interfaceId: {
            type: String,
            required: true,
            trim: true,
        },
        /** Si el permiso fue seteado a nivel módulo (aplica a todos sus hijos) */
        level: {
            type: String,
            enum: ["module", "interface"],
            default: "interface",
        },
        /** Permisos individuales */
        permissions: {
            type: permissionsSchema,
            default: () => ({}),
        },
        /** Usuario que realizó la última modificación */
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

/** Un único registro por combinación role + interfaceId */
rolePermissionSchema.index({ role: 1, interfaceId: 1 }, { unique: true });

module.exports = mongoose.model("RolePermission", rolePermissionSchema);
