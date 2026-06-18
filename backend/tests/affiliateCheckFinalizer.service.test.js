"use strict";

jest.setTimeout(30000);

jest.mock("../src/utils/canSellUtils", () => ({
    computeAndUpdateCanSell: jest.fn(async affiliateId => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        const contribution = await AffiliateContribution.findOne({ affiliateId }).lean();
        const canSell = contribution?.verification?.status === "success"
            && contribution.last3ClosedMonthsPaidCount > 0
            && ["not_found", "found_expired"].includes(contribution?.padron?.status);
        await AffiliateContribution.updateOne({ affiliateId }, { $set: { canSell } });
        return { success: true, canSell };
    }),
    evaluateCanSellStrict: jest.fn(async affiliateId => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        const contribution = await AffiliateContribution.findOne({ affiliateId }).lean();
        const canSell = contribution?.canSell === true;
        return { canSell, failedReasons: canSell ? [] : ["canSell_false"] };
    })
}));

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const {
    claimAffiliateCheckFinalization,
    completeAffiliateCheckFinalization,
    failAffiliateCheckFinalization,
    finalizeClaimedAffiliateCheckRow,
    heartbeatAffiliateCheckFinalization,
    processNextAffiliateCheckFinalization,
    releaseExpiredAffiliateCheckFinalizations
} = require("../src/services/affiliateCheckFinalizer.service");

const NOW = new Date("2026-06-10T12:00:00.000Z");

function arcaResult(overrides = {}) {
    return {
        status: "success",
        trabaja: true,
        ultimoAporte: "04/2026",
        inicioLaboral: "01/2025",
        trimPagos: 2,
        last3ClosedMonthsPaidCount: 2,
        needsPadron: true,
        errorMessage: null,
        checkedAt: NOW,
        ...overrides
    };
}

function padronResult(status = "not_found", overrides = {}) {
    return {
        status,
        sourceStatus: status,
        found: status !== "not_found",
        obraSocial: status === "not_found" ? null : "OS Padrón",
        periodoDesde: status === "not_found" ? null : "01/2024",
        nextChangeDate: status === "found_active" ? "01/2027" : null,
        monthsElapsed: status === "found_active" ? 5 : null,
        estado: status === "not_found" ? null : "VIGENTE",
        canSell: ["not_found", "found_expired"].includes(status),
        errorMessage: null,
        checkedAt: NOW,
        ...overrides
    };
}

