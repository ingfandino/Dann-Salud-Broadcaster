"use strict";

jest.setTimeout(30000);

jest.mock("../src/services/sssaludScraper.service", () => ({
    SSSaludSession: {
        create: jest.fn(async () => ({ close: jest.fn(async () => {}) }))
    },
    scrapeCuilWithSession: jest.fn()
}));

jest.mock("../src/utils/canSellUtils", () => ({
    computeAndUpdateCanSell: jest.fn(async affiliateId => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        const contribution = await AffiliateContribution.findOne({ affiliateId }).lean();
        const compatible = ["not_found", "found_expired"].includes(contribution?.padron?.status);
        await AffiliateContribution.updateOne({ affiliateId }, { $set: { canSell: compatible } });
        return { success: true, canSell: compatible };
    })
}));

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const { claimAffiliateCheckStage } = require("../src/services/affiliateCheckStage.service");
const {
    processNextAffiliateCheckPadronStage
} = require("../src/services/affiliateCheckPadronStage.service");
const { scrapeCuilWithSession } = require("../src/services/sssaludScraper.service");

const NOW = new Date("2026-06-10T12:00:00.000Z");
const SESSION = { page: {}, close: jest.fn(async () => {}) };

function foundExpiredResult(overrides = {}) {
    return {
        ok: true,
        status: "found_expired",
        found: true,
        canSell: true,
        data: {
            obraSocial: "OS Padrón",
            periodoDesde: "01/2024",
            canSell: true,
            nextChangeDate: "01/2025",
            monthsElapsed: 29,
            estado: "VIGENTE"
        },
        checkedAt: NOW,
        errorMessage: null,
        ...overrides
    };
}

async function createCandidate({ padronStatus = "pending", cuil = null, dateasStatus = "done" } = {}) {
    const affiliateCuil = cuil || String(Math.floor(20000000000 + Math.random() * 7000000000));
    const affiliate = await Affiliate.create({
        nombre: "Padrón Stage Test",
        cuil: affiliateCuil,
        obraSocial: "OS Importada",
        localidad: "CABA",
        telefono1: "1122334455",
        uploadedBy: new mongoose.Types.ObjectId(),
        sourceFile: "padron-stage-test.xlsx",
        batchId: "padron-stage-test",
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
        cuilNormalized: affiliateCuil,
        mode: "check_new",
        status: "queued",
        stages: {
            arca: {
                status: "done",
                result: { status: "success", trabaja: true, trimPagos: 2, needsPadron: true }
            },
            dateas: { status: dateasStatus },
            padron: { status: padronStatus },
            finalization: { status: "pending" }
        }
    });
    const contribution = await AffiliateContribution.create({
        affiliateId: affiliate._id,
        cuil: affiliateCuil,
        lastContributionPeriod: "04/2026",
        last3ClosedMonthsPaidCount: 2,
        verification: {
            status: "success",
            checkedAt: NOW,
            checkedBy: "test",
            executionType: "manual",
            executionId: `affiliate_check:${job._id}`,
            source: "arca_mis_aportes"
        },
        canSell: false
    });
    return { affiliate, contribution, job, row };
}

async function processNext(workerId = "padron-stage-1") {
    return processNextAffiliateCheckPadronStage({
        workerId,
        leaseMs: 60000,
        session: SESSION,
        now: NOW
    });
}

