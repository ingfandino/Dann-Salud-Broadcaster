"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const XLSX = require("xlsx");
const Affiliate = require("../src/models/Affiliate");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const {
    decorateJobs,
    exportAffiliateCheckJob,
    formatProgressAggregate,
    pauseAffiliateCheckJob,
    resumeAffiliateCheckJob,
    retryAffiliateCheckJob,
    softDeleteAffiliateCheckJob
} = require("../src/services/affiliateCheckOperations.service");
const {
    claimAffiliateCheckStage,
    completeAffiliateCheckStage
} = require("../src/services/affiliateCheckStage.service");

function user(role = "supervisor", id = new mongoose.Types.ObjectId()) {
    return { _id: id, role };
}

async function createJob(overrides = {}) {
    return AffiliateCheckJob.create({
        requestedBy: overrides.requestedBy || new mongoose.Types.ObjectId(),
        requestedByRole: overrides.requestedByRole || "supervisor",
        mode: overrides.mode || "check_new",
        status: overrides.status || "processing",
        requestedCount: overrides.requestedCount ?? 1,
        selectedCount: overrides.selectedCount ?? 1,
        startedAt: overrides.startedAt || new Date("2026-06-15T12:00:00.000Z"),
        activeStartedAt: overrides.activeStartedAt || new Date("2026-06-15T12:00:00.000Z"),
        ...overrides
    });
}

async function createRow(job, overrides = {}) {
    return AffiliateCheckRow.create({
        jobId: job._id,
        affiliateId: overrides.affiliateId || new mongoose.Types.ObjectId(),
        cuilNormalized: overrides.cuilNormalized || "20300000001",
        mode: job.mode,
        status: overrides.status || "queued",
        stages: overrides.stages,
        ...overrides
    });
}

