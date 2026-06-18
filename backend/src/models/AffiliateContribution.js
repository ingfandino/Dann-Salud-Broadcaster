const mongoose = require("mongoose");

const padronSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["not_found", "found_expired", "found_active", "captcha_failed", "error"],
            default: null,
            index: true,
        },
        checkedAt: {
            type: Date,
            default: null,
            index: true,
        },
        canSell: {
            type: Boolean,
            default: null,
        },
        periodoDesde: {
            type: String,
            default: null,
            trim: true,
        },
        nextChangeDate: {
            type: String,
            default: null,
            trim: true,
        },
        monthsElapsed: {
            type: Number,
            default: null,
        },
        obraSocial: {
            type: String,
            default: null,
            trim: true,
        },
        estado: {
            type: String,
            default: null,
            trim: true,
        },
    },
    { _id: false }
);

const verificationSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "success", "no_data", "captcha", "error"],
            default: "pending",
            index: true,
        },
        checkedAt: {
            type: Date,
            default: null,
            index: true,
        },
        checkedBy: {
            type: String,
            default: "system",
            trim: true,
        },
        executionType: {
            type: String,
            enum: ["cron", "manual"],
            default: "cron",
        },
        executionId: {
            type: String,
            default: null,
            index: true,
            trim: true,
        },
        source: {
            type: String,
            default: "arca_mis_aportes",
            trim: true,
        },
        errorMessage: {
            type: String,
            default: null,
            trim: true,
        },
    },
    { _id: false }
);

const padronRecoverySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "processing", "recovered", "not_sellable", "failed"],
            default: null,
            index: true,
        },
        claimedBy: { type: String, default: null, trim: true },
        claimedAt: { type: Date, default: null },
        leaseUntil: { type: Date, default: null, index: true },
        heartbeatAt: { type: Date, default: null },
        attempts: { type: Number, default: 0, min: 0 },
        maxAttempts: { type: Number, default: 5, min: 1 },
        lastAttemptAt: { type: Date, default: null, index: true },
        lastErrorMessage: { type: String, default: null, trim: true },
        recoveredAt: { type: Date, default: null },
        sourceRowId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateCheckRow",
            default: null,
        },
        lastResultStatus: { type: String, default: null, trim: true },
    },
    { _id: false }
);

const affiliateContributionSchema = new mongoose.Schema(
    {
        affiliateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Affiliate",
            required: true,
            unique: true,
            index: true,
        },
        cuil: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        lastContributionPeriod: {
            type: String,
            default: null,
            trim: true,
            index: true,
        },
        last3ClosedMonthsPaidCount: {
            type: Number,
            default: null,
            min: 0,
            max: 3,
        },
        verification: {
            type: verificationSchema,
            default: () => ({}),
        },
        padron: {
            type: padronSchema,
            default: null,
        },
        padronRecovery: {
            type: padronRecoverySchema,
            default: null,
        },
        canSell: {
            type: Boolean,
            default: null,
            index: true,
        },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

affiliateContributionSchema.index({ cuil: 1 });
affiliateContributionSchema.index({ lastContributionPeriod: 1 });
affiliateContributionSchema.index({
    "verification.status": 1,
    "verification.checkedAt": -1,
});
affiliateContributionSchema.index({
    "padron.status": 1,
    "padron.checkedAt": -1,
});
affiliateContributionSchema.index({
    "padronRecovery.status": 1,
    "padronRecovery.leaseUntil": 1,
    "padronRecovery.lastAttemptAt": 1,
});

module.exports = mongoose.model("AffiliateContribution", affiliateContributionSchema);
