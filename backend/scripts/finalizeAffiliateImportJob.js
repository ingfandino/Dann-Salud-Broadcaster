"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const { recoverOrphanedAffiliateImportJob } = require("../src/services/affiliateImport.service");

async function main() {
    const jobId = process.argv[2];
    const execute = process.argv.includes("--execute");
    const requireStale = !process.argv.includes("--ignore-stale");

    if (!jobId || !mongoose.isValidObjectId(jobId)) {
        console.error("Usage: node backend/scripts/finalizeAffiliateImportJob.js <jobId> [--execute] [--ignore-stale]");
        process.exit(2);
    }

    await connectDB();
    const result = await recoverOrphanedAffiliateImportJob(jobId, {
        dryRun: !execute,
        requireStale
    });

    console.log(JSON.stringify({
        execute,
        result: {
            ok: result.ok,
            finalized: result.finalized,
            dryRun: result.dryRun,
            reason: result.reason || null,
            status: result.status || null,
            report: result.report || null,
            job: result.job ? {
                _id: String(result.job._id),
                status: result.job.status,
                totalRows: result.job.totalRows,
                processedRows: result.job.processedRows,
                createdCount: result.job.createdCount,
                updatedCount: result.job.updatedCount,
                existingLinkedCount: result.job.existingLinkedCount,
                rejectedCount: result.job.rejectedCount,
                rejectedFilePath: result.job.rejectedFilePath || null,
                duplicateFilePath: result.job.duplicateFilePath || null,
                finishedAt: result.job.finishedAt || null,
                errorMessage: result.job.errorMessage || null,
                updatedAt: result.job.updatedAt || null
            } : null
        }
    }, null, 2));

    await mongoose.disconnect();
    process.exit(result.ok ? 0 : 1);
}

main().catch(async error => {
    console.error(error.stack || error.message);
    try { await mongoose.disconnect(); } catch {}
    process.exit(1);
});