async function createCandidate({
    jobStatus = "pending",
    supervisorId = null,
    arcaStageStatus = "done",
    arca = arcaResult(),
    dateasStageStatus = "done",
    padronStageStatus = "done",
    padron = padronResult(),
    rowStatus = "queued",
    selectedCount = 1
} = {}) {
    const affiliate = await Affiliate.create({
        nombre: "Finalizer Test",
        cuil: String(Math.floor(20000000000 + Math.random() * 7000000000)),
        obraSocial: "OS Importada",
        localidad: "CABA",
        telefono1: "1122334455",
        uploadedBy: new mongoose.Types.ObjectId(),
        sourceFile: "finalizer-test.xlsx",
        batchId: "finalizer-test",
        active: true,
        dataSource: "fresh"
    });
    const job = await AffiliateCheckJob.create({
        requestedBy: new mongoose.Types.ObjectId(),
        requestedByRole: supervisorId ? "supervisor" : "gerencia",
        mode: "check_new",
        status: jobStatus,
        requestedCount: selectedCount,
        selectedCount,
        ownership: { supervisorId }
    });
    const row = await AffiliateCheckRow.create({
        jobId: job._id,
        affiliateId: affiliate._id,
        cuilNormalized: affiliate.cuil,
        mode: "check_new",
        status: rowStatus,
        stages: {
            arca: {
                status: arcaStageStatus,
                errorMessage: arca.errorMessage || null,
                result: arca
            },
            dateas: {
                status: dateasStageStatus,
                result: dateasStageStatus === "done"
                    ? { status: "success", edad: 35, checkedAt: NOW }
                    : { status: "error", errorMessage: "DATEAS failed", checkedAt: NOW }
            },
            padron: {
                status: padronStageStatus,
                errorMessage: padron.errorMessage || null,
                result: padron
            },
            finalization: { status: "pending" }
        }
    });
    const canonicalPadron = ["not_found", "found_expired", "found_active", "captcha_failed", "error"]
        .includes(padron.status)
        ? padron.status
        : "error";
    await AffiliateContribution.create({
        affiliateId: affiliate._id,
        cuil: affiliate.cuil,
        lastContributionPeriod: arca.ultimoAporte || null,
        last3ClosedMonthsPaidCount: arca.trimPagos ?? null,
        verification: {
            status: arcaStageStatus === "done" ? "success" : "error",
            checkedAt: NOW,
            checkedBy: "test",
            executionType: "manual",
            executionId: `affiliate_check:${job._id}`,
            source: "arca_mis_aportes",
            errorMessage: arca.errorMessage || null
        },
        padron: padronStageStatus === "done" || padronStageStatus === "failed"
            ? {
                status: canonicalPadron,
                checkedAt: NOW,
                canSell: padron.canSell ?? null,
                periodoDesde: padron.periodoDesde || null,
                nextChangeDate: padron.nextChangeDate || null,
                monthsElapsed: padron.monthsElapsed ?? null,
                obraSocial: padron.obraSocial || null,
                estado: padron.estado || null
            }
            : null,
        canSell: ["not_found", "found_expired"].includes(canonicalPadron)
            && arcaStageStatus === "done"
            && arca.trimPagos > 0
            && arca.trabaja === true
    });
    return { affiliate, job, row };
}

async function processNext(workerId = "finalizer-1") {
    return processNextAffiliateCheckFinalization({ workerId, now: NOW });
}

