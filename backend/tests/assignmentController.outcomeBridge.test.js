"use strict";

require("./setup");

const mongoose = require("mongoose");

jest.mock("../src/config/whatsapp", () => ({
    getWhatsappClient: jest.fn(() => ({ sendMessage: jest.fn() })),
    isReady: jest.fn(() => false)
}));

const assignmentController = require("../src/controllers/assignmentController");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const LeadAssignment = require("../src/models/LeadAssignment");
const User = require("../src/models/User");

const DAY_MS = 24 * 60 * 60 * 1000;

function oid() {
    return new mongoose.Types.ObjectId();
}

function response() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

function request({ user, assignmentId, body = {}, idempotencyKey } = {}) {
    return {
        user,
        params: { id: String(assignmentId) },
        body,
        get(name) {
            return String(name).toLowerCase() === "idempotency-key" ? idempotencyKey : undefined;
        }
    };
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
        nombre: "Afiliado QA",
        cuil: `20${suffix}1`.slice(0, 11),
        obraSocial: "OS QA",
        localidad: "CABA",
        telefono1: "1111222233",
        uploadedBy: oid(),
        sourceFile: "outcome-bridge.xlsx",
        batchId: `outcome-${suffix}`,
        active: true,
        dataSource: "fresh",
        ...overrides
    });
}

async function createAssignedLead({ saleStatus = "none" } = {}) {
    const supervisor = await createUser("supervisor", { numeroEquipo: "42" });
    const advisor = await createUser("asesor", { numeroEquipo: "42", supervisor: supervisor._id });
    const otherAdvisor = await createUser("asesor", { numeroEquipo: "99" });
    const manager = await createUser("gerencia");
    const affiliate = await createAffiliate();
    const now = new Date();

    const job = await AffiliateCheckJob.create({
        requestedBy: supervisor._id,
        requestedByRole: "supervisor",
        mode: "check_new",
        status: "completed",
        channelOwner: supervisor._id,
        channelType: "internal",
        ownership: { supervisorId: supervisor._id, expiresAt: new Date(now.getTime() + DAY_MS) }
    });

    const operationalState = await AffiliateOperationalState.create({
        affiliateId: affiliate._id,
        cuil: affiliate.cuil,
        cuilNormalized: affiliate.cuil,
        freshness: "fresh",
        dataSource: "fresh",
        verificationStatus: "checked",
        usageStatus: "assigned",
        saleStatus,
        canSell: saleStatus === "none",
        availableForSale: false,
        unavailableReason: saleStatus === "qr_done" ? "sold_qr_done" : "assigned_to_advisor",
        verificationExpiresAt: new Date(now.getTime() + 10 * DAY_MS),
        ownership: {
            supervisorId: supervisor._id,
            assignedAt: now,
            expiresAt: new Date(now.getTime() + 10 * DAY_MS),
            source: "check_job"
        },
        currentCheckJobId: null,
        obraSocial: affiliate.obraSocial
    });

    const stockAssignment = await AffiliateAssignment.create({
        affiliateId: affiliate._id,
        operationalStateId: operationalState._id,
        supervisorId: supervisor._id,
        assignedBy: supervisor._id,
        source: "check_job",
        sourceJobId: job._id,
        status: "released",
        assignedAt: now,
        expiresAt: new Date(now.getTime() + 10 * DAY_MS),
        releasedAt: now,
        releaseReason: "assigned_to_advisor"
    });

    const lead = await LeadAssignment.create({
        affiliate: affiliate._id,
        assignedTo: advisor._id,
        assignedBy: supervisor._id,
        supervisor: supervisor._id,
        sourceStockAssignment: stockAssignment._id,
        operationalState: operationalState._id,
        sourceCheckJob: job._id,
        status: "Pendiente",
        sourceType: "fresh",
        active: true
    });

    return { supervisor, advisor, otherAdvisor, manager, affiliate, job, operationalState, stockAssignment, lead };
}

