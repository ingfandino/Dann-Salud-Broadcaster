const mongoose = require("mongoose");

const arcaAssistedTaskSchema = new mongoose.Schema(
    {
        mode: {
            type: String,
            enum: ["single", "selected", "filtered", "pending"],
            required: true,
        },
        cuil: {
            type: String,
            default: null,
        },
        affiliateIds: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Affiliate",
            }
        ],
        filters: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        limit: {
            type: Number,
            default: 1,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed", "error", "captcha"],
            default: "pending",
            index: true,
        },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        resultSummary: {
            success: { type: Number, default: 0 },
            captcha: { type: Number, default: 0 },
            no_data: { type: Number, default: 0 },
            error: { type: Number, default: 0 },
            total: { type: Number, default: 0 },
        },
        errorMessage: {
            type: String,
            default: null,
        }
    },
    { timestamps: false }
);

module.exports = mongoose.model("ArcaAssistedTask", arcaAssistedTaskSchema);
