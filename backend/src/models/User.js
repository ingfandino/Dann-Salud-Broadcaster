// backend/src/models/User.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const sanitize = require('mongoose-sanitize');

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        nombre: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        password: {
            type: String,
            required: true,
            minlength: 8,
            select: false,
        },
        numeroEquipo: {
            type: String,
            required: false,
            trim: true
        },
        role: {
            type: String,
            enum: ["administrativo", "supervisor", "asesor", "auditor", "gerencia", "RR.HH"],
            default: "asesor",
        },
        supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        active: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
            default: null,
        },
        // ✅ Historial de cambios de equipo para tracking de supervisores
        teamHistory: [{
            numeroEquipo: { type: String, required: true },
            fechaInicio: { type: Date, required: true },
            fechaFin: { type: Date, default: null }, // null = equipo actual  
            changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            changedAt: { type: Date, default: Date.now },
            notes: { type: String, default: '' }
        }],
        resetPasswordToken: {
            type: String,
            default: null,
            select: false,
        },
        resetPasswordExpires: {
            type: Date,
            default: null,
            select: false,
        },
    },
    { timestamps: true }
);

// Hash antes de guardar si cambió la password
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar contraseñas
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

userSchema.plugin(sanitize);

module.exports = mongoose.model("User", userSchema);