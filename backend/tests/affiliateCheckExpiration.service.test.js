"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const {
    expireAssignment,
    expireStaleAssignments
} = require("../src/services/affiliateCheckExpiration.service");

const NOW = new Date("2026-06-15T12:00:00.000Z");

async function createOwnedAffiliate(overrides = {}) {
    const affiliateId = new mongoose.Types.ObjectId();
    const supervisorId = overrides.supervisorId || new mongoose.Types.ObjectId();
    const expiresAt = overrides.expiresAt || new Date(NOW.getTime() - 60000);
    const cuil = String(Math.floor(20000000000 + Math.random() * 7000000000));
    const state = await AffiliateOperationalState.create({
        affiliateId,
        cuil,
        cuilNormalized: cuil,
        verificationStatus: overrides.verificationStatus || "checked",
        usageStatus: overrides.usageStatus || "assigned",
        saleStatus: overrides.saleStatus || "none",
        canSell: overrides.canSell ?? true,
        currentCheckJobId: overrides.currentCheckJobId || null,
        ownership: {
            supervisorId,
            assignedAt: overrides.assignedAt || new Date(NOW.getTime() - 86400000),
            expiresAt
        }
    });
    const assignment = await AffiliateAssignment.create({
        affiliateId,
        operationalStateId: state._id,
        supervisorId,
        assignedBy: new mongoose.Types.ObjectId(),
        source: "check_job",
        assignedAt: state.ownership.assignedAt,
        expiresAt
    });
    return { affiliateId, supervisorId, expiresAt, state, assignment };
}

describe("affiliateCheckExpiration.service", () => {
    test("expired active assignment is expired and clears matching ownership", async () => {
        const { state, assignment } = await createOwnedAffiliate();
        const stats = await expireStaleAssignments({ now: NOW });
        const [storedAssignment, storedState] = await Promise.all([
            AffiliateAssignment.findById(assignment._id).lean(),
            AffiliateOperationalState.findById(state._id).lean()
        ]);
        expect(stats).toMatchObject({ scanned: 1, expired: 1, errors: 0 });
        expect(storedAssignment.status).toBe("expired");
        expect(storedAssignment.expiredAt).toEqual(NOW);
        expect(storedAssignment.expirationReason).toBe("ownership_period_elapsed");
        expect(storedState.ownership.supervisorId).toBeNull();
        expect(storedState.ownership.expiresAt).toBeNull();
    });

    test("renewed assignment and extended ownership are not cleared by a stale operation", async () => {
        const { state, assignment } = await createOwnedAffiliate();
        const staleAssignment = assignment.toObject();
        const extended = new Date(NOW.getTime() + 86400000);
        await AffiliateAssignment.updateOne({ _id: assignment._id }, { $set: { expiresAt: extended } });
        await AffiliateOperationalState.updateOne({ _id: state._id }, { $set: { "ownership.expiresAt": extended } });
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

    test("newer active assignment ownership is not cleared", async () => {
        const original = await createOwnedAffiliate();
        const newerSupervisor = new mongoose.Types.ObjectId();
        const newerExpiry = new Date(NOW.getTime() + 86400000);
        await AffiliateAssignment.updateOne({ _id: original.assignment._id }, { $set: { status: "expired", expiredAt: NOW } });
        await AffiliateAssignment.create({
            affiliateId: original.affiliateId,
            operationalStateId: original.state._id,
            supervisorId: newerSupervisor,
            assignedBy: new mongoose.Types.ObjectId(),
            source: "manual",
            assignedAt: NOW,
            expiresAt: newerExpiry
        });
        await AffiliateOperationalState.updateOne({ _id: original.state._id }, { $set: {
            "ownership.supervisorId": newerSupervisor,
            "ownership.assignedAt": NOW,
            "ownership.expiresAt": newerExpiry
        } });
        const result = await expireAssignment(original.assignment.toObject(), NOW);
        const state = await AffiliateOperationalState.findById(original.state._id).lean();
        expect(result).toMatchObject({ skipped: true, reason: "newer_assignment" });
        expect(String(state.ownership.supervisorId)).toBe(String(newerSupervisor));
    });

    test("active currentCheckJobId prevents ownership cleanup", async () => {
        const requestedBy = new mongoose.Types.ObjectId();
        const activeJob = await AffiliateCheckJob.create({
            requestedBy,
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "processing"
        });
        const { state, assignment } = await createOwnedAffiliate({ currentCheckJobId: activeJob._id });
        const result = await expireAssignment(assignment.toObject(), NOW);
        const storedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(result).toMatchObject({ skipped: true, reason: "active_check_job" });
        expect(storedState.ownership.supervisorId).not.toBeNull();
    });

    test("repeated execution is idempotent", async () => {
        const { assignment } = await createOwnedAffiliate();
        const first = await expireStaleAssignments({ now: NOW });
        const second = await expireStaleAssignments({ now: NOW });
        const stored = await AffiliateAssignment.findById(assignment._id).lean();
        expect(first.expired).toBe(1);
        expect(second).toMatchObject({ scanned: 0, expired: 0 });
        expect(stored.status).toBe("expired");
    });

    test("batch limit is respected", async () => {
        await Promise.all([createOwnedAffiliate(), createOwnedAffiliate(), createOwnedAffiliate()]);
        const stats = await expireStaleAssignments({ now: NOW, limit: 2 });
        expect(stats.scanned).toBe(2);
        expect(stats.expired).toBe(2);
        expect(await AffiliateAssignment.countDocuments({ status: "active" })).toBe(1);
    });

    test("genuinely blocked affiliate remains blocked", async () => {
        const { state } = await createOwnedAffiliate({ usageStatus: "blocked", saleStatus: "qr_done", canSell: false });
        await expireStaleAssignments({ now: NOW });
        const stored = await AffiliateOperationalState.findById(state._id).lean();
        expect(stored.usageStatus).toBe("blocked");
        expect(stored.ownership.supervisorId).toBeNull();
    });

    test("stale assigned state is normalized to available when still sellable", async () => {
        const { state } = await createOwnedAffiliate({ usageStatus: "assigned", verificationStatus: "checked", canSell: true });
        await expireStaleAssignments({ now: NOW });
        const stored = await AffiliateOperationalState.findById(state._id).lean();
        expect(stored.usageStatus).toBe("available");
        expect(stored.ownership.supervisorId).toBeNull();
    });
});
