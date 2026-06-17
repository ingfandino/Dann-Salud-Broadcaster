"use strict";

require("./setup");

const mongoose = require("mongoose");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const { analyzeJob, executeRepair, publicReport } = require("../scripts/repairAffiliateCheckJobs");

function oid() {
    return new mongoose.Types.ObjectId();
}

async function createJob(overrides = {}) {
    return AffiliateCheckJob.create({
        requestedBy: oid(),
        requestedByRole: "gerencia",
        mode: overrides.mode || "check_new",
        status: overrides.status || "cancelled",
        requestedCount: overrides.requestedCount || 3,
        selectedCount: overrides.selectedCount ?? 3,
        processedCount: overrides.processedCount ?? 0,
        eligibleCount: overrides.eligibleCount ?? 0,
        assignedCount: overrides.assignedCount ?? 0,
        rejectedCount: overrides.rejectedCount ?? 0,
        failedCount: overrides.failedCount ?? 0,
        quota: { consumed: overrides.quotaConsumed ?? 0 },
        ownership: overrides.ownership || {},
        ...overrides.extra
    });
}

async function createRows(job, statuses) {
    const rows = [];
    for (const status of statuses) {
        rows.push(await AffiliateCheckRow.create({
            jobId: job._id,
            affiliateId: oid(),
            cuilNormalized: String(20000000000 + rows.length),
            mode: job.mode,
            status,
            canSell: status === "assigned",
            assignedToSupervisor: status === "assigned" ? (job.ownership?.supervisorId || oid()) : null,
            ownershipUntil: status === "assigned" ? new Date("2026-06-25T12:00:00.000Z") : null
        }));
    }
    return rows;
}

