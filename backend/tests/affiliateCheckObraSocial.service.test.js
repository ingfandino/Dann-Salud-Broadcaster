"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const SocialHealthList = require("../src/models/SocialHealthList");
const {
    createAffiliateCheckJob,
    previewAffiliateCheckSelection
} = require("../src/services/affiliateCheck.service");
const {
    buildFairTargets,
    classifyStoredNameToCatalog,
    FUZZY_MIN_GAP,
    FUZZY_MIN_SCORE
} = require("../src/services/affiliateCheckObraSocial.service");

const CATALOG = [
    { code: 100001, name: "OBRA SOCIAL A" },
    { code: 100002, name: "OBRA SOCIAL B" },
    { code: 100003, name: "OBRA SOCIAL C" }
];

function user() {
    return { _id: new mongoose.Types.ObjectId(), role: "supervisor" };
}

async function createStates(name, count, overrides = {}) {
    const created = [];
    for (let index = 0; index < count; index += 1) {
        const cuil = String(20000000000 + Math.floor(Math.random() * 7000000000));
        created.push(await AffiliateOperationalState.create({
            affiliateId: new mongoose.Types.ObjectId(),
            cuil,
            cuilNormalized: cuil,
            obraSocial: name,
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false,
            currentCheckJobId: null,
            ...overrides
        }));
    }
    return created;
}

function automatic() {
    return { strategy: "automatic", items: [] };
}

function manual(...codes) {
    return {
        strategy: "manual",
        items: codes.map(code => ({ code, name: "CLIENT NAME IS NOT TRUSTED" }))
    };
}

