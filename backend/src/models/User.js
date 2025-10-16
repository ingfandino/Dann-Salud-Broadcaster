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
            enum: ["admin", "supervisor", "asesor", "auditor", "revendedor"],
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