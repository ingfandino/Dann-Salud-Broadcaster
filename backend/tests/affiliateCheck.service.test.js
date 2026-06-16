"use strict";

jest.setTimeout(30000);

jest.mock("../src/services/affiliateCheckProcessor.service", () => ({
    processAffiliateCheckJob: jest.fn()
}));

jest.mock("uuid", () => ({ v4: jest.fn(() => "test-batch-id") }));
require("./setup");

const mongoose = require("mongoose");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateImportJob = require("../src/models/AffiliateImportJob");
const AffiliateImportRow = require("../src/models/AffiliateImportRow");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const User = require("../src/models/User");
const {
    AffiliateCheckError,
    assertActiveChannelAvailable,
    assertAffiliateCheckRole,
    cancelAffiliateCheckJob,
    computeRetainedQuota,
    createAffiliateCheckJob,
    createImportedAffiliateCheckJob,
    getActiveChannelStatus,
    getImportedAffiliateCheckAvailability,
    getSupervisorDailyUsage,
    previewAffiliateCheckSelection
} = require("../src/services/affiliateCheck.service");
const fs = require("fs");
const path = require("path");
const affiliateController = require("../src/controllers/affiliateController");
const { processAffiliatesData } = require("../src/services/affiliateImport.service");

function userStub(role = "supervisor") {
    return { _id: new mongoose.Types.ObjectId(), role };
}

