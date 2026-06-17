"use strict";

const mongoose = require("mongoose");

const STAGE_STATUSES = ["pending", "processing", "done", "failed", "skipped", "blocked"];

const stageSchema = new mongoose.Schema({
    status: { type: String, enum: STAGE_STATUSES, default: "pending" },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null },
    heartbeatAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    errorMessage: { type: String, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const finalizationSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ["pending", "ready", "processing", "done", "failed", "cancelled"],
        default: "pending"
    },
    claimedBy: { type: String, default: null },
    claimedAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null },
    heartbeatAt: { type: Date, default: null },
    attempts: { type: Number, default: 0, min: 0 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    errorMessage: { type: String, default: null },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    finalizedAt: { type: Date, default: null }
}, { _id: false });

const affiliateCheckRowSchema = new mongoose.Schema(
    {
        jobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateCheckJob",
            required: true,
            index: true
        },
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
        cuilNormalized: { type: String, trim: true, index: true },
        mode: {
            type: String,
            enum: ["check_new", "check_reusable", "extract_base", "check_import"],
            required: true,
            index: true
        },
        status: {
            type: String,
            enum: ["selected", "queued", "processing", "eligible", "assigned", "rejected", "failed", "cancelled"],
            default: "selected",
            index: true
        },
        previousState: mongoose.Schema.Types.Mixed,
        resultState: mongoose.Schema.Types.Mixed,
        canSell: { type: Boolean, default: null },
        rejectionReason: { type: String, trim: true },
        errorMessage: { type: String, trim: true },
        assignedToSupervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true
        },
        ownershipUntil: { type: Date, default: null, index: true },
        stages: {
            arca: { type: stageSchema, default: () => ({ status: "pending" }) },
            dateas: { type: stageSchema, default: () => ({ status: "pending" }) },
            padron: { type: stageSchema, default: () => ({ status: "blocked" }) },
            finalization: { type: finalizationSchema, default: () => ({ status: "pending" }) }
        }
    },
    { timestamps: true, versionKey: false }
);

affiliateCheckRowSchema.index({ jobId: 1, affiliateId: 1 }, { unique: true });
affiliateCheckRowSchema.index({ affiliateId: 1, createdAt: -1 });
affiliateCheckRowSchema.index({ status: 1, mode: 1, createdAt: -1 });
affiliateCheckRowSchema.index({ "stages.arca.status": 1, "stages.arca.leaseUntil": 1 });
affiliateCheckRowSchema.index({ "stages.dateas.status": 1, "stages.dateas.leaseUntil": 1 });
affiliateCheckRowSchema.index({ "stages.padron.status": 1, "stages.padron.leaseUntil": 1 });
affiliateCheckRowSchema.index({ "stages.finalization.status": 1, "stages.finalization.leaseUntil": 1 });
affiliateCheckRowSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.model("AffiliateCheckRow", affiliateCheckRowSchema);
