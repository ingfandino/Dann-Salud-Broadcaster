"use strict";

const mongoose = require("mongoose");

const affiliateAssignmentSchema = new mongoose.Schema(
    {
        affiliateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Affiliate",
            required: true,
            index: true
        },
        operationalStateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateOperationalState",
            default: null
        },
        supervisorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        teamId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            default: null,
            index: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        source: {
            type: String,
            enum: ["check_job", "extract_base", "legacy", "manual"],
            required: true,
            index: true
        },
        sourceJobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateCheckJob",
            default: null
        },
        status: {
            type: String,
            enum: ["active", "expired", "released", "cancelled"],
            default: "active",
            index: true
        },
        assignedAt: { type: Date, default: Date.now, index: true },
        expiresAt: { type: Date, required: true, index: true },
        releasedAt: Date,
        releaseReason: { type: String, trim: true },
        expiredAt: Date,
        expirationReason: { type: String, trim: true }
    },
    { timestamps: true, versionKey: false }
);

affiliateAssignmentSchema.index({ affiliateId: 1, status: 1 });
affiliateAssignmentSchema.index(
    { affiliateId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "active" }
    }
);
affiliateAssignmentSchema.index({ supervisorId: 1, status: 1, expiresAt: 1 });
affiliateAssignmentSchema.index({ sourceJobId: 1 });

module.exports = mongoose.model("AffiliateAssignment", affiliateAssignmentSchema);
