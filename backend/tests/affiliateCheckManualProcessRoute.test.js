"use strict";

jest.mock("../src/services/affiliateCheckProcessor.service", () => ({
    processAffiliateCheckJob: jest.fn()
}));

jest.mock("../src/services/affiliateImport.service", () => ({
    kickAffiliateImportProcessor: jest.fn()
}));

require("./setup");

const mongoose = require("mongoose");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const affiliateController = require("../src/controllers/affiliateController");
const { processAffiliateCheckJob } = require("../src/services/affiliateCheckProcessor.service");

function responseStub() {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
    return res;
}

describe("affiliate check manual process route", () => {
    test.each(["gerencia", "desarrollador"])("%s receives staged-processing response", async role => {
        const jobId = new mongoose.Types.ObjectId();
        const req = { params: { jobId: String(jobId) }, user: { _id: new mongoose.Types.ObjectId(), role } };
        const res = responseStub();

        await affiliateController.processAffiliateCheckJob(req, res);

        expect(res.statusCode).toBe(409);
        expect(res.body).toEqual({
            success: false,
            code: "STAGED_PROCESSING_REQUIRED",
            message: "El procesamiento manual ya no está disponible. El trabajo será procesado por los workers por etapas."
        });
        expect(processAffiliateCheckJob).not.toHaveBeenCalled();
    });

    test("unauthorized roles remain blocked by middleware", () => {
        const req = { user: { role: "supervisor" } };
        const res = responseStub();
        const next = jest.fn();

        affiliateController.requireAffiliateCheckProcessAccess(req, res, next);

        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
        expect(next).not.toHaveBeenCalled();
    });

    test("authorized middleware still allows Gerencia and Desarrollador", () => {
        for (const role of ["gerencia", "desarrollador"]) {
            const req = { user: { role } };
            const res = responseStub();
            const next = jest.fn();

            affiliateController.requireAffiliateCheckProcessAccess(req, res, next);

            expect(next).toHaveBeenCalledTimes(1);
            expect(res.statusCode).toBe(200);
        }
    });

    test("job state is unchanged and monolithic processor is not called", async () => {
        const job = await AffiliateCheckJob.create({
            requestedBy: new mongoose.Types.ObjectId(),
            requestedByRole: "gerencia",
            mode: "check_new",
            status: "pending",
            requestedCount: 1,
            selectedCount: 1
        });
        const before = await AffiliateCheckJob.findById(job._id).lean();
        const req = { params: { jobId: String(job._id) }, user: { _id: new mongoose.Types.ObjectId(), role: "gerencia" } };
        const res = responseStub();

        await affiliateController.processAffiliateCheckJob(req, res);

        const after = await AffiliateCheckJob.findById(job._id).lean();
        expect(res.statusCode).toBe(409);
        expect(after.status).toBe(before.status);
        expect(after.updatedAt.toISOString()).toBe(before.updatedAt.toISOString());
        expect(processAffiliateCheckJob).not.toHaveBeenCalled();
    });
});
