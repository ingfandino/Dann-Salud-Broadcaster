#!/usr/bin/env node
"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });

const ACTIVE_JOB_STATUSES = new Set(["pending", "processing", "pausing", "paused", "retrying", "stuck"]);
const SAFE_EXECUTION_CLASSIFICATIONS = new Set(["A", "C", "D"]);

function parseArgs(argv) {
    const args = { execute: false };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--affiliate") {
            args.affiliate = argv[index + 1];
            index += 1;
        } else if (arg === "--execute") {
            args.execute = true;
        } else if (arg === "--help" || arg === "-h") {
            args.help = true;
        } else {
            args.unknown = arg;
        }
    }
    return args;
}

function printHelp() {
    console.log("Usage: node scripts/reconcileAffiliateOperationalOwnership.js --affiliate <affiliateId> [--execute]");
    console.log("Default is dry-run. No --all mode is supported.");
}

function id(value) {
    return value ? String(value) : null;
}

function iso(value) {
    return value ? new Date(value).toISOString() : null;
}

function sameId(left, right) {
    return id(left) === id(right);
}

function sameDate(left, right) {
    return iso(left) === iso(right);
}

function summarizeOwnership(ownership = {}) {
    return {
        source: ownership.source || null,
        supervisorId: id(ownership.supervisorId),
        assignedAt: iso(ownership.assignedAt),
        expiresAt: iso(ownership.expiresAt)
    };
}

function summarizeState(state) {
    if (!state) return null;
    return {
        affiliateId: id(state.affiliateId),
        operationalStateId: id(state._id),
        ownership: summarizeOwnership(state.ownership),
        currentCheckJobId: id(state.currentCheckJobId),
        currentCheckStartedAt: iso(state.currentCheckStartedAt),
        verificationStatus: state.verificationStatus ?? null,
        canSell: state.canSell ?? null,
        availableForSale: state.availableForSale ?? null,
        unavailableReason: state.unavailableReason ?? null,
        saleStatus: state.saleStatus ?? null,
        freshness: state.freshness ?? null,
        updatedAt: iso(state.updatedAt)
    };
}

function summarizeProposed(state) {
    if (!state) return null;
    return {
        ownership: summarizeOwnership(state.ownership),
        currentCheckJobId: id(state.currentCheckJobId),
        currentCheckStartedAt: iso(state.currentCheckStartedAt),
        verificationStatus: state.verificationStatus ?? null,
        canSell: state.canSell ?? null,
        availableForSale: state.availableForSale ?? null,
        unavailableReason: state.unavailableReason ?? null,
        saleStatus: state.saleStatus ?? null,
        freshness: state.freshness ?? null
    };
}

function buildStateFilter(state) {
    return {
        _id: state._id,
        affiliateId: state.affiliateId,
        updatedAt: state.updatedAt,
        currentCheckJobId: state.currentCheckJobId || null,
        currentCheckStartedAt: state.currentCheckStartedAt || null,
        "ownership.source": state.ownership?.source || null,
        "ownership.supervisorId": state.ownership?.supervisorId || null,
        "ownership.assignedAt": state.ownership?.assignedAt || null,
        "ownership.expiresAt": state.ownership?.expiresAt || null
    };
}

function comparableGuard(evidence) {
    return {
        stateUpdatedAt: iso(evidence.state?.updatedAt),
        currentCheckJobId: id(evidence.state?.currentCheckJobId),
        currentCheckJobStatus: evidence.currentJob?.status || null,
        ownership: summarizeOwnership(evidence.state?.ownership),
        assignmentCount: evidence.assignments.length,
        activeAssignmentCount: evidence.activeAssignments.length,
        currentJobRowCount: evidence.currentJobRows.length,
        extractBaseRowCount: evidence.extractBaseRows.length
    };
}

function guardMatches(before, after) {
    return JSON.stringify(comparableGuard(before)) === JSON.stringify(comparableGuard(after));
}

function changedFields(current, proposed) {
    const changes = {};
    const fields = [
        ["ownership", current.ownership, proposed.ownership],
        ["currentCheckJobId", current.currentCheckJobId, proposed.currentCheckJobId],
        ["currentCheckStartedAt", current.currentCheckStartedAt, proposed.currentCheckStartedAt],
        ["verificationStatus", current.verificationStatus, proposed.verificationStatus],
        ["canSell", current.canSell, proposed.canSell],
        ["availableForSale", current.availableForSale, proposed.availableForSale],
        ["unavailableReason", current.unavailableReason, proposed.unavailableReason],
        ["saleStatus", current.saleStatus, proposed.saleStatus],
        ["freshness", current.freshness, proposed.freshness]
    ];
    for (const [name, before, after] of fields) {
        if (JSON.stringify(before) !== JSON.stringify(after)) {
            changes[name] = { from: before, to: after };
        }
    }
    return changes;
}