function responseStub() {
    return {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

async function createExternalImport({ uploadedBy, status = "completed", batchId = "batch-external" } = {}) {
    return AffiliateImportJob.create({
        originalFilename: "external.xlsx",
        storedFilename: "external-test.xlsx",
        uploadedBy: uploadedBy || new mongoose.Types.ObjectId(),
        source: "external_check",
        status,
        batchId
    });
}

async function createImportRow(jobId, affiliateId, overrides = {}) {
    return AffiliateImportRow.create({
        jobId,
        rowNumber: overrides.rowNumber || 2,
        affiliateId,
        action: overrides.action || "created",
        status: overrides.status || "success",
        cuilNormalized: overrides.cuilNormalized || "20300000001",
        ...overrides
    });
}

function externalImportRow(overrides = {}) {
    return {
        Nombre: "Nombre Archivo",
        CUIL: "20300000001",
        "Obra Social": "OS Archivo",
        Localidad: "Localidad Archivo",
        "Teléfono_1": "1122334455",
        ...overrides
    };
}

async function createAffiliate(overrides = {}) {
    return Affiliate.create({
        nombre: "Nombre Guardado",
        cuil: "20300000001",
        obraSocial: "OS Guardada",
        localidad: "Localidad Guardada",
        telefono1: "1122334455",
        uploadedBy: new mongoose.Types.ObjectId(),
        sourceFile: "original.xlsx",
        batchId: "original-batch",
        ...overrides
    });
}

async function createState(overrides = {}) {
    return AffiliateOperationalState.create({
        affiliateId: new mongoose.Types.ObjectId(),
        cuil: String(Math.floor(20000000000 + Math.random() * 7000000000)),
        cuilNormalized: String(Math.floor(20000000000 + Math.random() * 7000000000)),
        ...overrides
    });
}

describe("affiliateCheck.service", () => {
    beforeEach(async () => {
        await AffiliateCheckConfig.create({
            dailyQuota: { checkNew: 2, checkReusable: 2, extractBase: 2, checkImport: 2 }
        });
    });

    test("preview check_new rejects when disabled and does not mutate", async () => {
        const user = userStub();
        const state = await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        await expect(previewAffiliateCheckSelection({
            user,
            mode: "check_new",
            requestedCount: 5
        })).rejects.toMatchObject({
            code: "CHECK_NEW_DISABLED",
            statusCode: 409
        });

        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(await AffiliateCheckJob.countDocuments()).toBe(0);
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
        expect(await AffiliateAssignment.countDocuments()).toBe(0);
        expect(updatedState.verificationStatus).toBe("unchecked");
    });

    test("preview check_new works when enabled and does not mutate", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );
        const state = await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        const preview = await previewAffiliateCheckSelection({
            user,
            mode: "check_new",
            requestedCount: 5
        });

        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(preview.selectableCount).toBe(2);
        expect(preview.willSelectCount).toBe(2);
        expect(preview.dailyLimit).toBe(2);
        expect(preview.canCreate).toBe(true);
        expect(await AffiliateCheckJob.countDocuments()).toBe(0);
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
        expect(await AffiliateAssignment.countDocuments()).toBe(0);
        expect(updatedState.verificationStatus).toBe("unchecked");
    });

    test("creating check_new returns disabled response and mutates nothing", async () => {
        const user = userStub();
        const state = await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        await expect(createAffiliateCheckJob({
            user,
            mode: "check_new",
            requestedCount: 1
        })).rejects.toMatchObject({
            code: "CHECK_NEW_DISABLED",
            statusCode: 409
        });

        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        const usage = await getSupervisorDailyUsage({ userId: user._id });
        expect(await AffiliateCheckJob.countDocuments()).toBe(0);
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
        expect(await AffiliateAssignment.countDocuments()).toBe(0);
        expect(updatedState.verificationStatus).toBe("unchecked");
        expect(usage.byMode.check_new).toBe(0);
    });

    test("creating check_reusable returns disabled response and mutates nothing", async () => {
        const user = userStub();
        const state = await createState({
            freshness: "reusable",
            verificationStatus: "expired",
            usageStatus: "available",
            saleStatus: "none",
            availableForSale: false
        });

        await expect(createAffiliateCheckJob({
            user,
            mode: "check_reusable",
            requestedCount: 1
        })).rejects.toMatchObject({
            code: "CHECK_REUSABLE_DISABLED",
            statusCode: 409
        });

        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        const usage = await getSupervisorDailyUsage({ userId: user._id });
        expect(await AffiliateCheckJob.countDocuments()).toBe(0);
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
        expect(await AffiliateAssignment.countDocuments()).toBe(0);
        expect(updatedState.verificationStatus).toBe("expired");
        expect(usage.byMode.check_reusable).toBe(0);
    });

    test("extract_base assigns to the requesting supervisor when enabled", async () => {
        const user = userStub();
        const state = await createState({
            freshness: "reusable",
            verificationStatus: "checked",
            usageStatus: "available",
            saleStatus: "none",
            canSell: true,
            availableForSale: true
        });

        const job = await createAffiliateCheckJob({
            user,
            mode: "extract_base",
            requestedCount: 1
        });

        const assignment = await AffiliateAssignment.findOne({ sourceJobId: job._id }).lean();
        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(job.status).toBe("completed");
        expect(assignment.supervisorId.toString()).toBe(user._id.toString());
        expect(updatedState.availableForSale).toBe(false);
        expect(updatedState.usageStatus).toBe("assigned");
        expect(updatedState.ownership.supervisorId.toString()).toBe(user._id.toString());
    });

    test("extract_base quota consumed equals actual assigned count", async () => {
        const user = userStub();
        await createState({
            verificationStatus: "checked",
            usageStatus: "available",
            saleStatus: "none",
            canSell: true,
            availableForSale: true
        });

        const job = await createAffiliateCheckJob({
            user,
            mode: "extract_base",
            requestedCount: 2
        });

        const usage = await getSupervisorDailyUsage({ userId: user._id });
        expect(job.requestedCount).toBe(2);
        expect(job.assignedCount).toBe(1);
        expect(job.quota.consumed).toBe(1);
        expect(usage.byMode.extract_base).toBe(1);
    });

    test("duplicate active assignment is prevented for extract_base", async () => {
        const user = userStub();
        const state = await createState({
            verificationStatus: "checked",
            usageStatus: "available",
            saleStatus: "none",
            canSell: true,
            availableForSale: true
        });
        await AffiliateAssignment.create({
            affiliateId: state.affiliateId,
            operationalStateId: state._id,
            supervisorId: new mongoose.Types.ObjectId(),
            assignedBy: new mongoose.Types.ObjectId(),
            source: "manual",
            status: "active",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        const job = await createAffiliateCheckJob({
            user,
            mode: "extract_base",
            requestedCount: 1
        });

        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(job.assignedCount).toBe(0);
        expect(job.rejectedCount).toBe(1);
        expect(job.quota.consumed).toBe(0);
        expect(await AffiliateAssignment.countDocuments({ affiliateId: state.affiliateId, status: "active" })).toBe(1);
        expect(updatedState.availableForSale).toBe(true);
        expect(updatedState.usageStatus).toBe("available");
    });

    test("cancelling a pending check job preserves traceability and releases reservations", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );
        const state = await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });
        const job = await createAffiliateCheckJob({
            user,
            mode: "check_new",
            requestedCount: 1
        });

        const result = await cancelAffiliateCheckJob({
            jobId: job._id,
            cancelledBy: user._id,
            reason: "test_cancel"
        });

        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(result.job.status).toBe("cancelled");
        expect(result.job.cancelledBy.toString()).toBe(user._id.toString());
        expect(result.job.cancellationReason).toBe("test_cancel");
        expect(row.status).toBe("cancelled");
        expect(updatedState.verificationStatus).toBe("unchecked");
        expect(updatedState.availableForSale).toBe(false);
    });

    test("manager extract_base requires an explicit active supervisor target", async () => {
        const manager = userStub("gerencia");
        await expect(createAffiliateCheckJob({
            user: manager,
            mode: "extract_base",
            requestedCount: 1
        })).rejects.toBeInstanceOf(AffiliateCheckError);
    });

    test("daily quota includes failed jobs and rejects exhausted quota", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkReusableEnabled": true } }
        );
        await AffiliateCheckJob.create({
            requestedBy: user._id,
            requestedByRole: "supervisor",
            mode: "check_reusable",
            status: "pending",
            requestedCount: 2,
            quota: { consumed: 2 }
        });
        await AffiliateCheckJob.create({
            requestedBy: user._id,
            requestedByRole: "supervisor",
            mode: "check_reusable",
            status: "failed",
            requestedCount: 100,
            quota: { consumed: 100 }
        });

        await expect(previewAffiliateCheckSelection({
            user,
            mode: "check_reusable",
            requestedCount: 1
        })).rejects.toMatchObject({ code: "DAILY_QUOTA_EXHAUSTED" });
    });

    test("manager can extract to an explicit active supervisor", async () => {
        const supervisor = await User.create({
            username: "phase4-supervisor",
            nombre: "Phase 4 Supervisor",
            email: "phase4-supervisor@example.com",
            password: "password123",
            role: "supervisor",
            active: true
        });
        const manager = userStub("gerencia");
        await createState({
            verificationStatus: "checked",
            usageStatus: "available",
            saleStatus: "none",
            canSell: true,
            availableForSale: true
        });

        const job = await createAffiliateCheckJob({
            user: manager,
            mode: "extract_base",
            requestedCount: 1,
            supervisorId: supervisor._id
        });

        expect(job.ownership.supervisorId.toString()).toBe(supervisor._id.toString());
    });

    test("check_import mode, config defaults and processor compatibility are registered", () => {
        const job = new AffiliateCheckJob({
            requestedBy: new mongoose.Types.ObjectId(),
            mode: "check_import"
        });
        const config = new AffiliateCheckConfig();

        expect(job.validateSync()).toBeUndefined();
        expect(config.features.checkImportEnabled).toBe(false);
        expect(config.dailyQuota.checkImport).toBe(200);
        const processorSource = fs.readFileSync(
            path.join(__dirname, "../src/services/affiliateCheckProcessor.service.js"),
            "utf8"
        );
        expect(processorSource).toContain(`PROCESSABLE_MODES = ["check_new", "check_reusable", "check_import"]`);
    });

    test("check_import is blocked by its dedicated feature flag", async () => {
        const user = userStub();
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        await expect(createImportedAffiliateCheckJob({
            user,
            importJobId: importJob._id,
            requestedCount: 1
        })).rejects.toMatchObject({ code: "CHECK_IMPORT_DISABLED", statusCode: 409 });
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
    });

    test("check_import selects only successful deduplicated rows and respects requestedCount", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const first = await createState({ saleStatus: "none" });
        const second = await createState({ saleStatus: "none" });
        const third = await createState({ saleStatus: "none" });
        const rejected = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, first.affiliateId, { rowNumber: 2, action: "linked" });
        await createImportRow(importJob._id, first.affiliateId, { rowNumber: 3, action: "updated" });
        await createImportRow(importJob._id, second.affiliateId, { rowNumber: 4, action: "updated" });
        await createImportRow(importJob._id, third.affiliateId, { rowNumber: 5, action: "created" });
        await createImportRow(importJob._id, rejected.affiliateId, {
            rowNumber: 6, action: "rejected", status: "rejected", rejectionCode: "INVALID_CUIL"
        });

        const availability = await getImportedAffiliateCheckAvailability(importJob._id);
        expect(availability.eligibleCount).toBe(3);
        expect(availability.checkableCount).toBe(3);

        const job = await createImportedAffiliateCheckJob({
            user,
            importJobId: importJob._id,
            requestedCount: 1
        });
        const rows = await AffiliateCheckRow.find({ jobId: job._id }).lean();
        const reserved = await AffiliateOperationalState.findById(rows[0].operationalStateId).lean();

        expect(job.mode).toBe("check_import");
        expect(job.selectedCount).toBe(1);
        expect(job.quota.consumed).toBe(1);
        expect(rows).toHaveLength(1);
        expect(rows[0].affiliateId.toString()).toBe(first.affiliateId.toString());
        expect(reserved.verificationStatus).toBe("checking");
        expect(String(rows[0].affiliateId)).not.toBe(String(rejected.affiliateId));
    });

    test("check_import skips active ownership, active assignment and QR rows", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 5 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const owned = await createState({
            saleStatus: "none",
            ownership: { supervisorId: new mongoose.Types.ObjectId(), expiresAt: new Date(Date.now() + 86400000) }
        });
        const assigned = await createState({ saleStatus: "none" });
        const qr = await createState({ saleStatus: "qr_done" });
        const activeCheck = await createState({
            saleStatus: "none",
            verificationStatus: "unchecked",
            currentCheckJobId: new mongoose.Types.ObjectId(),
            currentCheckStartedAt: new Date()
        });
        const available = await createState({ saleStatus: "none" });
        for (const [index, state] of [owned, assigned, qr, activeCheck, available].entries()) {
            await createImportRow(importJob._id, state.affiliateId, { rowNumber: index + 2 });
        }
        await AffiliateAssignment.create({
            affiliateId: assigned.affiliateId,
            operationalStateId: assigned._id,
            supervisorId: new mongoose.Types.ObjectId(),
            assignedBy: new mongoose.Types.ObjectId(),
            source: "manual",
            expiresAt: new Date(Date.now() + 86400000)
        });

        const availability = await getImportedAffiliateCheckAvailability(importJob._id);
        expect(availability.eligibleCount).toBe(5);
        expect(availability.checkableCount).toBe(1);

        const job = await createImportedAffiliateCheckJob({
            user,
            importJobId: importJob._id,
            requestedCount: 1
        });
        const rows = await AffiliateCheckRow.find({ jobId: job._id }).lean();
        const assignedState = await AffiliateOperationalState.findById(assigned._id).lean();

        expect(rows).toHaveLength(1);
        expect(rows[0].affiliateId.toString()).toBe(available.affiliateId.toString());
        expect(job.conflictCount).toBe(4);
        expect(job.skippedCount).toBe(4);
        expect(assignedState.verificationStatus).not.toBe("checking");
    });

    test("external summary keeps 9 linked rows distinct from 7 currently checkable rows", async () => {
        const manager = userStub("gerencia");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true } }
        );
        const importJob = await createExternalImport({ uploadedBy: manager._id });
        await AffiliateImportJob.updateOne(
            { _id: importJob._id },
            { $set: { totalRows: 9, existingLinkedCount: 9, rejectedCount: 0 } }
        );
        for (let index = 0; index < 9; index += 1) {
            const state = await createState(index < 2 ? {
                verificationStatus: "checked",
                verificationExpiresAt: new Date(Date.now() + 86400000)
            } : { verificationStatus: "unchecked" });
            await createImportRow(importJob._id, state.affiliateId, {
                rowNumber: index + 2,
                action: "linked",
                cuilNormalized: state.cuilNormalized
            });
        }

        const availability = await getImportedAffiliateCheckAvailability(importJob._id);
        expect(availability).toMatchObject({
            eligibleCount: 9,
            checkableCount: 7,
            excludedCount: 2,
            exclusionReasons: { valid_check: 2 }
        });

        const response = responseStub();
        await affiliateController.getExternalAffiliateCheckImport({
            user: manager,
            params: { importJobId: String(importJob._id) }
        }, response);
        expect(response.body.job).toMatchObject({
            existingLinkedCount: 9,
            checkableCount: 7,
            excludedCount: 2,
            rejectedCount: 0,
            exclusionReasons: { valid_check: 2 }
        });

        await expect(createImportedAffiliateCheckJob({
            user: manager, importJobId: importJob._id, requestedCount: 8
        })).rejects.toMatchObject({ code: "REQUESTED_COUNT_EXCEEDS_AVAILABLE" });
        const job = await createImportedAffiliateCheckJob({
            user: manager, importJobId: importJob._id, requestedCount: 7
        });
        expect(job.selectedCount).toBe(7);
    });

    test("external eligibility summary groups operational exclusion reasons", async () => {
        const importJob = await createExternalImport();
        const now = new Date();
        const states = [
            await createState({ verificationStatus: "checked", verificationExpiresAt: new Date(now.getTime() + 86400000) }),
            await createState({ verificationStatus: "checking" }),
            await createState({ currentCheckJobId: new mongoose.Types.ObjectId(), verificationStatus: "checking" }),
            await createState({ saleStatus: "qr_done" }),
            await createState({ usageStatus: "assigned" }),
            await createState({ ownership: { supervisorId: new mongoose.Types.ObjectId(), expiresAt: new Date(now.getTime() + 86400000) } }),
            await createState({ verificationStatus: "unchecked" })
        ];
        for (const [index, state] of states.entries()) {
            await createImportRow(importJob._id, state.affiliateId, { rowNumber: index + 2, cuilNormalized: state.cuilNormalized });
        }
        const assignedState = await createState({ verificationStatus: "unchecked" });
        await createImportRow(importJob._id, assignedState.affiliateId, { rowNumber: 9, cuilNormalized: assignedState.cuilNormalized });
        await AffiliateAssignment.create({
            affiliateId: assignedState.affiliateId,
            operationalStateId: assignedState._id,
            supervisorId: new mongoose.Types.ObjectId(),
            assignedBy: new mongoose.Types.ObjectId(),
            source: "manual",
            expiresAt: new Date(now.getTime() + 86400000)
        });
        await createImportRow(importJob._id, new mongoose.Types.ObjectId(), { rowNumber: 10, cuilNormalized: "20999999999" });

        const availability = await getImportedAffiliateCheckAvailability(importJob._id, now);
        expect(availability).toMatchObject({
            eligibleCount: 9,
            checkableCount: 1,
            excludedCount: 8,
            exclusionReasons: {
                valid_check: 1,
                active_check: 1,
                reserved_by_other_job: 1,
                sold_or_qr: 1,
                assignment_conflict: 2,
                ownership_conflict: 1,
                other: 1
            }
        });
    });

    test("external eligibility summary returns stable zero-count reasons when nothing is excluded", async () => {
        const importJob = await createExternalImport();
        const state = await createState({ verificationStatus: "unchecked", saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId, { cuilNormalized: state.cuilNormalized });
        const expired = await createState({ verificationStatus: "checked", verificationExpiresAt: new Date(Date.now() - 86400000), saleStatus: "none" });
        await createImportRow(importJob._id, expired.affiliateId, { rowNumber: 3, cuilNormalized: expired.cuilNormalized });

        const availability = await getImportedAffiliateCheckAvailability(importJob._id);
        expect(availability.checkableCount).toBe(2);
        expect(availability.excludedCount).toBe(0);
        expect(Object.values(availability.exclusionReasons)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    test("check_import rejects a requested count above canonical availability", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 5 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const available = await createState({ saleStatus: "none" });
        const invalid = await createState({ saleStatus: "qr_done" });
        await createImportRow(importJob._id, available.affiliateId, { action: "linked" });
        await createImportRow(importJob._id, invalid.affiliateId, { rowNumber: 3, action: "updated" });

        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 2
        })).rejects.toMatchObject({ code: "REQUESTED_COUNT_EXCEEDS_AVAILABLE" });
        expect(await AffiliateCheckJob.countDocuments()).toBe(0);
    });

    test("check_import enforces dedicated quota and supervisor ownership target", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 1 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const first = await createState({ saleStatus: "none" });
        const second = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, first.affiliateId, { rowNumber: 2 });
        await createImportRow(importJob._id, second.affiliateId, { rowNumber: 3 });

        const job = await createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 2
        });
        expect(job.selectedCount).toBe(1);
        expect(job.ownership.supervisorId.toString()).toBe(user._id.toString());
        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "DAILY_QUOTA_EXHAUSTED" });
    });

    test("manager check_import without supervisor target creates general-stock destination", async () => {
        const manager = userStub("gerencia");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true } }
        );
        const importJob = await createExternalImport({ uploadedBy: manager._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        const job = await createImportedAffiliateCheckJob({
            user: manager, importJobId: importJob._id, requestedCount: 1
        });
        expect(job.ownership.supervisorId).toBeNull();
    });

    test("manager check_import can target an explicit active supervisor", async () => {
        const supervisor = await User.create({
            username: "check-import-supervisor",
            nombre: "Check Import Supervisor",
            email: "check-import-supervisor.com",
            password: "password123",
            role: "supervisor",
            active: true
        });
        const manager = userStub("encargado");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true } }
        );
        const importJob = await createExternalImport({ uploadedBy: manager._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        const job = await createImportedAffiliateCheckJob({
            user: manager,
            importJobId: importJob._id,
            requestedCount: 1,
            supervisorId: supervisor._id
        });
        expect(job.ownership.supervisorId.toString()).toBe(supervisor._id.toString());
    });

    test.each([undefined, 0, -1, 1.5, "not-a-number"])(
        "check_import rejects invalid requestedCount %p",
        async requestedCount => {
            const user = userStub();
            await AffiliateCheckConfig.updateOne(
                { active: true },
                { $set: { "features.checkImportEnabled": true } }
            );
            const importJob = await createExternalImport({ uploadedBy: user._id });
            const state = await createState({ saleStatus: "none" });
            await createImportRow(importJob._id, state.affiliateId);

            await expect(createImportedAffiliateCheckJob({
                user, importJobId: importJob._id, requestedCount
            })).rejects.toMatchObject({ message: "requestedCount debe ser un entero mayor que cero" });
        }
    );

    test.each(["pending", "processing", "failed"])(
        "check_import blocks import status %s",
        async status => {
            const user = userStub();
            await AffiliateCheckConfig.updateOne(
                { active: true },
                { $set: { "features.checkImportEnabled": true } }
            );
            const importJob = await createExternalImport({ uploadedBy: user._id, status });
            await expect(createImportedAffiliateCheckJob({
                user, importJobId: importJob._id, requestedCount: 1
            })).rejects.toMatchObject({ code: "IMPORT_NOT_COMPLETED", statusCode: 409 });
        }
    );

    test("check_import reservation survives operational rebuilds and is released by owner job", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 5 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none", verificationStatus: "unchecked" });
        await createImportRow(importJob._id, state.affiliateId);
        const firstJob = await createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        });

        await AffiliateOperationalState.updateOne(
            { _id: state._id },
            { $set: { verificationStatus: "checked" } }
        );
        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "NO_AVAILABLE_IMPORT_ROWS" });

        await cancelAffiliateCheckJob({
            jobId: firstJob._id, cancelledBy: user._id, reason: "safety_review"
        });
        const released = await AffiliateOperationalState.findById(state._id).lean();
        expect(released.currentCheckJobId ?? null).toBeNull();
        expect(released.verificationStatus).toBe("unchecked");
    });

    test("check_import distinguishes no eligible rows from reservation conflicts", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true } }
        );
        const emptyImport = await createExternalImport({ uploadedBy: user._id });
        await expect(createImportedAffiliateCheckJob({
            user, importJobId: emptyImport._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "NO_ELIGIBLE_IMPORT_ROWS" });

        const conflictImport = await createExternalImport({ uploadedBy: user._id, batchId: "conflict" });
        const state = await createState({ saleStatus: "qr_done" });
        await createImportRow(conflictImport._id, state.affiliateId);
        await expect(createImportedAffiliateCheckJob({
            user, importJobId: conflictImport._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "NO_AVAILABLE_IMPORT_ROWS" });
    });

    test("jobs listing defaults to the current Argentine day and filters before pagination", async () => {
        const owner = userStub();
        const other = userStub();
        const previousDay = await AffiliateCheckJob.create({ requestedBy: owner._id, requestedByRole: owner.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-15T02:59:59.999Z") });
        const firstToday = await AffiliateCheckJob.create({ requestedBy: owner._id, requestedByRole: owner.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-15T03:00:00.000Z") });
        const nearMidnight = await AffiliateCheckJob.create({ requestedBy: owner._id, requestedByRole: owner.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-16T02:30:00.000Z") });
        await AffiliateCheckJob.create({ requestedBy: owner._id, requestedByRole: owner.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-16T03:00:00.000Z") });
        await AffiliateCheckJob.create({ requestedBy: other._id, requestedByRole: other.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-16T01:00:00.000Z") });
        await AffiliateCheckJob.create({ requestedBy: owner._id, requestedByRole: owner.role, mode: "check_import", status: "completed", isDeleted: true, createdAt: new Date("2026-06-16T01:30:00.000Z") });

        const dateFormatSpy = jest.spyOn(Intl, "DateTimeFormat").mockImplementation(() => ({
            formatToParts: () => [
                { type: "year", value: "2026" },
                { type: "literal", value: "-" },
                { type: "month", value: "06" },
                { type: "literal", value: "-" },
                { type: "day", value: "15" }
            ]
        }));
        const response = responseStub();
        await affiliateController.listAffiliateCheckJobs({ user: owner, query: { limit: "1" } }, response);
        dateFormatSpy.mockRestore();

        expect(response.statusCode).toBe(200);
        expect(response.body.date).toBe("2026-06-15");
        expect(response.body.jobs).toHaveLength(1);
        expect(String(response.body.jobs[0]._id)).toBe(String(nearMidnight._id));
        expect(String(response.body.jobs[0]._id)).not.toBe(String(previousDay._id));
        expect(String(response.body.jobs[0]._id)).not.toBe(String(firstToday._id));
    });

    test("jobs listing returns only the explicitly selected Argentine calendar day", async () => {
        const manager = userStub("gerencia");
        const june15 = await AffiliateCheckJob.create({ requestedBy: manager._id, requestedByRole: manager.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-16T02:30:00.000Z") });
        const june16 = await AffiliateCheckJob.create({ requestedBy: manager._id, requestedByRole: manager.role, mode: "check_import", status: "completed", createdAt: new Date("2026-06-16T03:00:00.000Z") });

        const response = responseStub();
        await affiliateController.listAffiliateCheckJobs({ user: manager, query: { all: "true", date: "2026-06-15" } }, response);

        expect(response.statusCode).toBe(200);
        expect(response.body.jobs.map(job => String(job._id))).toContain(String(june15._id));
        expect(response.body.jobs.map(job => String(job._id))).not.toContain(String(june16._id));
    });

    test.each(["15/06/2026", "2026-13-40", "abc", "2026-06", "2026-02-30"])(
        "jobs listing rejects invalid date %s with a friendly response",
        async date => {
            const response = responseStub();
            await affiliateController.listAffiliateCheckJobs({ user: userStub(), query: { date } }, response);
            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual({ success: false, message: "La fecha indicada no es válida." });
        }
    );

    test("external import summary authorization allows owner and manager but blocks another supervisor", async () => {
        const owner = userStub();
        const otherSupervisor = userStub();
        const manager = userStub("gerencia");
        const importJob = await createExternalImport({ uploadedBy: owner._id });

        const ownerRes = responseStub();
        await affiliateController.getExternalAffiliateCheckImport({
            user: owner, params: { importJobId: String(importJob._id) }
        }, ownerRes);
        expect(ownerRes.statusCode).toBe(200);
        expect(ownerRes.body.job._id.toString()).toBe(importJob._id.toString());

        const managerRes = responseStub();
        await affiliateController.getExternalAffiliateCheckImport({
            user: manager, params: { importJobId: String(importJob._id) }
        }, managerRes);
        expect(managerRes.statusCode).toBe(200);

        const otherRes = responseStub();
        await affiliateController.getExternalAffiliateCheckImport({
            user: otherSupervisor, params: { importJobId: String(importJob._id) }
        }, otherRes);
        expect(otherRes.statusCode).toBe(404);
    });

    test("external report endpoints block cross-supervisor access before file download", async () => {
        const owner = userStub();
        const otherSupervisor = userStub();
        const importJob = await createExternalImport({ uploadedBy: owner._id });
        await AffiliateImportJob.updateOne(
            { _id: importJob._id },
            { $set: {
                rejectedFilePath: "/tmp/guessed-rejected.xlsx",
                updatedFilePath: "/tmp/guessed-updated.xlsx"
            } }
        );

        for (const handler of [
            affiliateController.downloadExternalAffiliateCheckRejectedFile,
            affiliateController.downloadExternalAffiliateCheckUpdatedFile
        ]) {
            const res = responseStub();
            res.download = jest.fn();
            await handler({
                user: otherSupervisor,
                params: { importJobId: String(importJob._id) }
            }, res);
            expect(res.statusCode).toBe(404);
            expect(res.download).not.toHaveBeenCalled();
        }
    });

    test("affiliate check access middleware enforces the internal role matrix", () => {
        const allowedRoles = ["supervisor", "gerencia", "encargado", "desarrollador"];
        const deniedRoles = ["asesor", "independiente", "auditor", "admin", "capacitador", "administrativo"];

        for (const role of allowedRoles) {
            const res = responseStub();
            const next = jest.fn();
            affiliateController.requireAffiliateCheckAccess({ user: { role } }, res, next);
            expect(res.statusCode).toBe(200);
            expect(next).toHaveBeenCalledTimes(1);
        }

        for (const role of deniedRoles) {
            const res = responseStub();
            const next = jest.fn();
            affiliateController.requireAffiliateCheckAccess({ user: { role } }, res, next);
            expect(res.statusCode).toBe(403);
            expect(next).not.toHaveBeenCalled();
        }
    });

    test("affiliate check dashboard summary route is registered before dynamic job routes", () => {
        const affiliateRoutes = require("../src/routes/affiliates");
        const routePaths = affiliateRoutes.stack
            .filter(layer => layer.route)
            .map(layer => layer.route.path);

        const dashboardIndex = routePaths.indexOf("/check/dashboard-summary");
        const dynamicJobIndex = routePaths.indexOf("/check/jobs/:jobId");
        const dashboardRoute = affiliateRoutes.stack.find(layer =>
            layer.route?.path === "/check/dashboard-summary"
            && layer.route?.methods?.get
        );

        expect(dashboardIndex).toBeGreaterThanOrEqual(0);
        expect(dynamicJobIndex).toBeGreaterThanOrEqual(0);
        expect(dashboardIndex).toBeLessThan(dynamicJobIndex);
        expect(dashboardRoute).toBeTruthy();
    });

    test("external upload is a wrapper around the shared asynchronous import pipeline", async () => {
        const source = fs.readFileSync(
            path.join(__dirname, "../src/controllers/affiliateController.js"),
            "utf8"
        );
        const uploadBlock = source.slice(
            source.indexOf("exports.uploadExternalAffiliateCheckFile"),
            source.indexOf("function buildImportJobAccessFilter")
        );
        const importService = require("../src/services/affiliateImport.service");

        expect(typeof importService.processAffiliatesData).toBe("function");
        expect(uploadBlock).toContain("AffiliateImportJob.create");
        expect(uploadBlock).toContain("kickAffiliateImportProcessor");
        expect(uploadBlock).not.toContain("XLSX.readFile");
        expect(uploadBlock).not.toContain("Affiliate.create");
    });

    test("external import links an identical existing affiliate without changing it", async () => {
        const importJob = await createExternalImport();
        const existing = await createAffiliate();

        const result = await processAffiliatesData(
            [externalImportRow()],
            importJob.uploadedBy,
            importJob.originalFilename,
            importJob._id,
            { source: "external_check" }
        );

        const stored = await Affiliate.findById(existing._id).lean();
        const row = await AffiliateImportRow.findOne({ jobId: importJob._id }).lean();
        expect(result.existingLinkedCount).toBe(1);
        expect(result.updatedCount).toBe(0);
        expect(result.duplicates).toHaveLength(0);
        expect(await Affiliate.countDocuments()).toBe(1);
        expect(row.action).toBe("linked");
        expect(row.status).toBe("success");
        expect(row.affiliateId.toString()).toBe(existing._id.toString());
        expect(stored.nombre).toBe("Nombre Guardado");
        expect(stored.telefono1).toBe("1122334455");
    });

    test("external import enriches phones but preserves existing identity fields", async () => {
        const importJob = await createExternalImport();
        const existing = await createAffiliate();
        const activeJobId = new mongoose.Types.ObjectId();
        await createState({
            affiliateId: existing._id,
            saleStatus: "none",
            verificationStatus: "checking",
            currentCheckJobId: activeJobId,
            currentCheckStartedAt: new Date()
        });

        const result = await processAffiliatesData(
            [externalImportRow({ "Teléfono_1": "1199999999" })],
            importJob.uploadedBy,
            importJob.originalFilename,
            importJob._id,
            { source: "external_check" }
        );

        const stored = await Affiliate.findById(existing._id).lean();
        const row = await AffiliateImportRow.findOne({ jobId: importJob._id }).lean();
        const operationalState = await AffiliateOperationalState.findOne({ affiliateId: existing._id }).lean();
        expect(result.updatedCount).toBe(1);
        expect(operationalState.verificationStatus).toBe("checking");
        expect(operationalState.currentCheckJobId.toString()).toBe(activeJobId.toString());
        expect(await Affiliate.countDocuments()).toBe(1);
        expect(row.action).toBe("updated");
        expect(row.affiliateId.toString()).toBe(existing._id.toString());
        expect(stored.nombre).toBe("Nombre Guardado");
        expect(stored.cuil).toBe("20300000001");
        expect(stored.obraSocial).toBe("OS Guardada");
        expect(stored.localidad).toBe("Localidad Guardada");
        expect(stored.telefono1).toBe("1199999999");
        expect(stored.telefono2).toBe("1122334455");
    });

    test("external import creates new affiliates and rejects invalid CUIL rows", async () => {
        const importJob = await createExternalImport();
        const result = await processAffiliatesData(
            [
                externalImportRow({ CUIL: "20400000002", "Teléfono_1": "1111111111" }),
                externalImportRow({ CUIL: "invalid", "Teléfono_1": "1222222222" })
            ],
            importJob.uploadedBy,
            importJob.originalFilename,
            importJob._id,
            { source: "external_check" }
        );

        const rows = await AffiliateImportRow.find({ jobId: importJob._id }).sort({ rowNumber: 1 }).lean();
        expect(result.validCount).toBe(1);
        expect(result.duplicates).toHaveLength(1);
        expect(await Affiliate.countDocuments()).toBe(1);
        expect(rows[0].action).toBe("created");
        expect(rows[0].affiliateId).toBeTruthy();
        expect(rows[1].rejectionCode).toBe("INVALID_CUIL");
    });

    test("general import still rejects an identical existing affiliate", async () => {
        const importJob = await AffiliateImportJob.create({
            originalFilename: "general.xlsx",
            storedFilename: "general.xlsx",
            uploadedBy: new mongoose.Types.ObjectId(),
            source: "affiliate_upload",
            status: "completed"
        });
        await createAffiliate();

        const result = await processAffiliatesData(
            [externalImportRow()],
            importJob.uploadedBy,
            importJob.originalFilename,
            importJob._id,
            { source: "affiliate_upload" }
        );

        expect(result.existingLinkedCount).toBe(0);
        expect(result.duplicates).toHaveLength(1);
        expect(result.duplicates[0].code).toBe("EXISTING_CUIL_SAME_PHONES");
    });

    test("gerencia bypasses check_import quota", async () => {
        const user = userStub("gerencia");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 0 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        const job = await createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        });
        expect(job.selectedCount).toBe(1);
    });

    test("desarrollador bypasses check_import quota", async () => {
        const user = userStub("desarrollador");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 0 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        const job = await createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        });
        expect(job.selectedCount).toBe(1);
    });

    test("admin cannot use check_import even if role exists", async () => {
        const user = userStub("admin");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 10 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "INTERNAL_CHECK_ROLE_FORBIDDEN", statusCode: 403 });
    });

    test("supervisor is blocked when check_import quota exhausted", async () => {
        const user = userStub("supervisor");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 0 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "DAILY_QUOTA_EXHAUSTED" });
    });

    test("quota bypass does not bypass eligibility/conflict exclusions", async () => {
        const user = userStub("gerencia");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 0 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        // qr_done is not eligible for check_import selection
        const state = await createState({ saleStatus: "qr_done" });
        await createImportRow(importJob._id, state.affiliateId);

        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        })).rejects.toMatchObject({ code: "NO_AVAILABLE_IMPORT_ROWS" });
    });

    test("error message does not expose check_import", async () => {
        const user = userStub("supervisor");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkImportEnabled": true, "dailyQuota.checkImport": 0 } }
        );
        const importJob = await createExternalImport({ uploadedBy: user._id });
        const state = await createState({ saleStatus: "none" });
        await createImportRow(importJob._id, state.affiliateId);

        await expect(createImportedAffiliateCheckJob({
            user, importJobId: importJob._id, requestedCount: 1
        })).rejects.toMatchObject({
            message: "No queda cupo disponible para procesar archivos externos hoy."
        });
    });

    test("error message does not expose technical mode names", async () => {
        const user = userStub("supervisor");
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true, "dailyQuota.checkNew": 0 } }
        );
        await expect(createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        })).rejects.toMatchObject({
            message: "No queda cupo diario disponible para chequeo de datos nuevos."
        });
    });

    test("active channel guard blocks second internal check_new when one is pending", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        const first = await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        });
        expect(first.status).toBe("pending");

        await expect(createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        })).rejects.toMatchObject({ code: "ACTIVE_CHECK_NEW_JOB", statusCode: 409 });
    });

    test("active channel guard allows creation after cancellation", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        const first = await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        });
        await cancelAffiliateCheckJob({ jobId: first._id, cancelledBy: user._id });

        const second = await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        });
        expect(second.status).toBe("pending");
    });

    test("preview returns canCreate=false when active job exists", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        });

        const preview = await previewAffiliateCheckSelection({
            user, mode: "check_new", requestedCount: 1
        });
        expect(preview.canCreate).toBe(false);
        expect(preview.blockedReason).toBe("active_check_new_job");
    });

    test("assertAffiliateCheckRole blocks asesor from internal check", () => {
        expect(() => assertAffiliateCheckRole(userStub("asesor"), "check_new"))
            .toThrow(AffiliateCheckError);
    });

    test("assertAffiliateCheckRole allows supervisor for internal check", () => {
        expect(() => assertAffiliateCheckRole(userStub("supervisor"), "check_new"))
            .not.toThrow();
    });

    test("assertAffiliateCheckRole blocks asesor from extract_base", () => {
        expect(() => assertAffiliateCheckRole(userStub("asesor"), "extract_base"))
            .toThrow(AffiliateCheckError);
    });

    test("cancel retains quota for rows that started processing", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true, "dailyQuota.checkNew": 5 } }
        );
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        const job = await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 2
        });

        const rows = await AffiliateCheckRow.find({ jobId: job._id }).lean();
        expect(rows.length).toBeGreaterThanOrEqual(1);
        await AffiliateCheckRow.updateOne(
            { _id: rows[0]._id },
            { $set: { "stages.arca.status": "done" } }
        );

        const result = await cancelAffiliateCheckJob({
            jobId: job._id,
            cancelledBy: user._id
        });
        expect(result.job.status).toBe("cancelled");
        expect(result.job.quota.consumed).toBe(1);
    });

    test("cancel sets quota to 0 for purely pending rows", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        const job = await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        });

        const result = await cancelAffiliateCheckJob({
            jobId: job._id,
            cancelledBy: user._id
        });
        expect(result.job.quota.consumed).toBe(0);
    });

    test("partial creation returns _partialCreation flag when fewer rows reserved", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true, "dailyQuota.checkNew": 100 } }
        );
        await createState({
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false
        });

        const job = await createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 10
        });
        expect(job.selectedCount).toBe(1);
        expect(job._partialCreation).toBe(true);
        expect(job._partialMessage).toContain("1");
        expect(job._partialMessage).toContain("10");
    });

    test("create rejects when no selectable affiliates exist", async () => {
        const user = userStub();
        await AffiliateCheckConfig.updateOne(
            { active: true },
            { $set: { "features.checkNewEnabled": true } }
        );

        await expect(createAffiliateCheckJob({
            user, mode: "check_new", requestedCount: 1
        })).rejects.toMatchObject({ code: "NO_SELECTABLE_AFFILIATES", statusCode: 422 });
    });

    test("getActiveChannelStatus returns canCreate true when no active job", async () => {
        const user = userStub();
        const status = await getActiveChannelStatus({
            mode: "check_new",
            ownerId: null,
            requestedBy: user._id
        });
        expect(status.canCreate).toBe(true);
    });

    test("extract_base bypasses active channel guard", async () => {
        const status = await getActiveChannelStatus({
            mode: "extract_base",
            ownerId: new mongoose.Types.ObjectId(),
            requestedBy: new mongoose.Types.ObjectId()
        });
        expect(status.canCreate).toBe(true);
    });
});

