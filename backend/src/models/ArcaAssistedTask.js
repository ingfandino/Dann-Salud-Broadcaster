const mongoose = require("mongoose");

const arcaAssistedTaskSchema = new mongoose.Schema(
    {
        mode: {
            type: String,
            enum: ["single", "selected", "filtered", "pending", "byObraSocial"],
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
        groups: {
            type: [
                {
                    obraSocial: { type: String, required: true },
                    limit:      { type: Number, default: 100 },
                }
            ],
            default: [],
        },
        limit: {
            type: Number,
            default: 1,
        },
        targetSnapshot: {
            type: [
                {
                    affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: "Affiliate" },
                    cuil: { type: String }
                }
            ],
            default: []
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
            canSellFailures: { type: Number, default: 0 },  // 🔍 Track CanSell computation failures
        },
        progress: {
            total:     { type: Number, default: 0 },
            processed: { type: Number, default: 0 },
            success:   { type: Number, default: 0 },
            captcha:   { type: Number, default: 0 },
            no_data:   { type: Number, default: 0 },
            error:     { type: Number, default: 0 },
            phase:     { type: String, enum: ["arca", "dateas", "padron", null], default: null },
            canSellFailures: { type: Number, default: 0 },  // 🔍 Track CanSell computation failures
        },
        errorMessage: {
            type: String,
            default: null,
        }
    },
    { timestamps: false }
);

module.exports = mongoose.model("ArcaAssistedTask", arcaAssistedTaskSchema);
