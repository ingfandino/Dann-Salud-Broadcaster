const Affiliate = require("../models/Affiliate");
const AffiliateContribution = require("../models/AffiliateContribution");
const { getLocalitiesByZone, ALL_KNOWN_LOCALITIES } = require("../constants/localityZones");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function periodToNum(p) {
    if (!p) return 0;
    const [mm, yyyy] = p.split("/");
    if (!mm || !yyyy) return 0;
    return parseInt(yyyy + mm.padStart(2, "0"), 10);
}

/**
 * Builds an array of affiliates based on unified selection modes.
 * @param {Object} params 
 * @param {String} params.mode - 'full', 'filtered', 'pending', 'selected', 'byObraSocial'
 * @param {Object} params.filters - Filter object (search, zona, localidad, periodFrom, periodTo, obraSocial, verificationStatus)
 * @param {Array} params.selectedIds - Array of ObjectId strings for 'selected' mode
 * @param {Array} params.groups - Array of {obraSocial, limit} for 'byObraSocial' mode
 * @param {Number} params.limit - Global limit for 'filtered' or 'pending' mode
 * @returns {Promise<Array>} List of Lean Affiliate documents
 */
async function buildAffiliateBatch({ mode, filters = {}, selectedIds = [], groups = [], limit = 0 }) {
    // Mode 1: Full
    if (mode === "full") {
        let q = Affiliate.find({}).sort({ uploadDate: -1 });
        if (limit > 0) q = q.limit(limit);
        return q.lean();
    }

    // Mode 2: Selected
    if (mode === "selected") {
        if (!selectedIds.length) return [];
        let q = Affiliate.find({ _id: { $in: selectedIds } });
        if (limit > 0) q = q.limit(limit);
        return q.lean();
    }

    // Mode 3: Pending
    if (mode === "pending") {
        const pendingContribs = await AffiliateContribution.find(
            { "verification.status": "pending" },
            { affiliateId: 1 }
        ).lean();
        const pendingIds = pendingContribs.map(c => c.affiliateId);
        let q = Affiliate.find({ _id: { $in: pendingIds }, active: true }).sort({ uploadDate: -1 });
        if (limit > 0) q = q.limit(limit);
        return q.lean();
    }

    // Mode 4: By Obra Social
    if (mode === "byObraSocial") {
        if (!groups || groups.length === 0) return [];
        let allAffiliates = [];
        const usedIds = new Set();

        for (const group of groups) {
            const { obraSocial, limit: groupLimit } = group;
            if (!obraSocial) { console.log(`[ARCA-BY-OS] Skipping group with empty obraSocial`); continue; }

            const parsedLimit = parseInt(groupLimit, 10);
            const limitVal = (parsedLimit > 0) ? parsedLimit : 0;

            console.log(`[ARCA-BY-OS] querying obraSocial="${obraSocial}" limit=${limitVal || "unlimited"}`);

            const groupFilter = { 
                active: true, 
                obraSocial: { $regex: `^${escapeRegex(obraSocial)}$`, $options: "i" },
                _id: { $nin: Array.from(usedIds) }
            };
            
            let q = Affiliate.find(groupFilter).sort({ uploadDate: -1 });
            if (limitVal > 0) q = q.limit(limitVal);
            
            const groupResults = await q.lean();
            console.log(`[ARCA-BY-OS] matched count=${groupResults.length} for obraSocial="${obraSocial}"`);

            for (const a of groupResults) {
                allAffiliates.push(a);
                usedIds.add(a._id.toString());
            }
        }
        return allAffiliates;
    }

    // Mode 5: Filtered (handles search, zona, localidad, periodFrom, periodTo, obraSocial, verificationStatus)
    if (mode === "filtered") {
        const queryFilter = { active: true };

        const { search, zona, localidad, periodFrom, periodTo, obraSocial, verificationStatus } = filters;

        // Búsqueda por texto (nombre, CUIL, teléfono)
        const searchTerm = search ? search.trim() : null;
        if (searchTerm) {
            queryFilter.$or = [
                { nombre: { $regex: searchTerm, $options: "i" } },
                { cuil: { $regex: searchTerm, $options: "i" } },
                { telefono1: { $regex: searchTerm, $options: "i" } },
                { telefono2: { $regex: searchTerm, $options: "i" } },
                { telefono3: { $regex: searchTerm, $options: "i" } }
            ];
        }

        // Obra Social (array o string)
        if (obraSocial) {
            const osArray = Array.isArray(obraSocial) ? obraSocial : [obraSocial];
            const validOs = osArray.filter(os => os && os !== "all");
            if (validOs.length > 0) {
                queryFilter.obraSocial = { $in: validOs.map(os => new RegExp(`^${escapeRegex(os)}$`, "i")) };
            }
        }

        // Localidad y Zona
        if (zona && zona.toLowerCase() !== "todos") {
            const zoneLocalities = getLocalitiesByZone(zona);
            if (zoneLocalities === null) {
                queryFilter.$nor = Array.from(ALL_KNOWN_LOCALITIES).map(l => ({
                    localidad: { $regex: `^${escapeRegex(l)}$`, $options: "i" }
                }));
            } else if (zoneLocalities.length > 0) {
                const zoneRegexList = zoneLocalities.map(l => new RegExp(`^${escapeRegex(l)}$`, "i"));
                if (localidad) {
                    queryFilter.$and = [
                        { localidad: { $in: zoneRegexList } },
                        { localidad: { $regex: localidad.trim(), $options: "i" } }
                    ];
                } else {
                    queryFilter.localidad = { $in: zoneRegexList };
                }
            }
        } else if (localidad) {
            queryFilter.localidad = { $regex: localidad.trim(), $options: "i" };
        }

        // Contribution-based filters (verificationStatus, periods)
        const statuses = verificationStatus
            ? (Array.isArray(verificationStatus) ? verificationStatus : [verificationStatus]).filter(Boolean)
            : [];
        const hasContribFilter = statuses.length > 0 || periodFrom || periodTo;

        if (hasContribFilter) {
            const includePending = statuses.includes("pending");
            const nonPendingStatuses = statuses.filter(s => s !== "pending");

            console.log(`[ARCA-FILTERED] statuses=${JSON.stringify(statuses)} includePending=${includePending} periodFrom=${periodFrom||"-"} periodTo=${periodTo||"-"}`);

            if (includePending && nonPendingStatuses.length === 0 && !periodFrom && !periodTo) {
                // ONLY "pending" requested, no period filter.
                // Affiliates with NO contribution document are also "pending" — use $nin exclusion.
                // Exclude affiliates that HAVE a contribution with a status that is NOT pending.
                const excluded = await AffiliateContribution.find(
                    { "verification.status": { $nin: ["pending", null] } },
                    { affiliateId: 1 }
                ).lean();
                console.log(`[ARCA-FILTERED] excluding ${excluded.length} affiliates with non-pending contribution`);
                queryFilter._id = { $nin: excluded.map(c => c.affiliateId) };

            } else if (includePending) {
                // "pending" + other statuses (and/or period filter).
                // Step 1: affiliates with a contribution matching the full statuses list, filtered by period.
                const cFilter = {};
                if (statuses.length > 0) cFilter["verification.status"] = { $in: statuses };
                const contribs = await AffiliateContribution.find(cFilter, { affiliateId: 1, lastContributionPeriod: 1 }).lean();
                let withContrib = contribs;
                if (periodFrom || periodTo) {
                    const fromNum = periodFrom ? parseInt(periodFrom, 10) : 0;
                    const toNum   = periodTo   ? parseInt(periodTo,   10) : 999999;
                    withContrib = contribs.filter(c => {
                        const n = periodToNum(c.lastContributionPeriod);
                        return n >= fromNum && n <= toNum;
                    });
                }
                // Step 2: affiliates with NO contribution record at all (truly pending, not period-filtered).
                const allContribAffIds = (await AffiliateContribution.distinct("affiliateId"));
                // Exclude affiliates that have a contribution with status NOT in our list
                const definitelyExcluded = await AffiliateContribution.find(
                    { "verification.status": { $nin: statuses } },
                    { affiliateId: 1 }
                ).lean();
                const excludedIdSet = new Set(definitelyExcluded.map(c => c.affiliateId.toString()));
                const withContribIds = withContrib.map(c => c.affiliateId.toString());
                // Final: include (withContribIds) + (no contribution at all) = exclude only definitelyExcluded
                console.log(`[ARCA-FILTERED] withContrib matches: ${withContrib.length} | allContribAffIds: ${allContribAffIds.length} | excluded: ${excludedIdSet.size}`);
                queryFilter._id = { $nin: Array.from(excludedIdSet) };

            } else {
                // No "pending" — simple $in approach (only affiliates with explicit contribution status).
                const cFilter = {};
                if (statuses.length > 0) cFilter["verification.status"] = { $in: statuses };
                const contribs = await AffiliateContribution.find(cFilter, { affiliateId: 1, lastContributionPeriod: 1 }).lean();
                let filtered = contribs;
                if (periodFrom || periodTo) {
                    const fromNum = periodFrom ? parseInt(periodFrom, 10) : 0;
                    const toNum   = periodTo   ? parseInt(periodTo,   10) : 999999;
                    filtered = contribs.filter(c => {
                        const n = periodToNum(c.lastContributionPeriod);
                        return n >= fromNum && n <= toNum;
                    });
                }
                console.log(`[ARCA-FILTERED] non-pending matches: ${filtered.length}`);
                queryFilter._id = { $in: filtered.map(c => c.affiliateId) };
            }
        }

        const totalBeforeLimit = await Affiliate.countDocuments(queryFilter);
        console.log(`[ARCA-FILTERED] final affiliate query: ${JSON.stringify(queryFilter)}`);
        console.log(`[ARCA-FILTERED] total matches before limit: ${totalBeforeLimit}`);

        let q = Affiliate.find(queryFilter).sort({ uploadDate: -1 });
        if (limit > 0) q = q.limit(limit);
        return q.lean();
    }

    throw new Error(`Modo no soportado: ${mode}`);
}

module.exports = {
    buildAffiliateBatch,
    escapeRegex,
    periodToNum
};