describe("affiliateCheckExpiration.service", () => {
    beforeEach(async () => {
        await AffiliateCheckConfig.create({
            dailyQuota: { checkNew: 2, checkReusable: 2, extractBase: 2, checkImport: 2 }
        });
    });

    test("expireStaleAssignments expires assignments past expiresAt", async () => {
        const { expireStaleAssignments } = require("../src/services/affiliateCheckExpiration.service");
        const supervisorId = new mongoose.Types.ObjectId();
        const affiliateId = new mongoose.Types.ObjectId();
        const expiresAt = new Date(Date.now() - 1000);
        const state = await createState({
            affiliateId,
            usageStatus: "assigned",
            ownership: { supervisorId, expiresAt: expiresAt }
        });
        await AffiliateAssignment.create({
            affiliateId,
            operationalStateId: state._id,
            supervisorId,
            assignedBy: new mongoose.Types.ObjectId(),
            source: "check_job",
            expiresAt: expiresAt
        });

        const stats = await expireStaleAssignments({ now: new Date() });
        expect(stats.expired).toBe(1);

        const assignment = await AffiliateAssignment.findOne({ affiliateId }).lean();
        expect(assignment.status).toBe("expired");
        expect(assignment.expiredAt).toBeTruthy();
        expect(assignment.expirationReason).toBe("ownership_period_elapsed");

        const updatedState = await AffiliateOperationalState.findById(state._id).lean();
        expect(updatedState.ownership.supervisorId).toBeNull();
    });

    test("expireStaleAssignments skips assignments not yet expired", async () => {
        const { expireStaleAssignments } = require("../src/services/affiliateCheckExpiration.service");
        const supervisorId = new mongoose.Types.ObjectId();
        const affiliateId = new mongoose.Types.ObjectId();
        const state = await createState({
            affiliateId,
            usageStatus: "assigned",
            ownership: { supervisorId, expiresAt: new Date(Date.now() + 86400000) }
        });
        await AffiliateAssignment.create({
            affiliateId,
            operationalStateId: state._id,
            supervisorId,
            assignedBy: new mongoose.Types.ObjectId(),
            source: "check_job",
            expiresAt: new Date(Date.now() + 86400000)
        });

        const stats = await expireStaleAssignments({ now: new Date() });
        expect(stats.scanned).toBe(0);
        expect(stats.expired).toBe(0);

        const assignment = await AffiliateAssignment.findOne({ affiliateId }).lean();
        expect(assignment.status).toBe("active");
    });

    test("deriveUsageStatusAfterExpiration returns correct statuses", () => {
        const { deriveUsageStatusAfterExpiration } = require("../src/services/affiliateCheckExpiration.service");
        expect(deriveUsageStatusAfterExpiration(null)).toBe("available");
        expect(deriveUsageStatusAfterExpiration({ saleStatus: "qr_done" })).toBe("blocked");
        expect(deriveUsageStatusAfterExpiration({ verificationStatus: "checked", canSell: true })).toBe("available");
        expect(deriveUsageStatusAfterExpiration({ verificationStatus: "expired" })).toBe("reusable");
        expect(deriveUsageStatusAfterExpiration({ usageStatus: "never_used" })).toBe("never_used");
    });
});
