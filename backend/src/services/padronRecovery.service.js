"use strict";

const Affiliate = require("../models/Affiliate");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const { SSSaludSession, scrapeCuilWithSession } = require("./sssaludScraper.service");
const { savePadronResult } = require("./padronSync.service");
const { upsertOperationalStateForAffiliate } = require("./affiliateOperationalState.service");
const { hasQrHechoForCuil } = require("../utils/canSellUtils");
const logger = require("../utils/logger").getLogger("padron-recovery");

const TECHNICAL_PADRON_STATUSES = new Set([
    "captcha_failed", "error", "failed", "timeout", "solver_unavailable"
]);
const CANONICAL_TECHNICAL_STATUSES = ["captcha_failed", "error"];
const SELLABLE_PADRON_STATUSES = new Set(["not_found", "found_expired"]);
const SUCCESS_PADRON_STATUSES = new Set(["not_found", "found_expired", "found_active"]);
const HOUR_MS = 60 * 60 * 1000;

function numberSetting(value, fallback, minimum = 1) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
}

function getPadronRecoveryConfig(env = process.env) {
    return {
        enabled: String(env.PADRON_RECOVERY_ENABLED || "false").toLowerCase() === "true",
        maxPerRun: numberSetting(env.PADRON_RECOVERY_MAX_PER_RUN, 200),
        leaseMs: numberSetting(env.PADRON_RECOVERY_LEASE_MS, 15 * 60 * 1000),
        maxAttempts: numberSetting(env.PADRON_RECOVERY_MAX_ATTEMPTS, 5),
        retryAfterHours: numberSetting(env.PADRON_RECOVERY_RETRY_AFTER_HOURS, 24)
    };
}

function normalizeCuil(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 11 ? digits : null;
}

function canonicalPadronStatus(status) {
    return ["failed", "timeout", "solver_unavailable"].includes(status) ? "error" : status;
}

function rowArcaEvidence(row) {
    const arca = row?.stages?.arca?.result || row?.resultState?.arca || {};
    const paidMonths = Number(arca.last3ClosedMonthsPaidCount ?? arca.trimPagos ?? 0);
    return {
        trabaja: arca.trabaja === true,
        paidMonths,
        needsPadron: arca.needsPadron === true,
        checkedAt: arca.checkedAt || row?.updatedAt || row?.createdAt || null
    };
}

function hasActiveOwnership(state, now = new Date()) {
    const ownership = state?.ownership;
    return Boolean(
        ownership?.supervisorId
        && (!ownership.expiresAt || new Date(ownership.expiresAt) > now)
    );
}

async function hasActiveAssignment(affiliateId, now = new Date()) {
    return Boolean(await AffiliateAssignment.exists({
        affiliateId,
        status: "active",
        expiresAt: { $gt: now }
    }));
}

function evidenceQuery() {
    return {
        $and: [
            {
                $or: [
                    { "stages.arca.result.trabaja": true },
                    { "resultState.arca.trabaja": true }
                ]
            },
            {
                $or: [
                    { "stages.arca.result.trimPagos": { $gt: 0 } },
                    { "stages.arca.result.last3ClosedMonthsPaidCount": { $gt: 0 } },
                    { "resultState.arca.trimPagos": { $gt: 0 } },
                    { "resultState.arca.last3ClosedMonthsPaidCount": { $gt: 0 } }
                ]
            },
            {
                $or: [
                    { "stages.arca.result.needsPadron": true },
                    { "resultState.arca.needsPadron": true }
                ]
            },
            {
                $or: [
                    { "stages.padron.result.status": { $in: Array.from(TECHNICAL_PADRON_STATUSES) } },
                    { "stages.padron.result.sourceStatus": { $in: Array.from(TECHNICAL_PADRON_STATUSES) } },
                    { "resultState.padron.status": { $in: Array.from(TECHNICAL_PADRON_STATUSES) } },
                    { "resultState.padron.sourceStatus": { $in: Array.from(TECHNICAL_PADRON_STATUSES) } }
                ]
            }
        ]
    };
}

async function isStrictRecoveryCandidate({ row, contribution, state, now }) {
    if (!row || !contribution) return false;
    const evidence = rowArcaEvidence(row);
    if (!evidence.trabaja || evidence.paidMonths <= 0 || !evidence.needsPadron) return false;
    if (Number(contribution.last3ClosedMonthsPaidCount || 0) <= 0) return false;
    if (!CANONICAL_TECHNICAL_STATUSES.includes(contribution.padron?.status)) return false;
    if (state?.availableForSale === true || state?.saleStatus === "qr_done") return false;
    if (hasActiveOwnership(state, now)) return false;
    if (await hasActiveAssignment(contribution.affiliateId, now)) return false;
    if (await hasQrHechoForCuil(contribution.cuil)) return false;
    return true;
}

