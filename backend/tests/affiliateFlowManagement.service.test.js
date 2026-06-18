"use strict";

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const LeadAssignment = require("../src/models/LeadAssignment");
const User = require("../src/models/User");
const { getAffiliateFlowManagementSnapshot } = require("../src/services/affiliateFlowManagement.service");

const DAY_MS = 24 * 60 * 60 * 1000;

function oid() {
    return new mongoose.Types.ObjectId();
}

async function createUser(role, overrides = {}) {
    const suffix = String(new mongoose.Types.ObjectId()).slice(-8);
    return User.create({
        username: `${role}-${suffix}`,
        nombre: `${role} QA`,
        email: `${role}-${suffix}@example.com`,
        password: "password123",
        role,
        active: true,
        ...overrides
    });
}

async function createAffiliate(overrides = {}) {
    const suffix = String(new mongoose.Types.ObjectId()).slice(-8);
    return Affiliate.create({
        nombre: "Persona QA",
        cuil: `20${suffix}1`.slice(0, 11),
        telefono1: "1111222233",
        obraSocial: "OS QA",
        localidad: "CABA",
        uploadedBy: oid(),
        sourceFile: "flow-management.xlsx",
        batchId: `flow-${suffix}`,
        active: true,
        ...overrides
    });
}

describe("affiliate flow management snapshot", () => {
    test("returns canonical counts and sanitized recent traceability", async () => {
        const now = new Date("2026-06-18T15:00:00.000Z");
        const supervisor = await createUser("supervisor");
        const advisor = await createUser("asesor", { supervisor: supervisor._id });
        const manager = await createUser("gerencia");
        const affiliate = await createAffiliate();

        const job = await AffiliateCheckJob.create({
            requestedBy: supervisor._id,
            requestedByRole: "supervisor",
            mode: "check_new",
            status: "completed",
            channelOwner: supervisor._id,
            channelType: "internal",
            requestedCount: 1,
            selectedCount: 1,
            eligibleCount: 1,
            assignedCount: 1,
            ownership: { supervisorId: supervisor._id },
            createdAt: new Date("2026-06-18T14:00:00.000Z"),
            finishedAt: new Date("2026-06-18T14:30:00.000Z")
        });
        const state = await AffiliateOperationalState.create({
            affiliateId: affiliate._id,
            cuil: affiliate.cuil,
            cuilNormalized: affiliate.cuil,
            freshness: "fresh",
            dataSource: "fresh",
            verificationStatus: "checked",
            usageStatus: "assigned",
            saleStatus: "none",
            canSell: true,
            availableForSale: false,
            unavailableReason: "assigned_to_advisor",
            verificationExpiresAt: new Date(now.getTime() + 10 * DAY_MS),
            ownership: {
                supervisorId: supervisor._id,
                assignedAt: now,
                expiresAt: new Date(now.getTime() + 10 * DAY_MS),
                source: "check_job"
            },
            obraSocial: affiliate.obraSocial
        });
        const stock = await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            operationalStateId: state._id,
            supervisorId: supervisor._id,
            assignedBy: supervisor._id,
            source: "check_job",
            sourceJobId: job._id,
            status: "active",
            assignedAt: now,
            expiresAt: new Date(now.getTime() + 10 * DAY_MS)
        });
        const lead = await LeadAssignment.create({
            affiliate: affiliate._id,
            assignedTo: advisor._id,
            assignedBy: supervisor._id,
            supervisor: supervisor._id,
            sourceStockAssignment: stock._id,
            operationalState: state._id,
            sourceCheckJob: job._id,
            assignedAt: now,
            status: "No contesta",
            lastOutcomeAt: new Date("2026-06-18T15:10:00.000Z"),
            lastOutcomeBy: advisor._id,
            active: true
        });

        const result = await getAffiliateFlowManagementSnapshot({
            user: { _id: manager._id, role: "gerencia" },
            now
        });

        expect(result.counts.eligible).toBe(1);
        expect(result.counts.supervisorOwned).toBe(1);
        expect(result.counts.advisorAssigned).toBe(1);
        expect(result.recentCheckJobs[0]).toMatchObject({ mode: "check_new", status: "completed", selectedCount: 1 });
        expect(result.recentDistributions[0]).toMatchObject({
            assignmentRef: String(lead._id).slice(-8),
            stockAssignmentRef: String(stock._id).slice(-8),
            checkJobRef: String(job._id).slice(-8),
            supervisorRef: String(supervisor._id).slice(-8),
            advisorRef: String(advisor._id).slice(-8),
            status: "No contesta"
        });
        expect(result.recentAdvisorOutcomes[0]).toMatchObject({
            assignmentRef: String(lead._id).slice(-8),
            outcome: "No contesta"
        });

        const payload = JSON.stringify(result);
        expect(payload).not.toContain(affiliate.nombre);
        expect(payload).not.toContain(affiliate.cuil);
        expect(payload).not.toContain(affiliate.telefono1);
        expect(payload).not.toContain("affiliate");
    });

    test("scopes supervisor traceability to their own stock and advisor assignments", async () => {
        const now = new Date("2026-06-18T15:00:00.000Z");
        const supervisor = await createUser("supervisor");
        const otherSupervisor = await createUser("supervisor");
        const advisor = await createUser("asesor", { supervisor: supervisor._id });
        const otherAdvisor = await createUser("asesor", { supervisor: otherSupervisor._id });

        const ownAffiliate = await createAffiliate();
        const otherAffiliate = await createAffiliate();
        await AffiliateAssignment.create({
            affiliateId: ownAffiliate._id,
            supervisorId: supervisor._id,
            assignedBy: supervisor._id,
            source: "check_job",
            status: "active",
            assignedAt: now,
            expiresAt: new Date(now.getTime() + DAY_MS)
        });
        await AffiliateAssignment.create({
            affiliateId: otherAffiliate._id,
            supervisorId: otherSupervisor._id,
            assignedBy: otherSupervisor._id,
            source: "check_job",
            status: "active",
            assignedAt: now,
            expiresAt: new Date(now.getTime() + DAY_MS)
        });
        await LeadAssignment.create({
            affiliate: ownAffiliate._id,
            assignedTo: advisor._id,
            assignedBy: supervisor._id,
            supervisor: supervisor._id,
            sourceStockAssignment: oid(),
            assignedAt: now,
            status: "Pendiente",
            active: true
        });
        await LeadAssignment.create({
            affiliate: otherAffiliate._id,
            assignedTo: otherAdvisor._id,
            assignedBy: otherSupervisor._id,
            supervisor: otherSupervisor._id,
            sourceStockAssignment: oid(),
            assignedAt: now,
            status: "Pendiente",
            active: true
        });

        const result = await getAffiliateFlowManagementSnapshot({
            user: { _id: supervisor._id, role: "supervisor" },
            now
        });

        expect(result.scope.management).toBe(false);
        expect(result.counts.supervisorOwned).toBe(1);
        expect(result.counts.advisorAssigned).toBe(1);
        expect(result.recentDistributions).toHaveLength(1);
        expect(result.recentDistributions[0].supervisorRef).toBe(String(supervisor._id).slice(-8));
    });
});
