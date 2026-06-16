"use strict";

const mongoose = require("mongoose");
const AffiliateCheckConfig = require("../models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const AffiliateImportJob = require("../models/AffiliateImportJob");
const AffiliateImportRow = require("../models/AffiliateImportRow");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const User = require("../models/User");
const { initializeStagesForRow } = require("./affiliateCheckStage.service");
const {
    getInternalObraSocialAvailability,
    normalizeSelection,
    resolveDistribution
} = require("./affiliateCheckObraSocial.service");

const MODES = ["check_new", "check_reusable", "extract_base", "check_import"];
const QUOTA_PATHS = {
    check_new: "checkNew",
    check_reusable: "checkReusable",
    extract_base: "extractBase",
    check_import: "checkImport"
};
const FEATURE_PATHS = {
    check_new: "checkNewEnabled",
    check_reusable: "checkReusableEnabled",
    extract_base: "extractBaseEnabled",
    check_import: "checkImportEnabled"
};
const DISABLED_MODE_ERRORS = {
    check_new: {
        code: "CHECK_NEW_DISABLED",
        message: "El chequeo de datos nuevos aún no está habilitado porque el worker de chequeo no está activo."
    },
    check_reusable: {
        code: "CHECK_REUSABLE_DISABLED",
        message: "El chequeo de datos reutilizables aún no está habilitado porque el worker de chequeo no está activo."
    },
    extract_base: {
        code: "EXTRACT_BASE_DISABLED",
        message: "La extracción desde base está deshabilitada temporalmente."
    },
    check_import: {
        code: "CHECK_IMPORT_DISABLED",
        message: "El chequeo de archivos externos está deshabilitado temporalmente."
    }
};
const MANAGER_ROLES = ["gerencia", "desarrollador", "admin", "encargado"];
const INTERNAL_CHECK_ROLES = ["supervisor", "encargado", "gerencia", "desarrollador"];
const INTERNAL_MODES = ["check_new", "check_reusable"];
const EXTERNAL_MODES = ["check_import"];
const ACTIVE_CHANNEL_STATUSES = ["pending", "processing", "pausing", "paused", "retrying", "stuck"];
const SAMPLE_SIZE = 10;
const FINAL_JOB_STATUSES = ["completed", "completed_with_errors", "failed", "cancelled"];
const STARTED_STAGE_STATUSES = ["processing", "done", "failed", "skipped", "not_required"];

function channelTypeForMode(mode) {
    if (INTERNAL_MODES.includes(mode)) return "internal";
    if (EXTERNAL_MODES.includes(mode)) return "external";
    return null;
}

function channelConflictError(channelType) {
    const internal = channelType === "internal";
    return new AffiliateCheckError(
        internal
            ? "Ya tienes un trabajo interno activo. Debes finalizarlo o cancelarlo antes de crear otro."
            : "Ya tienes un chequeo de archivo externo activo. Debes finalizarlo antes de crear otro.",
        409,
        internal ? "ACTIVE_INTERNAL_JOB" : "ACTIVE_EXTERNAL_JOB"
    );
}

function isChannelDuplicateKey(error) {
    if (error?.code !== 11000) return false;
    if (error?.keyPattern?.channelOwner && error?.keyPattern?.channelType) return true;
    return String(error?.message || "").includes("uniq_active_affiliate_check_channel");
}

async function createChannelProtectedJob(data) {
    try {
        return await AffiliateCheckJob.create(data);
    } catch (error) {
        if (isChannelDuplicateKey(error)) throw channelConflictError(data.channelType);
        throw error;
    }
}

class AffiliateCheckError extends Error {
    constructor(message, statusCode = 400, code = "AFFILIATE_CHECK_ERROR") {
        super(message);
        this.name = "AffiliateCheckError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

function normalizeRole(user) {
    return String(user?.role || "").trim().toLowerCase();
}

function normalizeRequestedCount(value) {
    const count = Number(value);
    if (!Number.isInteger(count) || count <= 0) {
        throw new AffiliateCheckError("requestedCount debe ser un entero mayor que cero");
    }
    return count;
}

function validateMode(mode) {
    if (!MODES.includes(mode)) {
        throw new AffiliateCheckError("Modo de chequeo inválido");
    }
}

function cleanFilters(filters = {}) {
    const allowed = ["obraSocial", "localidad", "freshness", "dataSource", "batchId"];
    return allowed.reduce((result, key) => {
        if (typeof filters[key] === "string" && filters[key].trim()) {
            result[key] = filters[key].trim();
        }
        return result;
    }, {});
}

function argentinaDayRange(date = new Date()) {
    const current = new Date(date);
    if (Number.isNaN(current.getTime())) {
        throw new AffiliateCheckError("Fecha inválida");
    }
    const argentinaTime = new Date(current.getTime() - (3 * 60 * 60 * 1000));
    const start = new Date(Date.UTC(
        argentinaTime.getUTCFullYear(),
        argentinaTime.getUTCMonth(),
        argentinaTime.getUTCDate(),
        3,
        0,
        0,
        0
    ));
    return { start, end: new Date(start.getTime() + (24 * 60 * 60 * 1000)) };
}

function buildOwnershipAvailability(now) {
    return {
        $or: [
            { "ownership.supervisorId": null },
            { "ownership.expiresAt": { $lt: now } }
        ]
    };
}

function buildEligibilityQuery(mode, filters = {}, now = new Date()) {
    validateMode(mode);
    const query = { ...cleanFilters(filters), ...buildOwnershipAvailability(now) };
    if (Array.isArray(filters.obraSocialNames) && filters.obraSocialNames.length > 0) {
        query.obraSocial = { $in: filters.obraSocialNames };
    }

    if (mode === "check_new") {
        Object.assign(query, {
            freshness: "fresh",
            verificationStatus: "unchecked",
            usageStatus: "never_used",
            saleStatus: "none",
            availableForSale: false,
            currentCheckJobId: null
        });
    } else if (mode === "check_reusable") {
        Object.assign(query, {
            freshness: "reusable",
            verificationStatus: { $in: ["expired", "error", "no_data", "captcha"] },
            usageStatus: { $ne: "blocked" },
            saleStatus: { $ne: "qr_done" },
            currentCheckJobId: null
        });
    } else {
        Object.assign(query, {
            verificationStatus: "checked",
            canSell: true,
            availableForSale: true,
            saleStatus: "none"
        });
    }

    return query;
}

function getDailyLimit(config, mode) {
    return Number(config.dailyQuota?.[QUOTA_PATHS[mode]] || 0);
}

function normalizeCheckConfig(config) {
    if (!config) return config;
    const normalized = config.toObject ? config.toObject() : { ...config };
    normalized.features = {
        checkNewEnabled: normalized.features?.checkNewEnabled === true,
        checkReusableEnabled: normalized.features?.checkReusableEnabled === true,
        extractBaseEnabled: normalized.features?.extractBaseEnabled !== false,
        checkImportEnabled: normalized.features?.checkImportEnabled === true
    };
    return normalized;
}

async function getActiveCheckConfig() {
    const existing = await AffiliateCheckConfig.findOne({ active: true }).lean();
    if (existing) return normalizeCheckConfig(existing);

    try {
        return normalizeCheckConfig(await AffiliateCheckConfig.create({ active: true }));
    } catch (error) {
        if (error?.code === 11000) {
            return normalizeCheckConfig(await AffiliateCheckConfig.findOne({ active: true }).lean());
        }
        throw error;
    }
}

function assertModeEnabled(config, mode) {
    validateMode(mode);
    const flag = FEATURE_PATHS[mode];
    const enabled = mode === "extract_base"
        ? config?.features?.[flag] !== false
        : config?.features?.[flag] === true;
    if (!enabled) {
        const disabled = DISABLED_MODE_ERRORS[mode];
        throw new AffiliateCheckError(disabled.message, 409, disabled.code);
    }
}

function assertInternalCheckRole(user, mode) {
    if (!INTERNAL_MODES.includes(mode)) return;
    const role = normalizeRole(user);
    if (!INTERNAL_CHECK_ROLES.includes(role)) {
        throw new AffiliateCheckError(
            "El rol actual no puede ejecutar chequeos internos de afiliados",
            403,
            "INTERNAL_CHECK_ROLE_FORBIDDEN"
        );
    }
}

async function assertActiveChannelAvailable({ mode, ownerId, requestedBy }) {
    if (mode === "extract_base") return;
    const isInternal = INTERNAL_MODES.includes(mode);
    const channelModes = isInternal ? INTERNAL_MODES : EXTERNAL_MODES;
    const effectiveOwner = ownerId || requestedBy;
    if (!effectiveOwner) return;

    const activeJob = await AffiliateCheckJob.findOne({
        mode: { $in: channelModes },
        status: { $in: ACTIVE_CHANNEL_STATUSES },
        isDeleted: { $ne: true },
        $or: [
            { channelOwner: effectiveOwner, channelType: isInternal ? "internal" : "external" },
            { "ownership.supervisorId": effectiveOwner },
            { requestedBy: effectiveOwner, "ownership.supervisorId": null }
        ]
    }).select("_id mode status").lean();

    if (activeJob) {
        const channelLabel = isInternal ? "interno" : "externo";
        throw new AffiliateCheckError(
            `Ya existe un trabajo de chequeo ${channelLabel} activo para este supervisor. Esperá a que finalice o cancelalo antes de crear uno nuevo.`,
            409,
            isInternal ? "ACTIVE_INTERNAL_JOB" : "ACTIVE_EXTERNAL_JOB"
        );
    }
}

async function getActiveChannelStatus({ mode, ownerId, requestedBy }) {
    if (mode === "extract_base") return { canCreate: true, blockedReason: null };
    const isInternal = INTERNAL_MODES.includes(mode);
    const channelModes = isInternal ? INTERNAL_MODES : EXTERNAL_MODES;
    const effectiveOwner = ownerId || requestedBy;
    if (!effectiveOwner) return { canCreate: true, blockedReason: null };

    const activeJob = await AffiliateCheckJob.findOne({
        mode: { $in: channelModes },
        status: { $in: ACTIVE_CHANNEL_STATUSES },
        isDeleted: { $ne: true },
        $or: [
            { channelOwner: effectiveOwner, channelType: isInternal ? "internal" : "external" },
            { "ownership.supervisorId": effectiveOwner },
            { requestedBy: effectiveOwner, "ownership.supervisorId": null }
        ]
    }).select("_id mode status").lean();

    if (activeJob) {
        return {
            canCreate: false,
            blockedReason: isInternal ? "active_internal_job" : "active_external_job",
            activeJobId: activeJob._id,
            activeJobMode: activeJob.mode,
            activeJobStatus: activeJob.status
        };
    }
    return { canCreate: true, blockedReason: null };
}

async function getSupervisorDailyUsage({ userId, date = new Date() }) {
    if (!mongoose.isValidObjectId(userId)) {
        throw new AffiliateCheckError("Usuario inválido");
    }
    const { start, end } = argentinaDayRange(date);
    const rows = await AffiliateCheckJob.aggregate([
        {
            $match: {
                requestedBy: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: start, $lt: end },
                status: { $ne: "draft" }
            }
        },
        {
            $group: {
                _id: "$mode",
                consumed: {
                    $sum: { $ifNull: ["$quota.consumed", 0] }
                }
            }
        }
    ]);

    const byMode = Object.fromEntries(MODES.map(mode => [mode, 0]));
    rows.forEach(row => {
        if (MODES.includes(row._id)) byMode[row._id] = row.consumed;
    });
    return {
        dateStart: start,
        dateEnd: end,
        byMode,
        total: Object.values(byMode).reduce((sum, value) => sum + value, 0)
    };
}

async function resolveQuota({ user, mode, requestedCount, date = new Date() }) {
    validateMode(mode);
    const count = normalizeRequestedCount(requestedCount);
    const [config, usage] = await Promise.all([
        getActiveCheckConfig(),
        getSupervisorDailyUsage({ userId: user?._id, date })
    ]);
    const dailyLimit = getDailyLimit(config, mode);
    const alreadyUsedToday = usage.byMode[mode] || 0;

    const role = normalizeRole(user);
    const BYPASS_ROLES = ["admin", "desarrollador", "gerencia"];
    const isBypass = BYPASS_ROLES.includes(role);

    const remaining = Math.max(0, dailyLimit - alreadyUsedToday);

    if (!isBypass && remaining === 0) {
        const MODE_LABELS = {
            check_import: "chequeo de archivos externos",
            check_new: "chequeo de datos nuevos",
            check_reusable: "rechequeo de datos reutilizables",
            extract_base: "extracción de base"
        };
        const message = mode === "check_import"
            ? "No queda cupo disponible para procesar archivos externos hoy."
            : `No queda cupo diario disponible para ${MODE_LABELS[mode] || mode}.`;

        throw new AffiliateCheckError(message, 429, "DAILY_QUOTA_EXHAUSTED");
    }

    const effectiveRemaining = isBypass ? Math.max(count, remaining) : remaining;

    return {
        config,
        dailyLimit,
        alreadyUsedToday,
        remaining: effectiveRemaining,
        cappedCount: Math.min(count, effectiveRemaining)
    };
}

async function previewAffiliateCheckSelection({
    user,
    mode,
    requestedCount,
    filters,
    supervisorId,
    obraSocialSelection,
    obraSocial
}) {
    validateMode(mode);
    assertInternalCheckRole(user, mode);
    const config = await getActiveCheckConfig();
    assertModeEnabled(config, mode);

    const supervisorTarget = await resolveSupervisorTarget({ user, mode, supervisorId });
    const channelStatus = await getActiveChannelStatus({
        mode,
        ownerId: supervisorTarget,
        requestedBy: user?._id
    });
    const quota = await resolveQuota({ user, mode, requestedCount });
    const normalizedRequested = normalizeRequestedCount(requestedCount);
    const cleanedFilters = cleanFilters(filters);
    const hasObraSocialContract = obraSocialSelection || obraSocial || cleanedFilters.obraSocial;
    const selection = INTERNAL_MODES.includes(mode) && hasObraSocialContract
        ? normalizeSelection(obraSocialSelection, obraSocial || cleanedFilters.obraSocial)
        : null;
    if (selection) delete cleanedFilters.obraSocial;

    const distributionResult = selection
        ? await resolveDistribution({
            mode,
            requestedCount: quota.cappedCount,
            selection,
            buildEligibilityQuery: (resolvedMode, extraFilters, now) =>
                buildEligibilityQuery(resolvedMode, { ...cleanedFilters, ...extraFilters }, now)
        })
        : null;
    const query = buildEligibilityQuery(mode, cleanedFilters);
    const [selectableCount, sample] = await Promise.all([
        distributionResult
            ? Promise.resolve(distributionResult.availableCount)
            : AffiliateOperationalState.countDocuments(query),
        AffiliateOperationalState.find(query)
            .sort({ uploadDate: 1, _id: 1 })
            .limit(SAMPLE_SIZE)
            .select("affiliateId cuilNormalized freshness verificationStatus usageStatus saleStatus canSell availableForSale obraSocial localidad batchId")
            .lean()
    ]);
    return {
        mode,
        requestedCount: normalizedRequested,
        dailyLimit: quota.dailyLimit,
        alreadyUsedToday: quota.alreadyUsedToday,
        remaining: quota.remaining,
        selectableCount,
        availableCount: selectableCount,
        willSelectCount: Math.min(quota.cappedCount, selectableCount),
        canCreate: channelStatus.canCreate,
        blockedReason: channelStatus.blockedReason || null,
        ...(selection ? {
            obraSocialSelection: {
                strategy: selection.strategy,
                selected: distributionResult.requestedItems
            },
            distribution: distributionResult.distribution.map(item => ({
                code: item.code,
                name: item.name,
                availableCount: item.availableCount,
                plannedCount: item.plannedCount
            })),
            distributionIsEstimated: true
        } : {}),
        sample
    };
}

async function getAffiliateCheckObraSocialAvailability({
    user,
    mode,
    search,
    limit,
    selectedCodes
}) {
    validateMode(mode);
    assertInternalCheckRole(user, mode);
    const config = await getActiveCheckConfig();
    assertModeEnabled(config, mode);
    const result = await getInternalObraSocialAvailability({
        mode,
        search,
        limit,
        selectedCodes,
        buildEligibilityQuery
    });
    return {
        mode,
        totalOrganizations: result.totalOrganizations,
        data: result.data
    };
}

async function resolveSupervisorTarget({ user, mode, supervisorId }) {
    const role = normalizeRole(user);
    if (role === "supervisor") return user._id;
    if (!MANAGER_ROLES.includes(role)) {
        throw new AffiliateCheckError("El rol actual no puede ejecutar chequeos de afiliados", 403);
    }
    if (mode !== "extract_base" && !supervisorId) return null;
    if (!mongoose.isValidObjectId(supervisorId)) {
        throw new AffiliateCheckError(
            mode === "extract_base"
                ? "extract_base requiere un supervisorId explícito para roles de gestión"
                : "Supervisor destino inválido"
        );
    }
    const supervisor = await User.findOne({
        _id: supervisorId,
        role: "supervisor",
        active: true,
        deletedAt: null
    }).select("_id").lean();
    if (!supervisor) {
        throw new AffiliateCheckError("Supervisor destino inválido o inactivo");
    }
    return supervisor._id;
}

function checkReservationUpdate(now, jobId = null) {
    const set = {
        verificationStatus: "checking",
        availableForSale: false,
        unavailableReason: "checking_in_progress",
        calculatedAt: now
    };
    if (jobId) {
        set.currentCheckJobId = jobId;
        set.currentCheckStartedAt = now;
    }
    return { $set: set };
}

function extractReservationUpdate({ supervisorId, expiresAt, now }) {
    return {
        $set: {
            usageStatus: "assigned",
            availableForSale: false,
            unavailableReason: "assigned_to_supervisor",
            "ownership.supervisorId": supervisorId,
            "ownership.assignedAt": now,
            "ownership.expiresAt": expiresAt,
            "ownership.source": "extract_base",
            lastUsedAt: now,
            reusableAfter: expiresAt,
            calculatedAt: now
        }
    };
}

function stateSnapshot(state) {
    return {
        freshness: state.freshness,
        verificationStatus: state.verificationStatus,
        usageStatus: state.usageStatus,
        saleStatus: state.saleStatus,
        canSell: state.canSell,
        availableForSale: state.availableForSale,
        unavailableReason: state.unavailableReason,
        ownership: state.ownership,
        lastUsedAt: state.lastUsedAt,
        reusableAfter: state.reusableAfter
    };
}

async function restoreState(state, snapshot, jobId = null) {
    const filter = { _id: state._id };
    if (jobId) filter.currentCheckJobId = jobId;
    await AffiliateOperationalState.updateOne(
        filter,
        {
            $set: {
                verificationStatus: snapshot.verificationStatus,
                usageStatus: snapshot.usageStatus,
                availableForSale: snapshot.availableForSale,
                unavailableReason: snapshot.unavailableReason ?? null,
                ownership: snapshot.ownership || {},
                lastUsedAt: snapshot.lastUsedAt ?? null,
                reusableAfter: snapshot.reusableAfter ?? null
            },
            ...(jobId ? { $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } } : {})
        }
    );
}

async function reserveSingleCheckRow({ job, filters }) {
    const now = new Date();
    const skippedStateIds = [];

    while (true) {
        const query = buildEligibilityQuery(job.mode, filters, now);
        if (skippedStateIds.length > 0) query._id = { $nin: skippedStateIds };

        const previous = await AffiliateOperationalState.findOneAndUpdate(
            query,
            checkReservationUpdate(now, job._id),
            { sort: { uploadDate: 1, _id: 1 }, new: false }
        ).lean();
        if (!previous) return null;

        const snapshot = stateSnapshot(previous);
        try {
            const activeAssignment = await AffiliateAssignment.findOne({
                affiliateId: previous.affiliateId,
                status: "active"
            }).select("_id").lean();
            if (activeAssignment) {
                await restoreState(previous, snapshot, job._id);
                skippedStateIds.push(previous._id);
                continue;
            }
            const row = await AffiliateCheckRow.create({
                jobId: job._id,
                affiliateId: previous.affiliateId,
                operationalStateId: previous._id,
                cuilNormalized: previous.cuilNormalized,
                mode: job.mode,
                status: "queued",
                previousState: snapshot,
                stages: initializeStagesForRow({}).stages
            });
            return { row, obraSocial: previous.obraSocial };
        } catch (error) {
            await restoreState(previous, snapshot, job._id);
            throw error;
        }
    }
}

async function reserveCheckRows({ job, count, filters, distribution = null }) {
    const rows = [];
    if (!distribution) {
        for (let index = 0; index < count; index += 1) {
            const reserved = await reserveSingleCheckRow({ job, filters });
            if (!reserved) break;
            rows.push(reserved.row);
        }
        return { rows, finalDistribution: [] };
    }

    const selectedByCode = new Map();
    let activeGroups = distribution.filter(item => item.availableCount > 0 && item.storedNames.length > 0);
    while (rows.length < count && activeGroups.length > 0) {
        let progressed = false;
        const allTargetsMet = activeGroups.every(group =>
            (selectedByCode.get(group.code) || 0) >= group.plannedCount
        );
        for (const group of activeGroups) {
            if (rows.length >= count) break;
            const selected = selectedByCode.get(group.code) || 0;
            if (!allTargetsMet && selected >= group.plannedCount) continue;
            const reserved = await reserveSingleCheckRow({
                job,
                filters: { ...filters, obraSocialNames: group.storedNames }
            });
            if (!reserved) {
                group.exhausted = true;
                continue;
            }
            rows.push(reserved.row);
            selectedByCode.set(group.code, selected + 1);
            progressed = true;
        }
        activeGroups = activeGroups.filter(group => !group.exhausted);
        if (!progressed && !allTargetsMet) {
            for (const group of activeGroups) group.plannedCount = selectedByCode.get(group.code) || 0;
            continue;
        }
        if (!progressed) break;
    }

    return {
        rows,
        finalDistribution: distribution.map(item => ({
            code: item.code,
            name: item.name,
            availableCount: item.availableCount,
            selectedCount: selectedByCode.get(item.code) || 0
        }))
    };
}

function buildImportedAffiliateReservationQuery(affiliateId, now) {
    return {
        affiliateId,
        currentCheckJobId: null,
        $and: [
            { verificationStatus: { $ne: "checking" } },
            {
                $or: [
                    { verificationStatus: { $ne: "checked" } },
                    { verificationExpiresAt: { $lte: now } }
                ]
            }
        ],
        usageStatus: { $nin: ["assigned", "blocked"] },
        saleStatus: "none",
        ...buildOwnershipAvailability(now)
    };
}

async function listEligibleImportAffiliateIds(importJobId) {
    const rows = await AffiliateImportRow.aggregate([
        {
            $match: {
                jobId: new mongoose.Types.ObjectId(importJobId),
                status: "success",
                affiliateId: { $type: "objectId" }
            }
        },
        {
            $group: {
                _id: "$affiliateId",
                firstRowNumber: { $min: "$rowNumber" }
            }
        },
        { $sort: { firstRowNumber: 1, _id: 1 } }
    ]);
    return rows.map(row => row._id);
}

const IMPORT_EXCLUSION_REASON_KEYS = [
    "valid_check",
    "active_check",
    "reserved_by_other_job",
    "sold_or_qr",
    "assignment_conflict",
    "ownership_conflict",
    "other"
];

function emptyImportExclusionReasons() {
    return Object.fromEntries(IMPORT_EXCLUSION_REASON_KEYS.map(key => [key, 0]));
}

function classifyImportedAffiliateExclusion({ state, hasActiveAssignment, now }) {
    if (!state) return "other";
    if (state.currentCheckJobId) return "reserved_by_other_job";
    if (state.verificationStatus === "checking") return "active_check";
    if (
        state.verificationStatus === "checked"
        && (!state.verificationExpiresAt || new Date(state.verificationExpiresAt) > now)
    ) return "valid_check";
    if (state.saleStatus !== "none") return "sold_or_qr";
    if (hasActiveAssignment || ["assigned", "blocked"].includes(state.usageStatus)) return "assignment_conflict";
    if (state.ownership?.supervisorId && (!state.ownership.expiresAt || new Date(state.ownership.expiresAt) >= now)) {
        return "ownership_conflict";
    }
    return null;
}

async function resolveImportedAffiliateEligibility(importJobId, now = new Date()) {
    const affiliateIds = await listEligibleImportAffiliateIds(importJobId);
    const exclusionReasons = emptyImportExclusionReasons();
    if (affiliateIds.length === 0) {
        return { eligibleCount: 0, checkableCount: 0, excludedCount: 0, exclusionReasons, availableAffiliateIds: [] };
    }

    const [states, assignedAffiliateIds] = await Promise.all([
        AffiliateOperationalState.find({ affiliateId: { $in: affiliateIds } })
            .select("affiliateId currentCheckJobId verificationStatus verificationExpiresAt usageStatus saleStatus ownership")
            .lean(),
        AffiliateAssignment.distinct("affiliateId", { affiliateId: { $in: affiliateIds }, status: "active" })
    ]);
    const statesByAffiliateId = new Map(states.map(state => [String(state.affiliateId), state]));
    const assignedIds = new Set(assignedAffiliateIds.map(String));
    const availableAffiliateIds = [];

    for (const affiliateId of affiliateIds) {
        const key = String(affiliateId);
        const reason = classifyImportedAffiliateExclusion({
            state: statesByAffiliateId.get(key),
            hasActiveAssignment: assignedIds.has(key),
            now
        });
        if (reason) exclusionReasons[reason] += 1;
        else availableAffiliateIds.push(affiliateId);
    }

    return {
        eligibleCount: affiliateIds.length,
        checkableCount: availableAffiliateIds.length,
        excludedCount: affiliateIds.length - availableAffiliateIds.length,
        exclusionReasons,
        availableAffiliateIds
    };
}

async function listAvailableImportedAffiliateIds(importJobId, now = new Date()) {
    return (await resolveImportedAffiliateEligibility(importJobId, now)).availableAffiliateIds;
}

async function getImportedAffiliateCheckAvailability(importJobId, now = new Date()) {
    if (!mongoose.isValidObjectId(importJobId)) {
        return { eligibleCount: 0, checkableCount: 0, excludedCount: 0, exclusionReasons: emptyImportExclusionReasons() };
    }
    const availability = await resolveImportedAffiliateEligibility(importJobId, now);
    return {
        eligibleCount: availability.eligibleCount,
        checkableCount: availability.checkableCount,
        excludedCount: availability.excludedCount,
        exclusionReasons: availability.exclusionReasons
    };
}

async function reserveImportedCheckRows({ job, affiliateIds, count }) {
    const rows = [];
    let conflictCount = 0;

    for (const affiliateId of affiliateIds) {
        if (rows.length >= count) break;
        const now = new Date();
        const previous = await AffiliateOperationalState.findOneAndUpdate(
            buildImportedAffiliateReservationQuery(affiliateId, now),
            checkReservationUpdate(now, job._id),
            { new: false }
        ).lean();
        if (!previous) {
            conflictCount += 1;
            continue;
        }

        const snapshot = stateSnapshot(previous);
        try {
            const activeAssignment = await AffiliateAssignment.findOne({
                affiliateId,
                status: "active"
            }).select("_id").lean();
            if (activeAssignment) {
                conflictCount += 1;
                await restoreState(previous, snapshot, job._id);
                continue;
            }
            const row = await AffiliateCheckRow.create({
                jobId: job._id,
                affiliateId,
                operationalStateId: previous._id,
                cuilNormalized: previous.cuilNormalized,
                mode: "check_import",
                status: "queued",
                previousState: snapshot,
                stages: initializeStagesForRow({}).stages
            });
            rows.push(row);
        } catch (error) {
            await restoreState(previous, snapshot, job._id);
            throw error;
        }
    }

    return { rows, conflictCount };
}

async function createImportedAffiliateCheckJob({
    user,
    importJobId,
    requestedCount,
    supervisorId = null
}) {
    if (!mongoose.isValidObjectId(importJobId)) {
        throw new AffiliateCheckError("ID de importación inválido");
    }
    const importJob = await AffiliateImportJob.findOne({
        _id: importJobId,
        source: "external_check"
    }).lean();
    if (!importJob) {
        throw new AffiliateCheckError("Trabajo de importación no encontrado", 404);
    }
    if (!["completed", "completed_with_errors"].includes(importJob.status)) {
        throw new AffiliateCheckError(
            "La importación debe estar completada antes de crear el chequeo.",
            409,
            "IMPORT_NOT_COMPLETED"
        );
    }

    const config = await getActiveCheckConfig();
    assertModeEnabled(config, "check_import");
    const normalizedRequestedCount = normalizeRequestedCount(requestedCount);
    const affiliateIds = await listEligibleImportAffiliateIds(importJobId);
    if (affiliateIds.length === 0) {
        throw new AffiliateCheckError(
            "No hay registros válidos para chequear en este archivo.",
            422,
            "NO_ELIGIBLE_IMPORT_ROWS"
        );
    }
    const { checkableCount } = await getImportedAffiliateCheckAvailability(importJobId);
    if (checkableCount === 0) {
        throw new AffiliateCheckError(
            "No hay registros válidos disponibles para chequear en este archivo.",
            422,
            "NO_AVAILABLE_IMPORT_ROWS"
        );
    }
    if (normalizedRequestedCount > checkableCount) {
        throw new AffiliateCheckError(
            "La cantidad solicitada no puede superar los " + checkableCount + " registros disponibles.",
            422,
            "REQUESTED_COUNT_EXCEEDS_AVAILABLE"
        );
    }
    const quota = await resolveQuota({
        user,
        mode: "check_import",
        requestedCount: normalizedRequestedCount
    });
    const supervisorTarget = await resolveSupervisorTarget({
        user,
        mode: "check_import",
        supervisorId
    });
    const targetCount = Math.min(quota.cappedCount, affiliateIds.length);
    const channelOwner = supervisorTarget || user._id;
    await assertActiveChannelAvailable({
        mode: "check_import",
        ownerId: channelOwner,
        requestedBy: user._id
    });
    const job = await createChannelProtectedJob({
        requestedBy: user._id,
        requestedByRole: normalizeRole(user),
        mode: "check_import",
        sourceImportJobId: importJob._id,
        channelOwner,
        channelType: "external",
        status: "pending",
        requestedCount: normalizedRequestedCount,
        ownership: { supervisorId: supervisorTarget },
        quota: {
            dailyLimit: quota.dailyLimit,
            alreadyUsedToday: quota.alreadyUsedToday,
            remainingBefore: quota.remaining,
            consumed: 0
        },
        filters: importJob.batchId ? { batchId: importJob.batchId } : {},
        startedAt: new Date()
    });

    try {
        const reservation = await reserveImportedCheckRows({
            job,
            affiliateIds,
            count: targetCount
        });
        if (reservation.rows.length === 0) {
            throw new AffiliateCheckError(
                "No hay registros válidos disponibles para chequear en este archivo.",
                422,
                "NO_AVAILABLE_IMPORT_ROWS"
            );
        }
        job.selectedCount = reservation.rows.length;
        job.skippedCount = reservation.conflictCount;
        job.conflictCount = reservation.conflictCount;
        job.quota.consumed = reservation.rows.length;
        await job.save();
        return job.toObject();
    } catch (error) {
        await releaseAffiliateCheckJobReservations({
            jobId: job._id,
            reason: "check_import_job_creation_failed"
        }).catch(() => {});
        job.status = "failed";
        job.errorMessage = error.message;
        job.quota.consumed = 0;
        job.finishedAt = new Date();
        await job.save();
        throw error;
    }
}

async function assignExtractedBaseAffiliates({ jobId }) {
    const job = await AffiliateCheckJob.findById(jobId);
    if (!job) throw new AffiliateCheckError("Trabajo de chequeo no encontrado", 404);
    if (job.mode !== "extract_base") {
        throw new AffiliateCheckError("El trabajo no es de tipo extract_base");
    }
    if (!job.ownership?.supervisorId) {
        throw new AffiliateCheckError("El trabajo no tiene supervisor destino");
    }

    const config = await getActiveCheckConfig();
    const targetCount = Math.max(0, Math.min(
        job.requestedCount || 0,
        job.eligibleCount || job.requestedCount || 0,
        job.quota?.remainingBefore ?? job.requestedCount ?? 0
    ));
    const expiresAt = new Date(Date.now() + (config.ownershipDays * 24 * 60 * 60 * 1000));
    const filters = job.filters?.toObject ? job.filters.toObject() : (job.filters || {});
    let assignedCount = 0;
    let rejectedCount = 0;

    for (let index = 0; index < targetCount; index += 1) {
        const now = new Date();
        const previous = await AffiliateOperationalState.findOneAndUpdate(
            buildEligibilityQuery("extract_base", filters, now),
            extractReservationUpdate({
                supervisorId: job.ownership.supervisorId,
                expiresAt,
                now
            }),
            { sort: { lastCheckedAt: 1, _id: 1 }, new: false }
        ).lean();
        if (!previous) break;

        const snapshot = stateSnapshot(previous);
        let assignment = null;
        try {
            const existingActiveAssignment = await AffiliateAssignment.findOne({
                affiliateId: previous.affiliateId,
                status: "active"
            }).select("_id").lean();
            if (existingActiveAssignment) {
                await AffiliateCheckRow.create({
                    jobId: job._id,
                    affiliateId: previous.affiliateId,
                    operationalStateId: previous._id,
                    cuilNormalized: previous.cuilNormalized,
                    mode: "extract_base",
                    status: "rejected",
                    previousState: snapshot,
                    rejectionReason: "active_assignment_exists",
                    stages: initializeStagesForRow({}).stages
                });
                rejectedCount += 1;
                await restoreState(previous, snapshot);
                continue;
            }
            assignment = await AffiliateAssignment.create({
                affiliateId: previous.affiliateId,
                operationalStateId: previous._id,
                supervisorId: job.ownership.supervisorId,
                assignedBy: job.requestedBy,
                source: "extract_base",
                sourceJobId: job._id,
                assignedAt: now,
                expiresAt
            });
            await AffiliateCheckRow.create({
                jobId: job._id,
                affiliateId: previous.affiliateId,
                operationalStateId: previous._id,
                cuilNormalized: previous.cuilNormalized,
                mode: "extract_base",
                status: "assigned",
                previousState: snapshot,
                resultState: {
                    assignmentId: assignment._id,
                    usageStatus: "assigned",
                    availableForSale: false
                },
                canSell: true,
                assignedToSupervisor: job.ownership.supervisorId,
                ownershipUntil: expiresAt,
                stages: initializeStagesForRow({}).stages
            });
            assignedCount += 1;
        } catch (error) {
            rejectedCount += 1;
            if (assignment) {
                await AffiliateAssignment.updateOne(
                    { _id: assignment._id },
                    {
                        $set: {
                            status: "cancelled",
                            releasedAt: new Date(),
                            releaseReason: "extract_row_creation_failed"
                        }
                    }
                );
            }
            await restoreState(previous, snapshot);
        }
    }

    const status = rejectedCount > 0 ? "completed_with_errors" : "completed";
    await AffiliateCheckJob.updateOne(
        { _id: job._id },
        {
            $set: {
                status,
                selectedCount: assignedCount,
                processedCount: assignedCount + rejectedCount,
                assignedCount,
                rejectedCount,
                "quota.consumed": assignedCount,
                "ownership.expiresAt": assignedCount > 0 ? expiresAt : null,
                finishedAt: new Date()
            }
        }
    );
    return AffiliateCheckJob.findById(job._id).lean();
}

async function createAffiliateCheckJob({
    user,
    mode,
    requestedCount,
    filters,
    supervisorId = null,
    obraSocialSelection,
    obraSocial
}) {
    validateMode(mode);
    assertInternalCheckRole(user, mode);
    const config = await getActiveCheckConfig();
    assertModeEnabled(config, mode);
    const cleanedFilters = cleanFilters(filters);
    const hasObraSocialContract = obraSocialSelection || obraSocial || cleanedFilters.obraSocial;
    const selection = INTERNAL_MODES.includes(mode) && hasObraSocialContract
        ? normalizeSelection(obraSocialSelection, obraSocial || cleanedFilters.obraSocial)
        : null;
    if (selection) delete cleanedFilters.obraSocial;
    const quota = await resolveQuota({ user, mode, requestedCount });
    const supervisorTarget = await resolveSupervisorTarget({ user, mode, supervisorId });
    const channelType = channelTypeForMode(mode);
    const channelOwner = channelType ? (supervisorTarget || user._id) : null;

    await assertActiveChannelAvailable({ mode, ownerId: channelOwner, requestedBy: user._id });

    const distributionResult = selection
        ? await resolveDistribution({
            mode,
            requestedCount: quota.cappedCount,
            selection,
            buildEligibilityQuery: (resolvedMode, extraFilters, now) =>
                buildEligibilityQuery(resolvedMode, { ...cleanedFilters, ...extraFilters }, now)
        })
        : null;
    const selectableCount = distributionResult
        ? distributionResult.availableCount
        : await AffiliateOperationalState.countDocuments(buildEligibilityQuery(mode, cleanedFilters));
    const intendedCount = Math.min(quota.cappedCount, selectableCount);

    if (mode !== "extract_base" && intendedCount === 0) {
        throw new AffiliateCheckError(
            "No hay datos disponibles para crear este trabajo en este momento.",
            422,
            "NO_SELECTABLE_AFFILIATES"
        );
    }

    const normalizedRequested = normalizeRequestedCount(requestedCount);
    const job = await createChannelProtectedJob({
        requestedBy: user._id,
        requestedByRole: normalizeRole(user),
        mode,
        ...(channelType ? { channelOwner, channelType } : {}),
        status: "pending",
        requestedCount: normalizedRequested,
        eligibleCount: selectableCount,
        filters: cleanedFilters,
        ...(selection ? {
            obraSocialSelection: {
                strategy: selection.strategy,
                requestedItems: distributionResult.requestedItems,
                finalDistribution: []
            }
        } : {}),
        quota: {
            dailyLimit: quota.dailyLimit,
            alreadyUsedToday: quota.alreadyUsedToday,
            remainingBefore: quota.remaining,
            consumed: mode === "extract_base" ? 0 : intendedCount
        },
        ownership: { supervisorId: supervisorTarget },
        startedAt: new Date()
    });

    try {
        if (mode === "extract_base") return assignExtractedBaseAffiliates({ jobId: job._id });

        const reservation = await reserveCheckRows({
            job,
            count: intendedCount,
            filters: cleanedFilters,
            distribution: distributionResult?.distribution || null
        });
        const rows = reservation.rows;
        if (rows.length === 0) {
            await releaseAffiliateCheckJobReservations({ jobId: job._id, reason: "zero_rows_reserved" }).catch(() => {});
            job.status = "cancelled";
            job.cancellationReason = "zero_rows_reserved";
            job.quota.consumed = 0;
            job.finishedAt = new Date();
            await job.save();
            throw new AffiliateCheckError(
                "No hay datos disponibles para crear este trabajo en este momento.",
                422,
                "NO_SELECTABLE_AFFILIATES"
            );
        }

        job.selectedCount = rows.length;
        job.quota.consumed = rows.length;
        job.status = "pending";
        if (selection) job.obraSocialSelection.finalDistribution = reservation.finalDistribution;
        await job.save();

        const result = job.toObject();
        if (rows.length < normalizedRequested) {
            result._partialCreation = true;
            result._partialMessage = `El trabajo fue creado con ${rows.length} de los ${normalizedRequested} datos solicitados, según la disponibilidad actual.`;
        }
        return result;
    } catch (error) {
        if (error instanceof AffiliateCheckError && error.code === "NO_SELECTABLE_AFFILIATES") throw error;
        await releaseAffiliateCheckJobReservations({
            jobId: job._id,
            reason: "affiliate_check_job_creation_failed"
        }).catch(releaseError => {
            console.error("[AFFILIATE-CHECK] Error liberando reservas tras fallo de creación:", releaseError);
        });
        job.status = "failed";
        job.errorMessage = error.message;
        job.quota.consumed = 0;
        job.finishedAt = new Date();
        await job.save();
        throw error;
    }
}

async function releaseAffiliateCheckJobReservations({ jobId, reason = "affiliate_check_job_released" }) {
    if (!mongoose.isValidObjectId(jobId)) {
        throw new AffiliateCheckError("ID de trabajo inválido");
    }
    const job = await AffiliateCheckJob.findById(jobId).lean();
    if (!job) throw new AffiliateCheckError("Trabajo de chequeo no encontrado", 404);

    const releasableStatuses = ["selected", "queued", "processing"];
    const rows = await AffiliateCheckRow.find({
        jobId: job._id,
        status: { $in: releasableStatuses }
    }).lean();
    let releasedStates = 0;
    let releasedRows = 0;

    for (const row of rows) {
        if (row.operationalStateId && row.previousState && row.mode !== "extract_base") {
            const stateFilter = { _id: row.operationalStateId };
            if (row.mode === "check_import") stateFilter.currentCheckJobId = job._id;
            else stateFilter.verificationStatus = "checking";
            const stateUpdate = await AffiliateOperationalState.updateOne(
                stateFilter,
                {
                    $set: {
                        verificationStatus: row.previousState.verificationStatus,
                        usageStatus: row.previousState.usageStatus,
                        availableForSale: row.previousState.availableForSale,
                        unavailableReason: row.previousState.unavailableReason ?? null,
                        ownership: row.previousState.ownership || {},
                        lastUsedAt: row.previousState.lastUsedAt ?? null,
                        reusableAfter: row.previousState.reusableAfter ?? null
                    },
                    ...({ $unset: { currentCheckJobId: "", currentCheckStartedAt: "" } })
                }
            );
            releasedStates += stateUpdate.modifiedCount || 0;
        }
        const rowUpdate = await AffiliateCheckRow.updateOne(
            { _id: row._id, status: { $in: releasableStatuses } },
            {
                $set: {
                    status: "cancelled",
                    resultState: {
                        released: true,
                        reason
                    }
                }
            }
        );
        releasedRows += rowUpdate.modifiedCount || 0;
    }

    return {
        jobId: job._id,
        releasedRows,
        releasedStates
    };
}

async function computeRetainedQuota(jobId) {
    const job = await AffiliateCheckJob.findById(jobId).select("selectedCount").lean();
    if (!job) throw new AffiliateCheckError("Trabajo de chequeo no encontrado", 404);
    const terminalCount = await AffiliateCheckRow.countDocuments({
        jobId,
        status: { $in: ["eligible", "assigned", "rejected", "failed"] }
    });
    const startedProcessingCount = await AffiliateCheckRow.countDocuments({
        jobId,
        status: { $nin: ["eligible", "assigned", "rejected", "failed", "cancelled"] },
        $or: [
            { "stages.arca.status": { $in: STARTED_STAGE_STATUSES } },
            { "stages.dateas.status": { $in: STARTED_STAGE_STATUSES } },
            { "stages.padron.status": { $in: STARTED_STAGE_STATUSES } },
            { "stages.finalization.status": { $in: STARTED_STAGE_STATUSES } }
        ]
    });
    const calculatedRetained = terminalCount + startedProcessingCount;
    const selectedCount = Math.max(0, Number(job.selectedCount || 0));
    return Math.max(0, Math.min(selectedCount, calculatedRetained));
}

async function adjustAffiliateCheckJobQuota({ jobId, reason, adjustedAt = new Date() }) {
    const job = await AffiliateCheckJob.findById(jobId).select("selectedCount").lean();
    if (!job) throw new AffiliateCheckError("Trabajo de chequeo no encontrado", 404);
    const retained = await computeRetainedQuota(jobId);
    const selectedCount = Math.max(0, Number(job.selectedCount || 0));
    const refunded = selectedCount - retained;
    await AffiliateCheckJob.updateOne(
        { _id: jobId },
        { $set: {
            "quota.consumed": retained,
            "quota.retained": retained,
            "quota.refunded": refunded,
            "quota.adjustedAt": adjustedAt,
            "quota.adjustmentReason": reason
        } }
    );
    return { retained, refunded, adjustedAt };
}

async function cancelAffiliateCheckJob({ jobId, cancelledBy, reason = "affiliate_check_job_cancelled" }) {
    if (!mongoose.isValidObjectId(jobId)) {
        throw new AffiliateCheckError("ID de trabajo inválido");
    }
    const job = await AffiliateCheckJob.findById(jobId);
    if (!job) throw new AffiliateCheckError("Trabajo de chequeo no encontrado", 404);
    if (job.status === "cancelled") {
        return {
            job: job.toObject(),
            release: { jobId: job._id, releasedRows: 0, releasedStates: 0 }
        };
    }
    if (FINAL_JOB_STATUSES.includes(job.status)) {
        throw new AffiliateCheckError("El trabajo ya está finalizado y no puede cancelarse", 409, "JOB_ALREADY_FINALIZED");
    }

    const adjustment = await adjustAffiliateCheckJobQuota({ jobId: job._id, reason });
    const retainedQuota = adjustment.retained;
    const refundedQuota = adjustment.refunded;
    const adjustedAt = adjustment.adjustedAt;
    const release = await releaseAffiliateCheckJobReservations({ jobId: job._id, reason });
    job.status = "cancelled";
    job.cancelledBy = cancelledBy || null;
    job.cancelledAt = new Date();
    job.cancellationReason = reason;
    job.finishedAt = adjustedAt;
    if (job.quota) {
        job.quota.consumed = retainedQuota;
        job.quota.retained = retainedQuota;
        job.quota.refunded = refundedQuota;
        job.quota.adjustedAt = adjustedAt;
        job.quota.adjustmentReason = reason;
    }
    await job.save();

    return {
        job: job.toObject(),
        release
    };
}

module.exports = {
    ACTIVE_CHANNEL_STATUSES,
    channelTypeForMode,
    adjustAffiliateCheckJobQuota,
    AffiliateCheckError,
    INTERNAL_CHECK_ROLES,
    INTERNAL_MODES,
    EXTERNAL_MODES,
    MANAGER_ROLES,
    MODES,
    assertActiveChannelAvailable,
    assertInternalCheckRole,
    assignExtractedBaseAffiliates,
    buildEligibilityQuery,
    cancelAffiliateCheckJob,
    computeRetainedQuota,
    createAffiliateCheckJob,
    createImportedAffiliateCheckJob,
    getActiveChannelStatus,
    getActiveCheckConfig,
    getAffiliateCheckObraSocialAvailability,
    getImportedAffiliateCheckAvailability,
    getSupervisorDailyUsage,
    normalizeRole,
    previewAffiliateCheckSelection,
    releaseAffiliateCheckJobReservations,
    stateSnapshot
};
