const mongoose = require("mongoose");

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
        verification: {
            type: verificationSchema,
            default: () => ({}),
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

module.exports = mongoose.model("AffiliateContribution", affiliateContributionSchema);
