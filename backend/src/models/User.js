/**
 * ============================================================
 * MODELO DE USUARIO (User)
 * ============================================================
 * Define la estructura de usuarios del sistema incluyendo:
 * - Datos de identificación y autenticación
 * - Roles y permisos (gerencia, supervisor, auditor, asesor, etc.)
 * - Historial de cambios de equipo para trazabilidad
 * - Funcionalidad de recuperación de contraseña
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const sanitize = require('mongoose-sanitize');

const userSchema = new mongoose.Schema(
    {
        /** Nombre de usuario único para login */
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        /** Nombre completo del usuario */
        nombre: {
            type: String,
            required: true,
            trim: true,
        },
        /** Correo electrónico único */
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        /** Contraseña hasheada (no se devuelve en consultas por defecto) */
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },
        /** Identificador del equipo de trabajo asignado */
        numeroEquipo: {
            type: String,
            required: false,
            trim: true
        },
        /** Rol del usuario que determina sus permisos en el sistema */
        role: {
            type: String,
            enum: ["administrativo", "supervisor", "asesor", "auditor", "gerencia", "RR.HH", "recuperador"],
            default: "asesor",
        },
        /** Referencia al supervisor asignado (para asesores) */
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        /** Estado activo/inactivo del usuario */
        active: {
            type: Boolean,
            default: false,
        },
        /** Fecha de eliminación lógica (soft delete) */
        deletedAt: {
            type: Date,
            default: null,
        },
        /** Historial de cambios de equipo para auditoría */
        teamHistory: [{
            numeroEquipo: { type: String, required: true },
            fechaInicio: { type: Date, required: true },
            fechaFin: { type: Date, default: null },
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            changedAt: { type: Date, default: Date.now },
            notes: { type: String, default: '' }
        }],
        /** Token temporal para recuperación de contraseña */
        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
        },
        /** Fecha de expiración del token de recuperación */
        resetPasswordExpires: {
            type: Date,
            default: null,
            select: false,
        },
    },
    { timestamps: true }
);

/**
 * Middleware pre-save: Hashea la contraseña automáticamente
 * antes de guardarla si fue modificada.
 */
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

/**
 * Compara una contraseña candidata con la hasheada almacenada.
 * @param {string} candidate - Contraseña en texto plano a verificar
 * @returns {Promise<boolean>} true si coinciden
 */
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

/** Plugin de sanitización para prevenir inyección NoSQL */
userSchema.plugin(sanitize);

module.exports = mongoose.model("User", userSchema);