// src/models/Autoresponse.js

const mongoose = require("mongoose");

const autoresponseSchema = new mongoose.Schema(
    {
        keyword: {
            type: String,
            trim: true,
            lowercase: true,
            unique: true,   // 🚨 no permite duplicados
            sparse: true    // 🚨 permite null (para fallback)
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
            default: "contains"
        },
        isFallback: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

// 🚨 Middleware extra: garantizar un único fallback en la DB
autoresponseSchema.pre("save", async function (next) {
    if (this.isFallback) {
        const existing = await mongoose.models.Autoresponse.findOne({
            isFallback: true,
            _id: { $ne: this._id }
        });
        if (existing) {
            return next(new Error("Ya existe un autoresponse fallback. Solo puede haber uno."));
        }
    }
    next();
});

module.exports = mongoose.model("Autoresponse", autoresponseSchema);