"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const {
    claimAffiliateCheckStage,
    completeAffiliateCheckStage,
    failAffiliateCheckStage,
    heartbeatAffiliateCheckStage,
    initializeStagesForRow,
    isAffiliateCheckRowReadyForFinalization,
    markAffiliateCheckRowFinalizationReady,
    releaseExpiredAffiliateCheckStages
} = require("../src/services/affiliateCheckStage.service");

async function createJob(status = "pending") {
    return AffiliateCheckJob.create({
        requestedBy: new mongoose.Types.ObjectId(),
        requestedByRole: "gerencia",
        mode: "check_new",
        status,
        requestedCount: 1,
        selectedCount: 1
    });
}

async function createRow(overrides = {}) {
    const job = overrides.job || await createJob();
    const row = await AffiliateCheckRow.create({
        jobId: job._id,
        affiliateId: new mongoose.Types.ObjectId(),
        cuilNormalized: String(Math.floor(20000000000 + Math.random() * 7000000000)),
        mode: "check_new",
        status: "queued",
        ...(overrides.row || {})
    });
    return { job, row };
}

async function claimArca(now = new Date("2026-06-10T12:00:00.000Z"), workerId = "arca-1") {
    return claimAffiliateCheckStage({ stage: "arca", workerId, leaseMs: 60000, now });
}