describe("affiliateCheckFinalizer.service", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await AffiliateCheckConfig.create({ active: true, ownershipDays: 30 });
    });

    test("does not finalize incomplete rows", async () => {
        const { row } = await createCandidate({ dateasStageStatus: "pending" });
        const result = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result).toBeNull();
        expect(stored.status).toBe("queued");
        expect(stored.stages.finalization.status).toBe("pending");
    });

    test.each([
        ["no paid months", arcaResult({ trimPagos: 0, last3ClosedMonthsPaidCount: 0, needsPadron: false }), "Trimestre sin pagos"],
        ["not working", arcaResult({ trabaja: false, needsPadron: false }), "ARCA: No trabaja"]
    ])("ARCA ineligible (%s) finalizes rejected and unavailable", async (_label, arca, reason) => {
        const { affiliate, row } = await createCandidate({
            arca,
            padronStageStatus: "skipped",
            padron: padronResult("not_found")
        });
        await processNext();
        const [stored, state] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(stored.status).toBe("rejected");
        expect(stored.rejectionReason).toBe(reason);
        expect(stored.stages.finalization.status).toBe("done");
        expect(state.availableForSale).toBe(false);
        expect(state.unavailableReason).toBe(reason);
    });

    test("ARCA technical failure finalizes failed and closes job with errors", async () => {
        const arca = arcaResult({ status: "error", errorMessage: "ARCA unavailable", needsPadron: false });
        const { row, job } = await createCandidate({
            arcaStageStatus: "failed",
            arca,
            padronStageStatus: "skipped"
        });
        const result = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.status).toBe("failed");
        expect(stored.errorMessage).toBe("ARCA unavailable");
        expect(result.job.status).toBe("completed_with_errors");
        expect(result.job.failedCount).toBe(1);
        expect(result.job._id.toString()).toBe(job._id.toString());
    });

    test("DATEAS failure does not block sellable general-stock finalization", async () => {
        const { affiliate, job, row } = await createCandidate({ dateasStageStatus: "failed" });
        const result = await processNext();
        const [stored, state, assignments] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean(),
            AffiliateAssignment.countDocuments({ affiliateId: affiliate._id })
        ]);

        expect(stored.status).toBe("eligible");
        expect(stored.resultState.dateas.status).toBe("error");
        expect(state.usageStatus).toBe("available");
        expect(state.availableForSale).toBe(true);
        expect(state.ownership.supervisorId).toBeNull();
        expect(assignments).toBe(0);
        expect(result.job.status).toBe("completed");
        expect(result.job.eligibleCount).toBe(1);
        expect(job.ownership.supervisorId).toBeNull();
    });

    test("sellable target-supervisor row creates assignment and assigned stock", async () => {
        const supervisorId = new mongoose.Types.ObjectId();
        const { affiliate, job, row } = await createCandidate({ supervisorId });
        await processNext();
        const [stored, state, assignment] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean(),
            AffiliateAssignment.findOne({ sourceJobId: job._id }).lean()
        ]);

        expect(stored.status).toBe("assigned");
        expect(stored.assignedToSupervisor.toString()).toBe(supervisorId.toString());
        expect(assignment.supervisorId.toString()).toBe(supervisorId.toString());
        expect(state.usageStatus).toBe("assigned");
        expect(state.availableForSale).toBe(false);
        expect(state.ownership.supervisorId.toString()).toBe(supervisorId.toString());
    });

    test("Padrón found_active finalizes rejected and unavailable", async () => {
        const activePadron = padronResult("found_active", { canSell: false });
        const { affiliate, row } = await createCandidate({ padron: activePadron });
        await processNext();
        const [stored, state] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(stored.status).toBe("rejected");
        expect(stored.rejectionReason).toBe("Padrón: Afiliado activo");
        expect(state.availableForSale).toBe(false);
    });

    test("Padrón technical failure finalizes failed and preserves recovery metadata", async () => {
        const technical = padronResult("captcha_failed", {
            canSell: null,
            errorMessage: "CAPTCHA no resuelto"
        });
        const { affiliate, row } = await createCandidate({
            padronStageStatus: "failed",
            padron: technical
        });
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.status).toBe("failed");
        expect(stored.resultState.arca.trimPagos).toBe(2);
        expect(stored.resultState.arca.trabaja).toBe(true);
        expect(stored.resultState.padron.status).toBe("captcha_failed");
        expect(stored.resultState.padron.errorMessage).toBe("CAPTCHA no resuelto");
        expect(await AffiliateAssignment.countDocuments({ affiliateId: affiliate._id })).toBe(0);
    });

    test("Gerencia/no-target row is not assigned to the original requester and clears ownership", async () => {
        const { affiliate, job, row } = await createCandidate();
        await processNext();
        const [stored, state] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(stored.status).toBe("eligible");
        expect(stored.assignedToSupervisor).toBeNull();
        expect(state.ownership.supervisorId).toBeNull();
        expect(String(job.requestedBy)).not.toBe(String(stored.assignedToSupervisor));
    });

    test("duplicate active assignment is prevented and row is rejected", async () => {
        const supervisorId = new mongoose.Types.ObjectId();
        const { affiliate, row } = await createCandidate({ supervisorId });
        await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            supervisorId: new mongoose.Types.ObjectId(),
            assignedBy: new mongoose.Types.ObjectId(),
            source: "manual",
            assignedAt: NOW,
            expiresAt: new Date(NOW.getTime() + 86400000)
        });
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.status).toBe("rejected");
        expect(stored.rejectionReason).toBe("active_assignment_exists");
        expect(await AffiliateAssignment.countDocuments({ affiliateId: affiliate._id, status: "active" })).toBe(1);
    });

    test("retries finalization by reusing same job assignment instead of rejecting duplicate", async () => {
        const supervisorId = new mongoose.Types.ObjectId();
        const { affiliate, job, row } = await createCandidate({ supervisorId });
        const expiresAt = new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000);
        const assignment = await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            supervisorId,
            assignedBy: job.requestedBy,
            source: "check_job",
            sourceJobId: job._id,
            assignedAt: NOW,
            expiresAt
        });
        await AffiliateCheckRow.updateOne({ _id: row._id }, { $set: {
            status: "processing",
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": "dead-finalizer",
            "stages.finalization.leaseUntil": new Date("2026-06-10T11:00:00.000Z"),
            "stages.finalization.attempts": 1,
            "stages.finalization.maxAttempts": 3
        } });

        const result = await processNextAffiliateCheckFinalization({
            workerId: "retry-finalizer",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:02:00.000Z")
        });
        const [stored, state, assignments, updatedJob] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean(),
            AffiliateAssignment.find({ affiliateId: affiliate._id, status: "active" }).lean(),
            AffiliateCheckJob.findById(job._id).lean()
        ]);

        expect(result.row.status).toBe("assigned");
        expect(stored.status).toBe("assigned");
        expect(stored.assignedToSupervisor.toString()).toBe(supervisorId.toString());
        expect(stored.resultState.assignmentId.toString()).toBe(assignment._id.toString());
        expect(state.usageStatus).toBe("assigned");
        expect(state.ownership.supervisorId.toString()).toBe(supervisorId.toString());
        expect(assignments).toHaveLength(1);
        expect(assignments[0]._id.toString()).toBe(assignment._id.toString());
        expect(updatedJob.status).toBe("completed");
        expect(updatedJob.assignedCount).toBe(1);
        expect(updatedJob.processedCount).toBe(1);
    });

    test("job counters derive from rows and close only when all selected rows are terminal", async () => {
        const { job } = await createCandidate({ selectedCount: 2 });
        const secondAffiliate = await Affiliate.create({
            nombre: "Already rejected",
            cuil: String(Math.floor(20000000000 + Math.random() * 7000000000)),
            obraSocial: "OS",
            localidad: "CABA",
            telefono1: "1122334455",
            uploadedBy: new mongoose.Types.ObjectId(),
            sourceFile: "finalizer-test.xlsx",
            batchId: "finalizer-test-2",
            active: true
        });
        await AffiliateCheckRow.create({
            jobId: job._id,
            affiliateId: secondAffiliate._id,
            cuilNormalized: secondAffiliate.cuil,
            mode: "check_new",
            status: "rejected",
            rejectionReason: "existing rejection"
        });

        const result = await processNext();
        expect(result.job.status).toBe("completed");
        expect(result.job.processedCount).toBe(2);
        expect(result.job.eligibleCount).toBe(1);
        expect(result.job.rejectedCount).toBe(1);
        expect(result.job.failedCount).toBe(0);
    });

    test("does not finalize cancelled jobs", async () => {
        const { row } = await createCandidate({ jobStatus: "cancelled" });
        const result = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result).toBeNull();
        expect(stored.status).toBe("queued");
        expect(stored.stages.finalization.status).toBe("pending");
    });
});

