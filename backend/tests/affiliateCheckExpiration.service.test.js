"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const Audit = require("../src/models/Audit");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const {
    auditAffiliateCheckExpiration,
    expireAssignment,
    expireStaleAssignments
} = require("../src/services/affiliateCheckExpiration.service");
const {
    rebuildOperationalStateForAffiliateIds
} = require("../src/services/affiliateOperationalState.service");

const NOW = new Date("2026-06-15T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
let cuilSequence = 0;

function oid() {
    return new mongoose.Types.ObjectId();
}

function nextCuil() {
    cuilSequence += 1;
    return `20${String(30000000 + cuilSequence).padStart(8, "0")}1`;
}

async function createConfig(overrides = {}) {
    return AffiliateCheckConfig.create({
        active: true,
        ownershipDays: overrides.ownershipDays || 30,
        verificationExpiryDays: overrides.verificationExpiryDays || 30,
        dailyQuota: { checkNew: 100, checkReusable: 100, extractBase: 100, checkImport: 100 },
        features: { checkNewEnabled: true, checkReusableEnabled: true, extractBaseEnabled: true, checkImportEnabled: true }
    });
}

async function createAffiliate(overrides = {}) {
    const cuil = overrides.cuil || nextCuil();
    return Affiliate.create({
        nombre: overrides.nombre || "Afiliado Expiracion",
        cuil,
        obraSocial: overrides.obraSocial || "OS Test",
        localidad: overrides.localidad || "CABA",
        telefono1: overrides.telefono1 || "1122334455",
        uploadedBy: overrides.uploadedBy || oid(),
        sourceFile: overrides.sourceFile || "expiration-test.xlsx",
        batchId: overrides.batchId || "expiration-batch",
        active: overrides.active !== undefined ? overrides.active : true,
        dataSource: overrides.dataSource || "reusable",
        ...overrides
    });
}

async function createContribution(affiliate, overrides = {}) {
    return AffiliateContribution.create({
        affiliateId: affiliate._id,
        cuil: affiliate.cuil,
        canSell: overrides.canSell !== undefined ? overrides.canSell : true,
        verification: {
            status: overrides.status || "success",
            checkedAt: overrides.checkedAt || new Date(NOW.getTime() - DAY_MS)
        }
    });
}

async function createAssignmentFixture(overrides = {}) {
    if (overrides.createConfig !== false) await createConfig(overrides.config || {});
    const supervisorId = overrides.supervisorId || oid();
    const assignedAt = overrides.assignedAt || new Date(NOW.getTime() - 10 * DAY_MS);
    const expiresAt = overrides.expiresAt || new Date(NOW.getTime() - 60 * 1000);
    const affiliate = await createAffiliate(overrides.affiliate || {});
    await createContribution(affiliate, overrides.contribution || {});
    const state = overrides.withoutState
        ? null
        : await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            verificationStatus: "checked",
            usageStatus: "assigned",
            saleStatus: "none",
            canSell: true,
            availableForSale: false,
            currentCheckJobId: overrides.currentCheckJobId || null,
            currentCheckStartedAt: overrides.currentCheckJobId ? new Date(NOW.getTime() - 60 * 1000) : null,
            ownership: {
                supervisorId,
                assignedAt,
                expiresAt,
                source: overrides.source || "check_job"
            }
        });
    const assignment = await AffiliateAssignment.create({
        affiliateId: affiliate._id,
        operationalStateId: state?._id || null,
        supervisorId,
        assignedBy: overrides.assignedBy || oid(),
        source: overrides.source || "check_job",
        sourceJobId: overrides.sourceJobId || oid(),
        assignedAt,
        expiresAt,
        status: overrides.status || "active"
    });
    return { affiliate, assignment, state, supervisorId, assignedAt, expiresAt };
}

async function createQrAudit(affiliate) {
    return Audit.create({
        nombre: "Afiliado QR",
        cuil: affiliate.cuil,
        cuilNormalized: affiliate.cuil,
        telefono: "1122334455",
        obraSocialVendida: "Binimed",
        scheduledAt: NOW,
        status: "QR hecho",
        statusUpdatedAt: NOW
    });
}

