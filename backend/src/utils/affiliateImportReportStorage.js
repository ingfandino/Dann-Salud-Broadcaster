"use strict";

const path = require("path");
const fs = require("fs").promises;
const logger = require("./logger");

const BACKEND_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, "..");
const FALLBACK_REPORT_ROOT = path.resolve(BACKEND_ROOT, "uploads/affiliate-reports");
const KNOWN_LEGACY_REPORT_ROOTS = [
    path.resolve("/home/dann-salud/Documentos/Dann-Salud-Broadcaster/backend/uploads/affiliate-reports"),
    path.resolve("/home/dann-salud/Documentos/Dann-Salud-Broadcaster-release/backend/uploads/affiliate-reports"),
    path.resolve(`${PROJECT_ROOT}-release/backend/uploads/affiliate-reports`)
];

function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
}

function parseLegacyRoots() {
    const configured = String(process.env.AFFILIATE_IMPORT_LEGACY_REPORT_DIRS || "")
        .split(/[;:,]/)
        .map(value => value.trim())
        .filter(Boolean)
        .map(value => path.resolve(value));
    return unique([...configured, ...KNOWN_LEGACY_REPORT_ROOTS]);
}

function getAffiliateImportReportRoot() {
    return path.resolve(process.env.AFFILIATE_IMPORT_REPORT_DIR || FALLBACK_REPORT_ROOT);
}

function getApprovedAffiliateImportReportRoots() {
    const canonicalRoot = getAffiliateImportReportRoot();
    return unique([canonicalRoot, ...parseLegacyRoots()]).map(root => ({
        root,
        legacy: root !== canonicalRoot
    }));
}

function isPathInsideRoot(filePath, root) {
    const relative = path.relative(root, filePath);
    return Boolean(relative)
        && relative !== "."
        && !relative.startsWith("..")
        && !path.isAbsolute(relative);
}

function resolveAffiliateImportReportPath(storedPath) {
    if (!storedPath || typeof storedPath !== "string") {
        return { authorized: false, filePath: null, reason: "MISSING_REPORT_PATH" };
    }

    const filePath = path.resolve(storedPath);
    for (const entry of getApprovedAffiliateImportReportRoots()) {
        if (isPathInsideRoot(filePath, entry.root)) {
            return {
                authorized: true,
                filePath,
                root: entry.root,
                isLegacy: entry.legacy
            };
        }
    }

    return { authorized: false, filePath, reason: "REPORT_PATH_OUTSIDE_APPROVED_ROOTS" };
}

function isAuthorizedAffiliateImportReportPath(storedPath) {
    return resolveAffiliateImportReportPath(storedPath).authorized;
}

async function ensureAffiliateImportReportDirectory() {
    const root = getAffiliateImportReportRoot();
    await fs.mkdir(root, { recursive: true });
    return root;
}

async function buildAffiliateImportReportPath(filename) {
    const root = await ensureAffiliateImportReportDirectory();
    return path.join(root, path.basename(filename));
}

async function affiliateImportReportExists(storedPath) {
    const resolved = resolveAffiliateImportReportPath(storedPath);
    if (!resolved.authorized) return false;
    try {
        await fs.access(resolved.filePath);
        return true;
    } catch {
        return false;
    }
}

function logLegacyAffiliateImportReportAccess(storedPath, context = "download") {
    const resolved = resolveAffiliateImportReportPath(storedPath);
    if (resolved.authorized && resolved.isLegacy) {
        logger.warn(`[AFFILIATE-IMPORT] Serving legacy report path during ${context}`);
    }
}

module.exports = {
    getAffiliateImportReportRoot,
    getApprovedAffiliateImportReportRoots,
    resolveAffiliateImportReportPath,
    isAuthorizedAffiliateImportReportPath,
    ensureAffiliateImportReportDirectory,
    buildAffiliateImportReportPath,
    affiliateImportReportExists,
    logLegacyAffiliateImportReportAccess
};