describe("affiliateCheckOperations.service", () => {
    test("aggregated progress counts skipped stages as terminal and clamps percent", () => {
        const job = {
            selectedCount: 2,
            processedCount: 1,
            status: "processing",
            startedAt: new Date("2026-06-15T12:00:00.000Z"),
            activeStartedAt: new Date("2026-06-15T12:00:00.000Z"),
            createdAt: new Date("2026-06-15T12:00:00.000Z")
        };
        const progress = formatProgressAggregate(job, {
            rowCount: 2,
            stages: {
                arca: { completed: 2 },
                dateas: { completed: 1, processing: 1 },
                padron: { completed: 2, skipped: 1 },
                finalizer: { completed: 1, pending: 1 }
            }
        }, new Date("2026-06-15T12:10:00.000Z"));
        expect(progress.percent).toBe(50);
        expect(progress.padronCompleted).toBe(2);
        expect(progress.activeStages).toEqual(["dateas"]);
        expect(progress.estimatedRemainingMs).toBeGreaterThan(0);
    });

    test("100-row job reports terminal-row progress by selectedCount", () => {
        const job = {
            selectedCount: 100,
            processedCount: 0,
            status: "processing",
            startedAt: new Date("2026-06-15T12:00:00.000Z"),
            activeStartedAt: new Date("2026-06-15T12:00:00.000Z"),
            createdAt: new Date("2026-06-15T12:00:00.000Z")
        };

        const firstCycle = formatProgressAggregate(job, {
            rowCount: 100,
            terminalRows: 10,
            stages: {
                arca: { completed: 10 },
                dateas: { completed: 10 },
                padron: { completed: 10 },
                finalizer: { completed: 10 }
            }
        }, new Date("2026-06-15T12:05:00.000Z"));
        expect(firstCycle.percent).toBe(10);
        expect(firstCycle.processedCount).toBe(10);
        expect(firstCycle.remainingCount).toBe(90);

        const secondCycle = formatProgressAggregate(job, {
            rowCount: 100,
            terminalRows: 20,
            stages: {
                arca: { completed: 20 },
                dateas: { completed: 20 },
                padron: { completed: 20 },
                finalizer: { completed: 20 }
            }
        }, new Date("2026-06-15T12:10:00.000Z"));
        expect(secondCycle.percent).toBe(20);
        expect(secondCycle.processedCount).toBe(20);
        expect(secondCycle.remainingCount).toBe(80);

        const done = formatProgressAggregate({ ...job, status: "completed" }, {
            rowCount: 100,
            terminalRows: 100,
            stages: {
                arca: { completed: 100 },
                dateas: { completed: 100 },
                padron: { completed: 100 },
                finalizer: { completed: 100 }
            }
        }, new Date("2026-06-15T12:30:00.000Z"));
        expect(done.percent).toBe(100);
        expect(done.remainingCount).toBe(0);
    });

    test("zero selected rows are safe and terminal jobs report 100 percent", () => {
        expect(formatProgressAggregate({ selectedCount: 0, status: "pending", createdAt: new Date() }, null).percent).toBe(0);
        expect(formatProgressAggregate({ selectedCount: 1, status: "completed", createdAt: new Date() }, { rowCount: 1, terminalRows: 1, stages: {} }).percent).toBe(100);
    });

    test("pause drains in-flight work, then resume preserves the same job id", async () => {
        const owner = user();
        const job = await createJob({ requestedBy: owner._id, status: "processing" });
        const row = await createRow(job);
        const claimed = await claimAffiliateCheckStage({ stage: "arca", workerId: "arca-pause", leaseMs: 60000 });
        expect(claimed._id.toString()).toBe(row._id.toString());

        const pausing = await pauseAffiliateCheckJob({ user: owner, jobId: job._id, now: new Date("2026-06-15T12:01:00.000Z") });
        expect(pausing.status).toBe("pausing");
        expect(await claimAffiliateCheckStage({ stage: "dateas", workerId: "dateas-pause", leaseMs: 60000 })).toBeNull();

        await completeAffiliateCheckStage({ rowId: row._id, stage: "arca", workerId: "arca-pause", now: new Date("2026-06-15T12:02:00.000Z") });
        const paused = await AffiliateCheckJob.findById(job._id).lean();
        expect(paused.status).toBe("paused");

        const resumed = await resumeAffiliateCheckJob({ user: owner, jobId: job._id, now: new Date("2026-06-15T12:03:00.000Z") });
        expect(resumed._id.toString()).toBe(job._id.toString());
        expect(resumed.status).toBe("processing");
        expect(resumed.resumeCount).toBe(1);
    });

    test("stage claims continue after an internal batch of ten rows", async () => {
        const owner = user();
        const job = await createJob({ requestedBy: owner._id, status: "processing", requestedCount: 100, selectedCount: 100 });
        for (let index = 0; index < 100; index += 1) {
            await createRow(job, {
                cuilNormalized: String(20310000000 + index),
                stages: {
                    arca: { status: "pending" },
                    dateas: { status: "pending" },
                    padron: { status: "blocked" },
                    finalization: { status: "pending" }
                }
            });
        }

        const firstCycleIds = [];
        for (let index = 0; index < 10; index += 1) {
            const claimed = await claimAffiliateCheckStage({ stage: "arca", workerId: `arca-${index}`, leaseMs: 60000 });
            expect(claimed).toBeTruthy();
            firstCycleIds.push(String(claimed._id));
            await completeAffiliateCheckStage({ rowId: claimed._id, stage: "arca", workerId: `arca-${index}`, now: new Date("2026-06-15T12:01:00.000Z") });
        }

        const nextClaim = await claimAffiliateCheckStage({ stage: "arca", workerId: "arca-next", leaseMs: 60000 });
        expect(nextClaim).toBeTruthy();
        expect(firstCycleIds).not.toContain(String(nextClaim._id));
        expect(await AffiliateCheckRow.countDocuments({ jobId: job._id, "stages.arca.status": "done" })).toBe(10);
        expect(await AffiliateCheckRow.countDocuments({ jobId: job._id, "stages.arca.status": "pending" })).toBe(89);
    });

    test("retry reuses the job, preserves successful stages and reopens only failed work", async () => {
        const owner = user();
        const job = await createJob({ requestedBy: owner._id, status: "completed_with_errors" });
        const row = await createRow(job, {
            status: "failed",
            stages: {
                arca: { status: "done", result: { status: "success" }, finishedAt: new Date() },
                dateas: { status: "failed", attempts: 3, errorMessage: "DATEAS failed", finishedAt: new Date() },
                padron: { status: "skipped", finishedAt: new Date() },
                finalization: { status: "failed", attempts: 1, errorMessage: "finalizer failed", finishedAt: new Date() }
            }
        });

        const retried = await retryAffiliateCheckJob({ user: owner, jobId: job._id });
        const stored = await AffiliateCheckRow.findById(row._id).lean();
        expect(retried._id.toString()).toBe(job._id.toString());
        expect(retried.status).toBe("processing");
        expect(retried.retryCount).toBe(1);
        expect(stored.stages.arca.status).toBe("done");
        expect(stored.stages.dateas.status).toBe("pending");
        expect(stored.stages.padron.status).toBe("skipped");
        expect(stored.stages.finalization.status).toBe("pending");
        expect(stored.status).toBe("queued");
        expect(await AffiliateCheckJob.countDocuments()).toBe(1);
    });

    test("completed and processing jobs cannot retry", async () => {
        const owner = user();
        for (const status of ["completed", "processing"]) {
            const job = await createJob({ requestedBy: owner._id, status });
            await expect(retryAffiliateCheckJob({ user: owner, jobId: job._id })).rejects.toMatchObject({ code: "JOB_CANNOT_RETRY" });
        }
    });

    test.each(["pending", "processing"])("%s stale work retries without creating a new job", async status => {
        const owner = user();
        const old = new Date(Date.now() - 30 * 60 * 1000);
        const job = await createJob({ requestedBy: owner._id, status, createdAt: old, startedAt: status === "processing" ? old : null, activeStartedAt: status === "processing" ? old : null });
        await createRow(job);

        const retried = await retryAffiliateCheckJob({ user: owner, jobId: job._id, now: new Date() });

        expect(retried._id.toString()).toBe(job._id.toString());
        expect(retried.status).toBe("processing");
        expect(retried.retryCount).toBe(1);
        expect(await AffiliateCheckJob.countDocuments()).toBe(1);
    });

    test("external retry reacquires only a safe reservation", async () => {
        const owner = user();
        const safeJob = await createJob({ requestedBy: owner._id, mode: "check_import", status: "partially_cancelled" });
        const safeRow = await createRow(safeJob);
        await AffiliateOperationalState.create({ affiliateId: safeRow.affiliateId, cuil: safeRow.cuilNormalized, cuilNormalized: safeRow.cuilNormalized });

        const retried = await retryAffiliateCheckJob({ user: owner, jobId: safeJob._id });
        const reserved = await AffiliateOperationalState.findOne({ affiliateId: safeRow.affiliateId }).lean();
        expect(retried.status).toBe("processing");
        expect(String(reserved.currentCheckJobId)).toBe(String(safeJob._id));

        const conflictJob = await createJob({ requestedBy: owner._id, mode: "check_import", status: "partially_cancelled" });
        const conflictRow = await createRow(conflictJob, { cuilNormalized: "20300000002" });
        await AffiliateOperationalState.create({ affiliateId: conflictRow.affiliateId, cuil: conflictRow.cuilNormalized, cuilNormalized: conflictRow.cuilNormalized, saleStatus: "qr_done" });
        await expect(retryAffiliateCheckJob({ user: owner, jobId: conflictJob._id })).rejects.toMatchObject({ code: "NO_RETRYABLE_WORK" });
        const conflict = await AffiliateOperationalState.findOne({ affiliateId: conflictRow.affiliateId }).lean();
        expect(conflict.currentCheckJobId).toBeNull();
    });

    test("backend permissions deny admin actions and supervisor cross-owner actions", async () => {
        const owner = user();
        const job = await createJob({ requestedBy: owner._id, status: "processing" });
        await expect(pauseAffiliateCheckJob({ user: user("admin"), jobId: job._id })).rejects.toMatchObject({ code: "JOB_ACTION_FORBIDDEN" });
        await expect(pauseAffiliateCheckJob({ user: user("supervisor"), jobId: job._id })).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
    });

    test.each(["gerencia", "desarrollador"])("%s can soft-delete a terminal job without deleting rows", async role => {
        const actor = user(role);
        const job = await createJob({ status: "completed", requestedByRole: role });
        await createRow(job, { status: "eligible" });
        const deleted = await softDeleteAffiliateCheckJob({ user: actor, jobId: job._id, reason: "qa cleanup" });
        expect(deleted.isDeleted).toBe(true);
        expect(deleted.deleteReason).toBe("qa cleanup");
        expect(await AffiliateCheckRow.countDocuments({ jobId: job._id })).toBe(1);
    });

    test.each(["supervisor", "encargado", "admin"])("%s cannot soft-delete jobs", async role => {
        const job = await createJob({ status: "completed" });
        await expect(softDeleteAffiliateCheckJob({ user: user(role), jobId: job._id })).rejects.toMatchObject({ code: "JOB_DELETE_FORBIDDEN" });
    });

    test("active jobs cannot be soft-deleted", async () => {
        const job = await createJob({ status: "processing" });
        await expect(softDeleteAffiliateCheckJob({ user: user("gerencia"), jobId: job._id })).rejects.toMatchObject({ code: "JOB_CANNOT_DELETE" });
    });

    test("terminal external job exports canonical columns and user-facing Padrón values", async () => {
        const owner = user();
        const affiliate = await Affiliate.create({
            nombre: "Export Test", cuil: "20300000001", obraSocial: "OS Original", localidad: "CABA",
            telefono1: "1111111111", telefono2: "2222222222", uploadedBy: owner._id,
            sourceFile: "external.xlsx", batchId: "export-batch"
        });
        const job = await createJob({ requestedBy: owner._id, mode: "check_import", status: "completed" });
        await createRow(job, {
            affiliateId: affiliate._id,
            status: "eligible",
            canSell: true,
            stages: {
                arca: { status: "done", result: { trabaja: true, last3ClosedMonthsPaidCount: 2, ultimoAporte: "04/2026" } },
                dateas: { status: "done", result: { edad: 40, provincia: "Buenos Aires", localidad: "CABA" } },
                padron: { status: "done", result: { status: "found_expired", nextChangeDate: "01/2026" } },
                finalization: { status: "done", finalizedAt: new Date() }
            }
        });
        await AffiliateContribution.create({ affiliateId: affiliate._id, cuil: affiliate.cuil, last3ClosedMonthsPaidCount: 2, lastContributionPeriod: "04/2026", padron: { status: "found_expired" }, canSell: true });
        await AffiliateOperationalState.create({ affiliateId: affiliate._id, cuil: affiliate.cuil, cuilNormalized: affiliate.cuil, canSell: true, availableForSale: true });

        const exported = await exportAffiliateCheckJob({ user: owner, jobId: job._id });
        const workbook = XLSX.read(exported.buffer);
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        expect(data[0]).toMatchObject({
            CUIL: affiliate.cuil,
            Nombre: "Export Test",
            "Estado Padrón": "Expirado",
            Apto: "Sí"
        });
        expect(Object.keys(data[0])).toEqual(expect.arrayContaining([
            "Job ID", "Modo", "Fecha de creación", "Fecha de finalización", "Solicitado por",
            "Supervisor propietario", "CUIL", "Nombre", "Obra Social almacenada",
            "Código canónico de Obra Social", "Nombre canónico de Obra Social", "Clasificación",
            "Estado de fila", "Estado ARCA", "Resultado ARCA", "Último período de aporte",
            "Trimestres pagos", "Estado DATEAS", "Edad", "Provincia", "Localidad",
            "Estado Padrón", "Fecha alta OS", "Estado final", "Apto", "Motivo de no aptitud",
            "Asignado al stock", "Supervisor asignado", "Stock general", "Error final"
        ]));
    });

    test("internal exports are manager-only, supervisor owns external result, and processing is denied", async () => {
        const owner = user();
        const internal = await createJob({ requestedBy: owner._id, mode: "check_new", status: "completed" });
        const external = await createJob({ requestedBy: owner._id, mode: "check_import", status: "completed" });
        const activeExternal = await createJob({ requestedBy: owner._id, mode: "check_import", status: "processing" });
        await createRow(internal, { status: "eligible", canSell: true });
        await createRow(external, { status: "eligible", canSell: true });
        await createRow(activeExternal, { status: "queued" });

        await expect(exportAffiliateCheckJob({ user: owner, jobId: internal._id })).rejects.toMatchObject({ code: "JOB_CANNOT_EXPORT" });
        await expect(exportAffiliateCheckJob({ user: user("supervisor"), jobId: external._id })).rejects.toMatchObject({ code: "JOB_NOT_FOUND" });
        await expect(exportAffiliateCheckJob({ user: owner, jobId: activeExternal._id })).rejects.toMatchObject({ code: "JOB_CANNOT_EXPORT" });
        await expect(exportAffiliateCheckJob({ user: user("gerencia"), jobId: internal._id })).resolves.toMatchObject({ filename: expect.stringContaining("chequeo_resultado_check_new") });
        await expect(exportAffiliateCheckJob({ user: user("desarrollador"), jobId: internal._id })).resolves.toMatchObject({ filename: expect.stringContaining("chequeo_resultado_check_new") });
        await expect(exportAffiliateCheckJob({ user: owner, jobId: external._id })).resolves.toMatchObject({ filename: expect.stringContaining("chequeo_resultado_check_import") });
    });

    test("decorated jobs expose backend-calculated permissions and stale pending detection", async () => {
        const owner = user();
        const job = await createJob({
            requestedBy: owner._id,
            status: "pending",
            createdAt: new Date(Date.now() - 20 * 60 * 1000),
            startedAt: null,
            activeStartedAt: null
        });
        const [decorated] = await decorateJobs([job.toObject()], owner);
        expect(decorated.pendingTooLong).toBe(true);
        expect(decorated.permissions.canRetry).toBe(true);
        expect(decorated.permissions.canPause).toBe(true);
    });
});
