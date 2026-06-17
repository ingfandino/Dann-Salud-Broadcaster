"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const User = require("../src/models/User");
const { decorateJobs, exportAffiliateCheckJob } = require("../src/services/affiliateCheckOperations.service");
const { getAffiliateCheckDashboardSummary } = require("../src/services/affiliateCheckDashboard.service");

function oid() {
    return new mongoose.Types.ObjectId();
}

async function createConfig() {
    return AffiliateCheckConfig.create({
        dailyQuota: { checkNew: 10, checkReusable: 10, extractBase: 10, checkImport: 10 },
        features: {
            checkNewEnabled: true,
            checkReusableEnabled: true,
            extractBaseEnabled: true,
            checkImportEnabled: true
        }
    });
}

describe("affiliate check dashboard and result counters", () => {
    beforeEach(async () => {
        await createConfig();
    });

    test("decorated jobs derive aptos and assigned to stock from rows and assignments", async () => {
        const supervisor = await User.create({ username: "sup1", nombre: "Supervisor", email: "sup1@example.com", password: "password123", role: "supervisor", active: true });
        const job = await AffiliateCheckJob.create({
            requestedBy: supervisor._id,
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "completed",
            channelOwner: supervisor._id,
            channelType: "internal",
            requestedCount: 10,
            selectedCount: 10,
            processedCount: 10,
            eligibleCount: 0,
            assignedCount: 4,
            rejectedCount: 6,
            ownership: { supervisorId: supervisor._id }
        });

        for (let index = 0; index < 4; index += 1) {
            const affiliateId = oid();
            await AffiliateCheckRow.create({ jobId: job._id, affiliateId, cuilNormalized: `20${index}`, mode: "check_new", status: "assigned", canSell: true, assignedToSupervisor: supervisor._id });
            await AffiliateAssignment.create({ affiliateId, supervisorId: supervisor._id, assignedBy: supervisor._id, source: "check_job", sourceJobId: job._id, expiresAt: new Date(Date.now() + 86400000) });
        }
        for (let index = 0; index < 6; index += 1) {
            await AffiliateCheckRow.create({ jobId: job._id, affiliateId: oid(), cuilNormalized: `30${index}`, mode: "check_new", status: "rejected", canSell: false });
        }

        const [decorated] = await decorateJobs([job.toObject()], supervisor);
        expect(decorated.eligibleCount).toBe(4);
        expect(decorated.assignedCount).toBe(4);
        expect(decorated.assignedToStockCount).toBe(4);
        expect(decorated.rejectedCount).toBe(6);
    });

    test("daily summary uses Argentina day, quota consumed, and active assignments", async () => {
        const supervisor = await User.create({ username: "sup2", nombre: "Supervisor 2", email: "sup2@example.com", password: "password123", role: "supervisor", active: true });
        const job = await AffiliateCheckJob.create({
            requestedBy: supervisor._id,
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "completed",
            channelOwner: supervisor._id,
            channelType: "internal",
            requestedCount: 3,
            selectedCount: 3,
            quota: { consumed: 3 },
            ownership: { supervisorId: supervisor._id },
            createdAt: new Date("2026-06-16T14:00:00.000Z")
        });
        const affiliateId = oid();
        await AffiliateCheckRow.create({ jobId: job._id, affiliateId, cuilNormalized: "201", mode: "check_new", status: "assigned", canSell: true, assignedToSupervisor: supervisor._id });
        await AffiliateAssignment.create({
            affiliateId,
            supervisorId: supervisor._id,
            assignedBy: supervisor._id,
            source: "check_job",
            sourceJobId: job._id,
            assignedAt: new Date("2026-06-16T13:00:00.000Z"),
            expiresAt: new Date("2026-06-20T03:00:00.000Z")
        });

        const result = await getAffiliateCheckDashboardSummary({
            user: { _id: supervisor._id, role: "supervisor" },
            date: "2026-06-16",
            now: new Date("2026-06-16T15:00:00.000Z")
        });
        expect(result.quota.checkNew.used).toBe(3);
        expect(result.quota.checkNew.remaining).toBe(7);
        expect(result.summary.checksPerformedToday).toBe(3);
        expect(result.summary.activeAssignments).toBe(1);
        expect(result.summary.eligibleRowsToday).toBe(1);
        expect(result.summary.assignedToStockToday).toBe(1);
    });

    test("daily summary does not count check-job assignments outside the Argentina day", async () => {
        const supervisor = await User.create({ username: "sup-outside", nombre: "Supervisor Outside", email: "sup-outside@example.com", password: "password123", role: "supervisor", active: true });
        const job = await AffiliateCheckJob.create({
            requestedBy: supervisor._id,
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "completed",
            channelOwner: supervisor._id,
            channelType: "internal",
            requestedCount: 1,
            selectedCount: 1,
            ownership: { supervisorId: supervisor._id },
            createdAt: new Date("2026-06-16T14:00:00.000Z")
        });
        const affiliateId = oid();
        await AffiliateCheckRow.create({ jobId: job._id, affiliateId, cuilNormalized: "202", mode: "check_new", status: "assigned", canSell: true, assignedToSupervisor: supervisor._id });
        await AffiliateAssignment.create({
            affiliateId,
            supervisorId: supervisor._id,
            assignedBy: supervisor._id,
            source: "check_job",
            sourceJobId: job._id,
            assignedAt: new Date("2026-06-17T03:00:00.000Z"),
            expiresAt: new Date("2026-06-20T03:00:00.000Z")
        });

        const result = await getAffiliateCheckDashboardSummary({
            user: { _id: supervisor._id, role: "supervisor" },
            date: "2026-06-16",
            now: new Date("2026-06-16T15:00:00.000Z")
        });

        expect(result.summary.activeAssignments).toBe(1);
        expect(result.summary.assignedToStockToday).toBe(0);
    });

    test("daily summary does not count legacy check-job assignments missing assignedAt", async () => {
        const supervisor = await User.create({ username: "sup-missing", nombre: "Supervisor Missing", email: "sup-missing@example.com", password: "password123", role: "supervisor", active: true });
        const job = await AffiliateCheckJob.create({
            requestedBy: supervisor._id,
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "completed",
            channelOwner: supervisor._id,
            channelType: "internal",
            requestedCount: 1,
            selectedCount: 1,
            ownership: { supervisorId: supervisor._id },
            createdAt: new Date("2026-06-16T14:00:00.000Z")
        });
        const affiliateId = oid();
        await AffiliateCheckRow.create({ jobId: job._id, affiliateId, cuilNormalized: "203", mode: "check_new", status: "assigned", canSell: true, assignedToSupervisor: supervisor._id });
        await AffiliateAssignment.collection.insertOne({
            affiliateId,
            supervisorId: supervisor._id,
            assignedBy: supervisor._id,
            source: "check_job",
            sourceJobId: job._id,
            status: "active",
            expiresAt: new Date("2026-06-20T03:00:00.000Z"),
            createdAt: new Date("2026-06-16T13:00:00.000Z"),
            updatedAt: new Date("2026-06-16T13:00:00.000Z")
        });

        const result = await getAffiliateCheckDashboardSummary({
            user: { _id: supervisor._id, role: "supervisor" },
            date: "2026-06-16",
            now: new Date("2026-06-16T15:00:00.000Z")
        });

        expect(result.summary.activeAssignments).toBe(1);
        expect(result.summary.assignedToStockToday).toBe(0);
    });


    test("summary uses durable assignments for extraction and validates Gerencia target supervisor", async () => {
        const supervisor = await User.create({ username: "sup4", nombre: "Supervisor 4", email: "sup4@example.com", password: "password123", role: "supervisor", active: true });
        const gerencia = await User.create({ username: "ger1", nombre: "Gerencia", email: "ger1@example.com", password: "password123", role: "gerencia", active: true });
        const encargado = await User.create({ username: "enc1", nombre: "Encargado", email: "enc1@example.com", password: "password123", role: "encargado", active: true });
        const affiliateId = oid();
        await AffiliateAssignment.create({
            affiliateId,
            supervisorId: supervisor._id,
            assignedBy: gerencia._id,
            source: "extract_base",
            sourceJobId: oid(),
            assignedAt: new Date("2026-06-16T13:00:00.000Z"),
            expiresAt: new Date("2026-06-20T03:00:00.000Z")
        });
        await AffiliateAssignment.create({
            affiliateId: oid(),
            supervisorId: supervisor._id,
            assignedBy: gerencia._id,
            source: "extract_base",
            status: "expired",
            assignedAt: new Date("2026-06-16T13:00:00.000Z"),
            expiresAt: new Date("2026-06-15T03:00:00.000Z")
        });
        await AffiliateCheckJob.create({
            requestedBy: gerencia._id,
            requestedByRole: "gerencia",
            mode: "extract_base",
            status: "processing",
            requestedCount: 355,
            selectedCount: 355,
            quota: { consumed: 0 },
            ownership: { supervisorId: supervisor._id },
            createdAt: new Date("2026-06-16T14:00:00.000Z")
        });

        const result = await getAffiliateCheckDashboardSummary({
            user: { _id: gerencia._id, role: "gerencia" },
            supervisorId: supervisor._id,
            date: "2026-06-16",
            now: new Date("2026-06-16T15:00:00.000Z")
        });

        expect(result.supervisorId).toBe(String(supervisor._id));
        expect(result.quota.extract.used).toBe(2);
        expect(result.summary.jobsCreatedToday).toBe(0);
        expect(result.summary.activeAssignments).toBe(1);

        const encargadoResult = await getAffiliateCheckDashboardSummary({
            user: { _id: encargado._id, role: "encargado" },
            supervisorId: supervisor._id,
            date: "2026-06-16",
            now: new Date("2026-06-16T15:00:00.000Z")
        });

        expect(encargadoResult.supervisorId).toBe(String(supervisor._id));
        expect(encargadoResult.success).toBe(true);
    });

    test("assigned-to-stock is based on active assignments and never exceeds eligible rows", async () => {
        const supervisor = await User.create({ username: "sup5", nombre: "Supervisor 5", email: "sup5@example.com", password: "password123", role: "supervisor", active: true });
        const job = await AffiliateCheckJob.create({ requestedBy: supervisor._id, requestedByRole: "supervisor", mode: "check_new", status: "completed", channelOwner: supervisor._id, channelType: "internal", quota: { consumed: 2 }, ownership: { supervisorId: supervisor._id }, createdAt: new Date("2026-06-16T14:00:00.000Z") });
        const eligibleAffiliate = oid();
        await AffiliateCheckRow.create({ jobId: job._id, affiliateId: eligibleAffiliate, cuilNormalized: "209", mode: "check_new", status: "assigned", canSell: true, assignedToSupervisor: supervisor._id });
        await AffiliateCheckRow.create({ jobId: job._id, affiliateId: oid(), cuilNormalized: "208", mode: "check_new", status: "assigned", canSell: false, assignedToSupervisor: supervisor._id });
        await AffiliateAssignment.create({ affiliateId: eligibleAffiliate, supervisorId: supervisor._id, assignedBy: supervisor._id, source: "check_job", sourceJobId: job._id, assignedAt: new Date("2026-06-16T14:05:00.000Z"), expiresAt: new Date("2026-06-20T03:00:00.000Z") });
        await AffiliateAssignment.create({ affiliateId: oid(), supervisorId: supervisor._id, assignedBy: supervisor._id, source: "check_job", sourceJobId: job._id, assignedAt: new Date("2026-06-16T14:05:00.000Z"), expiresAt: new Date("2026-06-20T03:00:00.000Z") });

        const result = await getAffiliateCheckDashboardSummary({ user: { _id: supervisor._id, role: "supervisor" }, date: "2026-06-16", now: new Date("2026-06-16T15:00:00.000Z") });
        expect(result.summary.eligibleRowsToday).toBe(1);
        expect(result.summary.assignedToStockToday).toBe(1);
        expect(result.summary.assignedToStockToday).toBeLessThanOrEqual(result.summary.eligibleRowsToday);
    });
    test("terminal internal jobs are exportable by Gerencia and denied to Supervisor", async () => {
        const supervisor = await User.create({ username: "sup3", nombre: "Supervisor 3", email: "sup3@example.com", password: "password123", role: "supervisor", active: true });
        const gerencia = await User.create({ username: "ger2", nombre: "Gerencia 2", email: "ger2@example.com", password: "password123", role: "gerencia", active: true });
        const affiliate = await Affiliate.create({
            cuil: "20-12345678-9",
            nombre: "Afiliado",
            telefono1: "1122334455",
            obraSocial: "OS",
            localidad: "CABA",
            uploadedBy: supervisor._id,
            sourceFile: "test.xlsx",
            batchId: "batch-test",
            active: true
        });
        const job = await AffiliateCheckJob.create({ requestedBy: supervisor._id, requestedByRole: "supervisor", mode: "check_new", status: "completed", channelOwner: supervisor._id, channelType: "internal", requestedCount: 1, selectedCount: 1, ownership: { supervisorId: supervisor._id } });
        await AffiliateOperationalState.create({ affiliateId: affiliate._id, cuil: affiliate.cuil, cuilNormalized: "20123456789", canSell: true, availableForSale: false });
        await AffiliateCheckRow.create({ jobId: job._id, affiliateId: affiliate._id, cuilNormalized: "20123456789", mode: "check_new", status: "assigned", canSell: true, assignedToSupervisor: supervisor._id });
        await AffiliateAssignment.create({ affiliateId: affiliate._id, supervisorId: supervisor._id, assignedBy: supervisor._id, source: "check_job", sourceJobId: job._id, expiresAt: new Date(Date.now() + 86400000) });

        await expect(exportAffiliateCheckJob({ user: { _id: supervisor._id, role: "supervisor" }, jobId: job._id }))
            .rejects.toMatchObject({ code: "JOB_CANNOT_EXPORT" });
        const result = await exportAffiliateCheckJob({ user: { _id: gerencia._id, role: "gerencia" }, jobId: job._id });
        expect(result.filename).toContain("chequeo_resultado_check_new");
        expect(Buffer.isBuffer(result.buffer)).toBe(true);
        expect(result.buffer.length).toBeGreaterThan(0);
    });
});
