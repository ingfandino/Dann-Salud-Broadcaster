"use strict";

const mongoose = require("mongoose");

const affiliateImportRowSchema = new mongoose.Schema(
    {
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateImportJob",
            required: true
        },
        rowNumber: { type: Number, required: true, min: 2 },
        raw: { type: mongoose.Schema.Types.Mixed },
        normalized: { type: mongoose.Schema.Types.Mixed },
        affiliateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Affiliate"
        },
        action: {
            type: String,
            enum: ["created", "updated", "linked", "rejected"],
            required: true
        },
        status: {
            type: String,
            enum: ["success", "rejected", "error"],
            required: true
        },
        cuilNormalized: { type: String, trim: true },
        phonesNormalized: [{ type: String, trim: true }],
        rejectionCode: { type: String, trim: true },
        rejectionReason: { type: String, trim: true },
        previousSnapshot: { type: mongoose.Schema.Types.Mixed },
        appliedChanges: { type: mongoose.Schema.Types.Mixed }
    },
    { timestamps: true }
);

affiliateImportRowSchema.index({ jobId: 1, rowNumber: 1 });
affiliateImportRowSchema.index({ cuilNormalized: 1, createdAt: -1 });
affiliateImportRowSchema.index({ affiliateId: 1, createdAt: -1 });
affiliateImportRowSchema.index({ action: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("AffiliateImportRow", affiliateImportRowSchema);