describe("affiliateCheckExpiration.service", () => {
    test("expired active assignment is expired, history is preserved and sellable affiliate becomes available", async () => {
        const { affiliate, assignment, supervisorId, assignedAt, expiresAt } = await createAssignmentFixture();

        const stats = await expireStaleAssignments({ now: NOW });
        const [storedAssignment, storedState] = await Promise.all([
            AffiliateAssignment.findById(assignment._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(stats).toMatchObject({ scanned: 1, eligible: 1, expired: 1, errors: 0 });
        expect(storedAssignment.status).toBe("expired");
        expect(storedAssignment.expiredAt).toEqual(NOW);
        expect(storedAssignment.expirationReason).toBe("ownership_period_elapsed");
        expect(String(storedAssignment.supervisorId)).toBe(String(supervisorId));
        expect(storedAssignment.assignedAt).toEqual(assignedAt);
        expect(storedAssignment.expiresAt).toEqual(expiresAt);
        expect(storedAssignment.sourceJobId).toEqual(assignment.sourceJobId);
        expect(storedState.ownership.supervisorId).toBeNull();
        expect(storedState.availableForSale).toBe(true);
        expect(storedState.unavailableReason).toBeNull();
    });

    test("assignment not yet expired is left untouched", async () => {
        const future = new Date(NOW.getTime() + DAY_MS);
        const { assignment, affiliate } = await createAssignmentFixture({ expiresAt: future });

        const stats = await expireStaleAssignments({ now: NOW });
        const [storedAssignment, storedState] = await Promise.all([
            AffiliateAssignment.findById(assignment._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(stats).toMatchObject({ scanned: 0, expired: 0, errors: 0 });
        expect(storedAssignment.status).toBe("active");
        expect(storedAssignment.expiresAt).toEqual(future);
        expect(storedState.ownership.supervisorId).not.toBeNull();
    });

    test("already expired assignment is an idempotent no-op", async () => {
        const { assignment } = await createAssignmentFixture({ status: "expired" });

        const result = await expireAssignment(assignment.toObject(), NOW);
        const stats = await expireStaleAssignments({ now: NOW });

        expect(result).toMatchObject({ skipped: true, reason: "already_expired" });
        expect(stats).toMatchObject({ scanned: 0, expired: 0 });
    });

    test("expired assignment with expired verification remains unavailable for recheck", async () => {
        await createConfig({ verificationExpiryDays: 10 });
        const { affiliate } = await createAssignmentFixture({
            createConfig: false,
            contribution: { checkedAt: new Date(NOW.getTime() - 11 * DAY_MS) }
        });

        await expireStaleAssignments({ now: NOW });
        const storedState = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(storedState.ownership.supervisorId).toBeNull();
        expect(storedState.verificationStatus).toBe("expired");
        expect(storedState.availableForSale).toBe(false);
        expect(storedState.unavailableReason).toBe("verification_expired");
    });

    test("expired assignment with QR done keeps sale exclusion", async () => {
        const { affiliate } = await createAssignmentFixture();
        await createQrAudit(affiliate);

        await expireStaleAssignments({ now: NOW });
        const storedState = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(storedState.ownership.supervisorId).toBeNull();
        expect(storedState.saleStatus).toBe("qr_done");
        expect(storedState.availableForSale).toBe(false);
        expect(storedState.unavailableReason).toBe("sold_qr_done");
    });

    test("expired assignment with active currentCheckJobId preserves reservation and blocks availability", async () => {
        await createConfig();
        const activeJob = await AffiliateCheckJob.create({
            requestedBy: oid(),
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "processing",
            requestedCount: 1,
            selectedCount: 1
        });
        const { affiliate, assignment } = await createAssignmentFixture({
            createConfig: false,
            currentCheckJobId: activeJob._id
        });

        const result = await expireAssignment(assignment.toObject(), NOW);
        const [storedAssignment, storedState] = await Promise.all([
            AffiliateAssignment.findById(assignment._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(result.expired).toBe(true);
        expect(storedAssignment.status).toBe("expired");
        expect(String(storedState.currentCheckJobId)).toBe(String(activeJob._id));
        expect(storedState.ownership.supervisorId).toBeNull();
        expect(storedState.availableForSale).toBe(false);
        expect(storedState.unavailableReason).toBe("checking_in_progress");
    });

    test("newer active assignment remains authoritative after an older assignment was already expired", async () => {
        const original = await createAssignmentFixture();
        await AffiliateAssignment.updateOne(
            { _id: original.assignment._id },
            { $set: { status: "expired", expiredAt: NOW, expirationReason: "ownership_period_elapsed" } }
        );
        const newerSupervisor = oid();
        const newerExpiry = new Date(NOW.getTime() + DAY_MS);
        const newerAssignment = await AffiliateAssignment.create({
            affiliateId: original.affiliate._id,
            operationalStateId: original.state._id,
            supervisorId: newerSupervisor,
            assignedBy: oid(),
            source: "manual",
            assignedAt: NOW,
            expiresAt: newerExpiry
        });

        const result = await expireAssignment(original.assignment.toObject(), NOW);
        await rebuildOperationalStateForAffiliateIds([original.affiliate._id], { now: NOW });
        const storedState = await AffiliateOperationalState.findOne({ affiliateId: original.affiliate._id }).lean();

        expect(result).toMatchObject({ skipped: true, reason: "already_expired" });
        expect(String(storedState.ownership.supervisorId)).toBe(String(newerSupervisor));
        expect(storedState.ownership.source).toBe("manual");
        expect(String(newerAssignment.affiliateId)).toBe(String(original.affiliate._id));
    });

    test("concurrent expiration attempts are idempotent", async () => {
        const { assignment } = await createAssignmentFixture();

        const first = await expireAssignment(assignment.toObject(), NOW);
        const second = await expireAssignment(assignment.toObject(), NOW);
        const stored = await AffiliateAssignment.findById(assignment._id).lean();

        expect(first.expired).toBe(true);
        expect(second).toMatchObject({ skipped: true, reason: "already_expired" });
        expect(stored.status).toBe("expired");
    });

    test("assignment changed before update is skipped safely", async () => {
        const { state, assignment } = await createAssignmentFixture();
        const staleAssignment = assignment.toObject();
        const extended = new Date(NOW.getTime() + DAY_MS);
        await AffiliateAssignment.updateOne({ _id: assignment._id }, { $set: { expiresAt: extended } });

        const result = await expireAssignment(staleAssignment, NOW);
        const [storedAssignment, storedState] = await Promise.all([
            AffiliateAssignment.findById(assignment._id).lean(),
            AffiliateOperationalState.findById(state._id).lean()
        ]);

        expect(result).toMatchObject({ skipped: true, reason: "already_transitioned" });
        expect(storedAssignment.status).toBe("active");
        expect(storedAssignment.expiresAt).toEqual(extended);
        expect(storedState.ownership.supervisorId).not.toBeNull();
    });

    test("operational-state rebuild failure leaves assignment expired for later reconciliation", async () => {
        const { affiliate, assignment } = await createAssignmentFixture();
        const failingRebuild = jest.fn().mockRejectedValue(new Error("rebuild unavailable"));

        const stats = await expireStaleAssignments({
            now: NOW,
            rebuildOperationalState: failingRebuild
        });
        const expiredAssignment = await AffiliateAssignment.findById(assignment._id).lean();
        const staleState = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(stats).toMatchObject({ expired: 1, operationalStateFailed: 1, errors: 1 });
        expect(expiredAssignment.status).toBe("expired");
        expect(staleState.ownership.supervisorId).not.toBeNull();

        await rebuildOperationalStateForAffiliateIds([affiliate._id], { now: NOW });
        const repairedState = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();
        expect(repairedState.ownership.supervisorId).toBeNull();
        expect(repairedState.availableForSale).toBe(true);
    });

    test("batch limit is respected", async () => {
        await createConfig();
        await Promise.all([
            createAssignmentFixture({ createConfig: false }),
            createAssignmentFixture({ createConfig: false }),
            createAssignmentFixture({ createConfig: false })
        ]);

        const stats = await expireStaleAssignments({ now: NOW, limit: 2 });

        expect(stats.scanned).toBe(2);
        expect(stats.expired).toBe(2);
        expect(await AffiliateAssignment.countDocuments({ status: "active" })).toBe(1);
    });

    test("ownershipDays and verificationExpiryDays do not assume 30 days", async () => {
        await createConfig({ ownershipDays: 7, verificationExpiryDays: 45 });
        const { affiliate } = await createAssignmentFixture({
            createConfig: false,
            expiresAt: new Date(NOW.getTime() - 1000),
            contribution: { checkedAt: new Date(NOW.getTime() - 20 * DAY_MS) }
        });

        await expireStaleAssignments({ now: NOW });
        const storedState = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(storedState.verificationStatus).toBe("checked");
        expect(storedState.availableForSale).toBe(true);
        expect(storedState.verificationExpiresAt.toISOString()).toBe(new Date(NOW.getTime() + 25 * DAY_MS).toISOString());
    });

    test("missing operational-state document is recreated during expiration rebuild", async () => {
        const { affiliate } = await createAssignmentFixture({ withoutState: true });

        await expireStaleAssignments({ now: NOW });
        const storedState = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(storedState).toBeTruthy();
        expect(storedState.ownership.supervisorId).toBeNull();
        expect(storedState.availableForSale).toBe(true);
    });

    test("duplicate active assignment anomaly skips affected affiliates", async () => {
        const { assignment } = await createAssignmentFixture();
        const aggregateSpy = jest.spyOn(AffiliateAssignment, "aggregate")
            .mockResolvedValueOnce([{ groups: 1 }])
            .mockResolvedValueOnce([{ _id: assignment.affiliateId, count: 2 }]);

        const stats = await expireStaleAssignments({ now: NOW });
        const storedAssignment = await AffiliateAssignment.findById(assignment._id).lean();

        expect(stats.duplicateActiveAssignmentAnomalies).toBe(1);
        expect(stats.expired).toBe(0);
        expect(stats.skippedChanged).toBe(1);
        expect(storedAssignment.status).toBe("active");
        aggregateSpy.mockRestore();
    });

    test("dry-run reports aggregate effects and performs no writes", async () => {
        const { assignment } = await createAssignmentFixture();

        const stats = await auditAffiliateCheckExpiration({ now: NOW, limit: 100 });
        const storedAssignment = await AffiliateAssignment.findById(assignment._id).lean();

        expect(stats.dryRun).toBe(true);
        expect(stats.scanned).toBe(1);
        expect(stats.eligible).toBe(1);
        expect(stats.effects.availableGeneralStock).toBe(1);
        expect(stats.safeToExecute).toBe(true);
        expect(storedAssignment.status).toBe("active");
    });
});
