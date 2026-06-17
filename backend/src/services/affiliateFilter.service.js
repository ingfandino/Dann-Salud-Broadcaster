/**
 * ============================================================
 * AFFILIATE FILTER SERVICE
 * ============================================================
 * Resuelve el conjunto de afiliados candidatos para modos ARCA
 * que requieren respetar los filtros enviados por el frontend.
 *
 * Phase 1: usado exclusivamente por runArcaTask (filtered y byObraSocial modes).
 * affiliateController.searchAffiliates no se modifica en Phase 1.
 */

const Affiliate = require("../models/Affiliate");
const AffiliateContribution = require("../models/AffiliateContribution");
const { getLocalitiesByZone, ALL_KNOWN_LOCALITIES } = require("../constants/localityZones");

/** Escapes regex special characters (local copy — Option A, Phase 1). */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Converts a stored "MM/YYYY" period string to an integer YYYYMM for range comparison. */
function periodToNum(p) {
    if (!p) return 0;
    const parts = p.split("/");
    if (parts.length !== 2) return 0;
    const [mm, yyyy] = parts;
    return parseInt(yyyy + mm.padStart(2, "0"), 10);
}

/**
 * Clasifica un afiliado en grupo de prioridad ARCA.
 *
 * Contratos:
 *   never_reviewed (1):    sin contrib, sin verification, o sin checkedAt
 *   retryable_failure (2): status ∈ { null, pending, captcha, error }
 *   stale_terminal (3):    status ∈ { success, no_data }, checkedAt > staleMs
 *   recently_processed:    status ∈ { success, no_data }, checkedAt <= staleMs → exclude: true
 *   unknown status:        fallback → retryable_failure
 *
 * no_data y success son TERMINALES: no son retryable inmediatos.
 * Solo re-entran al pool tras ARCA_STALE_AFTER_DAYS días.
 *
 * @param {object|null} contrib  - documento AffiliateContribution o null
 * @param {number}      staleMs  - ventana de obsolescencia en milisegundos
 * @param {number}      now      - Date.now()
 * @returns {{ group: string, sortPriority: number, exclude: boolean }}
 */
function classifyArcaCandidate(contrib, staleMs, now) {
    if (!contrib || !contrib.verification || !contrib.verification.checkedAt) {
        return { group: "never_reviewed", sortPriority: 1, exclude: false };
    }
    const { status, checkedAt } = contrib.verification;
    if (!status || ["pending", "captcha", "error"].includes(status)) {
        return { group: "retryable_failure", sortPriority: 2, exclude: false };
    }
    if (["success", "no_data"].includes(status)) {
        const ageMs = now - new Date(checkedAt).getTime();
        if (ageMs > staleMs) {
            return { group: "stale_terminal", sortPriority: 3, exclude: false };
        }
        return { group: "recently_processed", sortPriority: 99, exclude: true };
    }
    // Unknown status — safe fallback to retryable
    return { group: "retryable_failure", sortPriority: 2, exclude: false };
}

/**
 * Ordena un array de afiliados por uploadDate DESC, _id ASC como desempate.
 * Muta el array recibido.
 *
 * @param {Array<{ _id, cuil, uploadDate }>} arr
 * @returns {Array}
 */
function sortByUploadDate(arr) {
    return arr.sort((a, b) => {
        const tDiff = new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
        if (tDiff !== 0) return tDiff;
        return String(a._id) < String(b._id) ? -1 : 1;
    });
}

/**
 * Construye el filtro Mongoose para la colección Affiliate a partir del objeto
 * de filtros enviado por el frontend (task.filters).
 * Maneja: search, obraSocial, zona, localidad.
 * Los filtros basados en AffiliateContribution se resuelven por separado.
 *
 * @param {object} filters
 * @returns {object} Mongoose filter
 */