async function findPadronRecoveryCandidates({ now = new Date(), limit = 200 } = {}) {
    const scanLimit = Math.max(limit, limit * 10);
    const rows = await AffiliateCheckRow.find(evidenceQuery())
        .sort({ updatedAt: -1, _id: -1 })
        .limit(scanLimit)
        .lean();
    const candidates = [];
    const seen = new Set();

    for (const row of rows) {
        const affiliateKey = String(row.affiliateId || "");
        if (!affiliateKey || seen.has(affiliateKey)) continue;
        seen.add(affiliateKey);
        const [contribution, state] = await Promise.all([
            AffiliateContribution.findOne({ affiliateId: row.affiliateId }).lean(),
            AffiliateOperationalState.findOne({ affiliateId: row.affiliateId }).lean()
        ]);
        if (await isStrictRecoveryCandidate({ row, contribution, state, now })) {
            candidates.push({ row, contribution, state });
            if (candidates.length >= limit) break;
        }
    }
    return candidates;
}

function recoveryClaimFilter({ contributionId, now, retryBefore, maxAttempts }) {
    return {
        _id: contributionId,
        last3ClosedMonthsPaidCount: { $gt: 0 },
        "padron.status": { $in: CANONICAL_TECHNICAL_STATUSES },
        $expr: {
            $lt: [
                { $ifNull: ["$padronRecovery.attempts", 0] },
                { $ifNull: ["$padronRecovery.maxAttempts", maxAttempts] }
            ]
        },
        $or: [
            {
                "padronRecovery.status": "processing",
                "padronRecovery.leaseUntil": { $lt: now }
            },
            {
                $and: [
                    {
                        $or: [
                            { padronRecovery: { $exists: false } },
                            { padronRecovery: null },
                            { "padronRecovery.status": null },
                            { "padronRecovery.status": { $in: ["pending", "failed"] } }
                        ]
                    },
                    {
                        $or: [
                            { "padronRecovery.lastAttemptAt": { $exists: false } },
                            { "padronRecovery.lastAttemptAt": null },
                            { "padronRecovery.lastAttemptAt": { $lte: retryBefore } }
                        ]
                    }
                ]
            }
        ]
    };
}

async function claimPadronRecoveryCandidate({
    candidate,
    workerId,
    leaseMs,
    maxAttempts,
    retryAfterHours,
    now = new Date()
}) {
    const retryBefore = new Date(now.getTime() - retryAfterHours * HOUR_MS);
    const claimed = await AffiliateContribution.findOneAndUpdate(
        recoveryClaimFilter({
            contributionId: candidate.contribution._id,
            now,
            retryBefore,
            maxAttempts
        }),
        [
            {
                $set: {
                    padronRecovery: {
                        $mergeObjects: [
                            { $ifNull: ["$padronRecovery", {}] },
                            {
                                status: "processing",
                                claimedBy: String(workerId),
                                claimedAt: now,
                                heartbeatAt: now,
                                leaseUntil: new Date(now.getTime() + leaseMs),
                                attempts: {
                                    $add: [
                                        { $ifNull: ["$padronRecovery.attempts", 0] },
                                        1
                                    ]
                                },
                                maxAttempts,
                                lastAttemptAt: now,
                                lastErrorMessage: null,
                                sourceRowId: candidate.row._id
                            }
                        ]
                    }
                }
            }
        ],
        { new: true }
    );
    if (!claimed) return null;
    return { ...candidate, contribution: claimed };
}

async function claimNextPadronRecovery({
    workerId,
    leaseMs = 15 * 60 * 1000,
    maxAttempts = 5,
    retryAfterHours = 24,
    now = new Date(),
    scanLimit = 50
}) {
    const candidates = await findPadronRecoveryCandidates({ now, limit: scanLimit });
    for (const candidate of candidates) {
        const claimed = await claimPadronRecoveryCandidate({
            candidate, workerId, leaseMs, maxAttempts, retryAfterHours, now
        });
        if (claimed) return claimed;
    }
    return null;
}

async function heartbeatPadronRecovery({ rowId, workerId, leaseMs, now = new Date() }) {
    const row = await AffiliateCheckRow.findById(rowId).select("affiliateId").lean();
    if (!row) return null;
    return AffiliateContribution.findOneAndUpdate(
        {
            affiliateId: row.affiliateId,
            "padronRecovery.status": "processing",
            "padronRecovery.claimedBy": String(workerId)
        },
        {
            $set: {
                "padronRecovery.heartbeatAt": now,
                "padronRecovery.leaseUntil": new Date(now.getTime() + leaseMs)
            }
        },
        { new: true }
    );
}

