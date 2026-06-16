"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateImportJob = require("../src/models/AffiliateImportJob");
const AffiliateImportRow = require("../src/models/AffiliateImportRow");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const User = require("../src/models/User");
const {
    createAffiliateCheckJob,
    createImportedAffiliateCheckJob,
    previewAffiliateCheckSelection
} = require("../src/services/affiliateCheck.service");

function user(role = "supervisor") {
    return { _id: new mongoose.Types.ObjectId(), role };
}

async function createState(overrides = {}) {
    const cuil = String(Math.floor(20000000000 + Math.random() * 7000000000));
    return AffiliateOperationalState.create({
        affiliateId: new mongoose.Types.ObjectId(),
        cuil,
        cuilNormalized: cuil,
        ...overrides
    });
}

async function createInternalState(mode) {
    if (mode === "check_reusable") {
        return createState({
            freshness: "reusable",
            verificationStatus: "expired",
            usageStatus: "available",
            saleStatus: "none",
            currentCheckJobId: null
        });
    }
    return createState({
        freshness: "fresh",
        verificationStatus: "unchecked",
        usageStatus: "never_used",
        saleStatus: "none",
        availableForSale: false
    });
}

async function createExtractState(overrides = {}) {
    return createState({
        verificationStatus: "checked",
        canSell: true,
        availableForSale: true,
        saleStatus: "none",
        usageStatus: "available",
        ...overrides
    });
}

async function createImport(owner, count = 2) {
    const importJob = await AffiliateImportJob.create({
        originalFilename: "concurrent.xlsx",
        storedFilename: "concurrent.xlsx",
        uploadedBy: owner._id,
        source: "external_check",
        status: "completed",
        batchId: `batch-${new mongoose.Types.ObjectId()}`
    });
    for (let index = 0; index < count; index += 1) {
        const state = await createState({ saleStatus: "none" });
        await AffiliateImportRow.create({
            jobId: importJob._id,
            rowNumber: index + 2,
            affiliateId: state.affiliateId,
            action: "created",
            status: "success",
            cuilNormalized: state.cuilNormalized
        });
    }
    return importJob;
}

function expectOneConflict(results, code) {
    const fulfilled = results.filter(result => result.status === "fulfilled");
    const rejected = results.filter(result => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code, statusCode: 409 });
}

function expectAllFulfilled(results) {
    expect(results.every(result => result.status === "fulfilled")).toBe(true);
}

