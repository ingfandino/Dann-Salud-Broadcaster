"use strict";

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const LeadAssignment = require("../src/models/LeadAssignment");
const assignmentService = require("../src/services/assignmentService");

const DAY_MS = 24 * 60 * 60 * 1000;

function oid() {
    return new mongoose.Types.ObjectId();
}

async function createAffiliate(overrides = {}) {
    const idPart = String(new mongoose.Types.ObjectId()).slice(-8);
    return Affiliate.create({
        nombre: "Afiliado Stock",
        cuil: `20${idPart}1`.slice(0, 11),
        obraSocial: "OS Stock",
        localidad: "CABA",
        telefono1: "1111222233",
        uploadedBy: oid(),
        sourceFile: "stock-bridge.xlsx",
        batchId: "stock-bridge",
        active: true,
        dataSource: "fresh",
        ...overrides
    });
}

async function createVerifiedStock({ supervisorId, source = "check_job", freshness = "fresh", canSell = true, expiresAt } = {}) {
    const now = new Date();
    const affiliate = await createAffiliate({ dataSource: freshness });
    const operationalState = await AffiliateOperationalState.create({
        affiliateId: affiliate._id,
        cuil: affiliate.cuil,
        cuilNormalized: affiliate.cuil,
        freshness,
        dataSource: freshness,
        verificationStatus: "checked",
        usageStatus: "available",
        saleStatus: "none",
        canSell,
        availableForSale: canSell,
        verificationExpiresAt: new Date(now.getTime() + 10 * DAY_MS),
        ownership: {
            supervisorId,
            assignedAt: now,
            expiresAt: new Date(now.getTime() + 10 * DAY_MS),
            source
        },
        obraSocial: affiliate.obraSocial
    });

    const stockAssignment = await AffiliateAssignment.create({
        affiliateId: affiliate._id,
        operationalStateId: operationalState._id,
        supervisorId,
        assignedBy: supervisorId,
        source,
        sourceJobId: oid(),
        assignedAt: now,
        expiresAt: expiresAt || new Date(now.getTime() + 10 * DAY_MS)
    });

    return { affiliate, operationalState, stockAssignment };
}

describe("assignmentService verified stock bridge", () => {
    test("distributes verified supervisor stock into advisor-visible lead assignments", async () => {
        await LeadAssignment.init();
        const supervisorId = oid();
        const asesorId = oid();
        const { affiliate, operationalState, stockAssignment } = await createVerifiedStock({ supervisorId });

        const result = await assignmentService.distributeLeads({
            distribution: [{ asesorId, quantity: 1, mix: { freshPercentage: 100, reusablePercentage: 0 } }]
        }, supervisorId);

        expect(result).toMatchObject({
            totalAssigned: 1,
            requestedTotal: 1,
            partial: false
        });

        const lead = await LeadAssignment.findOne({ affiliate: affiliate._id, assignedTo: asesorId }).lean();
        expect(lead).toMatchObject({
            assignedBy: supervisorId,
            supervisor: supervisorId,
            sourceStockAssignment: stockAssignment._id,
            operationalState: operationalState._id,
            status: "Pendiente",
            sourceType: "fresh",
            active: true
        });

        const releasedStock = await AffiliateAssignment.findById(stockAssignment._id).lean();
        expect(releasedStock.status).toBe("released");
        expect(releasedStock.releaseReason).toBe("assigned_to_advisor");

        const updatedState = await AffiliateOperationalState.findById(operationalState._id).lean();
        expect(updatedState.usageStatus).toBe("assigned");
        expect(updatedState.availableForSale).toBe(false);
        expect(updatedState.unavailableReason).toBe("assigned_to_advisor");

        const visibleLeads = await assignmentService.getDailyAssignments(asesorId);
        expect(visibleLeads).toHaveLength(1);
        expect(String(visibleLeads[0].affiliate._id)).toBe(String(affiliate._id));
    });

    test("does not create a duplicate lead when the stock affiliate is already active for an advisor", async () => {
        await LeadAssignment.init();
        const supervisorId = oid();
        const asesorId = oid();
        const { affiliate, stockAssignment } = await createVerifiedStock({ supervisorId });

        await LeadAssignment.create({
            affiliate: affiliate._id,
            assignedTo: asesorId,
            assignedBy: supervisorId,
            supervisor: supervisorId,
            sourceStockAssignment: stockAssignment._id,
            status: "Pendiente",
            sourceType: "fresh",
            active: true
        });

        const result = await assignmentService.distributeLeads({
            distribution: [{ asesorId, quantity: 1, mix: { freshPercentage: 100, reusablePercentage: 0 } }]
        }, supervisorId);

        expect(result.totalAssigned).toBe(0);
        expect(result.requestedTotal).toBe(1);
        expect(result.partial).toBe(true);

        await expect(LeadAssignment.countDocuments({ affiliate: affiliate._id, active: true })).resolves.toBe(1);
        await expect(AffiliateAssignment.findById(stockAssignment._id).lean()).resolves.toMatchObject({ status: "active" });
    });

    test("skips stock that is no longer sellable", async () => {
        await LeadAssignment.init();
        const supervisorId = oid();
        const asesorId = oid();
        const { stockAssignment } = await createVerifiedStock({ supervisorId, canSell: false });

        const result = await assignmentService.distributeLeads({
            distribution: [{ asesorId, quantity: 1, mix: { freshPercentage: 100, reusablePercentage: 0 } }]
        }, supervisorId);

        expect(result.totalAssigned).toBe(0);
        expect(result.partial).toBe(true);
        await expect(AffiliateAssignment.findById(stockAssignment._id).lean()).resolves.toMatchObject({ status: "active" });
    });
});