async function finishRecovery({ contributionId, workerId, status, now, errorMessage, resultStatus }) {
    const update = {
        "padronRecovery.status": status,
        "padronRecovery.leaseUntil": null,
        "padronRecovery.heartbeatAt": null,
        "padronRecovery.lastErrorMessage": errorMessage || null,
        "padronRecovery.lastResultStatus": resultStatus || null
    };
    if (status === "recovered") update["padronRecovery.recoveredAt"] = now;
    return AffiliateContribution.findOneAndUpdate(
        {
            _id: contributionId,
            "padronRecovery.status": "processing",
            "padronRecovery.claimedBy": String(workerId)
        },
        { $set: update },
        { new: true }
    );
}

async function isStockReleaseSafe(affiliateId, cuil, now) {
    const state = await AffiliateOperationalState.findOne({ affiliateId }).lean();
    if (state?.saleStatus === "qr_done" || hasActiveOwnership(state, now)) return false;
    if (await hasActiveAssignment(affiliateId, now)) return false;
    if (await hasQrHechoForCuil(cuil)) return false;
    return true;
}

async function revalidateClaim(claimed, now) {
    const [contribution, state] = await Promise.all([
        AffiliateContribution.findById(claimed.contribution._id).lean(),
        AffiliateOperationalState.findOne({ affiliateId: claimed.contribution.affiliateId }).lean()
    ]);
    return {
        contribution,
        state,
        valid: await isStrictRecoveryCandidate({ row: claimed.row, contribution, state, now })
    };
}

function startHeartbeat({ rowId, workerId, leaseMs }) {
    const intervalMs = Math.max(1000, Math.floor(leaseMs / 3));
    const timer = setInterval(() => {
        heartbeatPadronRecovery({ rowId, workerId, leaseMs }).catch(error => {
            logger.warn(`[PADRON-RECOVERY] Heartbeat falló row=${rowId}: ${error.message}`);
        });
    }, intervalMs);
    if (typeof timer.unref === "function") timer.unref();
    return timer;
}

function canonicalScraperResult(result, now) {
    const status = canonicalPadronStatus(result?.status || "error");
    return {
        ...result,
        status,
        checkedAt: result?.checkedAt || now,
        errorMessage: result?.errorMessage || null
    };
}

async function persistUnavailableState(affiliateId, reason, now) {
    await upsertOperationalStateForAffiliate(affiliateId, { now });
    return AffiliateOperationalState.findOneAndUpdate(
        { affiliateId },
        {
            $set: {
                availableForSale: false,
                usageStatus: "blocked",
                unavailableReason: reason,
                calculatedAt: now
            }
        },
        { new: true, upsert: false }
    );
}

async function persistGeneralStock(affiliateId, now) {
    await AffiliateAssignment.updateMany(
        { affiliateId, status: "active", expiresAt: { $lte: now } },
        {
            $set: {
                status: "expired",
                releasedAt: now,
                releaseReason: "padron_recovery_stale_assignment"
            }
        }
    );
    await upsertOperationalStateForAffiliate(affiliateId, { now });
    return AffiliateOperationalState.findOneAndUpdate(
        { affiliateId },
        {
            $set: {
                canSell: true,
                availableForSale: true,
                usageStatus: "available",
                unavailableReason: null,
                ownership: {},
                calculatedAt: now
            }
        },
        { new: true, upsert: false }
    );
}

