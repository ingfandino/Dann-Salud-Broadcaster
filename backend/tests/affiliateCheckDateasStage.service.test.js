"use strict";

jest.setTimeout(30000);

jest.mock("../src/services/dateasBot.service", () => ({
    scrapeDataeas: jest.fn()
}));

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const { claimAffiliateCheckStage } = require("../src/services/affiliateCheckStage.service");
const {
    processNextAffiliateCheckDateasStage
} = require("../src/services/affiliateCheckDateasStage.service");
const { scrapeDataeas } = require("../src/services/dateasBot.service");

const NOW = new Date("2026-06-10T12:00:00.000Z");
const SESSION = { page: {}, close: jest.fn(async () => {}) };

function successResult(overrides = {}) {
    return {
        cuil: "20300000001",
        nombre: "Nombre DATEAS",
        edad: 37,
        provincia: "Buenos Aires",
        localidad: "La Plata",
        ...overrides
    };
}

async function createCandidate() {
    const affiliate = await Affiliate.create({
        nombre: "Nombre Importado",
        cuil: String(Math.floor(20000000000 + Math.random() * 7000000000)),
        obraSocial: "OS Test",
        localidad: "CABA",
        telefono1: "1122334455",
        telefono2: "1199999999",
        uploadedBy: new mongoose.Types.ObjectId(),
        sourceFile: "dateas-stage-test.xlsx",
        batchId: "dateas-stage-test",
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

async function processNext(workerId = "dateas-stage-1") {
    return processNextAffiliateCheckDateasStage({
        workerId,
        leaseMs: 60000,
        session: SESSION,
        now: NOW
    });
}

describe("affiliateCheckDateasStage.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        scrapeDataeas.mockResolvedValue(successResult());
    });

    test("claims a pending DATEAS stage and does not steal a valid lease", async () => {
        const { row } = await createCandidate();
        const claimed = await claimAffiliateCheckStage({
            stage: "dateas",
            workerId: "owner-worker",
            leaseMs: 60000,
            now: NOW
        });
        const stolen = await processNext("other-worker");

        expect(claimed._id.toString()).toBe(row._id.toString());
        expect(claimed.stages.dateas.status).toBe("processing");
        expect(stolen).toBeNull();
        expect(scrapeDataeas).not.toHaveBeenCalled();
    });

    test("successful DATEAS processing persists all row metadata and marks the stage done", async () => {
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.success).toBe(true);
        expect(stored.stages.dateas.status).toBe("done");
        expect(stored.stages.dateas.result).toMatchObject({
            status: "success",
            nombre: "Nombre DATEAS",
            edad: 37,
            provincia: "Buenos Aires",
            localidad: "La Plata",
            errorMessage: null
        });
        expect(stored.resultState.dateas).toMatchObject({
            nombre: "Nombre DATEAS",
            edad: 37,
            provincia: "Buenos Aires",
            localidad: "La Plata"
        });
        expect(scrapeDataeas).toHaveBeenCalledWith(SESSION.page, expect.any(String));
    });

    test("enriches age and locality without overwriting identity or phone fields", async () => {
        const { affiliate } = await createCandidate();
        await processNext();
        const stored = await Affiliate.findById(affiliate._id).lean();

        expect(stored.edad).toBe(37);
        expect(stored.localidad).toBe("La Plata");
        expect(stored.nombre).toBe("Nombre Importado");
        expect(stored.cuil).toBe(affiliate.cuil);
        expect(stored.telefono1).toBe("1122334455");
        expect(stored.telefono2).toBe("1199999999");
        expect(stored.provincia).toBeUndefined();
    });

    test("DATEAS runs independently from ARCA and does not change Padrón", async () => {
        const { row } = await createCandidate();
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.stages.arca.status).toBe("pending");
        expect(stored.stages.padron.status).toBe("blocked");
        expect(stored.status).toBe("queued");
    });

    test("retryable DATEAS failure returns only the DATEAS stage to pending", async () => {
        scrapeDataeas.mockRejectedValue(new Error("temporary DATEAS timeout"));
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.retryable).toBe(true);
        expect(stored.stages.dateas.status).toBe("pending");
        expect(stored.stages.dateas.result.errorMessage).toBe("temporary DATEAS timeout");
        expect(stored.status).toBe("queued");
        expect(stored.stages.padron.status).toBe("blocked");
    });

    test("permanent DATEAS failure marks only the DATEAS stage failed", async () => {
        const error = new Error("invalid permanent DATEAS response");
        error.retryable = false;
        scrapeDataeas.mockRejectedValue(error);
        const { row } = await createCandidate();
        const processed = await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(processed.retryable).toBe(false);
        expect(stored.stages.dateas.status).toBe("failed");
        expect(stored.resultState.dateas.status).toBe("error");
        expect(stored.status).toBe("queued");
        expect(stored.stages.padron.status).toBe("blocked");
    });

    test("no DATEAS result is a non-blocking permanent enrichment failure", async () => {
        scrapeDataeas.mockResolvedValue(null);
        const { row } = await createCandidate();
        await processNext();
        const stored = await AffiliateCheckRow.findById(row._id).lean();

        expect(stored.stages.dateas.status).toBe("failed");
        expect(stored.stages.dateas.errorMessage).toBe("Sin resultados en DATEAS");
        expect(stored.status).toBe("queued");
        expect(stored.stages.padron.status).toBe("blocked");
    });
});