describe("repairAffiliateCheckJobs script", () => {
    test("cancelled job dry-run proposes counters from durable rows", async () => {
        const job = await createJob({ selectedCount: 3, processedCount: 0 });
        await createRows(job, ["cancelled", "cancelled", "cancelled"]);

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(true);
        expect(analysis.classification).toBe("cancelled_counters");
        expect(analysis.proposedChanges).toMatchObject({ selectedCount: 3, processedCount: 3, assignedCount: 0, rejectedCount: 0, failedCount: 0, "quota.consumed": 0 });
        const stored = await AffiliateCheckJob.findById(job._id).lean();
        expect(stored.processedCount).toBe(0);
    });

    test("cancelled job execute updates counters", async () => {
        const job = await createJob({ selectedCount: 3, processedCount: 0 });
        await createRows(job, ["cancelled", "cancelled", "cancelled"]);

        const result = await executeRepair(job._id, { now: new Date("2026-06-17T12:00:00.000Z") });
        const stored = await AffiliateCheckJob.findById(job._id).lean();

        expect(result.executed).toBe(true);
        expect(stored.processedCount).toBe(3);
        expect(stored.selectedCount).toBe(3);
        expect(stored.quota.consumed).toBe(0);
        expect(stored.status).toBe("cancelled");
    });

    test("second execute is no-op", async () => {
        const job = await createJob({ selectedCount: 2, processedCount: 0 });
        await createRows(job, ["cancelled", "cancelled"]);

        await executeRepair(job._id);
        const second = await executeRepair(job._id);

        expect(second.executed).toBe(false);
        expect(second.noOp).toBe(true);
    });

    test("active reservation blocks cancelled-job repair", async () => {
        const job = await createJob({ selectedCount: 1, processedCount: 0 });
        const [row] = await createRows(job, ["cancelled"]);
        await AffiliateOperationalState.create({ affiliateId: row.affiliateId, cuil: row.cuilNormalized, cuilNormalized: row.cuilNormalized, currentCheckJobId: job._id });

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(false);
        expect(analysis.reasons).toContain("active_reservations_present");
    });

    test("assignment presence blocks cancelled-job repair", async () => {
        const job = await createJob({ selectedCount: 1, processedCount: 0 });
        const [row] = await createRows(job, ["cancelled"]);
        await AffiliateAssignment.create({ affiliateId: row.affiliateId, supervisorId: oid(), assignedBy: oid(), source: "check_job", sourceJobId: job._id, expiresAt: new Date("2026-06-25T12:00:00.000Z") });

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(false);
        expect(analysis.reasons).toContain("assignments_present");
    });

    test("non-terminal row blocks repair", async () => {
        const job = await createJob({ selectedCount: 1, processedCount: 0 });
        await createRows(job, ["processing"]);

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(false);
        expect(analysis.reasons).toContain("non_terminal_rows_present");
    });

    test("concurrency guard blocks stale repair", async () => {
        const job = await createJob({ selectedCount: 1, processedCount: 0 });
        await createRows(job, ["cancelled"]);

        const result = await executeRepair(job._id, {
            beforeUpdate: () => AffiliateCheckJob.updateOne({ _id: job._id }, { $set: { processedCount: 99 } })
        });

        expect(result.executed).toBe(false);
        expect(result.safe).toBe(false);
        expect(result.reasons).toContain("atomic_update_did_not_match");
    });

    test("valid extract_base job proposes terminal completion", async () => {
        const supervisorId = oid();
        const job = await createJob({ mode: "extract_base", status: "processing", selectedCount: 0, processedCount: 0, ownership: { supervisorId } });
        const rows = await createRows(job, ["assigned", "assigned"]);
        for (const row of rows) {
            await AffiliateAssignment.create({ affiliateId: row.affiliateId, supervisorId, assignedBy: job.requestedBy, source: "extract_base", sourceJobId: job._id, assignedAt: new Date("2026-06-17T12:00:00.000Z"), expiresAt: new Date("2026-06-25T12:00:00.000Z") });
        }

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(true);
        expect(analysis.classification).toBe("extract_base_finalize");
        expect(analysis.proposedChanges).toMatchObject({ status: "completed", selectedCount: 2, processedCount: 2, assignedCount: 2, eligibleCount: 2, "quota.consumed": 2 });
    });

    test("valid extract_base execute updates job only", async () => {
        const supervisorId = oid();
        const job = await createJob({ mode: "extract_base", status: "processing", selectedCount: 0, processedCount: 0, ownership: { supervisorId } });
        const rows = await createRows(job, ["assigned"]);
        await AffiliateAssignment.create({ affiliateId: rows[0].affiliateId, supervisorId, assignedBy: job.requestedBy, source: "extract_base", sourceJobId: job._id, assignedAt: new Date("2026-06-17T12:00:00.000Z"), expiresAt: new Date("2026-06-25T12:00:00.000Z") });
        const assignmentsBefore = await AffiliateAssignment.countDocuments();

        const result = await executeRepair(job._id, { now: new Date("2026-06-17T13:00:00.000Z") });
        const stored = await AffiliateCheckJob.findById(job._id).lean();
        const assignmentsAfter = await AffiliateAssignment.countDocuments();

        expect(result.executed).toBe(true);
        expect(stored.status).toBe("completed");
        expect(stored.finishedAt.toISOString()).toBe("2026-06-17T13:00:00.000Z");
        expect(stored.assignedCount).toBe(1);
        expect(assignmentsAfter).toBe(assignmentsBefore);
    });

    test("assignment row mismatch blocks extract_base repair", async () => {
        const supervisorId = oid();
        const job = await createJob({ mode: "extract_base", status: "processing", selectedCount: 0, processedCount: 0, ownership: { supervisorId } });
        await createRows(job, ["assigned"]);

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(false);
        expect(analysis.reasons).toContain("assignment_row_mismatch");
    });

    test("wrong sourceJobId blocks extract_base repair", async () => {
        const supervisorId = oid();
        const job = await createJob({ mode: "extract_base", status: "processing", selectedCount: 0, processedCount: 0, ownership: { supervisorId } });
        const rows = await createRows(job, ["assigned"]);
        await AffiliateAssignment.create({ affiliateId: rows[0].affiliateId, supervisorId, assignedBy: job.requestedBy, source: "extract_base", sourceJobId: oid(), assignedAt: new Date("2026-06-17T12:00:00.000Z"), expiresAt: new Date("2026-06-25T12:00:00.000Z") });

        const analysis = await analyzeJob(job._id);

        expect(analysis.safe).toBe(false);
        expect(analysis.reasons).toContain("assignment_row_mismatch");
    });

    test("existing completed job is no-op", async () => {
        const job = await createJob({ mode: "extract_base", status: "completed", selectedCount: 1, processedCount: 1, assignedCount: 1 });
        await createRows(job, ["assigned"]);

        const result = await executeRepair(job._id);

        expect(result.executed).toBe(false);
        expect(result.noOp).toBe(true);
        expect(result.classification).toBe("already_terminal");
    });

    test("public report does not include personal row data", async () => {
        const job = await createJob({ selectedCount: 1, processedCount: 0 });
        await createRows(job, ["cancelled"]);

        const report = publicReport(await analyzeJob(job._id));
        const serialized = JSON.stringify(report);

        expect(serialized).not.toContain("cuilNormalized");
        expect(serialized).not.toContain("telefono");
        expect(serialized).not.toContain("nombre");
    });
});