describe("affiliate check Obra Social balanced allocation", () => {
    beforeAll(async () => {
        await AffiliateCheckJob.init();
    });

    beforeEach(async () => {
        await AffiliateCheckConfig.create({
            dailyQuota: { checkNew: 100, checkReusable: 100 },
            features: { checkNewEnabled: true, checkReusableEnabled: true }
        });
        await SocialHealthList.create(CATALOG);
    });

    test("water filling balances and redistributes shortages", () => {
        const planned = buildFairTargets([
            { code: 1, availableCount: 100 },
            { code: 2, availableCount: 1 },
            { code: 3, availableCount: 100 }
        ], 5);
        expect(planned.map(item => item.plannedCount)).toEqual([2, 1, 2]);
    });

    test("automatic preview with eligible data returns a non-empty planned distribution", async () => {
        await Promise.all(CATALOG.map(item => createStates(item.name, 2)));
        const preview = await previewAffiliateCheckSelection({
            user: user(),
            mode: "check_new",
            requestedCount: 3,
            obraSocialSelection: automatic()
        });
        expect(preview.willSelectCount).toBe(3);
        expect(preview.distribution.length).toBeGreaterThan(0);
        for (const item of preview.distribution) {
            expect(item).toEqual(expect.objectContaining({
                code: expect.any(Number),
                name: expect.any(String),
                availableCount: expect.any(Number),
                plannedCount: expect.any(Number)
            }));
        }
    });

    test("strict fuzzy mapping requires threshold and score gap", () => {
        const catalog = [
            { code: 1, name: "OBRA SOCIAL ALFA" },
            { code: 2, name: "OBRA SOCIAL ALFA PLUS" }
        ];
        expect(FUZZY_MIN_SCORE).toBe(0.88);
        expect(FUZZY_MIN_GAP).toBe(0.08);
        const ambiguous = classifyStoredNameToCatalog("OBRA SOCIAL ALFA PLU", catalog);
        expect(ambiguous.category).toBe("ambiguous");
        expect(ambiguous.item).toBeNull();
        const unresolved = classifyStoredNameToCatalog("VALOR SIN RELACION", catalog);
        expect(unresolved.category).toBe("unresolved");
        expect(unresolved.item).toBeNull();
    });

    test("automatic allocation varies equal organizations and persists final distribution", async () => {
        await Promise.all(CATALOG.map(item => createStates(item.name, 4)));
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 6,
            obraSocialSelection: automatic()
        });
        expect(job.selectedCount).toBe(6);
        expect(job.obraSocialSelection.strategy).toBe("automatic");
        expect(job.obraSocialSelection.finalDistribution.map(item => item.selectedCount)).toEqual([2, 2, 2]);
        expect(job.obraSocialSelection.finalDistribution.reduce((sum, item) => sum + item.selectedCount, 0)).toBe(6);
    });

    test("manual allocation balances selected organizations and never uses unselected ones", async () => {
        await createStates(CATALOG[0].name, 4);
        await createStates(CATALOG[1].name, 4);
        await createStates(CATALOG[2].name, 4);
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 6,
            obraSocialSelection: manual(100001, 100003)
        });
        expect(job.obraSocialSelection.requestedItems.map(item => item.name))
            .toEqual(["OBRA SOCIAL A", "OBRA SOCIAL C"]);
        expect(job.obraSocialSelection.finalDistribution.map(item => item.selectedCount)).toEqual([3, 3]);
        const rows = await AffiliateCheckRow.find({ jobId: job._id }).select("operationalStateId").lean();
        const states = await AffiliateOperationalState.find({
            _id: { $in: rows.map(row => row.operationalStateId) }
        }).select("obraSocial").lean();
        expect(new Set(states.map(item => item.obraSocial))).toEqual(new Set(["OBRA SOCIAL A", "OBRA SOCIAL C"]));
        expect(job.obraSocialSelection.requestedItems).toHaveLength(2);
        expect(job.obraSocialSelection.finalDistribution).toHaveLength(2);
        expect(job.obraSocialSelection.finalDistribution.reduce((sum, item) => sum + item.selectedCount, 0)).toBe(job.selectedCount);
    });

    test("zero-availability selected organization is reported and remaining slots redistribute", async () => {
        await createStates(CATALOG[0].name, 5);
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 4,
            obraSocialSelection: manual(100001, 100002)
        });
        expect(job.selectedCount).toBe(4);
        expect(job.obraSocialSelection.finalDistribution).toEqual([
            expect.objectContaining({ code: 100001, selectedCount: 4 }),
            expect.objectContaining({ code: 100002, availableCount: 0, selectedCount: 0 })
        ]);
    });

    test("empty manual selection and invalid client code are rejected", async () => {
        await createStates(CATALOG[0].name, 1);
        await expect(createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: { strategy: "manual", items: [] }
        })).rejects.toMatchObject({ code: "OBRA_SOCIAL_SELECTION_REQUIRED", statusCode: 400 });
        await expect(createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: manual(999999)
        })).rejects.toMatchObject({ code: "INVALID_OBRA_SOCIAL_CODE", statusCode: 400 });
    });

    test("automatic finalDistribution sum equals selectedCount", async () => {
        await createStates(CATALOG[0].name, 2);
        await createStates(CATALOG[1].name, 2);
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 4,
            obraSocialSelection: automatic()
        });
        expect(job.obraSocialSelection.finalDistribution.reduce((sum, item) => sum + item.selectedCount, 0)).toBe(job.selectedCount);
    });

    test("zero selected returns no job", async () => {
        await expect(createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: automatic()
        })).rejects.toMatchObject({ code: "NO_SELECTABLE_AFFILIATES", statusCode: 422 });
        expect(await AffiliateCheckJob.countDocuments()).toBe(0);
    });

    test("ambiguous label contributes to neither count nor reservation", async () => {
        await SocialHealthList.create({ code: 100004, name: "OBRA SOCIAL A PLUS" });
        await createStates("OBRA SOCIAL A PLU", 3);
        await expect(createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: automatic()
        })).rejects.toMatchObject({ code: "NO_SELECTABLE_AFFILIATES" });
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
    });

    test("active AffiliateAssignment is excluded from availability and reservation", async () => {
        const [state] = await createStates(CATALOG[0].name, 1);
        await createStates(CATALOG[0].name, 1);
        await AffiliateAssignment.create({
            affiliateId: state.affiliateId,
            operationalStateId: state._id,
            supervisorId: new mongoose.Types.ObjectId(),
            assignedBy: new mongoose.Types.ObjectId(),
            status: "active",
            source: "manual",
            assignedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000)
        });
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: automatic()
        });
        expect(job.selectedCount).toBe(1);
        const row = await AffiliateCheckRow.findOne({ jobId: job._id }).lean();
        expect(String(row.affiliateId)).not.toBe(String(state.affiliateId));
    });

    test("preview may overestimate active assignments but creation reserves none of them", async () => {
        const [state] = await createStates(CATALOG[0].name, 1);
        await AffiliateAssignment.create({
            affiliateId: state.affiliateId,
            operationalStateId: state._id,
            supervisorId: new mongoose.Types.ObjectId(),
            assignedBy: new mongoose.Types.ObjectId(),
            status: "active",
            source: "manual",
            assignedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000)
        });
        const preview = await previewAffiliateCheckSelection({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: automatic()
        });
        expect(preview.willSelectCount).toBe(1);
        await expect(createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 1,
            obraSocialSelection: automatic()
        })).rejects.toMatchObject({ code: "NO_SELECTABLE_AFFILIATES" });
        expect(await AffiliateCheckRow.countDocuments()).toBe(0);
        const cancelledJob = await AffiliateCheckJob.findOne({ cancellationReason: "zero_rows_reserved" }).lean();
        expect(cancelledJob).toEqual(expect.objectContaining({ status: "cancelled", selectedCount: 0 }));
    });

    test("check_reusable allows stale assigned ownership but excludes valid ownership and blocked rows", async () => {
        const expired = new Date(Date.now() - 60_000);
        const valid = new Date(Date.now() + 60_000);
        await createStates(CATALOG[0].name, 1, {
            freshness: "reusable",
            verificationStatus: "expired",
            usageStatus: "assigned",
            ownership: { supervisorId: new mongoose.Types.ObjectId(), expiresAt: expired, source: "manual" }
        });
        await createStates(CATALOG[0].name, 1, {
            freshness: "reusable",
            verificationStatus: "expired",
            usageStatus: "assigned",
            ownership: { supervisorId: new mongoose.Types.ObjectId(), expiresAt: valid, source: "manual" }
        });
        await createStates(CATALOG[0].name, 1, {
            freshness: "reusable",
            verificationStatus: "expired",
            usageStatus: "blocked"
        });
        const preview = await previewAffiliateCheckSelection({
            user: user(),
            mode: "check_reusable",
            requestedCount: 3,
            obraSocialSelection: automatic()
        });
        expect(preview.selectableCount).toBe(1);
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_reusable",
            requestedCount: 3,
            obraSocialSelection: automatic()
        });
        expect(job.selectedCount).toBe(1);
    });

    test("partial creation reflects total selected availability", async () => {
        await createStates(CATALOG[0].name, 2);
        await createStates(CATALOG[1].name, 1);
        const job = await createAffiliateCheckJob({
            user: user(),
            mode: "check_new",
            requestedCount: 10,
            obraSocialSelection: automatic()
        });
        expect(job.selectedCount).toBe(3);
        expect(job._partialCreation).toBe(true);
        expect(job.obraSocialSelection.finalDistribution.reduce((sum, item) => sum + item.selectedCount, 0)).toBe(3);
    });

    test("creation recalculates after a stale preview", async () => {
        await createStates(CATALOG[0].name, 5);
        const first = user();
        const second = user();
        const preview = await previewAffiliateCheckSelection({
            user: first,
            mode: "check_new",
            requestedCount: 5,
            obraSocialSelection: automatic()
        });
        expect(preview.willSelectCount).toBe(5);
        await createAffiliateCheckJob({
            user: second,
            mode: "check_new",
            requestedCount: 2,
            obraSocialSelection: automatic()
        });
        const created = await createAffiliateCheckJob({
            user: first,
            mode: "check_new",
            requestedCount: 5,
            obraSocialSelection: automatic()
        });
        expect(created.selectedCount).toBe(3);
    });

    test("two supervisors competing automatically never reserve the same Affiliate", async () => {
        await createStates(CATALOG[0].name, 4);
        await createStates(CATALOG[1].name, 4);
        await createStates(CATALOG[2].name, 4);
        const results = await Promise.all([
            createAffiliateCheckJob({
                user: user(),
                mode: "check_new",
                requestedCount: 8,
                obraSocialSelection: automatic()
            }),
            createAffiliateCheckJob({
                user: user(),
                mode: "check_new",
                requestedCount: 8,
                obraSocialSelection: automatic()
            })
        ]);
        const rows = await AffiliateCheckRow.find({
            jobId: { $in: results.map(job => job._id) }
        }).select("affiliateId").lean();
        expect(rows).toHaveLength(12);
        expect(new Set(rows.map(row => String(row.affiliateId))).size).toBe(12);
    });
});
