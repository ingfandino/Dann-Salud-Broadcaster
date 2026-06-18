"use strict";

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const { rebuildOperationalStateForAffiliateIds } = require("../src/services/affiliateOperationalState.service");
const {
    reconcileAffiliateOperationalOwnership
} = require("../scripts/reconcileAffiliateOperationalOwnership");

const NOW = new Date("2026-06-17T15:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function oid() {
    return new mongoose.Types.ObjectId();
}

async function createAffiliate(overrides = {}) {
    const suffix = String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
    return Affiliate.create({
        nombre: overrides.nombre || "Afiliado Estado",
        cuil: overrides.cuil || `20${suffix}123${suffix.slice(0, 1)}`.slice(0, 11),
        obraSocial: overrides.obraSocial || "OS Test",
        localidad: overrides.localidad || "CABA",
        telefono1: overrides.telefono1 || "1122334455",
        uploadedBy: overrides.uploadedBy || oid(),
        sourceFile: overrides.sourceFile || "state-test.xlsx",
        batchId: overrides.batchId || "state-batch",
        active: overrides.active !== undefined ? overrides.active : true,
        ...overrides
    });
}

async function createContribution(affiliate, checkedAt) {
    return AffiliateContribution.create({
        affiliateId: affiliate._id,
        cuil: affiliate.cuil,
        canSell: true,
        verification: {
            status: "success",
            checkedAt
        }
    });
}

async function createConfig(overrides = {}) {
    return AffiliateCheckConfig.create({
        active: true,
        ownershipDays: overrides.ownershipDays || 30,
        verificationExpiryDays: overrides.verificationExpiryDays || 30,
        dailyQuota: { checkNew: 10, checkReusable: 10, extractBase: 10, checkImport: 10 },
        features: { checkNewEnabled: true, checkReusableEnabled: true, extractBaseEnabled: true, checkImportEnabled: true }
    });
}

