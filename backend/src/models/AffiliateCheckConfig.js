"use strict";

const mongoose = require("mongoose");

const affiliateCheckConfigSchema = new mongoose.Schema(
    {
        active: { type: Boolean, default: true },
        dailyQuota: {
            checkNew: { type: Number, default: 500, min: 0 },
            checkReusable: { type: Number, default: 1000, min: 0 },
            extractBase: { type: Number, default: 500, min: 0 },
            checkImport: { type: Number, default: 200, min: 0 }
        },
        ownershipDays: { type: Number, default: 30, min: 1 },
        verificationExpiryDays: { type: Number, default: 30, min: 1 },
        workers: {
            arca: { type: Boolean, default: true },
            dateas: { type: Boolean, default: true },
            padron: { type: Boolean, default: true },
            codem: { type: Boolean, default: false }
        },
        features: {
            checkNewEnabled: { type: Boolean, default: false },
            checkReusableEnabled: { type: Boolean, default: false },
            extractBaseEnabled: { type: Boolean, default: true },
            checkImportEnabled: { type: Boolean, default: false }
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true, versionKey: false }
);

affiliateCheckConfigSchema.index(
    { active: 1 },
    { unique: true, partialFilterExpression: { active: true } }
);

module.exports = mongoose.model("AffiliateCheckConfig", affiliateCheckConfigSchema);
