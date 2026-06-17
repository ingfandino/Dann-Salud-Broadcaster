"use strict";

const fs = require("fs");
const path = require("path");

function loadStorageWithEnv(env = {}) {
    const modulePath = "../src/utils/affiliateImportReportStorage";
    jest.resetModules();
    delete process.env.AFFILIATE_IMPORT_REPORT_DIR;
    delete process.env.AFFILIATE_IMPORT_LEGACY_REPORT_DIRS;
    Object.assign(process.env, env);
    return require(modulePath);
}

describe("affiliate import report storage", () => {
    afterEach(() => {
        delete process.env.AFFILIATE_IMPORT_REPORT_DIR;
        delete process.env.AFFILIATE_IMPORT_LEGACY_REPORT_DIRS;
        jest.resetModules();
    });

    test("uses AFFILIATE_IMPORT_REPORT_DIR as canonical report root", () => {
        const storage = loadStorageWithEnv({ AFFILIATE_IMPORT_REPORT_DIR: "/tmp/dannsalud-reports" });
        expect(storage.getAffiliateImportReportRoot()).toBe(path.resolve("/tmp/dannsalud-reports"));
    });

    test("falls back to backend uploads affiliate report directory", () => {
        const storage = loadStorageWithEnv();
        expect(storage.getAffiliateImportReportRoot()).toBe(
            path.resolve(__dirname, "../uploads/affiliate-reports")
        );
    });

    test("accepts canonical-root files and rejects traversal and sibling prefix paths", () => {
        const storage = loadStorageWithEnv({ AFFILIATE_IMPORT_REPORT_DIR: "/data/reports" });

        expect(storage.resolveAffiliateImportReportPath("/data/reports/file.xlsx")).toMatchObject({
            authorized: true,
            isLegacy: false
        });
        expect(storage.resolveAffiliateImportReportPath("/data/reports/../secret.xlsx")).toMatchObject({
            authorized: false
        });
        expect(storage.resolveAffiliateImportReportPath("/data/reports-old/file.xlsx")).toMatchObject({
            authorized: false
        });
    });

    test("accepts configured legacy roots for reads but rejects unknown external absolute paths", () => {
        const storage = loadStorageWithEnv({
            AFFILIATE_IMPORT_REPORT_DIR: "/data/reports",
            AFFILIATE_IMPORT_LEGACY_REPORT_DIRS: "/legacy/reports;/other/legacy"
        });

        expect(storage.resolveAffiliateImportReportPath("/legacy/reports/old.xlsx")).toMatchObject({
            authorized: true,
            isLegacy: true
        });
        expect(storage.resolveAffiliateImportReportPath("/unknown/reports/file.xlsx")).toMatchObject({
            authorized: false
        });
    });

    test("builds new report paths under the canonical root only", async () => {
        const storage = loadStorageWithEnv({ AFFILIATE_IMPORT_REPORT_DIR: "/tmp/dannsalud-canonical" });
        await expect(storage.buildAffiliateImportReportPath("../unsafe.xlsx")).resolves.toBe(
            path.resolve("/tmp/dannsalud-canonical/unsafe.xlsx")
        );
    });

    test("upload history buttons use report availability rather than counts", () => {
        const source = fs.readFileSync(
            path.resolve(__dirname, "../../frontend-nextjs/components/dashboard/base-afiliados-cargar.tsx"),
            "utf8"
        );

        expect(source).toContain("Boolean(item.updatedFileAvailable || item.updatedFileUrl)");
        expect(source).toContain("Boolean(item.rejectedFileAvailable || item.rejectedFileUrl)");
        expect(source).not.toContain("safeNumber(item.actualizados) > 0");
        expect(source).not.toContain("safeNumber(item.rechazados) > 0");
    });
});