function buildAffiliateBaseFilter(filters) {
    const { search, obraSocial, zona, localidad } = filters || {};
    const filter = { active: true };

    if (search) {
        const term = search.trim();
        filter.$or = [
            { nombre:    { $regex: term, $options: "i" } },
            { cuil:      { $regex: term, $options: "i" } },
            { telefono1: { $regex: term, $options: "i" } },
            { telefono2: { $regex: term, $options: "i" } },
            { telefono3: { $regex: term, $options: "i" } },
        ];
    }

    if (obraSocial) {
        if (Array.isArray(obraSocial)) {
            if (obraSocial.length > 0) filter.obraSocial = { $in: obraSocial };
        } else if (obraSocial !== "all") {
            filter.obraSocial = obraSocial;
        }
    }

    if (zona && zona.toLowerCase() !== "todos") {
        const zoneLocalities = getLocalitiesByZone(zona);
        if (zoneLocalities === null) {
            // PROVINCIA: excluir todas las localidades de zonas conocidas
            filter.$nor = Array.from(ALL_KNOWN_LOCALITIES).map(l => ({
                localidad: { $regex: `^${escapeRegex(l)}$`, $options: "i" },
            }));
        } else if (zoneLocalities.length > 0) {
            const zoneRegexList = zoneLocalities.map(l => new RegExp(`^${escapeRegex(l)}$`, "i"));
            if (localidad) {
                filter.$and = [
                    { localidad: { $in: zoneRegexList } },
                    { localidad: { $regex: localidad.trim(), $options: "i" } },
                ];
            } else {
                filter.localidad = { $in: zoneRegexList };
            }
        }
    } else if (localidad) {
        filter.localidad = { $regex: localidad.trim(), $options: "i" };
    }

    return filter;
}

/**
 * Resuelve un Set de _id strings de afiliados que coinciden con los filtros
 * basados en AffiliateContribution (verificationStatus, periodFrom, periodTo,
 * trimPagos, soloDisponibles).
 * Retorna null si ninguno de esos filtros está activo (sin restricción).
 *
 * @param {object} filters
 * @returns {Promise<Set<string>|null>}
 */
async function resolveContribBasedIdSet(filters) {
    const { verificationStatus, periodFrom, periodTo, trimPagos, soloDisponibles } = filters || {};

    const hasVerifOrPeriod =
        (verificationStatus && (Array.isArray(verificationStatus) ? verificationStatus.length > 0 : true)) ||
        periodFrom ||
        periodTo;
    const hasTrimFilter = trimPagos && (Array.isArray(trimPagos) ? trimPagos.length > 0 : true);
    const hasSoloDisponibles = soloDisponibles === true || soloDisponibles === "true";

    if (!hasVerifOrPeriod && !hasTrimFilter && !hasSoloDisponibles) return null;

    let idSet = null;

    // ── verificationStatus + period ──────────────────────────────────────────
    if (hasVerifOrPeriod) {
        const statuses = verificationStatus
            ? (Array.isArray(verificationStatus) ? verificationStatus : [verificationStatus]).filter(Boolean)
            : [];
        const includePending     = statuses.includes("pending");
        const nonPendingStatuses = statuses.filter(s => s !== "pending");
        let matchingIds;

        if (includePending && nonPendingStatuses.length === 0 && !periodFrom && !periodTo) {
            // Ruta eficiente: solo pending — excluir los que tienen status terminal confirmado
            const excluded = await AffiliateContribution.find(
                { "verification.status": { $nin: ["pending", null] } },
                { affiliateId: 1 }
            ).lean();
            const excludedSet = new Set(excluded.map(c => String(c.affiliateId)));
            const all = await Affiliate.find({ active: true }, { _id: 1 }).lean();
            matchingIds = all.map(a => a._id).filter(id => !excludedSet.has(String(id)));
        } else {
            const contribFilter = {};
            if (statuses.length > 0) {
                contribFilter["verification.status"] = { $in: statuses };
            }
            let contribs = await AffiliateContribution.find(
                contribFilter,
                { affiliateId: 1, lastContributionPeriod: 1 }
            ).lean();

            if (periodFrom || periodTo) {
                const fromNum = periodFrom ? parseInt(periodFrom, 10) : 0;
                const toNum   = periodTo   ? parseInt(periodTo, 10)   : 999999;
                contribs = contribs.filter(c => {
                    const n = periodToNum(c.lastContributionPeriod);
                    return n >= fromNum && n <= toNum;
                });
            }

            matchingIds = contribs.map(c => c.affiliateId);

            if (includePending && !periodFrom && !periodTo) {
                const allContribIds = await AffiliateContribution.distinct("affiliateId");
                const matchingSet   = new Set(matchingIds.map(String));
                const noContribAff  = await Affiliate.find(
                    { active: true, _id: { $nin: allContribIds } },
                    { _id: 1 }
                ).lean();
                for (const a of noContribAff) {
                    if (!matchingSet.has(String(a._id))) matchingIds.push(a._id);
                }
            }
        }
        idSet = new Set(matchingIds.map(String));
    }

    // ── trimPagos ─────────────────────────────────────────────────────────────
    if (hasTrimFilter) {
        const trimValues   = (Array.isArray(trimPagos) ? trimPagos : [trimPagos]).map(Number);
        const includesZero = trimValues.includes(0);
        const nonZeroVals  = trimValues.filter(v => v !== 0);
        const trimSet = new Set();

        if (nonZeroVals.length > 0) {
            const contribs = await AffiliateContribution.find(
                { last3ClosedMonthsPaidCount: { $in: nonZeroVals } },
                { affiliateId: 1 }
            ).lean();
            for (const c of contribs) trimSet.add(String(c.affiliateId));
        }
        if (includesZero) {
            const positiveIds = await AffiliateContribution.distinct("affiliateId", {
                last3ClosedMonthsPaidCount: { $gt: 0 },
            });
            const positiveSet = new Set(positiveIds.map(String));
            const zeroAffiliates = await Affiliate.find(
                { active: true, _id: { $nin: positiveIds } },
                { _id: 1 }
            ).lean();
            for (const a of zeroAffiliates) {
                if (!positiveSet.has(String(a._id))) trimSet.add(String(a._id));
            }
        }

        idSet = idSet === null
            ? trimSet
            : new Set([...idSet].filter(id => trimSet.has(id)));
    }

    // ── soloDisponibles ───────────────────────────────────────────────────────
    if (hasSoloDisponibles) {
        const canSellIds = await AffiliateContribution.distinct("affiliateId", { canSell: true });
        const canSellSet = new Set(canSellIds.map(String));
        idSet = idSet === null
            ? canSellSet
            : new Set([...idSet].filter(id => canSellSet.has(id)));
    }

    return idSet;
}