describe("affiliateOperationalState.service rebuild", () => {
    test("uses verificationExpiryDays=10 for verification expiration", async () => {
        await createConfig({ verificationExpiryDays: 10 });
        const affiliate = await createAffiliate({ cuil: "20123456780" });
        await createContribution(affiliate, new Date(NOW.getTime() - 11 * DAY_MS));

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].verificationStatus).toBe("expired");
        expect(result.states[0].verificationExpiresAt.toISOString()).toBe(new Date(NOW.getTime() - DAY_MS).toISOString());
    });

    test("uses verificationExpiryDays=45 for verification expiration", async () => {
        await createConfig({ verificationExpiryDays: 45 });
        const checkedAt = new Date("2026-06-01T15:00:00.000Z");
        const affiliate = await createAffiliate({ cuil: "20123456781" });
        await createContribution(affiliate, checkedAt);

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].verificationStatus).toBe("checked");
        expect(result.states[0].verificationExpiresAt.toISOString()).toBe(new Date(checkedAt.getTime() + 45 * DAY_MS).toISOString());
    });

    test("uses ownershipDays=7 for legacy ownership fallback", async () => {
        await createConfig({ ownershipDays: 7 });
        const supervisor = oid();
        const assignedAt = new Date("2026-06-10T12:00:00.000Z");
        const affiliate = await createAffiliate({ cuil: "20123456782", exported: true, exportedTo: supervisor, exportedAt: assignedAt });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].ownership.source).toBe("legacy");
        expect(result.states[0].ownership.supervisorId.toString()).toBe(supervisor.toString());
        expect(result.states[0].ownership.expiresAt.toISOString()).toBe(new Date(assignedAt.getTime() + 7 * DAY_MS).toISOString());
    });

    test("active AffiliateAssignment wins over conflicting legacy ownership", async () => {
        await createConfig({ ownershipDays: 7 });
        const legacySupervisor = oid();
        const assignmentSupervisor = oid();
        const affiliate = await createAffiliate({
            cuil: "20123456783",
            exported: true,
            exportedTo: legacySupervisor,
            exportedAt: new Date("2026-06-16T12:00:00.000Z")
        });
        await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            supervisorId: assignmentSupervisor,
            assignedBy: assignmentSupervisor,
            source: "check_job",
            sourceJobId: oid(),
            assignedAt: new Date("2026-06-17T12:00:00.000Z"),
            expiresAt: new Date("2026-06-25T12:00:00.000Z")
        });

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].ownership.source).toBe("check_job");
        expect(result.states[0].ownership.supervisorId.toString()).toBe(assignmentSupervisor.toString());
        expect(result.states[0].usageStatus).toBe("assigned");
    });

    test("expired active assignment is ignored and legacy fallback is used", async () => {
        await createConfig({ ownershipDays: 30 });
        const legacySupervisor = oid();
        const expiredSupervisor = oid();
        const affiliate = await createAffiliate({
            cuil: "20123456784",
            exported: true,
            exportedTo: legacySupervisor,
            exportedAt: new Date("2026-06-16T12:00:00.000Z")
        });
        await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            supervisorId: expiredSupervisor,
            assignedBy: expiredSupervisor,
            source: "check_job",
            sourceJobId: oid(),
            assignedAt: new Date("2026-06-01T12:00:00.000Z"),
            expiresAt: new Date("2026-06-10T12:00:00.000Z")
        });

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].ownership.source).toBe("legacy");
        expect(result.states[0].ownership.supervisorId.toString()).toBe(legacySupervisor.toString());
    });

    test("legacy fallback remains available when no assignment exists", async () => {
        await createConfig({ ownershipDays: 30 });
        const legacySupervisor = oid();
        const affiliate = await createAffiliate({
            cuil: "20123456785",
            exported: true,
            exportedTo: legacySupervisor,
            exportedAt: new Date("2026-06-16T12:00:00.000Z")
        });

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].ownership.source).toBe("legacy");
        expect(result.states[0].ownership.supervisorId.toString()).toBe(legacySupervisor.toString());
    });


    test("active reservation keeps otherwise sellable affiliate unavailable", async () => {
        await createConfig();
        const affiliate = await createAffiliate({ cuil: "20123456788" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));
        const job = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_new", status: "processing", requestedCount: 1, selectedCount: 1 });
        await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            currentCheckJobId: job._id,
            currentCheckStartedAt: new Date("2026-06-17T12:00:00.000Z")
        });

        await rebuildOperationalStateForAffiliateIds([affiliate._id], { now: NOW });
        const stored = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(String(stored.currentCheckJobId)).toBe(String(job._id));
        expect(stored.availableForSale).toBe(false);
        expect(stored.unavailableReason).toBe("checking_in_progress");
    });

    test("clears stale extract_base ownership without assignment while preserving active reservation", async () => {
        await createConfig();
        const supervisor = oid();
        const affiliate = await createAffiliate({ cuil: "20123456794" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));
        const job = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_new", status: "processing", requestedCount: 1, selectedCount: 1 });
        await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            verificationStatus: "checked",
            canSell: true,
            availableForSale: false,
            unavailableReason: "assigned_to_supervisor",
            currentCheckJobId: job._id,
            currentCheckStartedAt: new Date("2026-06-17T12:00:00.000Z"),
            ownership: {
                supervisorId: supervisor,
                assignedAt: new Date("2026-06-17T12:00:00.000Z"),
                expiresAt: new Date("2026-06-25T12:00:00.000Z"),
                source: "extract_base"
            }
        });

        await rebuildOperationalStateForAffiliateIds([affiliate._id], { now: NOW });
        const stored = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(String(stored.currentCheckJobId)).toBe(String(job._id));
        expect(stored.ownership.supervisorId).toBeNull();
        expect(stored.ownership.source).toBeNull();
        expect(stored.availableForSale).toBe(false);
        expect(stored.unavailableReason).toBe("checking_in_progress");
    });

    test("active reservation blocks availability while active assignment ownership is preserved", async () => {
        await createConfig();
        const supervisor = oid();
        const affiliate = await createAffiliate({ cuil: "20123456789" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));
        const job = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_reusable", status: "paused", requestedCount: 1, selectedCount: 1 });
        await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            supervisorId: supervisor,
            assignedBy: supervisor,
            source: "check_job",
            sourceJobId: oid(),
            assignedAt: new Date("2026-06-16T12:00:00.000Z"),
            expiresAt: new Date("2026-06-25T12:00:00.000Z")
        });
        await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            currentCheckJobId: job._id,
            currentCheckStartedAt: new Date("2026-06-17T12:00:00.000Z")
        });

        await rebuildOperationalStateForAffiliateIds([affiliate._id], { now: NOW });
        const stored = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(String(stored.currentCheckJobId)).toBe(String(job._id));
        expect(stored.ownership.source).toBe("check_job");
        expect(String(stored.ownership.supervisorId)).toBe(String(supervisor));
        expect(stored.availableForSale).toBe(false);
        expect(stored.unavailableReason).toBe("checking_in_progress");
    });

    test("unreserved equivalent affiliate follows normal sellable availability", async () => {
        await createConfig();
        const affiliate = await createAffiliate({ cuil: "20123456790" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(result.states[0].currentCheckJobId).toBeNull();
        expect(result.states[0].availableForSale).toBe(true);
        expect(result.states[0].unavailableReason).toBeNull();
    });

    test("bulk rebuild resolves reservation jobs once for multiple reserved affiliates", async () => {
        await createConfig();
        const first = await createAffiliate({ cuil: "20123456791" });
        const second = await createAffiliate({ cuil: "20123456792" });
        await createContribution(first, new Date("2026-06-16T12:00:00.000Z"));
        await createContribution(second, new Date("2026-06-16T12:00:00.000Z"));
        const firstJob = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_new", status: "pending", requestedCount: 1, selectedCount: 1 });
        const secondJob = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_reusable", status: "retrying", requestedCount: 1, selectedCount: 1 });
        await AffiliateOperationalState.create({ affiliateId: first._id, cuil: first.cuil, cuilNormalized: first.cuil, currentCheckJobId: firstJob._id });
        await AffiliateOperationalState.create({ affiliateId: second._id, cuil: second.cuil, cuilNormalized: second.cuil, currentCheckJobId: secondJob._id });
        const jobFindSpy = jest.spyOn(AffiliateCheckJob, "find");

        const result = await rebuildOperationalStateForAffiliateIds([first._id, second._id], { dryRun: true, now: NOW });

        expect(jobFindSpy).toHaveBeenCalledTimes(1);
        expect(result.states).toHaveLength(2);
        expect(result.states.every(state => state.unavailableReason === "checking_in_progress")).toBe(true);
        jobFindSpy.mockRestore();
    });

    test("terminal reservation reference is preserved but does not block availability", async () => {
        await createConfig();
        const affiliate = await createAffiliate({ cuil: "20123456793" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));
        const job = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_new", status: "completed", requestedCount: 1, selectedCount: 1 });
        await AffiliateOperationalState.create({ affiliateId: affiliate._id, cuil: affiliate.cuil, cuilNormalized: affiliate.cuil, currentCheckJobId: job._id });

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(String(result.states[0].currentCheckJobId)).toBe(String(job._id));
        expect(result.states[0].availableForSale).toBe(true);
        expect(result.states[0].unavailableReason).toBeNull();
    });

    test("terminal reservation reference does not preserve stale extract_base ownership", async () => {
        await createConfig();
        const affiliate = await createAffiliate({ cuil: "20123456795" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));
        const job = await AffiliateCheckJob.create({ requestedBy: oid(), requestedByRole: "supervisor", mode: "check_new", status: "completed", requestedCount: 1, selectedCount: 1 });
        await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            currentCheckJobId: job._id,
            ownership: {
                supervisorId: oid(),
                assignedAt: new Date("2026-06-17T12:00:00.000Z"),
                expiresAt: new Date("2026-06-25T12:00:00.000Z"),
                source: "extract_base"
            }
        });

        const result = await rebuildOperationalStateForAffiliateIds([affiliate._id], { dryRun: true, now: NOW });

        expect(String(result.states[0].currentCheckJobId)).toBe(String(job._id));
        expect(result.states[0].ownership.supervisorId).toBeNull();
        expect(result.states[0].ownership.source).toBeNull();
        expect(result.states[0].availableForSale).toBe(true);
    });

    test("reconciliation script rebuilds stale ownership idempotently without assignment writes", async () => {
        await createConfig({ verificationExpiryDays: 10 });
        const affiliate = await createAffiliate({ cuil: "20123456796" });
        await createContribution(affiliate, new Date(NOW.getTime() - 11 * DAY_MS));
        await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            verificationStatus: "checked",
            canSell: true,
            availableForSale: false,
            unavailableReason: "assigned_to_supervisor",
            ownership: {
                supervisorId: oid(),
                assignedAt: new Date("2026-06-17T12:00:00.000Z"),
                expiresAt: new Date("2026-06-25T12:00:00.000Z"),
                source: "extract_base"
            }
        });
        const models = { Affiliate, AffiliateAssignment, AffiliateCheckJob, AffiliateCheckRow, AffiliateContribution, AffiliateOperationalState, Audit: require("../src/models/Audit") };

        const dryRun = await reconcileAffiliateOperationalOwnership({
            affiliateId: affiliate._id,
            execute: false,
            models,
            rebuildOperationalStateForAffiliateIds
        });
        const executed = await reconcileAffiliateOperationalOwnership({
            affiliateId: affiliate._id,
            execute: true,
            models,
            rebuildOperationalStateForAffiliateIds
        });
        const second = await reconcileAffiliateOperationalOwnership({
            affiliateId: affiliate._id,
            execute: true,
            models,
            rebuildOperationalStateForAffiliateIds
        });
        const stored = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(dryRun).toMatchObject({ classification: "A", safe: true, executed: false });
        expect(executed.write).toMatchObject({ matchedCount: 1, modifiedCount: 1 });
        expect(second.write).toMatchObject({ modifiedCount: 0, reason: "already_reconciled_noop" });
        expect(stored.ownership.supervisorId).toBeNull();
        expect(stored.availableForSale).toBe(false);
        expect(stored.unavailableReason).toBe("verification_expired");
        expect(await AffiliateAssignment.countDocuments({ affiliateId: affiliate._id })).toBe(0);
    });

    test("reconciliation script aborts when state changes before guarded write", async () => {
        await createConfig();
        const affiliate = await createAffiliate({ cuil: "20123456797" });
        await createContribution(affiliate, new Date("2026-06-16T12:00:00.000Z"));
        const state = await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            verificationStatus: "checked",
            canSell: true,
            availableForSale: false,
            unavailableReason: "assigned_to_supervisor",
            ownership: {
                supervisorId: oid(),
                assignedAt: new Date("2026-06-17T12:00:00.000Z"),
                expiresAt: new Date("2026-06-25T12:00:00.000Z"),
                source: "extract_base"
            }
        });
        const models = { Affiliate, AffiliateAssignment, AffiliateCheckJob, AffiliateCheckRow, AffiliateContribution, AffiliateOperationalState, Audit: require("../src/models/Audit") };
        let calls = 0;
        const racingRebuild = async (ids, options) => {
            calls += 1;
            const result = await rebuildOperationalStateForAffiliateIds(ids, options);
            if (calls === 1) {
                await AffiliateOperationalState.updateOne(
                    { _id: state._id },
                    { $set: { unavailableReason: "assigned_to_supervisor_race" } }
                );
            }
            return result;
        };

        const result = await reconcileAffiliateOperationalOwnership({
            affiliateId: affiliate._id,
            execute: true,
            models,
            rebuildOperationalStateForAffiliateIds: racingRebuild
        });
        const stored = await AffiliateOperationalState.findById(state._id).lean();

        expect(result.safe).toBe(false);
        expect(result.write).toMatchObject({ skipped: true, reason: "concurrency_guard_changed" });
        expect(stored.ownership.supervisorId).not.toBeNull();
    });

    test("bulk rebuild performs one AffiliateAssignment query for all affiliates", async () => {
        await createConfig();
        const first = await createAffiliate({ cuil: "20123456786" });
        const second = await createAffiliate({ cuil: "20123456787" });
        const findSpy = jest.spyOn(AffiliateAssignment, "find");

        await rebuildOperationalStateForAffiliateIds([first._id, second._id], { dryRun: true, now: NOW });

        expect(findSpy).toHaveBeenCalledTimes(1);
        findSpy.mockRestore();
    });
});