describe("affiliateCheckStage.service", () => {
    test("new rows and plain objects initialize stage defaults", async () => {
        const initialized = initializeStagesForRow({ status: "queued" });
        const { row } = await createRow();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(initialized.stages.arca.status).toBe("pending");
        expect(initialized.stages.dateas.status).toBe("pending");
        expect(initialized.stages.padron.status).toBe("blocked");
        expect(initialized.stages.finalization.status).toBe("pending");
        expect(initialized.stages.finalization.attempts).toBe(0);
        expect(initialized.stages.finalization.maxAttempts).toBe(3);
        expect(initialized.stages.finalization.leaseUntil).toBeNull();
        expect(stored.stages.finalization.attempts).toBe(0);
        expect(stored.stages.arca.attempts).toBe(0);
        expect(stored.stages.padron.status).toBe("blocked");
    });

    test("claims a pending ARCA stage atomically and starts the parent job", async () => {
        const { job, row } = await createRow();
        const now = new Date("2026-06-10T12:00:00.000Z");
        const claimed = await claimArca(now);
        const updatedJob = await AffiliateCheckJob.findById(job._id).lean();

        expect(claimed._id.toString()).toBe(row._id.toString());
        expect(claimed.stages.arca.status).toBe("processing");
        expect(claimed.stages.arca.claimedBy).toBe("arca-1");
        expect(claimed.stages.arca.attempts).toBe(1);
        expect(claimed.stages.arca.leaseUntil.toISOString()).toBe("2026-06-10T12:01:00.000Z");
        expect(updatedJob.status).toBe("processing");
    });

    test("does not claim a processing stage with a valid lease", async () => {
        await createRow();
        await claimArca();
        const second = await claimArca(new Date("2026-06-10T12:00:30.000Z"), "arca-2");
        expect(second).toBeNull();
    });

    test("reclaims an expired processing stage", async () => {
        await createRow();
        const first = await claimArca();
        const reclaimed = await claimArca(new Date("2026-06-10T12:02:00.000Z"), "arca-2");

        expect(reclaimed._id.toString()).toBe(first._id.toString());
        expect(reclaimed.stages.arca.claimedBy).toBe("arca-2");
        expect(reclaimed.stages.arca.attempts).toBe(2);
        expect(reclaimed.stages.arca.startedAt.toISOString()).toBe("2026-06-10T12:00:00.000Z");
    });

    test("heartbeat only extends a stage owned by the worker", async () => {
        const { row } = await createRow();
        await claimArca();
        const denied = await heartbeatAffiliateCheckStage({
            rowId: row._id,
            stage: "arca",
            workerId: "other-worker",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:00:20.000Z")
        });
        const updated = await heartbeatAffiliateCheckStage({
            rowId: row._id,
            stage: "arca",
            workerId: "arca-1",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:00:20.000Z")
        });

        expect(denied).toBeNull();
        expect(updated.stages.arca.heartbeatAt.toISOString()).toBe("2026-06-10T12:00:20.000Z");
        expect(updated.stages.arca.leaseUntil.toISOString()).toBe("2026-06-10T12:01:20.000Z");
    });

    test("completion only works for the owning worker", async () => {
        const { row } = await createRow();
        await claimArca();
        const denied = await completeAffiliateCheckStage({
            rowId: row._id,
            stage: "arca",
            workerId: "other-worker",
            result: { ok: true }
        });
        const completed = await completeAffiliateCheckStage({
            rowId: row._id,
            stage: "arca",
            workerId: "arca-1",
            result: { last3ClosedMonthsPaidCount: 2 },
            now: new Date("2026-06-10T12:00:40.000Z")
        });

        expect(denied).toBeNull();
        expect(completed.stages.arca.status).toBe("done");
        expect(completed.stages.arca.result.last3ClosedMonthsPaidCount).toBe(2);
        expect(completed.stages.arca.claimedBy).toBe("arca-1");
        expect(completed.stages.arca.leaseUntil).toBeNull();
    });

    test("retryable failure returns the stage to pending while attempts remain", async () => {
        const { row } = await createRow();
        await claimArca();
        const failed = await failAffiliateCheckStage({
            rowId: row._id,
            stage: "arca",
            workerId: "arca-1",
            errorMessage: "temporary",
            retryable: true
        });

        expect(failed.stages.arca.status).toBe("pending");
        expect(failed.stages.arca.errorMessage).toBe("temporary");
        expect(failed.stages.arca.finishedAt).toBeNull();
    });

    test("non-retryable failure marks the stage failed", async () => {
        const { row } = await createRow();
        await claimArca();
        const failed = await failAffiliateCheckStage({
            rowId: row._id,
            stage: "arca",
            workerId: "arca-1",
            errorMessage: "hard failure",
            retryable: false,
            now: new Date("2026-06-10T12:00:40.000Z")
        });

        expect(failed.stages.arca.status).toBe("failed");
        expect(failed.stages.arca.finishedAt.toISOString()).toBe("2026-06-10T12:00:40.000Z");
    });

    test("expired leases return to pending or fail at max attempts", async () => {
        const first = await createRow();
        const second = await createRow();
        const expired = new Date("2026-06-10T11:00:00.000Z");
        await AffiliateCheckRow.updateOne({ _id: first.row._id }, { $set: {
            "stages.arca.status": "processing",
            "stages.arca.claimedBy": "arca-1",
            "stages.arca.leaseUntil": expired,
            "stages.arca.attempts": 1,
            "stages.arca.maxAttempts": 3
        } });
        await AffiliateCheckRow.updateOne({ _id: second.row._id }, { $set: {
            "stages.arca.status": "processing",
            "stages.arca.claimedBy": "arca-2",
            "stages.arca.leaseUntil": expired,
            "stages.arca.attempts": 3,
            "stages.arca.maxAttempts": 3
        } });

        const result = await releaseExpiredAffiliateCheckStages({
            stage: "arca",
            now: new Date("2026-06-10T12:00:00.000Z"),
            limit: 10
        });
        const pending = await AffiliateCheckRow.findById(first.row._id).lean();
        const failed = await AffiliateCheckRow.findById(second.row._id).lean();

        expect(result).toEqual({ released: 1, failed: 1 });
        expect(pending.stages.arca.status).toBe("pending");
        expect(pending.stages.arca.errorMessage).toBe("Stage lease expired");
        expect(failed.stages.arca.status).toBe("failed");
        expect(failed.stages.arca.errorMessage).toBe("Stage lease expired after max attempts");
    });

    test("finalization readiness is false while stages are incomplete", () => {
        expect(isAffiliateCheckRowReadyForFinalization({ status: "queued" })).toBe(false);
        expect(isAffiliateCheckRowReadyForFinalization({
            status: "queued",
            stages: {
                arca: { status: "done", result: { last3ClosedMonthsPaidCount: 1 } },
                dateas: { status: "done" },
                padron: { status: "blocked" }
            }
        })).toBe(false);
    });

    test("valid done/skipped/blocked combination becomes finalization-ready", async () => {
        const { row } = await createRow();
        await AffiliateCheckRow.updateOne({ _id: row._id }, { $set: {
            "stages.arca.status": "done",
            "stages.arca.result": { needsPadron: false, last3ClosedMonthsPaidCount: 0 },
            "stages.dateas.status": "skipped",
            "stages.padron.status": "blocked"
        } });
        const current = await AffiliateCheckRow.findById(row._id).lean();
        const ready = await markAffiliateCheckRowFinalizationReady({ rowId: row._id });

        expect(isAffiliateCheckRowReadyForFinalization(current)).toBe(true);
        expect(ready.stages.finalization.status).toBe("ready");
    });

    test("legacy rows without stages are lazily initialized before claim", async () => {
        const job = await createJob();
        const rawRow = {
            _id: new mongoose.Types.ObjectId(),
            jobId: job._id,
            affiliateId: new mongoose.Types.ObjectId(),
            cuilNormalized: "20300000001",
            mode: "check_new",
            status: "queued",
            createdAt: new Date(),
            updatedAt: new Date()
        };
        await AffiliateCheckRow.collection.insertOne(rawRow);

        const claimed = await claimAffiliateCheckStage({
            stage: "dateas",
            workerId: "dateas-1",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:00:00.000Z")
        });

        expect(claimed._id.toString()).toBe(rawRow._id.toString());
        expect(claimed.stages.dateas.status).toBe("processing");
        expect(claimed.stages.arca.status).toBe("pending");
        expect(claimed.stages.padron.status).toBe("blocked");
    });
});