/**
 * Resuelve la lista ordenada de afiliados candidatos para un conjunto de filtros.
 *
 * Pasos:
 * 1. Construir filtro base Affiliate (search, obraSocial, zona, localidad)
 * 2. Resolver IDs desde AffiliateContribution (verificationStatus, period, trimPagos, soloDisponibles)
 * 3. Intersectar ambos conjuntos (no ampliar el universo filtrado)
 * 4. Obtener afiliados del universo filtrado con uploadDate
 * 5. Obtener contribuciones solo para ese subconjunto
 * 6. Clasificar en grupos de prioridad ARCA; excluir recently_processed
 * 7. Ordenar dentro de cada grupo: uploadDate DESC, _id ASC
 * 8. Concatenar grupos en orden de prioridad; aplicar limit
 *
 * El universo objetivo nunca se amplía más allá de lo que el usuario filtró.
 *
 * @param {object} filters   - task.filters del ArcaAssistedTask
 * @param {object} options   - { limit: number, staleMs: number, now: number }
 * @returns {Promise<Array<{ _id, cuil, uploadDate }>>}
 */
async function resolveFilteredAffiliateIds(filters, options = {}) {
    const { limit = 0, staleMs, now } = options;

    const baseFilter   = buildAffiliateBaseFilter(filters);
    const contribIdSet = await resolveContribBasedIdSet(filters);

    if (contribIdSet !== null) {
        if (baseFilter._id?.$in) {
            baseFilter._id = {
                $in: baseFilter._id.$in.filter(id => contribIdSet.has(String(id))),
            };
        } else {
            baseFilter._id = { $in: [...contribIdSet] };
        }
    }

    const affiliates = await Affiliate.find(
        baseFilter,
        { _id: 1, cuil: 1, uploadDate: 1 }
    ).lean();

    if (affiliates.length === 0) return [];

    const affiliateIds  = affiliates.map(a => a._id);
    const contributions = await AffiliateContribution.find(
        { affiliateId: { $in: affiliateIds } },
        { affiliateId: 1, "verification.status": 1, "verification.checkedAt": 1 }
    ).lean();

    const contribMap = new Map();
    for (const c of contributions) contribMap.set(String(c.affiliateId), c);

    const groups = { never_reviewed: [], retryable_failure: [], stale_terminal: [] };
    for (const aff of affiliates) {
        const contrib = contribMap.get(String(aff._id)) || null;
        const cls = classifyArcaCandidate(contrib, staleMs, now);
        if (!cls.exclude) groups[cls.group].push(aff);
    }

    const ordered = [
        ...sortByUploadDate(groups.never_reviewed),
        ...sortByUploadDate(groups.retryable_failure),
        ...sortByUploadDate(groups.stale_terminal),
    ];

    return limit > 0 ? ordered.slice(0, limit) : ordered;
}

module.exports = { resolveFilteredAffiliateIds, classifyArcaCandidate };
