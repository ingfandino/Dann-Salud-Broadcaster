"use strict";

jest.setTimeout(30000);

jest.mock("../src/services/contributionScraper.service", () => ({
    BrowserSession: {
        create: jest.fn(async () => ({ close: jest.fn(async () => {}) })),
        createViaPublicPortal: jest.fn(async () => ({ close: jest.fn(async () => {}) }))
    },
    scrapeCuilWithSession: jest.fn(),
    ArcaSessionExpiredError: class ArcaSessionExpiredError extends Error {},
}));

jest.mock("../src/services/dateasBot.service", () => ({
    enrichAgeBatch: jest.fn(async () => ({ enriched: 0, skipped: 0, errors: 0 }))
}));

jest.mock("../src/services/padronSync.service", () => ({
    evaluateNeedsPadronCheck: jest.fn(last3 => last3 != null && last3 > 0),
    syncPadronBatch: jest.fn(async affiliates => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        for (const affiliate of affiliates) {
            await AffiliateContribution.findOneAndUpdate(
                { affiliateId: String(affiliate._id) },
                { $set: { padron: { status: "not_found", checkedAt: new Date(), canSell: true }, canSell: true } },
                { new: true }
            );
        }
        return { processed: affiliates.length, not_found: affiliates.length, found_expired: 0, found_active: 0, captcha_failed: 0, error: 0 };
    })
}));

