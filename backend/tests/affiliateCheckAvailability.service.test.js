"use strict";

jest.setTimeout(30000);
require("./setup");

const mongoose = require("mongoose");
const AffiliateCheckConfig = require("../src/models/AffiliateCheckConfig");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const SocialHealthList = require("../src/models/SocialHealthList");
const {
    getAffiliateCheckObraSocialAvailability
} = require("../src/services/affiliateCheck.service");

function user(role = "supervisor") {
    return { _id: new mongoose.Types.ObjectId(), role };
}

async function state(obraSocial, mode = "check_new") {
    const cuil = String(Math.floor(20000000000 + Math.random() * 7000000000));
    const reusable = mode === "check_reusable";
    return AffiliateOperationalState.create({
        affiliateId: new mongoose.Types.ObjectId(),
        cuil,
        cuilNormalized: cuil,
        obraSocial,
        freshness: reusable ? "reusable" : "fresh",
        verificationStatus: reusable ? "expired" : "unchecked",
        usageStatus: reusable ? "available" : "never_used",
        saleStatus: "none",
        availableForSale: false,
        currentCheckJobId: null
    });
}

describe("affiliate check Obra Social availability", () => {
    beforeEach(async () => {
        await AffiliateCheckConfig.create({
            dailyQuota: { checkNew: 100, checkReusable: 100 },
            features: { checkNewEnabled: true, checkReusableEnabled: true }
        });
        await SocialHealthList.create([
            { code: 123400, name: "OBRA SOCIAL DE EMPLEADOS DE COMERCIO" },
            { code: 654321, name: "OBRA SOCIAL MÉDICA DEL SUR" },
            { code: 777777, name: "OBRA SOCIAL SIN STOCK" }
        ]);
    });

    test("returns only catalog organizations with real availability", async () => {
        await state("OBRA SOCIAL DE EMPLEADOS DE COMERCIO");
        await state("OBRA SOCIAL DE EMPLEADOS DE COMERCIO");
        await state("LEGACY VALUE WITHOUT CATALOG");

        const result = await getAffiliateCheckObraSocialAvailability({
            user: user(),
            mode: "check_new",
            limit: 50
        });

        expect(result.totalOrganizations).toBe(1);
        expect(result.data).toEqual([expect.objectContaining({
            code: 123400,
            availableCount: 2
        })]);
    });

    test.each([
        ["comercio", 123400],
        ["emplead comercio", 123400],
        ["medica sur", 654321],
        ["médica", 654321],
        ["1234", 123400]
    ])("search %s is normalized and bounded", async (search, expectedCode) => {
        await state("OBRA SOCIAL DE EMPLEADOS DE COMERCIO");
        await state("OBRA SOCIAL MÉDICA DEL SUR");
        const result = await getAffiliateCheckObraSocialAvailability({
            user: user(),
            mode: "check_new",
            search,
            limit: 1
        });
        expect(result.data).toHaveLength(1);
        expect(result.data[0].code).toBe(expectedCode);
    });

    test("check_new and check_reusable apply their own eligibility", async () => {
        await state("OBRA SOCIAL DE EMPLEADOS DE COMERCIO", "check_new");
        await state("OBRA SOCIAL DE EMPLEADOS DE COMERCIO", "check_reusable");
        const actor = user();

        const fresh = await getAffiliateCheckObraSocialAvailability({
            user: actor,
            mode: "check_new"
        });
        const reusable = await getAffiliateCheckObraSocialAvailability({
            user: actor,
            mode: "check_reusable"
        });

        expect(fresh.data[0].availableCount).toBe(1);
        expect(reusable.data[0].availableCount).toBe(1);
    });

    test("admin is denied and supervisor is allowed", async () => {
        await state("OBRA SOCIAL DE EMPLEADOS DE COMERCIO");
        await expect(getAffiliateCheckObraSocialAvailability({
            user: user("admin"),
            mode: "check_new"
        })).rejects.toMatchObject({ code: "INTERNAL_CHECK_ROLE_FORBIDDEN", statusCode: 403 });

        await expect(getAffiliateCheckObraSocialAvailability({
            user: user("supervisor"),
            mode: "check_new"
        })).resolves.toMatchObject({ totalOrganizations: 1 });
    });
});