describe("affiliate check atomic channels", () => {
    beforeAll(async () => {
        await AffiliateCheckJob.init();
    });

    beforeEach(async () => {
        await AffiliateCheckConfig.create({
            dailyQuota: { checkNew: 100, checkReusable: 100, extractBase: 100, checkImport: 100 },
            features: {
                checkNewEnabled: true,
                checkReusableEnabled: true,
                extractBaseEnabled: true,
                checkImportEnabled: true
            }
        });
    });

    test("two simultaneous check_new jobs collide atomically", async () => {
        const owner = user();
        await Promise.all([createInternalState("check_new"), createInternalState("check_new")]);
        const results = await Promise.allSettled([
            createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 }),
            createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 })
        ]);
        expectOneConflict(results, "ACTIVE_CHECK_NEW_JOB");
        expect(await AffiliateCheckJob.countDocuments({ channelOwner: owner._id, mode: "check_new" })).toBe(1);
    });

    test("simultaneous check_new and check_reusable use independent mode channels", async () => {
        const owner = user();
        await Promise.all([createInternalState("check_new"), createInternalState("check_reusable")]);
        const results = await Promise.allSettled([
            createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 }),
            createAffiliateCheckJob({ user: owner, mode: "check_reusable", requestedCount: 1 })
        ]);
        expectAllFulfilled(results);
        expect(await AffiliateCheckJob.countDocuments({ channelOwner: owner._id, mode: { $in: ["check_new", "check_reusable"] } })).toBe(2);
    });

    test("two simultaneous external jobs collide atomically", async () => {
        const owner = user();
        const importJob = await createImport(owner);
        const results = await Promise.allSettled([
            createImportedAffiliateCheckJob({ user: owner, importJobId: importJob._id, requestedCount: 1 }),
            createImportedAffiliateCheckJob({ user: owner, importJobId: importJob._id, requestedCount: 1 })
        ]);
        expectOneConflict(results, "ACTIVE_CHECK_IMPORT_JOB");
        expect(await AffiliateCheckJob.countDocuments({ channelOwner: owner._id, mode: "check_import" })).toBe(1);
    });

    test("simultaneous internal and external jobs use independent channels", async () => {
        const owner = user();
        await createInternalState("check_new");
        const importJob = await createImport(owner, 1);
        const results = await Promise.allSettled([
            createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 }),
            createImportedAffiliateCheckJob({ user: owner, importJobId: importJob._id, requestedCount: 1 })
        ]);
        expect(results.every(result => result.status === "fulfilled")).toBe(true);
    });

    test.each(["pending", "processing", "pausing", "paused", "retrying", "stuck"])(
        "%s occupies the internal channel",
        async status => {
            const owner = user();
            await AffiliateCheckJob.create({
                requestedBy: owner._id,
                requestedByRole: owner.role,
                mode: "check_new",
                status,
                channelOwner: owner._id,
                channelType: "internal",
                ownership: { supervisorId: owner._id }
            });
            await createInternalState("check_new");
            await expect(createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 }))
                .rejects.toMatchObject({ code: "ACTIVE_CHECK_NEW_JOB" });
        }
    );

    test.each(["completed", "completed_with_errors", "failed", "cancelled", "partially_cancelled"])(
        "%s releases the internal channel",
        async status => {
            const owner = user();
            await AffiliateCheckJob.create({
                requestedBy: owner._id,
                requestedByRole: owner.role,
                mode: "check_new",
                status,
                channelOwner: owner._id,
                channelType: "internal",
                ownership: { supervisorId: owner._id }
            });
            await createInternalState("check_new");
            const created = await createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 });
            expect(created.status).toBe("pending");
        }
    );

    test("supervisor-controlled identity fields cannot change the effective owner", async () => {
        const owner = user();
        const other = new mongoose.Types.ObjectId();
        await createInternalState("check_new");
        const created = await createAffiliateCheckJob({
            user: owner,
            mode: "check_new",
            requestedCount: 1,
            supervisorId: other,
            requestedBy: other,
            role: "gerencia"
        });
        expect(String(created.requestedBy)).toBe(String(owner._id));
        expect(created.requestedByRole).toBe("supervisor");
        expect(String(created.channelOwner)).toBe(String(owner._id));
        expect(String(created.ownership.supervisorId)).toBe(String(owner._id));
    });

    test.each(["encargado", "gerencia", "desarrollador"])(
        "%s may delegate internal work to a validated active supervisor",
        async role => {
            const actor = user(role);
            const target = await User.create({
                username: `channel-target-`,
                nombre: `Channel Target `,
                email: `channel-target-@example.com`,
                password: "password123",
                role: "supervisor",
                active: true
            });
            await createInternalState("check_new");
            const preview = await previewAffiliateCheckSelection({
                user: actor,
                mode: "check_new",
                requestedCount: 1,
                supervisorId: target._id
            });
            expect(preview.canCreate).toBe(true);
            const created = await createAffiliateCheckJob({
                user: actor,
                mode: "check_new",
                requestedCount: 1,
                supervisorId: target._id
            });
            expect(String(created.channelOwner)).toBe(String(target._id));
            expect(String(created.ownership.supervisorId)).toBe(String(target._id));
            expect(String(created.requestedBy)).toBe(String(actor._id));
        }
    );

    test.each(["admin", "asesor", "auditor", "capacitador", "administrativo"])(
        "%s cannot preview or create internal work",
        async role => {
            const actor = user(role);
            await createInternalState("check_new");
            await expect(previewAffiliateCheckSelection({ user: actor, mode: "check_new", requestedCount: 1 }))
                .rejects.toMatchObject({ code: "INTERNAL_CHECK_ROLE_FORBIDDEN", statusCode: 403 });
            await expect(createAffiliateCheckJob({ user: actor, mode: "check_new", requestedCount: 1, supervisorId: new mongoose.Types.ObjectId() }))
                .rejects.toMatchObject({ code: "INTERNAL_CHECK_ROLE_FORBIDDEN", statusCode: 403 });
        }
    );

    test("check_new, check_reusable, check_import, and extract_base can coexist for one supervisor", async () => {
        const owner = user();
        await Promise.all([createInternalState("check_new"), createInternalState("check_reusable"), createExtractState()]);
        const importJob = await createImport(owner, 1);

        const results = await Promise.allSettled([
            createAffiliateCheckJob({ user: owner, mode: "check_new", requestedCount: 1 }),
            createAffiliateCheckJob({ user: owner, mode: "check_reusable", requestedCount: 1 }),
            createImportedAffiliateCheckJob({ user: owner, importJobId: importJob._id, requestedCount: 1 }),
            createAffiliateCheckJob({ user: owner, mode: "extract_base", requestedCount: 1 })
        ]);

        expectAllFulfilled(results);
        expect(await AffiliateCheckJob.countDocuments({ channelOwner: owner._id, mode: { $in: ["check_new", "check_reusable", "check_import"] } })).toBe(3);
        expect(await AffiliateAssignment.countDocuments({ supervisorId: owner._id, source: "extract_base", status: "active" })).toBe(1);
    });

    test("extract_base quota exceeded is blocked without using channel guard", async () => {
        await AffiliateCheckConfig.updateOne({ active: true }, { $set: { "dailyQuota.extractBase": 0 } });
        const owner = user();
        await createExtractState();
        await expect(createAffiliateCheckJob({ user: owner, mode: "extract_base", requestedCount: 1 }))
            .rejects.toMatchObject({ code: "DAILY_QUOTA_EXHAUSTED", statusCode: 429 });
    });

    test("concurrent extraction of one affiliate creates only one active assignment", async () => {
        const owner = user();
        await createExtractState();
        const results = await Promise.allSettled([
            createAffiliateCheckJob({ user: owner, mode: "extract_base", requestedCount: 1 }),
            createAffiliateCheckJob({ user: owner, mode: "extract_base", requestedCount: 1 })
        ]);
        expect(results.filter(result => result.status === "fulfilled")).toHaveLength(2);
        expect(await AffiliateAssignment.countDocuments({ supervisorId: owner._id, source: "extract_base", status: "active" })).toBe(1);
    });

});
