"use strict";

jest.setTimeout(30000);

jest.mock("../src/services/contributionScraper.service", () => ({
    BrowserSession: {
        create: jest.fn(async () => ({ close: jest.fn(async () => {}) }))
    },
    scrapeCuilWithSession: jest.fn()
}));

jest.mock("../src/utils/canSellUtils", () => ({
    computeAndUpdateCanSell: jest.fn(async affiliateId => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        await AffiliateContribution.updateOne({ affiliateId }, { $set: { canSell: false } });
        return { success: true, canSell: false };
    })
}));

jest.mock("../src/services/dateasBot.service", () => ({
    enrichAgeBatch: jest.fn()
}));

jest.mock("../src/services/padronSync.service", () => ({
    evaluateNeedsPadronCheck: jest.fn(),
    syncPadronBatch: jest.fn()
}));

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const { claimAffiliateCheckStage } = require("../src/services/affiliateCheckStage.service");
const {
    processNextAffiliateCheckArcaStage
} = require("../src/services/affiliateCheckArcaStage.service");
const { scrapeCuilWithSession } = require("../src/services/contributionScraper.service");

const NOW = new Date("2026-06-10T12:00:00.000Z");
const SESSION = { close: jest.fn(async () => {}) };

function successResult(overrides = {}) {
    return {
        ok: true,
        status: "success",
        lastContributionPeriod: "04/2026",
        last3ClosedMonthsPaidCount: 2,
        trabaja: true,
        inicioLaboral: "01/2025",
        checkedAt: NOW,
        errorMessage: null,
        ...overrides
    };
}

async function createCandidate() {
    const affiliate = await Affiliate.create({
        nombre: "ARCA Stage Test",
        cuil: String(Math.floor(20000000000 + Math.random() * 7000000000)),
        obraSocial: "OS Test",
        localidad: "CABA",
        telefono1: "1122334455",
        uploadedBy: new mongoose.Types.ObjectId(),
        sourceFile: "arca-stage-test.xlsx",
        batchId: "arca-stage-test",
        active: true
    });
    const job = await AffiliateCheckJob.create({
        requestedBy: new mongoose.Types.ObjectId(),
        requestedByRole: "gerencia",
        mode: "check_new",
        status: "pending",
        requestedCount: 1,
        selectedCount: 1
    });
    const row = await AffiliateCheckRow.create({
        jobId: job._id,
        affiliateId: affiliate._id,
        cuilNormalized: affiliate.cuil,
        mode: "check_new",
        status: "queued"
    });
    return { affiliate, job, row };
}

async function processNext(workerId = "arca-stage-1") {
    return processNextAffiliateCheckArcaStage({
        workerId,
        leaseMs: 60000,
        session: SESSION,
        now: NOW
    });
}

describe("affiliateCheckArcaStage.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        scrapeCuilWithSession.mockResolvedValue(successResult());
    });

    test("claims a pending ARCA stage and does not steal a valid lease", async () => {
        const { row } = await createCandidate();
        const claimed = await claimAffiliateCheckStage({
            stage: "arca",
            workerId: "owner-worker",
            leaseMs: 60000,
            now: NOW
        });
        const stolen = await processNext("other-worker");

        expect(claimed._id.toString()).toBe(row._id.toString());
        expect(claimed.stages.arca.status).toBe("processing");
        expect(stolen).toBeNull();
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("successful ARCA processing persists stage and compatible row metadata", async () => {
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.success).toBe(true);
        expect(stored.stages.arca.status).toBe("done");
        expect(stored.stages.arca.result.status).toBe("success");
        expect(stored.stages.arca.result.ultimoAporte).toBe("04/2026");
        expect(stored.stages.arca.result.inicioLaboral).toBe("01/2025");
        expect(stored.stages.arca.result.trabaja).toBe(true);
        expect(stored.resultState.arca.ultimoAporte).toBe("04/2026");
        expect(stored.resultState.arca.inicioLaboral).toBe("01/2025");
        expect(stored.resultState.arca.trabaja).toBe(true);
        expect(scrapeCuilWithSession).toHaveBeenCalledTimes(1);
    });

    test("successful ARCA processing updates canonical AffiliateContribution", async () => {
        const { affiliate, job } = await createCandidate();
        await processNext();
        const contribution = await AffiliateContribution.findOne({ affiliateId: affiliate._id }).lean();

        expect(contribution.lastContributionPeriod).toBe("04/2026");
        expect(contribution.last3ClosedMonthsPaidCount).toBe(2);
        expect(contribution.verification.status).toBe("success");
        expect(contribution.verification.executionType).toBe("affiliate_check");
        expect(contribution.verification.executionId).toBe(`affiliate_check:${job._id}`);
        expect(contribution.verification.source).toBe("arca_mis_aportes");
        expect(contribution.canSell).toBe(false);
    });

    test("positive contributions and trabaja true enable the Padrón stage", async () => {
        const { row } = await createCandidate();
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.stages.arca.result.trimPagos).toBe(2);
        expect(stored.stages.arca.result.last3ClosedMonthsPaidCount).toBe(2);
        expect(stored.stages.arca.result.needsPadron).toBe(true);
        expect(stored.resultState.arca.needsPadron).toBe(true);
        expect(stored.stages.padron.status).toBe("pending");
    });

    test.each([
        ["zero paid months", { last3ClosedMonthsPaidCount: 0, trabaja: true }],
        ["not working", { last3ClosedMonthsPaidCount: 2, trabaja: false }],
        ["unknown work status", { last3ClosedMonthsPaidCount: 2, trabaja: null }]
    ])("%s skips the Padrón stage", async (_label, overrides) => {
        scrapeCuilWithSession.mockResolvedValue(successResult(overrides));
        const { row } = await createCandidate();
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.stages.arca.result.needsPadron).toBe(false);
        expect(stored.resultState.arca.needsPadron).toBe(false);
        expect(stored.stages.padron.status).toBe("skipped");
    });

    test("retryable ARCA exception returns the stage to pending", async () => {
        scrapeCuilWithSession.mockRejectedValue(new Error("temporary ARCA session failure"));
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.retryable).toBe(true);
        expect(stored.stages.arca.status).toBe("pending");
        expect(stored.stages.arca.result.verificationStatus).toBe("error");
        expect(stored.stages.padron.status).toBe("blocked");
    });

    test("permanent ARCA exception marks the stage failed and skips Padrón", async () => {
        const error = new Error("invalid permanent response");
        error.retryable = false;
        scrapeCuilWithSession.mockRejectedValue(error);
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.retryable).toBe(false);
        expect(stored.stages.arca.status).toBe("failed");
        expect(stored.stages.arca.result.errorMessage).toBe("invalid permanent response");
        expect(stored.resultState.arca.needsPadron).toBe(false);
        expect(stored.stages.padron.status).toBe("skipped");
    });

    test("no_data is persisted as a permanent ARCA stage failure", async () => {
        scrapeCuilWithSession.mockResolvedValue({
            ok: true,
            status: "no_data",
            checkedAt: NOW,
            errorMessage: "Sin datos"
        });
        const { affiliate, row } = await createCandidate();
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();
        const contribution = await AffiliateContribution.findOne({ affiliateId: affiliate._id }).lean();

        expect(stored.stages.arca.status).toBe("failed");
        expect(stored.stages.arca.result.needsPadron).toBe(false);
        expect(stored.stages.padron.status).toBe("skipped");
        expect(contribution.verification.status).toBe("no_data");
    });
});
