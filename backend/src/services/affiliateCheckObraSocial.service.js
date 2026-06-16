"use strict";

const SocialHealthList = require("../models/SocialHealthList");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");

const INTERNAL_MODES = ["check_new", "check_reusable"];
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const FUZZY_MIN_SCORE = 0.88;
const FUZZY_MIN_GAP = 0.08;

function selectionError(message, code, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function normalizeObraSocialText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

function tokenSet(value) {
    return new Set(normalizeObraSocialText(value).split(" ").filter(token => token.length > 1));
}

function tokenSimilarity(left, right) {
    const a = tokenSet(left);
    const b = tokenSet(right);
    if (!a.size || !b.size) return 0;
    let intersection = 0;
    for (const token of a) if (b.has(token)) intersection += 1;
    return (2 * intersection) / (a.size + b.size);
}

function embeddedCatalogCode(value) {
    const matches = String(value || "").match(/\b\d{5,6}\b/g);
    return matches?.length ? Number(matches[matches.length - 1]) : null;
}

function buildCatalogMaps(catalog) {
    return {
        byCode: new Map(catalog.map(item => [Number(item.code), item])),
        byNormalizedName: new Map(catalog.map(item => [normalizeObraSocialText(item.name), item]))
    };
}

function scoreCatalogCandidate(normalizedStoredName, catalogName) {
    const itemNormalized = normalizeObraSocialText(catalogName);
    const substring = normalizedStoredName.includes(itemNormalized) || itemNormalized.includes(normalizedStoredName);
    return substring ? 0.9 : tokenSimilarity(normalizedStoredName, itemNormalized);
}

function classifyStoredNameToCatalog(storedName, catalog, maps = buildCatalogMaps(catalog)) {
    const normalized = normalizeObraSocialText(storedName);
    if (!normalized) return { category: "unresolved", item: null, score: 0, secondScore: 0 };
    const exact = maps.byNormalizedName.get(normalized);
    if (exact) return { category: "exact", item: exact, score: 1, secondScore: 0 };

    const code = embeddedCatalogCode(storedName);
    if (code && maps.byCode.has(code)) {
        return { category: "embedded_code", item: maps.byCode.get(code), score: 1, secondScore: 0 };
    }

    const scored = catalog
        .map(item => ({ item, score: scoreCatalogCandidate(normalized, item.name) }))
        .sort((a, b) => b.score - a.score || Number(a.item.code) - Number(b.item.code));
    const best = scored[0] || { item: null, score: 0 };
    const second = scored[1] || { item: null, score: 0 };
    if (best.score < FUZZY_MIN_SCORE) {
        return { category: "unresolved", item: null, score: best.score, secondScore: second.score };
    }
    if ((best.score - second.score) < FUZZY_MIN_GAP) {
        return { category: "ambiguous", item: null, score: best.score, secondScore: second.score };
    }
    return { category: "fuzzy", item: best.item, score: best.score, secondScore: second.score };
}

function matchStoredNameToCatalog(storedName, catalog, maps = buildCatalogMaps(catalog)) {
    return classifyStoredNameToCatalog(storedName, catalog, maps).item;
}

function normalizeSelection(selection, legacyObraSocial) {
    if (!selection && legacyObraSocial) {
        return {
            strategy: "manual",
            items: [{ name: String(legacyObraSocial).trim() }],
            legacy: true
        };
    }
    const strategy = selection?.strategy || "automatic";
    if (!["automatic", "manual"].includes(strategy)) {
        throw selectionError("Estrategia de obra social inválida.", "INVALID_OBRA_SOCIAL_STRATEGY");
    }
    const items = Array.isArray(selection?.items) ? selection.items : [];
    if (strategy === "manual" && items.length === 0) {
        throw selectionError("Selecciona al menos una obra social.", "OBRA_SOCIAL_SELECTION_REQUIRED");
    }
    return { strategy, items, legacy: false };
}

async function resolveSelectionCatalogItems(selection) {
    if (selection.strategy === "automatic") return [];
    const catalog = await SocialHealthList.find({}).select("code name").lean();
    const maps = buildCatalogMaps(catalog);
    const resolved = [];
    const seen = new Set();
    for (const requested of selection.items) {
        let item = null;
        if (requested?.code !== undefined && requested?.code !== null && requested?.code !== "") {
            item = maps.byCode.get(Number(requested.code)) || null;
        } else if (selection.legacy && requested?.name) {
            item = matchStoredNameToCatalog(requested.name, catalog, maps);
        }
        if (!item) {
            throw selectionError("Una de las obras sociales seleccionadas no pertenece al catálogo vigente.", "INVALID_OBRA_SOCIAL_CODE");
        }
        if (!seen.has(Number(item.code))) {
            seen.add(Number(item.code));
            resolved.push({ code: Number(item.code), name: item.name });
        }
    }
    return resolved;
}

function buildFairTargets(groups, requestedCount) {
    const targets = new Map(groups.map(group => [group.code, 0]));
    const remaining = new Map(groups.map(group => [group.code, Math.max(0, Number(group.availableCount || 0))]));
    let slots = Math.max(0, Number(requestedCount || 0));
    let active = groups.filter(group => remaining.get(group.code) > 0);
    while (slots > 0 && active.length > 0) {
        let progressed = false;
        for (const group of active) {
            if (slots <= 0) break;
            const available = remaining.get(group.code);
            if (available <= 0) continue;
            targets.set(group.code, targets.get(group.code) + 1);
            remaining.set(group.code, available - 1);
            slots -= 1;
            progressed = true;
        }
        if (!progressed) break;
        active = active.filter(group => remaining.get(group.code) > 0);
    }
    return groups.map(group => ({ ...group, plannedCount: targets.get(group.code) || 0 }));
}

function searchScore(item, search) {
    const term = normalizeObraSocialText(search);
    if (!term) return 1;
    const code = String(item.code);
    if (/^\d+$/.test(term) && code.startsWith(term)) return code === term ? 100 : 90;
    const name = normalizeObraSocialText(item.name);
    if (name.includes(term)) return 80;
    const tokens = term.split(" ").filter(Boolean);
    if (tokens.every(token => name.includes(token))) return 70;
    const similarity = tokenSimilarity(name, term);
    return similarity >= 0.45 ? Math.round(similarity * 60) : 0;
}

async function aggregateAvailability({ mode, buildEligibilityQuery, now = new Date() }) {
    const rows = await AffiliateOperationalState.aggregate([
        { $match: buildEligibilityQuery(mode, {}, now) },
        { $match: { obraSocial: { $type: "string", $ne: "" } } },
        { $group: { _id: "$obraSocial", availableCount: { $sum: 1 } } }
    ]);
    const catalog = await SocialHealthList.find({}).select("code name").lean();
    const maps = buildCatalogMaps(catalog);
    const grouped = new Map();
    for (const row of rows) {
        const item = matchStoredNameToCatalog(row._id, catalog, maps);
        if (!item) continue;
        const code = Number(item.code);
        const current = grouped.get(code) || {
            code,
            codePadded: String(code).padStart(6, "0"),
            name: item.name,
            availableCount: 0,
            storedNames: []
        };
        current.availableCount += Number(row.availableCount || 0);
        current.storedNames.push(row._id);
        grouped.set(code, current);
    }
    return [...grouped.values()];
}

async function getInternalObraSocialAvailability({
    mode,
    search = "",
    limit = DEFAULT_LIMIT,
    selectedCodes,
    buildEligibilityQuery,
    now = new Date()
}) {
    if (!INTERNAL_MODES.includes(mode)) {
        throw selectionError("Modo interno inválido.", "INVALID_INTERNAL_MODE");
    }
    const boundedLimit = Math.max(1, Math.min(MAX_LIMIT, Number(limit) || DEFAULT_LIMIT));
    const selected = new Set((selectedCodes || []).map(Number));
    const groups = await aggregateAvailability({ mode, buildEligibilityQuery, now });
    const ranked = groups
        .map(item => ({ ...item, relevance: selected.has(item.code) ? 101 : searchScore(item, search) }))
        .filter(item => item.availableCount > 0 && item.relevance > 0)
        .sort((a, b) =>
            b.relevance - a.relevance
            || b.availableCount - a.availableCount
            || a.name.localeCompare(b.name, "es")
        );
    return {
        totalOrganizations: ranked.length,
        data: ranked.slice(0, boundedLimit).map(({ storedNames, relevance, ...item }) => item),
        groups
    };
}

async function resolveDistribution({
    mode,
    requestedCount,
    selection,
    buildEligibilityQuery,
    now = new Date()
}) {
    const requestedItems = await resolveSelectionCatalogItems(selection);
    const availability = await aggregateAvailability({ mode, buildEligibilityQuery, now });
    const allowedCodes = selection.strategy === "manual"
        ? new Set(requestedItems.map(item => item.code))
        : null;
    const selectedGroups = availability.filter(group => !allowedCodes || allowedCodes.has(group.code));
    const byCode = new Map(selectedGroups.map(group => [group.code, group]));
    const distribution = buildFairTargets(
        selection.strategy === "manual"
            ? requestedItems.map(item => byCode.get(item.code) || {
                ...item,
                codePadded: String(item.code).padStart(6, "0"),
                availableCount: 0,
                storedNames: []
            })
            : selectedGroups,
        requestedCount
    );
    return {
        requestedItems,
        distribution,
        availableCount: distribution.reduce((sum, item) => sum + item.availableCount, 0)
    };
}

module.exports = {
    aggregateAvailability,
    buildFairTargets,
    classifyStoredNameToCatalog,
    FUZZY_MIN_GAP,
    FUZZY_MIN_SCORE,
    getInternalObraSocialAvailability,
    matchStoredNameToCatalog,
    normalizeObraSocialText,
    normalizeSelection,
    resolveDistribution,
    resolveSelectionCatalogItems,
    tokenSimilarity
};
