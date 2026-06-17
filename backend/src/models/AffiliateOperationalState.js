"use strict";

const mongoose = require("mongoose");

const ownershipSchema = new mongoose.Schema(
    {
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            default: null,
            index: true
        },
        assignedAt: { type: Date, default: null },
        expiresAt: { type: Date, default: null, index: true },
        source: {
            type: String,
            enum: ["legacy", "import", "check_job", "extract_base", "manual", null],
            default: null
        }
    },
    { _id: false }
);

const affiliateOperationalStateSchema = new mongoose.Schema(
    {
        affiliateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Affiliate",
            required: true,
            unique: true
        },
        cuil: { type: String, required: true, trim: true, index: true },
        cuilNormalized: { type: String, required: true, trim: true, index: true },
        freshness: {
            type: String,
            enum: ["fresh", "reusable", "extra", "unknown"],
            default: "unknown",
            index: true
        },
        verificationStatus: {
            type: String,
            enum: ["unchecked", "checking", "checked", "expired", "no_data", "captcha", "error"],
            default: "unchecked",
            index: true
        },
        usageStatus: {
            type: String,
            enum: ["never_used", "available", "assigned", "exported", "worked", "blocked", "reusable"],
            default: "never_used",
            index: true
        },
        saleStatus: {
            type: String,
            enum: ["none", "in_progress", "qr_done", "rejected", "failed"],
            default: "none",
            index: true
        },
        canSell: { type: Boolean, default: null, index: true },
        availableForSale: { type: Boolean, default: false, index: true },
        unavailableReason: { type: String, default: null, trim: true },
        lastCheckedAt: { type: Date, default: null, index: true },
        verificationExpiresAt: { type: Date, default: null, index: true },
        lastUsedAt: { type: Date, default: null, index: true },
        reusableAfter: { type: Date, default: null, index: true },
        ownership: { type: ownershipSchema, default: () => ({}) },
        obraSocial: { type: String, default: null, trim: true, index: true },
        localidad: { type: String, default: null, trim: true, index: true },
        dataSource: {
            type: String,
            enum: ["fresh", "reusable", "extra", "unknown"],
            default: "unknown",
            index: true
        },
        sourceFile: { type: String, default: null, trim: true },
        batchId: { type: String, default: null, trim: true, index: true },
        uploadDate: { type: Date, default: null, index: true },
        contributionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateContribution",
            default: null,
            index: true
        },
        lastAuditId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Audit",
            default: null,
            index: true
        },
        currentCheckJobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateCheckJob",
            default: null,
            index: true
        },
        currentCheckStartedAt: { type: Date, default: null },
        calculatedAt: { type: Date, default: Date.now, index: true },
        calculationVersion: { type: String, default: "phase2_v1" }
    },
    { timestamps: true, versionKey: false }
);

affiliateOperationalStateSchema.index({ availableForSale: 1, canSell: 1, freshness: 1 });
affiliateOperationalStateSchema.index({ verificationStatus: 1, verificationExpiresAt: 1 });
affiliateOperationalStateSchema.index({ usageStatus: 1, lastUsedAt: 1 });
affiliateOperationalStateSchema.index({ saleStatus: 1, updatedAt: -1 });
affiliateOperationalStateSchema.index({ obraSocial: 1, availableForSale: 1, freshness: 1 });
affiliateOperationalStateSchema.index({ localidad: 1, availableForSale: 1 });
affiliateOperationalStateSchema.index({ "ownership.supervisorId": 1, "ownership.expiresAt": 1 });
affiliateOperationalStateSchema.index({ batchId: 1, uploadDate: -1 });

module.exports = mongoose.model(
    "AffiliateOperationalState",
    affiliateOperationalStateSchema
);
