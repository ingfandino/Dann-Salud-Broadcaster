"use strict";

jest.mock("uuid", () => ({ v4: jest.fn(() => "test-batch-id") }));
require("./setup");

const mongoose = require("mongoose");
const AffiliateImportJob = require("../src/models/AffiliateImportJob");

describe("AffiliateImportJob lifecycle", () => {
    test("new jobs default to pending and have not started", () => {
        const job = new AffiliateImportJob({
            originalFilename: "afiliados.xlsx",
            storedFilename: "affiliate-test.xlsx",
            uploadedBy: new mongoose.Types.ObjectId()
        });

        expect(job.status).toBe("pending");
        expect(job.startedAt).toBeUndefined();
        expect(job.processedRows).toBe(0);
    });
});

const AffiliateImportRow = require("../src/models/AffiliateImportRow");
const Affiliate = require("../src/models/Affiliate");
const {
    processAffiliatesData,
    recoverOrphanedAffiliateImportJob
} = require("../src/services/affiliateImport.service");

function validRow(overrides = {}) {
    return {
        Nombre: "Nombre Test",
        CUIL: "20300000001",
        "Obra Social": "OS Test",
        Localidad: "CABA",
        "Teléfono_1": "1122334455",
        ...overrides
    };
}

async function createProcessingJob(overrides = {}) {
    const totalRows = overrides.totalRows ?? 3;
    const rejectedCount = overrides.rejectedCount ?? totalRows;
    const processedRows = overrides.processedRows ?? totalRows;
    const oldDate = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return AffiliateImportJob.create({
        originalFilename: overrides.originalFilename || "stale-import.xlsx",
        storedFilename: overrides.storedFilename || "stale-import.xlsx",
        uploadedBy: overrides.uploadedBy || new mongoose.Types.ObjectId(),
        status: overrides.status || "processing",
        totalRows,
        processedRows,
        createdCount: overrides.createdCount ?? 0,
        updatedCount: overrides.updatedCount ?? 0,
        existingLinkedCount: overrides.existingLinkedCount ?? 0,
        rejectedCount,
        errorMessage: overrides.errorMessage ?? null,
        startedAt: oldDate,
        updatedAt: overrides.updatedAt || oldDate
    });
}

describe("Affiliate import bounded memory and orphan recovery", () => {
    test("batched workflow can reject many rows without retaining rejected row objects", async () => {
        const job = await createProcessingJob({ totalRows: 25, processedRows: 0, rejectedCount: 0 });
        const rows = Array.from({ length: 25 }, (_, index) => validRow({ CUIL: `invalid-${index}` }));

        const result = await processAffiliatesData(
            rows,
            job.uploadedBy,
            job.originalFilename,
            job._id,
            { batchSize: 5, retainRejectedRows: false }
        );

        expect(result.rejectedCount).toBe(25);
        expect(result.duplicates).toHaveLength(0);
        expect(await AffiliateImportRow.countDocuments({ jobId: job._id, action: "rejected" })).toBe(25);
        expect(await Affiliate.countDocuments()).toBe(0);
    });

    test("worker interruption after final batch can be finalized without reprocessing", async () => {
        const job = await createProcessingJob({ totalRows: 2, createdCount: 2, rejectedCount: 0 });
        const beforeAffiliateCount = await Affiliate.countDocuments();

        const result = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: false, requireStale: false });
        const stored = await AffiliateImportJob.findById(job._id).lean();

        expect(result.ok).toBe(true);
        expect(result.finalized).toBe(true);
        expect(stored.status).toBe("completed");
        expect(stored.finishedAt).toBeTruthy();
        expect(await Affiliate.countDocuments()).toBe(beforeAffiliateCount);
    });

    test("recovery is idempotent and second execution cannot finalize again", async () => {
        const job = await createProcessingJob({ totalRows: 1, createdCount: 1, rejectedCount: 0 });

        const first = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: false, requireStale: false });
        const second = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: false, requireStale: false });

        expect(first.finalized).toBe(true);
        expect(second.ok).toBe(false);
        expect(second.reason).toBe("JOB_NOT_PROCESSING");
    });

    test("counter mismatch prevents auto-finalization", async () => {
        const job = await createProcessingJob({ totalRows: 3, createdCount: 1, rejectedCount: 1 });

        const result = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: false, requireStale: false });
        const stored = await AffiliateImportJob.findById(job._id).lean();

        expect(result.ok).toBe(false);
        expect(result.reason).toBe("COUNTER_SUM_MISMATCH");
        expect(stored.status).toBe("processing");
    });

    test("missing rejection report requires persisted rejected rows", async () => {
        const job = await createProcessingJob({ totalRows: 1, rejectedCount: 1 });

        const missingRows = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: true, requireStale: false });
        expect(missingRows.ok).toBe(false);
        expect(missingRows.reason).toBe("PERSISTED_REJECTION_COUNT_MISMATCH");

        await AffiliateImportRow.create({
            jobId: job._id,
            rowNumber: 2,
            action: "rejected",
            status: "rejected",
            rejectionCode: "INVALID_CUIL",
            rejectionReason: "CUIL inválido",
            normalized: { cuilRaw: "bad" }
        });

        const dryRun = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: true, requireStale: false });
        expect(dryRun.ok).toBe(true);
        expect(dryRun.finalized).toBe(false);
        expect(dryRun.report.wouldGenerate).toBe(true);
    });

    test("failed job is not silently marked completed", async () => {
        const job = await createProcessingJob({ status: "failed", totalRows: 1, createdCount: 1, rejectedCount: 0 });

        const result = await recoverOrphanedAffiliateImportJob(job._id, { dryRun: false, requireStale: false });
        const stored = await AffiliateImportJob.findById(job._id).lean();

        expect(result.ok).toBe(false);
        expect(result.reason).toBe("JOB_NOT_PROCESSING");
        expect(stored.status).toBe("failed");
    });
});