describe("affiliateCheckFinalizer lease recovery", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await AffiliateCheckConfig.create({ active: true, ownershipDays: 30 });
    });

    test("finalization claim sets lease fields and a valid lease cannot be stolen", async () => {
        const { row } = await createCandidate();
        const claimed = await claimAffiliateCheckFinalization({
            workerId: "finalizer-owner",
            leaseMs: 60000,
            now: NOW
        });
        const stolen = await claimAffiliateCheckFinalization({
            workerId: "finalizer-other",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:00:30.000Z")
        });

        expect(claimed._id.toString()).toBe(row._id.toString());
        expect(claimed.stages.finalization.status).toBe("processing");
        expect(claimed.stages.finalization.claimedBy).toBe("finalizer-owner");
        expect(claimed.stages.finalization.attempts).toBe(1);
        expect(claimed.stages.finalization.claimedAt.toISOString()).toBe(NOW.toISOString());
        expect(claimed.stages.finalization.leaseUntil.toISOString()).toBe("2026-06-10T12:01:00.000Z");
        expect(stolen).toBeNull();
    });

    test("an in-flight finalization may finish after pause is requested", async () => {
        const { job, row } = await createCandidate();
        const claimed = await claimAffiliateCheckFinalization({ workerId: "owner", leaseMs: 60000, now: NOW });
        await AffiliateCheckJob.updateOne({ _id: job._id }, { $set: { status: "pausing" } });

        const finalized = await finalizeClaimedAffiliateCheckRow({ row: claimed, workerId: "owner", now: NOW });
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(finalized).not.toBeNull();
        expect(stored.stages.finalization.status).toBe("done");
    });

    test("finalization heartbeat only extends the owning worker lease", async () => {
        const { row } = await createCandidate();
        await claimAffiliateCheckFinalization({ workerId: "owner", leaseMs: 60000, now: NOW });
        const denied = await heartbeatAffiliateCheckFinalization({
            rowId: row._id,
            workerId: "other",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:00:20.000Z")
        });
        const updated = await heartbeatAffiliateCheckFinalization({
            rowId: row._id,
            workerId: "owner",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:00:20.000Z")
        });

        expect(denied).toBeNull();
        expect(updated.stages.finalization.heartbeatAt.toISOString()).toBe("2026-06-10T12:00:20.000Z");
        expect(updated.stages.finalization.leaseUntil.toISOString()).toBe("2026-06-10T12:01:20.000Z");
    });

    test("finalization completion clears lease and marks done", async () => {
        const { row } = await createCandidate();
        await claimAffiliateCheckFinalization({ workerId: "owner", leaseMs: 60000, now: NOW });
        const completed = await completeAffiliateCheckFinalization({
            rowId: row._id,
            workerId: "owner",
            now: new Date("2026-06-10T12:00:40.000Z")
        });

        expect(completed.stages.finalization.status).toBe("done");
        expect(completed.stages.finalization.claimedBy).toBe("owner");
        expect(completed.stages.finalization.leaseUntil).toBeNull();
        expect(completed.stages.finalization.finishedAt.toISOString()).toBe("2026-06-10T12:00:40.000Z");
    });

    test("expired finalization returns to ready while attempts remain", async () => {
        const { row } = await createCandidate();
        await AffiliateCheckRow.updateOne({ _id: row._id }, { $set: {
            status: "processing",
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": "dead-worker",
            "stages.finalization.leaseUntil": new Date("2026-06-10T11:00:00.000Z"),
            "stages.finalization.attempts": 1,
            "stages.finalization.maxAttempts": 3
        } });

        const result = await releaseExpiredAffiliateCheckFinalizations({ now: NOW, limit: 10 });
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result).toEqual({ released: 1, failed: 0 });
        expect(stored.status).toBe("queued");
        expect(stored.stages.finalization.status).toBe("ready");
        expect(stored.stages.finalization.claimedBy).toBeNull();
        expect(stored.stages.finalization.errorMessage).toBe("Finalization lease expired");
    });

    test("expired finalization becomes failed when attempts are exhausted", async () => {
        const { job, row } = await createCandidate();
        await AffiliateCheckRow.updateOne({ _id: row._id }, { $set: {
            status: "processing",
            "stages.finalization.status": "processing",
            "stages.finalization.claimedBy": "dead-worker",
            "stages.finalization.leaseUntil": new Date("2026-06-10T11:00:00.000Z"),
            "stages.finalization.attempts": 3,
            "stages.finalization.maxAttempts": 3
        } });

        const result = await releaseExpiredAffiliateCheckFinalizations({ now: NOW, limit: 10 });
        const [stored, updatedJob] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateCheckJob.findById(job._id).lean()
        ]);

        expect(result).toEqual({ released: 0, failed: 1 });
        expect(stored.status).toBe("failed");
        expect(stored.stages.finalization.status).toBe("failed");
        expect(stored.stages.finalization.errorMessage).toBe("Finalization lease expired after max attempts");
        expect(updatedJob.failedCount).toBe(1);
        expect(updatedJob.status).toBe("completed_with_errors");
    });

    test("finalizer reclaims and processes an expired finalization directly", async () => {
        const { row } = await createCandidate();
        await claimAffiliateCheckFinalization({ workerId: "dead-worker", leaseMs: 1000, now: NOW });
        const result = await processNextAffiliateCheckFinalization({
            workerId: "recovery-worker",
            leaseMs: 60000,
            now: new Date("2026-06-10T12:02:00.000Z")
        });
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result.row.status).toBe("eligible");
        expect(stored.stages.finalization.status).toBe("done");
        expect(stored.stages.finalization.claimedBy).toBe("recovery-worker");
        expect(stored.stages.finalization.attempts).toBe(2);
    });

    test("stale recovery ignores terminal jobs", async () => {
        const { row } = await createCandidate({ jobStatus: "cancelled" });
        await AffiliateCheckRow.updateOne({ _id: row._id }, { $set: {
            status: "processing",
            "stages.finalization.status": "processing",
            "stages.finalization.leaseUntil": new Date("2026-06-10T11:00:00.000Z"),
            "stages.finalization.attempts": 1
        } });

        const result = await releaseExpiredAffiliateCheckFinalizations({ now: NOW, limit: 10 });
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result).toEqual({ released: 0, failed: 0 });
        expect(stored.stages.finalization.status).toBe("processing");
    });

    test("stale recovery does not corrupt an already terminal row", async () => {
        const { row } = await createCandidate({ rowStatus: "eligible" });
        await AffiliateCheckRow.updateOne({ _id: row._id }, { $set: {
            "stages.finalization.status": "processing",
            "stages.finalization.leaseUntil": new Date("2026-06-10T11:00:00.000Z"),
            "stages.finalization.attempts": 3,
            "stages.finalization.maxAttempts": 3
        } });

        const result = await releaseExpiredAffiliateCheckFinalizations({ now: NOW, limit: 10 });
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result).toEqual({ released: 0, failed: 0 });
        expect(stored.status).toBe("eligible");
        expect(stored.stages.finalization.status).toBe("processing");
    });
});