describe("affiliateCheckPadronStage.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        scrapeCuilWithSession.mockResolvedValue(foundExpiredResult());
    });

    test("claims a pending Padrón stage and does not steal a valid lease", async () => {
        const { row } = await createCandidate();
        const claimed = await claimAffiliateCheckStage({
            stage: "padron",
            workerId: "owner-worker",
            leaseMs: 60000,
            now: NOW
        });
        const stolen = await processNext("other-worker");

        expect(claimed._id.toString()).toBe(row._id.toString());
        expect(claimed.stages.padron.status).toBe("processing");
        expect(stolen).toBeNull();
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test.each(["blocked", "skipped"])("does not claim a %s Padrón stage", async status => {
        await createCandidate({ padronStatus: status });
        const processed = await processNext();

        expect(processed).toBeNull();
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("successful Padrón processing persists stage metadata and completes", async () => {
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.success).toBe(true);
        expect(stored.stages.padron.status).toBe("done");
        expect(stored.stages.padron.result).toMatchObject({
            status: "found_expired",
            obraSocial: "OS Padrón",
            periodoDesde: "01/2024",
            nextChangeDate: "01/2025",
            monthsElapsed: 29,
            estado: "VIGENTE",
            canSell: true
        });
        expect(stored.resultState.padron).toMatchObject(stored.stages.padron.result);
        expect(scrapeCuilWithSession).toHaveBeenCalledWith(expect.any(String), SESSION);
    });

    test("updates canonical AffiliateContribution.padron and canSell", async () => {
        const { affiliate } = await createCandidate();
        await processNext();
        const stored = await AffiliateContribution.findOne({ affiliateId: affiliate._id }).lean();

        expect(stored.padron).toMatchObject({
            status: "found_expired",
            canSell: true,
            periodoDesde: "01/2024",
            nextChangeDate: "01/2025",
            monthsElapsed: 29,
            obraSocial: "OS Padrón",
            estado: "VIGENTE"
        });
        expect(stored.canSell).toBe(true);
    });

    test("found_active completes the stage but canonical canSell remains false", async () => {
        scrapeCuilWithSession.mockResolvedValue(foundExpiredResult({
            status: "found_active",
            canSell: false,
            data: {
                obraSocial: "OS Activa",
                periodoDesde: "01/2026",
                canSell: false,
                nextChangeDate: "01/2027",
                monthsElapsed: 5,
                estado: "VIGENTE"
            }
        }));
        const { affiliate, row } = await createCandidate();
        await processNext();
        const [storedRow, contribution] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateContribution.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(storedRow.stages.padron.status).toBe("done");
        expect(storedRow.stages.padron.result.status).toBe("found_active");
        expect(contribution.padron.status).toBe("found_active");
        expect(contribution.canSell).toBe(false);
    });

    test("retryable CAPTCHA failure persists canonical error details and returns stage to pending", async () => {
        scrapeCuilWithSession.mockResolvedValue({
            ok: false,
            status: "captcha_failed",
            found: false,
            data: null,
            checkedAt: NOW,
            errorMessage: "CAPTCHA no resuelto"
        });
        const { affiliate, row } = await createCandidate();
        const processed = await processNext();
        const [storedRow, contribution] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateContribution.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(processed.retryable).toBe(true);
        expect(storedRow.stages.padron.status).toBe("pending");
        expect(storedRow.stages.padron.result.status).toBe("captcha_failed");
        expect(contribution.padron.status).toBe("captcha_failed");
        expect(contribution.canSell).toBe(false);
    });

    test("permanent Padrón exception marks only the stage failed", async () => {
        const error = new Error("non-recoverable Padrón parser error");
        error.retryable = false;
        scrapeCuilWithSession.mockRejectedValue(error);
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.retryable).toBe(false);
        expect(stored.stages.padron.status).toBe("failed");
        expect(stored.resultState.padron.errorMessage).toBe(error.message);
        expect(stored.status).toBe("queued");
    });

    test("invalid CUIL fails permanently without calling Padrón", async () => {
        const { affiliate, contribution, row } = await createCandidate();
        await Promise.all([
            Affiliate.updateOne({ _id: affiliate._id }, { $set: { cuil: "invalid" } }),
            AffiliateContribution.updateOne({ _id: contribution._id }, { $set: { cuil: "invalid" } }),
            AffiliateCheckRow.updateOne({ _id: row._id }, { $set: { cuilNormalized: "invalid" } })
        ]);
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.retryable).toBe(false);
        expect(stored.stages.padron.status).toBe("failed");
        expect(stored.stages.padron.errorMessage).toBe("CUIL inválido o ausente para Padrón");
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("DATEAS failure does not block Padrón and ARCA/DATEAS states are preserved", async () => {
        const { row } = await createCandidate({ dateasStatus: "failed" });
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.stages.padron.status).toBe("done");
        expect(stored.stages.arca.status).toBe("done");
        expect(stored.stages.arca.result.needsPadron).toBe(true);
        expect(stored.stages.dateas.status).toBe("failed");
    });

    test("Padrón stage does not assign stock or finalize the row", async () => {
        const { affiliate, row } = await createCandidate();
        await processNext();
        const [stored, assignments] = await Promise.all([
            AffiliateCheckRow.findById(row._id).lean(),
            AffiliateAssignment.countDocuments({ affiliateId: affiliate._id })
        ]);

        expect(assignments).toBe(0);
        expect(stored.status).toBe("queued");
        expect(stored.assignedToSupervisor).toBeNull();
        expect(stored.stages.finalization.status).toBe("pending");
    });
});