async function processClaimedPadronRecovery({ claimed, workerId, leaseMs, session, now = new Date() }) {
    const revalidated = await revalidateClaim(claimed, now);
    if (!revalidated.valid) {
        await finishRecovery({
            contributionId: claimed.contribution._id,
            workerId,
            status: "not_sellable",
            now,
            errorMessage: "Candidate no longer satisfies recovery safety criteria",
            resultStatus: revalidated.contribution?.padron?.status
        });
        return { success: false, skipped: true, reason: "candidate_changed" };
    }

    const affiliate = await Affiliate.findById(claimed.contribution.affiliateId).lean();
    const cuil = normalizeCuil(affiliate?.cuil || claimed.contribution.cuil);
    if (!affiliate || !cuil) {
        await finishRecovery({
            contributionId: claimed.contribution._id,
            workerId,
            status: "failed",
            now,
            errorMessage: "Affiliate or valid CUIL not found",
            resultStatus: "error"
        });
        return { success: false, retryable: false, reason: "invalid_affiliate" };
    }

    let ownedSession = null;
    const activeSession = session || await SSSaludSession.create();
    if (!session) ownedSession = activeSession;
    const heartbeat = startHeartbeat({ rowId: claimed.row._id, workerId, leaseMs });

    try {
        const rawResult = await scrapeCuilWithSession(cuil, activeSession);
        const result = canonicalScraperResult(rawResult, now);
        await savePadronResult(String(affiliate._id), result);
        const contribution = await AffiliateContribution.findById(claimed.contribution._id).lean();

        if (SELLABLE_PADRON_STATUSES.has(result.status) && contribution?.canSell === true) {
            const stockSafe = await isStockReleaseSafe(affiliate._id, cuil, now);
            if (!stockSafe) {
                await finishRecovery({
                    contributionId: contribution._id,
                    workerId,
                    status: "not_sellable",
                    now,
                    errorMessage: "Stock ownership or sale state changed during recovery",
                    resultStatus: result.status
                });
                return { success: false, skipped: true, reason: "stock_changed" };
            }
            await persistGeneralStock(affiliate._id, now);
            await finishRecovery({
                contributionId: contribution._id,
                workerId,
                status: "recovered",
                now,
                resultStatus: result.status
            });
            return { success: true, recovered: true, status: result.status };
        }

        if (SUCCESS_PADRON_STATUSES.has(result.status)) {
            const reason = result.status === "found_active"
                ? "Padrón: Afiliado activo"
                : "Padrón compatible pero no cumple canSell estricto";
            await persistUnavailableState(affiliate._id, reason, now);
            await finishRecovery({
                contributionId: contribution._id,
                workerId,
                status: "not_sellable",
                now,
                errorMessage: reason,
                resultStatus: result.status
            });
            return { success: true, recovered: false, status: result.status };
        }

        const errorMessage = result.errorMessage || `Padrón recovery failed: ${rawResult?.status || "error"}`;
        await persistUnavailableState(affiliate._id, errorMessage, now);
        await finishRecovery({
            contributionId: contribution._id,
            workerId,
            status: "failed",
            now,
            errorMessage,
            resultStatus: rawResult?.status || result.status
        });
        return { success: false, retryable: true, status: rawResult?.status || result.status };
    } catch (error) {
        await persistUnavailableState(affiliate._id, error.message, now).catch(() => null);
        await finishRecovery({
            contributionId: claimed.contribution._id,
            workerId,
            status: "failed",
            now,
            errorMessage: error.message,
            resultStatus: "error"
        });
        return { success: false, retryable: true, error: error.message };
    } finally {
        clearInterval(heartbeat);
        if (ownedSession) await ownedSession.close().catch(() => null);
    }
}

async function runPadronRecoveryOnce({
    workerId = `padron-recovery:${process.pid}`,
    env = process.env,
    session = null,
    now = new Date()
} = {}) {
    const config = getPadronRecoveryConfig(env);
    if (!config.enabled) {
        return { enabled: false, processed: 0, recovered: 0, notSellable: 0, failed: 0 };
    }

    const stats = { enabled: true, processed: 0, recovered: 0, notSellable: 0, failed: 0 };
    let ownedSession = null;
    try {
        for (let index = 0; index < config.maxPerRun; index += 1) {
            const claimed = await claimNextPadronRecovery({
                workerId,
                leaseMs: config.leaseMs,
                maxAttempts: config.maxAttempts,
                retryAfterHours: config.retryAfterHours,
                now
            });
            if (!claimed) break;
            if (!session && !ownedSession) ownedSession = await SSSaludSession.create();
            const result = await processClaimedPadronRecovery({
                claimed,
                workerId,
                leaseMs: config.leaseMs,
                session: session || ownedSession,
                now
            });
            stats.processed += 1;
            if (result.recovered) stats.recovered += 1;
            else if (result.success) stats.notSellable += 1;
            else stats.failed += 1;
        }
        return stats;
    } finally {
        if (ownedSession) await ownedSession.close().catch(() => null);
    }
}

module.exports = {
    CANONICAL_TECHNICAL_STATUSES,
    SELLABLE_PADRON_STATUSES,
    TECHNICAL_PADRON_STATUSES,
    canonicalPadronStatus,
    claimNextPadronRecovery,
    claimPadronRecoveryCandidate,
    findPadronRecoveryCandidates,
    getPadronRecoveryConfig,
    hasActiveOwnership,
    heartbeatPadronRecovery,
    isStrictRecoveryCandidate,
    isStockReleaseSafe,
    processClaimedPadronRecovery,
    rowArcaEvidence,
    runPadronRecoveryOnce
};