jest.mock("../src/utils/canSellUtils", () => ({
    evaluateCanSellStrict: jest.fn(async () => ({ canSell: true, failedReasons: [] })),
    computeAndUpdateCanSell: jest.fn(async affiliateId => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        const updated = await AffiliateContribution.findOneAndUpdate(
            { affiliateId: String(affiliateId) },
            { $set: { canSell: true } },
            { new: true }
        );
        return { success: true, canSell: updated?.canSell ?? true, evaluation: { canSell: true, failedReasons: [] }, error: null };
    }),
    isValidPhone: jest.fn(() => true),
    normalizeCuil: jest.fn(cuil => String(cuil || "").replace(/\D/g, "")),
    buildCuilLooseRegex: jest.fn(cuil => new RegExp(String(cuil || ""))),
    hasQrHechoForCuil: jest.fn(async () => false)
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
const { createAffiliateCheckJob } = require("../src/services/affiliateCheck.service");
const { processAffiliateCheckJob } = require("../src/services/affiliateCheckProcessor.service");
const { scrapeCuilWithSession } = require("../src/services/contributionScraper.service");
const { enrichAgeBatch } = require("../src/services/dateasBot.service");
const { syncPadronBatch } = require("../src/services/padronSync.service");
const { evaluateCanSellStrict } = require("../src/utils/canSellUtils");

function userStub(role = "supervisor") {
    return { _id: new mongoose.Types.ObjectId(), role };
}

async function createAffiliate(overrides = {}) {
    return Affiliate.create({
        nombre: overrides.nombre || "Afiliado Test",
        cuil: overrides.cuil || String(Math.floor(20000000000 + Math.random() * 7000000000)),
        obraSocial: overrides.obraSocial || "OS Test",
        localidad: overrides.localidad || "CABA",
        telefono1: overrides.telefono1 || "1122334455",
        uploadedBy: overrides.uploadedBy || new mongoose.Types.ObjectId(),
        sourceFile: overrides.sourceFile || "test.xlsx",
        batchId: overrides.batchId || "batch-test",
        active: overrides.active !== undefined ? overrides.active : true
    });
}

async function createOperationalState(affiliate, overrides = {}) {
    return AffiliateOperationalState.create({
        affiliateId: affiliate._id,
        cuil: affiliate.cuil,
        cuilNormalized: affiliate.cuil,
        freshness: "fresh",
        verificationStatus: "unchecked",
        usageStatus: "never_used",
        saleStatus: "none",
        availableForSale: false,
        ...overrides
    });
}

async function createAffiliatesWithOperationalStates(count, overrides = {}) {
    const affiliates = [];
    for (let index = 0; index < count; index += 1) {
        const affiliate = await createAffiliate({
            cuil: String(20000000000 + index + Math.floor(Math.random() * 100000000)),
            ...overrides.affiliate
        });
        await createOperationalState(affiliate, overrides.state);
        affiliates.push(affiliate);
    }
    return affiliates;
}

async function enableCheckModes() {
    await AffiliateCheckConfig.create({
        dailyQuota: { checkNew: 10, checkReusable: 10, extractBase: 10 },
        features: { checkNewEnabled: true, checkReusableEnabled: true, extractBaseEnabled: true }
    });
}

function arcaSuccess(last3 = 1) {
    return {
        ok: true,
        status: "success",
        lastContributionPeriod: "04/2026",
        last3ClosedMonthsPaidCount: last3,
        trabaja: true,
        inicioLaboral: "01/2025",
        checkedAt: new Date(),
        errorMessage: null
    };
}

function rowStateSnapshot(row) {
    return {
        status: row.status,
        canSell: row.canSell,
        rejectionReason: row.rejectionReason || null,
        errorMessage: row.errorMessage || null,
        resultState: row.resultState || null
    };
}

function operationalStateSnapshot(state) {
    return {
        verificationStatus: state.verificationStatus,
        usageStatus: state.usageStatus,
        availableForSale: state.availableForSale,
        unavailableReason: state.unavailableReason || null,
        canSell: state.canSell ?? null
    };
}

async function createJobWithSingleRowStatus({ jobStatus, rowStatus = "queued" }) {
    const affiliate = await createAffiliate();
    const state = await createOperationalState(affiliate);
    const job = await AffiliateCheckJob.create({
        requestedBy: new mongoose.Types.ObjectId(),
        requestedByRole: "gerencia",
        mode: "check_new",
        status: jobStatus,
        requestedCount: 1,
        selectedCount: 1,
        processedCount: ["eligible", "assigned", "rejected", "failed", "cancelled"].includes(rowStatus) ? 1 : 0
    });
    const row = await AffiliateCheckRow.create({
        jobId: job._id,
        affiliateId: affiliate._id,
        operationalStateId: state._id,
        cuilNormalized: affiliate.cuil,
        mode: "check_new",
        status: rowStatus,
        previousState: { verificationStatus: "unchecked", usageStatus: "never_used", availableForSale: false }
    });
    return { affiliate, state, job, row };
}

describe("affiliateCheckProcessor.service", () => {
    beforeEach(async () => {
        jest.clearAllMocks();
        scrapeCuilWithSession.mockResolvedValue(arcaSuccess(1));
        evaluateCanSellStrict.mockResolvedValue({ canSell: true, failedReasons: [] });
    });

    test("check_new remains disabled by default", async () => {
        await AffiliateCheckConfig.create({ dailyQuota: { checkNew: 2, checkReusable: 2, extractBase: 2 } });
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);

        await expect(createAffiliateCheckJob({
            user: userStub("supervisor"),
            mode: "check_new",
            requestedCount: 1
        })).rejects.toMatchObject({ code: "CHECK_NEW_DISABLED" });
    });

    test("enabled check_new creates pending job and rows", async () => {
        await enableCheckModes();
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);

        const job = await createAffiliateCheckJob({
            user: userStub("supervisor"),
            mode: "check_new",
            requestedCount: 1
        });

        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        const state = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();
        expect(job.status).toBe("pending");
        expect(row.status).toBe("queued");
        expect(state.verificationStatus).toBe("checking");
        expect(state.unavailableReason).toBe("checking_in_progress");
    });

    test("processing check_new assigns eligible supervisor rows", async () => {
        await enableCheckModes();
        const user = userStub("supervisor");
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);
        const job = await createAffiliateCheckJob({ user, mode: "check_new", requestedCount: 1 });

        const processed = await processAffiliateCheckJob(job._id);
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        const assignment = await AffiliateAssignment.findOne({ sourceJobId: job._id }).lean();
        const state = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(processed.status).toBe("completed");
        expect(processed.processedCount).toBe(1);
        expect(processed.assignedCount).toBe(1);
        expect(row.status).toBe("assigned");
        expect(assignment.supervisorId.toString()).toBe(user._id.toString());
        expect(state.usageStatus).toBe("assigned");
        expect(state.availableForSale).toBe(false);
        expect(enrichAgeBatch).toHaveBeenCalled();
        expect(syncPadronBatch).toHaveBeenCalled();
    });

    test("non-sellable rows are rejected and not assigned", async () => {
        await enableCheckModes();
        scrapeCuilWithSession.mockResolvedValue(arcaSuccess(0));
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);
        const job = await createAffiliateCheckJob({ user: userStub("supervisor"), mode: "check_new", requestedCount: 1 });

        const processed = await processAffiliateCheckJob(job._id);
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();

        expect(processed.status).toBe("completed");
        expect(processed.rejectedCount).toBe(1);
        expect(row.status).toBe("rejected");
        expect(row.rejectionReason).toBe("Trimestre sin pagos");
        expect(await AffiliateAssignment.countDocuments()).toBe(0);
    });

    test("manager-created valid rows become general available stock without supervisor target", async () => {
        await enableCheckModes();
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);
        const job = await createAffiliateCheckJob({ user: userStub("gerencia"), mode: "check_new", requestedCount: 1 });

        await processAffiliateCheckJob(job._id);
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        const state = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(row.status).toBe("eligible");
        expect(await AffiliateAssignment.countDocuments()).toBe(0);
        expect(state.usageStatus).toBe("available");
        expect(state.availableForSale).toBe(true);
        expect(state.ownership.supervisorId).toBeNull();
    });

    test("check_reusable selects expired retryable candidates", async () => {
        await enableCheckModes();
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate, {
            freshness: "reusable",
            verificationStatus: "expired",
            usageStatus: "available",
            saleStatus: "none"
        });

        const job = await createAffiliateCheckJob({ user: userStub("gerencia"), mode: "check_reusable", requestedCount: 1 });
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();

        expect(job.selectedCount).toBe(1);
        expect(row.affiliateId.toString()).toBe(affiliate._id.toString());
    });

    test("processing failure marks row failed and releases checking state", async () => {
        await enableCheckModes();
        scrapeCuilWithSession.mockRejectedValue(new Error("ARCA down"));
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);
        const job = await createAffiliateCheckJob({ user: userStub("supervisor"), mode: "check_new", requestedCount: 1 });

        const processed = await processAffiliateCheckJob(job._id);
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        const state = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(processed.status).toBe("completed_with_errors");
        expect(row.status).toBe("failed");
        expect(state.verificationStatus).not.toBe("checking");
        expect(state.unavailableReason).toBe("check_failed");
    });

    test("operational state rebuild happens after contribution update", async () => {
        await enableCheckModes();
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);
        const job = await createAffiliateCheckJob({ user: userStub("gerencia"), mode: "check_new", requestedCount: 1 });

        await processAffiliateCheckJob(job._id);
        const contribution = await AffiliateContribution.findOne({ affiliateId: affiliate._id }).lean();
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        const state = await AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean();

        expect(contribution.verification.status).toBe("success");
        expect(contribution.lastContributionPeriod).toBe("04/2026");
        expect(row.resultState.arca.ultimoAporte).toBe("04/2026");
        expect(row.resultState.arca.inicioLaboral).toBe("01/2025");
        expect(row.resultState.arca.trabaja).toBe(true);
        expect(state.contributionId.toString()).toBe(contribution._id.toString());
        expect(state.verificationStatus).toBe("checked");
    });

    test("job counters are scoped to current rows for eligible and rejected rows", async () => {
        await enableCheckModes();
        await createAffiliatesWithOperationalStates(2);
        scrapeCuilWithSession
            .mockResolvedValueOnce(arcaSuccess(1))
            .mockResolvedValueOnce(arcaSuccess(0));

        const job = await createAffiliateCheckJob({ user: userStub("gerencia"), mode: "check_new", requestedCount: 2 });

        const processed = await processAffiliateCheckJob(job._id);
        const rows = await AffiliateCheckRow.find({ jobId: job._id }).sort({ status: 1 }).lean();

        expect(rows.map(row => row.status).sort()).toEqual(["eligible", "rejected"]);
        expect(processed.requestedCount).toBe(2);
        expect(processed.selectedCount).toBe(2);
        expect(processed.processedCount).toBe(2);
        expect(processed.eligibleCount).toBe(1);
        expect(processed.assignedCount).toBe(0);
        expect(processed.rejectedCount).toBe(1);
        expect(processed.failedCount).toBe(0);
        expect(processed.status).toBe("completed");
    });

    test("job counters are scoped to current rows for assigned and failed rows", async () => {
        await enableCheckModes();
        const user = userStub("supervisor");
        await createAffiliatesWithOperationalStates(2);
        scrapeCuilWithSession
            .mockResolvedValueOnce(arcaSuccess(1))
            .mockRejectedValueOnce(new Error("ARCA down"));

        const job = await createAffiliateCheckJob({ user, mode: "check_new", requestedCount: 2 });

        const processed = await processAffiliateCheckJob(job._id);
        const rows = await AffiliateCheckRow.find({ jobId: job._id }).sort({ status: 1 }).lean();

        expect(rows.map(row => row.status).sort()).toEqual(["assigned", "failed"]);
        expect(processed.requestedCount).toBe(2);
        expect(processed.selectedCount).toBe(2);
        expect(processed.processedCount).toBe(2);
        expect(processed.eligibleCount).toBe(0);
        expect(processed.assignedCount).toBe(1);
        expect(processed.rejectedCount).toBe(0);
        expect(processed.failedCount).toBe(1);
        expect(processed.status).toBe("completed_with_errors");
    });

    test("processing a completed job returns JOB_ALREADY_FINALIZED without mutations", async () => {
        const { job, row, state } = await createJobWithSingleRowStatus({ jobStatus: "completed", rowStatus: "eligible" });
        const beforeRow = rowStateSnapshot(row.toObject());
        const beforeState = operationalStateSnapshot(state.toObject());

        await expect(processAffiliateCheckJob(job._id)).rejects.toMatchObject({
            code: "JOB_ALREADY_FINALIZED",
            statusCode: 409,
            jobStatus: "completed"
        });

        const afterRow = await AffiliateCheckRow.findById(row._id).lean();
        const afterState = await AffiliateOperationalState.findById(state._id).lean();
        expect(rowStateSnapshot(afterRow)).toEqual(beforeRow);
        expect(operationalStateSnapshot(afterState)).toEqual(beforeState);
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("processing a cancelled job returns JOB_ALREADY_FINALIZED without mutations", async () => {
        const { job, row, state } = await createJobWithSingleRowStatus({ jobStatus: "cancelled", rowStatus: "cancelled" });
        const beforeRow = rowStateSnapshot(row.toObject());
        const beforeState = operationalStateSnapshot(state.toObject());

        await expect(processAffiliateCheckJob(job._id)).rejects.toMatchObject({
            code: "JOB_ALREADY_FINALIZED",
            statusCode: 409,
            jobStatus: "cancelled"
        });

        const afterRow = await AffiliateCheckRow.findById(row._id).lean();
        const afterState = await AffiliateOperationalState.findById(state._id).lean();
        expect(rowStateSnapshot(afterRow)).toEqual(beforeRow);
        expect(operationalStateSnapshot(afterState)).toEqual(beforeState);
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("processing an already processing job returns JOB_ALREADY_PROCESSING without mutations", async () => {
        const { job, row, state } = await createJobWithSingleRowStatus({ jobStatus: "processing", rowStatus: "queued" });
        const beforeRow = rowStateSnapshot(row.toObject());
        const beforeState = operationalStateSnapshot(state.toObject());

        await expect(processAffiliateCheckJob(job._id)).rejects.toMatchObject({
            code: "JOB_ALREADY_PROCESSING",
            statusCode: 409,
            jobStatus: "processing"
        });

        const afterRow = await AffiliateCheckRow.findById(row._id).lean();
        const afterState = await AffiliateOperationalState.findById(state._id).lean();
        expect(rowStateSnapshot(afterRow)).toEqual(beforeRow);
        expect(operationalStateSnapshot(afterState)).toEqual(beforeState);
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("normal pending job processing still works", async () => {
        await enableCheckModes();
        const affiliate = await createAffiliate();
        await createOperationalState(affiliate);
        const job = await createAffiliateCheckJob({ user: userStub("gerencia"), mode: "check_new", requestedCount: 1 });

        const processed = await processAffiliateCheckJob(job._id);
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();

        expect(processed.status).toBe("completed");
        expect(processed.processedCount).toBe(1);
        expect(row.status).toBe("eligible");
        expect(scrapeCuilWithSession).toHaveBeenCalledTimes(1);
    });
});
