"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const {
    adjustAffiliateCheckJobQuota,
    cancelAffiliateCheckJob,
    computeRetainedQuota,
    getSupervisorDailyUsage
} = require("../src/services/affiliateCheck.service");
const {
    pauseAffiliateCheckJob,
    resumeAffiliateCheckJob,
    retryAffiliateCheckJob
} = require("../src/services/affiliateCheckOperations.service");

function owner() {
    return { _id: new mongoose.Types.ObjectId(), role: "supervisor" };
}

async function createJob(actor, overrides = {}) {
    return AffiliateCheckJob.create({
        requestedBy: actor._id,
        requestedByRole: actor.role,
        mode: "check_new",
        status: "pending",
        requestedCount: 10,
        selectedCount: 10,
        quota: { consumed: 10 },
        ...overrides
    });
}

async function createRows(job, count, startedCount = 0) {
    const rows = [];
    for (let index = 0; index < count; index += 1) {
        rows.push(await AffiliateCheckRow.create({
            jobId: job._id,
            affiliateId: new mongoose.Types.ObjectId(),
            cuilNormalized: String(20000000000 + index),
            mode: job.mode,
            status: "selected",
            ...(index < startedCount ? { stages: { arca: { status: "done" } } } : {})
        }));
    }
    return rows;
}

describe("affiliate check quota integrity", () => {
    test("10 selected and 0 started retains 0, refunds 10, and daily usage is 0", async () => {
        const actor = owner();
        const job = await createJob(actor);
        await createRows(job, 10, 0);
        const result = await cancelAffiliateCheckJob({ jobId: job._id, cancelledBy: actor._id });
        const usage = await getSupervisorDailyUsage({ userId: actor._id });
        expect(result.job.quota).toMatchObject({ consumed: 0, retained: 0, refunded: 10 });
        expect(usage.byMode.check_new).toBe(0);
    });

    test("10 selected and 4 unique started rows retains 4, refunds 6, and daily usage is 4", async () => {
        const actor = owner();
        const job = await createJob(actor);
        await createRows(job, 10, 4);
        const result = await cancelAffiliateCheckJob({ jobId: job._id, cancelledBy: actor._id });
        const usage = await getSupervisorDailyUsage({ userId: actor._id });
        expect(result.job.quota).toMatchObject({ consumed: 4, retained: 4, refunded: 6 });
        expect(result.job.quota.adjustedAt).toBeTruthy();
        expect(usage.byMode.check_new).toBe(4);
    });

    test("one row with three started stages contributes exactly one", async () => {
        const actor = owner();
        const job = await createJob(actor, { requestedCount: 1, selectedCount: 1, quota: { consumed: 1 } });
        await AffiliateCheckRow.create({
            jobId: job._id,
            affiliateId: new mongoose.Types.ObjectId(),
            cuilNormalized: "20300000001",
            mode: job.mode,
            status: "processing",
            stages: {
                arca: { status: "done" },
                dateas: { status: "done" },
                padron: { status: "failed" }
            }
        });
        expect(await computeRetainedQuota(job._id)).toBe(1);
    });

    test("failed job after 6 unique started rows contributes 6 to daily usage", async () => {
        const actor = owner();
        const job = await createJob(actor, { status: "processing" });
        await createRows(job, 10, 6);
        const adjusted = await adjustAffiliateCheckJobQuota({ jobId: job._id, reason: "test_failed" });
        await AffiliateCheckJob.updateOne({ _id: job._id }, { $set: { status: "failed" } });
        const usage = await getSupervisorDailyUsage({ userId: actor._id });
        expect(adjusted).toMatchObject({ retained: 6, refunded: 4 });
        expect(usage.byMode.check_new).toBe(6);
    });

    test("pause and resume do not alter quota", async () => {
        const actor = owner();
        const job = await createJob(actor, { status: "processing", requestedCount: 1, selectedCount: 1, quota: { consumed: 1 } });
        await createRows(job, 1, 0);
        const paused = await pauseAffiliateCheckJob({ user: actor, jobId: job._id });
        const resumed = await resumeAffiliateCheckJob({ user: actor, jobId: job._id });
        expect(paused.quota.consumed).toBe(1);
        expect(resumed.quota.consumed).toBe(1);
    });

    test("retry reuses the same quota charge", async () => {
        const actor = owner();
        const job = await createJob(actor, { status: "completed_with_errors", requestedCount: 1, selectedCount: 1, quota: { consumed: 1 } });
        await AffiliateCheckRow.create({
            jobId: job._id,
            affiliateId: new mongoose.Types.ObjectId(),
            cuilNormalized: "20300000002",
            mode: job.mode,
            status: "failed",
            stages: { arca: { status: "failed" }, finalization: { status: "failed" } }
        });
        const retried = await retryAffiliateCheckJob({ user: actor, jobId: job._id });
        expect(String(retried._id)).toBe(String(job._id));
        expect(retried.quota.consumed).toBe(1);
    });

    test("completed_with_errors remains charged", async () => {
        const actor = owner();
        await createJob(actor, { status: "completed_with_errors", quota: { consumed: 10 } });
        const usage = await getSupervisorDailyUsage({ userId: actor._id });
        expect(usage.byMode.check_new).toBe(10);
    });

    test("retained quota is clamped between zero and selectedCount", async () => {
        const actor = owner();
        const capped = await createJob(actor, { requestedCount: 2, selectedCount: 2, quota: { consumed: 2 } });
        await createRows(capped, 4, 4);
        expect(await computeRetainedQuota(capped._id)).toBe(2);

        const zero = await createJob(actor, { status: "completed", requestedCount: 0, selectedCount: 0, quota: { consumed: 0 } });
        expect(await computeRetainedQuota(zero._id)).toBe(0);
    });
});
