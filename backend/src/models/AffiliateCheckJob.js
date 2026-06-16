"use strict";

const mongoose = require("mongoose");

const affiliateCheckJobSchema = new mongoose.Schema(
    {
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        requestedByRole: { type: String, trim: true, index: true },
        mode: {
            type: String,
            enum: ["check_new", "check_reusable", "extract_base", "check_import"],
            required: true,
            index: true
        },
        sourceImportJobId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AffiliateImportJob",
            default: null,
            index: true
        },
        channelOwner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            index: true
        },
        channelType: {
            type: String,
            enum: ["internal", "external"],
            index: true
        },
        status: {
            type: String,
            enum: [
                "draft",
                "pending",
                "processing",
                "pausing",
                "paused",
                "retrying",
                "stuck",
                "partially_cancelled",
                "completed",
                "completed_with_errors",
                "failed",
                "cancelled"
            ],
            default: "pending",
            index: true
        },
        requestedCount: { type: Number, default: 0, min: 0 },
        selectedCount: { type: Number, default: 0, min: 0 },
        skippedCount: { type: Number, default: 0, min: 0 },
        conflictCount: { type: Number, default: 0, min: 0 },
        processedCount: { type: Number, default: 0, min: 0 },
        eligibleCount: { type: Number, default: 0, min: 0 },
        assignedCount: { type: Number, default: 0, min: 0 },
        rejectedCount: { type: Number, default: 0, min: 0 },
        failedCount: { type: Number, default: 0, min: 0 },
        filters: {
            obraSocial: { type: String, trim: true },
            localidad: { type: String, trim: true },
            freshness: { type: String, trim: true },
            dataSource: { type: String, trim: true },
            batchId: { type: String, trim: true }
        },
        obraSocialSelection: {
            strategy: { type: String, enum: ["automatic", "manual"], default: undefined },
            requestedItems: [{
                code: { type: Number, required: true },
                name: { type: String, required: true, trim: true }
            }],
            finalDistribution: [{
                code: { type: Number, required: true },
                name: { type: String, required: true, trim: true },
                availableCount: { type: Number, default: 0, min: 0 },
                selectedCount: { type: Number, default: 0, min: 0 }
            }]
        },
        quota: {
            dailyLimit: { type: Number, min: 0 },
            alreadyUsedToday: { type: Number, min: 0 },
            remainingBefore: { type: Number, min: 0 },
            consumed: { type: Number, default: 0, min: 0 },
            retained: { type: Number, min: 0 },
            refunded: { type: Number, min: 0 },
            adjustedAt: Date,
            adjustmentReason: { type: String, trim: true }
        },
        ownership: {
            supervisorId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                default: null,
                index: true
            },
            expiresAt: { type: Date, default: null, index: true }
        },
        errorMessage: { type: String, trim: true },
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        cancelledAt: Date,
        cancellationReason: { type: String, trim: true },
        pauseRequestedAt: Date,
        pauseRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        pausedAt: Date,
        pausedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        pauseReason: { type: String, trim: true },
        resumeCount: { type: Number, default: 0, min: 0 },
        lastResumedAt: Date,
        lastResumedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        retryCount: { type: Number, default: 0, min: 0 },
        lastRetriedAt: Date,
        lastRetriedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        retryReason: { type: String, trim: true },
        previousStatus: { type: String, trim: true },
        lastProgressAt: Date,
        lastWorkerHeartbeatAt: Date,
        activeStartedAt: Date,
        accumulatedActiveMs: { type: Number, default: 0, min: 0 },
        isDeleted: { type: Boolean, default: false, index: true },
        deletedAt: Date,
        deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
        deleteReason: { type: String, trim: true },
        deletedPreviousStatus: { type: String, trim: true },
        startedAt: Date,
        finishedAt: Date
    },
    {
        timestamps: true,
        versionKey: false,
        autoIndex: process.env.NODE_ENV !== "production"
    }
);

affiliateCheckJobSchema.index({ requestedBy: 1, isDeleted: 1, createdAt: -1 });
affiliateCheckJobSchema.index({ mode: 1, status: 1, createdAt: -1 });
affiliateCheckJobSchema.index({ "ownership.supervisorId": 1, "ownership.expiresAt": 1 });
affiliateCheckJobSchema.index(
    { channelOwner: 1, channelType: 1 },
    {
        name: "uniq_active_affiliate_check_channel",
        unique: true,
        partialFilterExpression: {
            channelOwner: { $type: "objectId" },
            channelType: { $in: ["internal", "external"] },
            status: { $in: ["pending", "processing", "pausing", "paused", "retrying", "stuck"] },
            isDeleted: false
        }
    }
);

module.exports = mongoose.model("AffiliateCheckJob", affiliateCheckJobSchema);
