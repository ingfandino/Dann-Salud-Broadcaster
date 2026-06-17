"use strict";

const mongoose = require("mongoose");

const affiliateImportJobSchema = new mongoose.Schema(
    {
        originalFilename: { type: String, required: true, trim: true },
        storedFilename: { type: String, trim: true },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        source: {
            type: String,
            enum: ["affiliate_upload", "external_check"],
            default: "affiliate_upload",
            index: true
        },
        batchId: {
            type: String,
            index: true
        },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "completed_with_errors", "failed"],
            default: "pending",
            required: true
        },
        totalRows: { type: Number, default: 0, min: 0 },
        processedRows: { type: Number, default: 0, min: 0 },
        createdCount: { type: Number, default: 0, min: 0 },
        updatedCount: { type: Number, default: 0, min: 0 },
        existingLinkedCount: { type: Number, default: 0, min: 0 },
        rejectedCount: { type: Number, default: 0, min: 0 },
        rejectionSummary: {
            type: Map,
            of: Number,
            default: {}
        },
        rejectedFilePath: { type: String, trim: true },
        updatedFilePath: { type: String, trim: true },
        duplicateFilePath: { type: String, trim: true },
        errorMessage: { type: String, trim: true },
        startedAt: { type: Date },
        finishedAt: { type: Date }
    },
    { timestamps: true }
);

affiliateImportJobSchema.index({ uploadedBy: 1, createdAt: -1 });
affiliateImportJobSchema.index({ status: 1, createdAt: -1 });
affiliateImportJobSchema.index({ originalFilename: 1, createdAt: -1 });

module.exports = mongoose.model("AffiliateImportJob", affiliateImportJobSchema);