function isCanonicalNoop(evidence) {
    if (!evidence.state || !evidence.proposed) return false;
    const current = summarizeState(evidence.state);
    const proposed = summarizeProposed(evidence.proposed);
    return Object.keys(changedFields(current, proposed)).length === 0
        && !evidence.state.ownership?.supervisorId
        && !evidence.proposed.ownership?.supervisorId;
}

async function loadEvidence({ affiliateId, models, rebuildOperationalStateForAffiliateIds }) {
    const {
        Affiliate,
        AffiliateAssignment,
        AffiliateCheckJob,
        AffiliateCheckRow,
        AffiliateContribution,
        AffiliateOperationalState,
        Audit
    } = models;

    const state = await AffiliateOperationalState.findOne({ affiliateId }).lean();
    const activeAssignmentsPromise = AffiliateAssignment.find({ affiliateId, status: "active" }).lean();
    const assignmentsPromise = AffiliateAssignment.find(
        { affiliateId },
        { source: 1, sourceJobId: 1, supervisorId: 1, assignedBy: 1, status: 1, assignedAt: 1, expiresAt: 1, releasedAt: 1, expiredAt: 1, expirationReason: 1, createdAt: 1, updatedAt: 1 }
    ).sort({ createdAt: 1 }).lean();
    const affiliatePromise = Affiliate.findById(
        affiliateId,
        { exportedTo: 1, exportedAt: 1, assignedAt: 1, assignedTo: 1, exported: 1, exportBatchId: 1, leadStatus: 1, isUsed: 1, ultimoUso: 1, active: 1, dataSource: 1 }
    ).lean();
    const contributionPromise = AffiliateContribution.findOne(
        { affiliateId },
        { canSell: 1, verification: 1, padron: 1, padronRecovery: 1, updatedAt: 1 }
    ).lean();
    const [activeAssignments, assignments, affiliate, contribution] = await Promise.all([
        activeAssignmentsPromise,
        assignmentsPromise,
        affiliatePromise,
        contributionPromise
    ]);

    const currentJob = state?.currentCheckJobId
        ? await AffiliateCheckJob.findById(
            state.currentCheckJobId,
            { mode: 1, status: 1, selectedCount: 1, assignedCount: 1, rejectedCount: 1, requestedBy: 1, requestedByRole: 1, ownership: 1, createdAt: 1, updatedAt: 1, startedAt: 1, finishedAt: 1, isDeleted: 1 }
        ).lean()
        : null;
    const [currentJobRows, rows, extractBaseRows, auditCounts, dryRun] = await Promise.all([
        state?.currentCheckJobId
            ? AffiliateCheckRow.find({ affiliateId, jobId: state.currentCheckJobId }, { jobId: 1, mode: 1, status: 1, assignedToSupervisor: 1, ownershipUntil: 1, stages: 1, createdAt: 1, updatedAt: 1 }).lean()
            : [],
        AffiliateCheckRow.find({ affiliateId }, { jobId: 1, mode: 1, status: 1, assignedToSupervisor: 1, ownershipUntil: 1, createdAt: 1, updatedAt: 1 }).sort({ createdAt: 1 }).lean(),
        AffiliateCheckRow.find({ affiliateId, mode: "extract_base" }, { jobId: 1, mode: 1, status: 1, assignedToSupervisor: 1, ownershipUntil: 1, createdAt: 1, updatedAt: 1 }).sort({ createdAt: 1 }).lean(),
        state?.cuilNormalized
            ? Audit.aggregate([
                { $match: { cuilNormalized: state.cuilNormalized } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
                { $sort: { count: -1, _id: 1 } }
            ])
            : [],
        rebuildOperationalStateForAffiliateIds([affiliateId], { dryRun: true })
    ]);

    return {
        state,
        activeAssignments,
        assignments,
        affiliate,
        contribution,
        currentJob,
        currentJobRows,
        rows,
        extractBaseRows,
        auditCounts,
        dryRun,
        proposed: dryRun.states[0] || null
    };
}

function hasValidLegacyOwnership(evidence) {
    return Boolean(evidence.affiliate?.exportedTo || evidence.affiliate?.exportedAt || evidence.affiliate?.assignedAt);
}

function hasDurableAssignmentEvidence(evidence) {
    return evidence.assignments.length > 0
        || evidence.extractBaseRows.some(row => row.status === "assigned" || row.assignedToSupervisor || row.ownershipUntil)
        || evidence.currentJobRows.some(row => row.status === "assigned" || row.assignedToSupervisor || row.ownershipUntil);
}

function classifyEvidence(evidence) {
    const state = evidence.state;
    const proposed = evidence.proposed;
    if (!state) return { classification: "E", reason: "missing_operational_state" };
    if (isCanonicalNoop(evidence)) {
        return { classification: "A", reason: "already_reconciled_noop" };
    }
    if (state.ownership?.source !== "extract_base" || !state.ownership?.supervisorId) {
        return { classification: "E", reason: "not_target_extract_base_ownership" };
    }
    if (!proposed) return { classification: "E", reason: "canonical_rebuild_produced_no_state" };
    if (evidence.activeAssignments.length > 0) {
        return { classification: "E", reason: "conflicting_active_assignment" };
    }
    if (hasDurableAssignmentEvidence(evidence)) {
        return { classification: "B", reason: "durable_assignment_or_row_evidence_exists" };
    }

    const activeReservation = Boolean(evidence.currentJob && ACTIVE_JOB_STATUSES.has(evidence.currentJob.status));
    if (activeReservation && !proposed.ownership?.supervisorId && sameId(proposed.currentCheckJobId, state.currentCheckJobId)) {
        return { classification: "C", reason: "active_reservation_without_assignment" };
    }
    if (hasValidLegacyOwnership(evidence) && proposed.ownership?.source === "legacy") {
        return { classification: "D", reason: "canonical_legacy_fallback_exists" };
    }
    if (!activeReservation && !hasValidLegacyOwnership(evidence) && !proposed.ownership?.supervisorId) {
        return { classification: "A", reason: "no_active_assignment_or_canonical_ownership" };
    }
    return { classification: "E", reason: "evidence_conflict_or_unsupported_shape" };
}

function buildReport(evidence, classification) {
    const current = summarizeState(evidence.state);
    const proposed = summarizeProposed(evidence.proposed);
    const safe = SAFE_EXECUTION_CLASSIFICATIONS.has(classification.classification)
        && proposed
        && Object.keys(changedFields(current, proposed)).length >= 0;
    return {
        dryRun: true,
        safe,
        classification: classification.classification,
        classificationReason: classification.reason,
        current,
        canonicalProposed: proposed,
        fieldsToChange: proposed ? changedFields(current, proposed) : {},
        provenance: {
            currentCheckJobExists: Boolean(evidence.currentJob),
            currentCheckJobMode: evidence.currentJob?.mode || null,
            currentCheckJobStatus: evidence.currentJob?.status || null,
            currentCheckJobActive: evidence.currentJob ? ACTIVE_JOB_STATUSES.has(evidence.currentJob.status) : null,
            assignedAffiliateCheckRowForCurrentJob: evidence.currentJobRows.some(row => row.status === "assigned" || row.assignedToSupervisor),
            historicalAffiliateAssignmentCount: evidence.assignments.length,
            activeAffiliateAssignmentCount: evidence.activeAssignments.length,
            extractBaseRowCount: evidence.extractBaseRows.length,
            legacyOwnershipPresent: hasValidLegacyOwnership(evidence),
            verification: evidence.contribution ? {
                status: evidence.contribution.verification?.status || null,
                checkedAt: iso(evidence.contribution.verification?.checkedAt),
                canSell: evidence.contribution.canSell ?? null,
                padronStatus: evidence.contribution.padron?.status || null,
                padronCanSell: evidence.contribution.padron?.canSell ?? null,
                padronRecoveryStatus: evidence.contribution.padronRecovery?.status || null
            } : null,
            auditStatusCounts: evidence.auditCounts.map(item => ({ status: item._id || null, count: item.count })),
            assignmentHistory: evidence.assignments.map(item => ({
                assignmentId: id(item._id),
                source: item.source,
                sourceJobId: id(item.sourceJobId),
                supervisorId: id(item.supervisorId),
                assignedBy: id(item.assignedBy),
                status: item.status,
                assignedAt: iso(item.assignedAt),
                expiresAt: iso(item.expiresAt),
                releasedAt: iso(item.releasedAt),
                expiredAt: iso(item.expiredAt),
                expirationReason: item.expirationReason || null
            })),
            rowHistory: evidence.rows.map(row => ({
                rowId: id(row._id),
                jobId: id(row.jobId),
                mode: row.mode,
                status: row.status,
                assignedToSupervisor: id(row.assignedToSupervisor),
                ownershipUntil: iso(row.ownershipUntil),
                createdAt: iso(row.createdAt),
                updatedAt: iso(row.updatedAt)
            }))
        },
        guard: comparableGuard(evidence)
    };
}

async function reconcileAffiliateOperationalOwnership({ affiliateId, execute = false, models, rebuildOperationalStateForAffiliateIds }) {
    const mongoose = require("mongoose");
    if (!mongoose.isValidObjectId(affiliateId)) {
        throw new Error("--affiliate debe ser un ObjectId valido");
    }

    const evidence = await loadEvidence({ affiliateId, models, rebuildOperationalStateForAffiliateIds });
    const classification = classifyEvidence(evidence);
    const report = buildReport(evidence, classification);
    report.executeRequested = execute;
    report.executed = false;
    report.write = null;

    if (!execute) return report;
    if (!report.safe || !SAFE_EXECUTION_CLASSIFICATIONS.has(classification.classification)) {
        report.write = { skipped: true, reason: "unsafe_classification" };
        return report;
    }

    const freshEvidence = await loadEvidence({ affiliateId, models, rebuildOperationalStateForAffiliateIds });
    if (!guardMatches(evidence, freshEvidence)) {
        report.safe = false;
        report.write = { skipped: true, reason: "concurrency_guard_changed" };
        return report;
    }
    const freshClassification = classifyEvidence(freshEvidence);
    if (freshClassification.classification !== classification.classification) {
        report.safe = false;
        report.write = { skipped: true, reason: "classification_changed" };
        return report;
    }

    const proposed = freshEvidence.proposed;
    if (Object.keys(changedFields(summarizeState(freshEvidence.state), summarizeProposed(proposed))).length === 0) {
        report.executed = false;
        report.write = { matchedCount: 1, modifiedCount: 0, reason: "already_reconciled_noop" };
        report.postRepair = summarizeState(freshEvidence.state);
        report.postRepairDryRun = buildReport(freshEvidence, classifyEvidence(freshEvidence));
        return report;
    }
    const updateResult = await models.AffiliateOperationalState.updateOne(
        buildStateFilter(freshEvidence.state),
        { $set: proposed },
        { runValidators: true }
    );
    report.executed = updateResult.modifiedCount === 1;
    report.write = {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount
    };
    const after = await loadEvidence({ affiliateId, models, rebuildOperationalStateForAffiliateIds });
    report.postRepair = summarizeState(after.state);
    report.postRepairDryRun = buildReport(after, classifyEvidence(after));
    return report;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }
    if (args.unknown) throw new Error(`Argumento no soportado: ${args.unknown}`);
    if (!args.affiliate) throw new Error("Debe indicar --affiliate <affiliateId>");

    const mongoose = require("mongoose");
    const connectDB = require("../src/config/db");
    const models = {
        Affiliate: require("../src/models/Affiliate"),
        AffiliateAssignment: require("../src/models/AffiliateAssignment"),
        AffiliateCheckJob: require("../src/models/AffiliateCheckJob"),
        AffiliateCheckRow: require("../src/models/AffiliateCheckRow"),
        AffiliateContribution: require("../src/models/AffiliateContribution"),
        AffiliateOperationalState: require("../src/models/AffiliateOperationalState"),
        Audit: require("../src/models/Audit")
    };
    const {
        rebuildOperationalStateForAffiliateIds
    } = require("../src/services/affiliateOperationalState.service");

    try {
        await connectDB();
        const result = await reconcileAffiliateOperationalOwnership({
            affiliateId: args.affiliate,
            execute: args.execute,
            models,
            rebuildOperationalStateForAffiliateIds
        });
        console.log(JSON.stringify(result, null, 2));
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error(JSON.stringify({
            success: false,
            code: "AFFILIATE_OPERATIONAL_OWNERSHIP_RECONCILE_FAILED",
            message: error?.message || "Error reconciliando ownership operacional"
        }, null, 2));
        process.exitCode = 1;
    });
}

module.exports = {
    classifyEvidence,
    reconcileAffiliateOperationalOwnership
};