describe("assignmentController LeadAssignment outcome bridge", () => {
    test("advisor can update own LeadAssignment and the result persists with provenance", async () => {
        const ctx = await createAssignedLead();
        const res = response();

        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "No contesta", note: "QA harmless outcome" },
                idempotencyKey: "qa-no-answer-1"
            }),
            res
        );

        expect(res.statusCode).toBe(200);
        expect(res.payload).toMatchObject({ success: true, idempotent: false });
        expect(res.payload.assignment.status).toBe("No contesta");
        expect(res.payload.assignment.sourceStockAssignment._id.toString()).toBe(ctx.stockAssignment._id.toString());
        expect(res.payload.assignment.operationalState._id.toString()).toBe(ctx.operationalState._id.toString());
        expect(res.payload.assignment.sourceCheckJob._id.toString()).toBe(ctx.job._id.toString());

        const stored = await LeadAssignment.findById(ctx.lead._id).lean();
        expect(stored.status).toBe("No contesta");
        expect(stored.lastOutcomeAt).toBeTruthy();
        expect(String(stored.lastOutcomeBy)).toBe(String(ctx.advisor._id));
        expect(stored.lastOutcomeNote).toBe("QA harmless outcome");
        expect(stored.interactions).toHaveLength(1);
        expect(stored.interactions[0]).toMatchObject({
            type: "Cambio Estado",
            statusFrom: "Pendiente",
            statusTo: "No contesta",
            idempotencyKey: "qa-no-answer-1"
        });

        expect(String(stored.supervisor)).toBe(String(ctx.supervisor._id));
        expect(String(stored.assignedTo)).toBe(String(ctx.advisor._id));
        expect(String(stored.sourceStockAssignment)).toBe(String(ctx.stockAssignment._id));
        expect(String(stored.operationalState)).toBe(String(ctx.operationalState._id));
        expect(String(stored.sourceCheckJob)).toBe(String(ctx.job._id));
    });

    test("another advisor cannot update the assignment", async () => {
        const ctx = await createAssignedLead();
        const res = response();

        await assignmentController.updateStatus(
            request({
                user: ctx.otherAdvisor,
                assignmentId: ctx.lead._id,
                body: { status: "No contesta" }
            }),
            res
        );

        expect(res.statusCode).toBe(404);
        expect(res.payload.success).toBe(false);
        await expect(LeadAssignment.findById(ctx.lead._id).lean()).resolves.toMatchObject({
            status: "Pendiente",
            interactions: []
        });
    });

    test("supervisor and management can inspect outcome without mutating it", async () => {
        const ctx = await createAssignedLead();
        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "No le interesa", note: "QA read visibility" }
            }),
            response()
        );

        const supervisorRes = response();
        await assignmentController.getAssignmentDetail(
            request({ user: ctx.supervisor, assignmentId: ctx.lead._id }),
            supervisorRes
        );

        expect(supervisorRes.statusCode).toBe(200);
        expect(supervisorRes.payload.assignment.status).toBe("No le interesa");
        expect(supervisorRes.payload.assignment.assignedTo._id.toString()).toBe(ctx.advisor._id.toString());
        expect(supervisorRes.payload.assignment.supervisor._id.toString()).toBe(ctx.supervisor._id.toString());
        expect(supervisorRes.payload.assignment.lastOutcomeBy._id.toString()).toBe(ctx.advisor._id.toString());

        const managementRes = response();
        await assignmentController.getAssignmentDetail(
            request({ user: ctx.manager, assignmentId: ctx.lead._id }),
            managementRes
        );

        expect(managementRes.statusCode).toBe(200);
        expect(managementRes.payload.assignment.sourceStockAssignment._id.toString()).toBe(ctx.stockAssignment._id.toString());
        expect(managementRes.payload.assignment.operationalState._id.toString()).toBe(ctx.operationalState._id.toString());
    });

    test("idempotent retry does not duplicate history", async () => {
        const ctx = await createAssignedLead();

        const first = response();
        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "No contesta", note: "Retry-safe" },
                idempotencyKey: "retry-key"
            }),
            first
        );

        const second = response();
        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "No contesta", note: "Retry-safe" },
                idempotencyKey: "retry-key"
            }),
            second
        );

        expect(first.statusCode).toBe(200);
        expect(second.statusCode).toBe(200);
        expect(second.payload.idempotent).toBe(true);

        const stored = await LeadAssignment.findById(ctx.lead._id).lean();
        expect(stored.status).toBe("No contesta");
        expect(stored.interactions).toHaveLength(1);

        const conflict = response();
        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "Spam" },
                idempotencyKey: "retry-key"
            }),
            conflict
        );
        expect(conflict.statusCode).toBe(409);
        expect(conflict.payload.success).toBe(false);
    });

    test("failed update does not report success or mutate state", async () => {
        const ctx = await createAssignedLead();
        const res = response();

        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "Estado inexistente" }
            }),
            res
        );

        expect(res.statusCode).toBe(400);
        expect(res.payload.success).toBe(false);
        await expect(LeadAssignment.findById(ctx.lead._id).lean()).resolves.toMatchObject({
            status: "Pendiente",
            interactions: []
        });
    });

    test("harmless outcome does not return affiliate to stock or create duplicate active advisor assignment", async () => {
        const ctx = await createAssignedLead();
        const res = response();

        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "No contesta" }
            }),
            res
        );

        expect(res.statusCode).toBe(200);
        await expect(LeadAssignment.countDocuments({ affiliate: ctx.affiliate._id, active: true })).resolves.toBe(1);
        await expect(AffiliateAssignment.countDocuments({ affiliateId: ctx.affiliate._id, status: "active" })).resolves.toBe(0);
        await expect(AffiliateAssignment.findById(ctx.stockAssignment._id).lean()).resolves.toMatchObject({
            status: "released",
            releaseReason: "assigned_to_advisor"
        });
        await expect(AffiliateOperationalState.findById(ctx.operationalState._id).lean()).resolves.toMatchObject({
            usageStatus: "assigned",
            availableForSale: false,
            unavailableReason: "assigned_to_advisor"
        });
    });

    test("QR/sale exclusion state remains intact after LeadAssignment outcome changes", async () => {
        const ctx = await createAssignedLead({ saleStatus: "qr_done" });
        const res = response();

        await assignmentController.updateStatus(
            request({
                user: ctx.advisor,
                assignmentId: ctx.lead._id,
                body: { status: "No contesta" }
            }),
            res
        );

        expect(res.statusCode).toBe(200);
        await expect(AffiliateOperationalState.findById(ctx.operationalState._id).lean()).resolves.toMatchObject({
            saleStatus: "qr_done",
            availableForSale: false,
            unavailableReason: "sold_qr_done"
        });
        await expect(AffiliateAssignment.countDocuments({ affiliateId: ctx.affiliate._id, status: "active" })).resolves.toBe(0);
    });
});