describe("affiliateCheckFinalizer legacy compatibility", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await AffiliateCheckConfig.create({ active: true, ownershipDays: 30 });
    });

    test("lazily initializes missing finalization lease fields", async () => {
        const { row } = await createCandidate();
        await AffiliateCheckRow.collection.updateOne(
            { _id: row._id },
            { $unset: { "stages.finalization": "" } }
        );

        const result = await processNextAffiliateCheckFinalization({
            workerId: "legacy-finalizer",
            leaseMs: 60000,
            now: NOW
        });
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(result.row.status).toBe("eligible");
        expect(stored.stages.finalization.status).toBe("done");
        expect(stored.stages.finalization.claimedBy).toBe("legacy-finalizer");
        expect(stored.stages.finalization.attempts).toBe(1);
    });
});

describe("affiliateCheckFinalizer failure lease behavior", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        await AffiliateCheckConfig.create({ active: true, ownershipDays: 30 });
    });

    test("retryable finalization failure returns ownership to ready", async () => {
        const { row } = await createCandidate();
        await claimAffiliateCheckFinalization({ workerId: "owner", leaseMs: 60000, now: NOW });
        const failed = await failAffiliateCheckFinalization({
            rowId: row._id,
            workerId: "owner",
            errorMessage: "temporary finalizer database error",
            retryable: true,
            now: new Date("2026-06-10T12:00:20.000Z")
        });

        expect(failed.status).toBe("queued");
        expect(failed.stages.finalization.status).toBe("ready");
        expect(failed.stages.finalization.leaseUntil).toBeNull();
        expect(failed.stages.finalization.heartbeatAt).toBeNull();
        expect(failed.stages.finalization.errorMessage).toBe("temporary finalizer database error");
    });
});
