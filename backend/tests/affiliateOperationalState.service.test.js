"use strict";

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const { rebuildOperationalStateForAffiliateIds } = require("../src/services/affiliateOperationalState.service");

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
