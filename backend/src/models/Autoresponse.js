// src/models/Autoresponse.js

const mongoose = require("mongoose");

const autoresponseSchema = new mongoose.Schema(
    {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        keyword: {
            type: String,
            trim: true,
            lowercase: true,
            // la unicidad ahora será compuesta por usuario mediante índices
            sparse: true
        },
        response: {
            type: String,
            required: true
        },
        active: {
            type: Boolean,
            default: true
        },
        matchType: {
            type: String,
            enum: ["exact", "contains"],
            default: "exact" // ✅ Comparación exacta por defecto (solo mayús/minús y espacios tolerados)
        },
        isFallback: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// Middleware extra: garantizar un único fallback por usuario
autoresponseSchema.pre("save", async function (next) {
    if (this.isFallback) {
        const existing = await mongoose.models.Autoresponse.findOne({
            isFallback: true,
            createdBy: this.createdBy,
            _id: { $ne: this._id }
        });
        if (existing) {
            return next(new Error("Ya existe un autoresponse fallback para este usuario. Solo puede haber uno."));
        }
    }
    next();
});

// Índices de unicidad por usuario
// - Un keyword no nulo solo puede repetirse una vez por usuario
autoresponseSchema.index(
  { createdBy: 1, keyword: 1 },
  { unique: true, partialFilterExpression: { keyword: { $type: "string" } } }
);
// - Solo un fallback por usuario
autoresponseSchema.index(
  { createdBy: 1, isFallback: 1 },
  { unique: true, partialFilterExpression: { isFallback: true } }
);

module.exports = mongoose.model("Autoresponse", autoresponseSchema);