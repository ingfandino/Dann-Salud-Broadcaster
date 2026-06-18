#!/usr/bin/env node
"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const logger = require("../src/utils/logger").getLogger("affiliate-check-repair");

const TERMINAL_ROW_STATUSES = new Set(["eligible", "assigned", "rejected", "failed", "cancelled"]);
const TERMINAL_JOB_STATUSES = new Set(["completed", "completed_with_errors", "failed", "cancelled"]);
const CANCEL_REPAIR_STATUSES = new Set(["cancelled", "partially_cancelled"]);
const EXTRACT_REPAIR_STATUSES = new Set(["processing", "paused", "pausing", "retrying", "stuck"]);

function parseArgs(argv = process.argv.slice(2)) {
    const options = { execute: false, allSafe: false, jobId: null };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--execute") options.execute = true;
        else if (arg === "--all-safe") options.allSafe = true;
        else if (arg === "--job") options.jobId = argv[++index];
        else if (arg === "--help" || arg === "-h") options.help = true;
        else throw new Error(`Argumento no reconocido: ${arg}`);
    }
    if (!options.allSafe && !options.jobId && !options.help) {
        throw new Error("Debe indicar --job <jobId> o --all-safe");
    }
    return options;
}

function objectId(value) {
    return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function countBy(items, keyFn) {
    return items.reduce((acc, item) => {
        const key = keyFn(item) || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function sumCounts(counts, statuses) {
    return statuses.reduce((total, status) => total + Number(counts[status] || 0), 0);
}

function storedCounters(job) {
    return {
        selectedCount: Number(job.selectedCount || 0),
        processedCount: Number(job.processedCount || 0),
        eligibleCount: Number(job.eligibleCount || 0),
        assignedCount: Number(job.assignedCount || 0),
        rejectedCount: Number(job.rejectedCount || 0),
        failedCount: Number(job.failedCount || 0),
        quotaConsumed: Number(job.quota?.consumed || 0)
    };
}

function buildRowCounters(rowStatusCounts) {
    const terminalRows = sumCounts(rowStatusCounts, Array.from(TERMINAL_ROW_STATUSES));
    return {
        selectedCount: Object.values(rowStatusCounts).reduce((total, count) => total + Number(count || 0), 0),
        processedCount: terminalRows,
        eligibleCount: Number(rowStatusCounts.eligible || 0),
        assignedCount: Number(rowStatusCounts.assigned || 0),
        rejectedCount: Number(rowStatusCounts.rejected || 0),
        failedCount: Number(rowStatusCounts.failed || 0)
    };
}

async function aggregateRows(jobId) {
    const rows = await AffiliateCheckRow.find(
        { jobId },
        { status: 1, mode: 1, affiliateId: 1, assignedToSupervisor: 1, stages: 1 }
    ).lean();
    return {
        rows,
        rowStatusCounts: countBy(rows, row => row.status),
        finalizationStageCounts: countBy(rows, row => row.stages?.finalization?.status || "missing")
    };
}

async function aggregateAssignments(jobId) {
    const [assignmentCount, activeAssignmentCount, wrongSourceCount] = await Promise.all([
        AffiliateAssignment.countDocuments({ sourceJobId: jobId }),
        AffiliateAssignment.countDocuments({ sourceJobId: jobId, status: "active" }),
        AffiliateAssignment.countDocuments({ sourceJobId: { $ne: jobId }, status: "active" })
    ]);
    return { assignmentCount, activeAssignmentCount, wrongSourceCount };
}

async function activeReservationCount(jobId) {
    return AffiliateOperationalState.countDocuments({ currentCheckJobId: jobId });
}

function countersEqual(left, right, keys) {
    return keys.every(key => Number(left[key] || 0) === Number(right[key] || 0));
}

function classifyCancelledJob({ job, rowStatusCounts, assignmentCount, reservationCount }) {
    const rowCounters = buildRowCounters(rowStatusCounts);
    const rowTotal = rowCounters.selectedCount;
    const terminalRows = rowCounters.processedCount;
    const nonTerminalRows = rowTotal - terminalRows;
    const allRowsCancelled = rowTotal > 0 && Number(rowStatusCounts.cancelled || 0) === rowTotal;
    const proposed = {
        ...rowCounters,
        "quota.consumed": 0
    };
    const reasons = [];
    if (!CANCEL_REPAIR_STATUSES.has(job.status)) reasons.push("job_not_cancelled");
    if (nonTerminalRows > 0) reasons.push("non_terminal_rows_present");
    if (!allRowsCancelled) reasons.push("cancelled_repair_requires_all_rows_cancelled");
    if (reservationCount !== 0) reasons.push("active_reservations_present");
    if (assignmentCount !== 0) reasons.push("assignments_present");
    const noOp = reasons.length === 0 && countersEqual(storedCounters(job), {
        selectedCount: proposed.selectedCount,
        processedCount: proposed.processedCount,
        eligibleCount: proposed.eligibleCount,
        assignedCount: proposed.assignedCount,
        rejectedCount: proposed.rejectedCount,
        failedCount: proposed.failedCount,
        quotaConsumed: proposed["quota.consumed"]
    }, ["selectedCount", "processedCount", "eligibleCount", "assignedCount", "rejectedCount", "failedCount", "quotaConsumed"]);
    return { type: "cancelled_counters", safe: reasons.length === 0, noOp, reasons, proposed };
}

function classifyExtractBaseJob({ job, rows, rowStatusCounts, assignmentCount, activeAssignmentCount, reservationCount }) {
    const rowCounters = buildRowCounters(rowStatusCounts);
    const rowTotal = rowCounters.selectedCount;
    const terminalRows = rowCounters.processedCount;
    const assignedRows = Number(rowStatusCounts.assigned || 0);
    const rejectedRows = Number(rowStatusCounts.rejected || 0);
    const failedRows = Number(rowStatusCounts.failed || 0);
    const cancelledRows = Number(rowStatusCounts.cancelled || 0);
    const nonTerminalRows = rowTotal - terminalRows;
    const hasOnlySupportedTerminalRows = rowTotal > 0 && rows.every(row => ["assigned", "rejected", "failed", "cancelled"].includes(row.status));
    const proposedStatus = rejectedRows > 0 || failedRows > 0 || cancelledRows > 0 ? "completed_with_errors" : "completed";
    const proposed = {
        status: proposedStatus,
        selectedCount: rowTotal,
        processedCount: terminalRows,
        assignedCount: assignedRows,
        eligibleCount: assignedRows,
        rejectedCount: rejectedRows,
        failedCount: failedRows,
        "quota.consumed": assignedRows,
        "ownership.expiresAt": rows.find(row => row.ownershipUntil)?.ownershipUntil || job.ownership?.expiresAt || null
    };
    const reasons = [];
    if (job.mode !== "extract_base") reasons.push("not_extract_base");
    if (!EXTRACT_REPAIR_STATUSES.has(job.status)) reasons.push("status_not_repairable_extract_base");
    if (reservationCount !== 0) reasons.push("active_reservations_present");
    if (nonTerminalRows > 0 || !hasOnlySupportedTerminalRows) reasons.push("unsupported_or_non_terminal_rows_present");
    if (assignmentCount !== assignedRows || activeAssignmentCount !== assignedRows) reasons.push("assignment_row_mismatch");
    const noOp = TERMINAL_JOB_STATUSES.has(job.status) && countersEqual(storedCounters(job), {
        selectedCount: proposed.selectedCount,
        processedCount: proposed.processedCount,
        eligibleCount: proposed.eligibleCount,
        assignedCount: proposed.assignedCount,
        rejectedCount: proposed.rejectedCount,
        failedCount: proposed.failedCount,
        quotaConsumed: proposed["quota.consumed"]
    }, ["selectedCount", "processedCount", "eligibleCount", "assignedCount", "rejectedCount", "failedCount", "quotaConsumed"]);
    return { type: "extract_base_finalize", safe: reasons.length === 0, noOp, reasons, proposed };
}

async function analyzeJob(jobId) {
    const id = objectId(jobId);
    if (!id) return { jobId, found: false, safe: false, reasons: ["invalid_job_id"] };
    const job = await AffiliateCheckJob.findById(id).lean();
    if (!job) return { jobId, found: false, safe: false, reasons: ["job_not_found"] };

    const [{ rows, rowStatusCounts, finalizationStageCounts }, assignmentStats, reservationCount] = await Promise.all([
        aggregateRows(id),
        aggregateAssignments(id),
        activeReservationCount(id)
    ]);

    let classification;
    if (CANCEL_REPAIR_STATUSES.has(job.status)) {
        classification = classifyCancelledJob({ job, rowStatusCounts, assignmentCount: assignmentStats.assignmentCount, reservationCount });
    } else if (TERMINAL_JOB_STATUSES.has(job.status)) {
        classification = { type: "already_terminal", safe: true, noOp: true, reasons: [], proposed: {} };
    } else if (job.mode === "extract_base") {
        classification = classifyExtractBaseJob({ job, rows, rowStatusCounts, assignmentCount: assignmentStats.assignmentCount, activeAssignmentCount: assignmentStats.activeAssignmentCount, reservationCount });
    } else {
        classification = { type: "unsupported", safe: false, noOp: false, reasons: ["unsupported_job_state"], proposed: {} };
    }

    return {
        jobId: String(job._id),
        found: true,
        mode: job.mode,
        status: job.status,
        updatedAt: job.updatedAt,
        storedCounters: storedCounters(job),
        rowStatusCounts,
        finalizationStageCounts,
        assignmentCount: assignmentStats.assignmentCount,
        activeAssignmentCount: assignmentStats.activeAssignmentCount,
        activeReservationCount: reservationCount,
        classification: classification.type,
        safe: classification.safe,
        noOp: classification.noOp,
        reasons: classification.reasons,
        proposedChanges: classification.proposed
    };
}

async function executeRepair(jobId, { now = new Date(), beforeUpdate = null } = {}) {
    const analysis = await analyzeJob(jobId);
    if (!analysis.found || !analysis.safe) return { ...analysis, executed: false, writeResult: null };
    if (analysis.noOp) return { ...analysis, executed: false, noOp: true, writeResult: null };

    const id = objectId(jobId);
    const current = await AffiliateCheckJob.findById(id).lean();
    if (!current || String(current.updatedAt?.toISOString()) !== String(analysis.updatedAt?.toISOString())) {
        return { ...analysis, executed: false, safe: false, reasons: [...analysis.reasons, "concurrency_guard_failed"], writeResult: null };
    }

    const baseFilter = {
        _id: id,
        status: current.status,
        updatedAt: current.updatedAt,
        selectedCount: current.selectedCount || 0,
        processedCount: current.processedCount || 0,
        eligibleCount: current.eligibleCount || 0,
        assignedCount: current.assignedCount || 0,
        rejectedCount: current.rejectedCount || 0,
        failedCount: current.failedCount || 0
    };

    let update;
    if (analysis.classification === "cancelled_counters") {
        update = {
            $set: {
                selectedCount: analysis.proposedChanges.selectedCount,
                processedCount: analysis.proposedChanges.processedCount,
                eligibleCount: analysis.proposedChanges.eligibleCount,
                assignedCount: analysis.proposedChanges.assignedCount,
                rejectedCount: analysis.proposedChanges.rejectedCount,
                failedCount: analysis.proposedChanges.failedCount,
                "quota.consumed": analysis.proposedChanges["quota.consumed"],
                "quota.adjustedAt": now,
                "quota.adjustmentReason": "affiliate_check_repair_cancelled_counters"
            }
        };
    } else if (analysis.classification === "extract_base_finalize") {
        update = {
            $set: {
                status: analysis.proposedChanges.status,
                selectedCount: analysis.proposedChanges.selectedCount,
                processedCount: analysis.proposedChanges.processedCount,
                eligibleCount: analysis.proposedChanges.eligibleCount,
                assignedCount: analysis.proposedChanges.assignedCount,
                rejectedCount: analysis.proposedChanges.rejectedCount,
                failedCount: analysis.proposedChanges.failedCount,
                "quota.consumed": analysis.proposedChanges["quota.consumed"],
                "ownership.expiresAt": analysis.proposedChanges["ownership.expiresAt"],
                finishedAt: now
            }
        };
    } else {
        return { ...analysis, executed: false, safe: false, reasons: [...analysis.reasons, "unsupported_repair_type"], writeResult: null };
    }

    if (typeof beforeUpdate === "function") await beforeUpdate();
    const result = await AffiliateCheckJob.updateOne(baseFilter, update);
    if (result.modifiedCount !== 1) {
        return { ...analysis, executed: false, safe: false, reasons: [...analysis.reasons, "atomic_update_did_not_match"], writeResult: result };
    }
    logger.info(`[AFFILIATE-CHECK-REPAIR] repaired jobId=${analysis.jobId} type=${analysis.classification}`);
    return { ...analysis, executed: true, writeResult: result };
}

async function findSafeCandidates() {
    const jobs = await AffiliateCheckJob.find({
        $or: [
            { status: { $in: Array.from(CANCEL_REPAIR_STATUSES) } },
            { mode: "extract_base", status: { $in: Array.from(EXTRACT_REPAIR_STATUSES) } }
        ],
        isDeleted: { $ne: true }
    }, { _id: 1 }).lean();
    const analyses = [];
    for (const job of jobs) analyses.push(await analyzeJob(job._id));
    return analyses.filter(item => item.safe && !item.noOp);
}

function publicReport(result, execute = false) {
    return {
        dryRun: !execute,
        jobId: result.jobId,
        mode: result.mode,
        status: result.status,
        storedCounters: result.storedCounters,
        rowStatusCounts: result.rowStatusCounts,
        finalizationStageCounts: result.finalizationStageCounts,
        assignmentCount: result.assignmentCount,
        activeAssignmentCount: result.activeAssignmentCount,
        activeReservationCount: result.activeReservationCount,
        classification: result.classification,
        safe: result.safe,
        noOp: result.noOp,
        reasons: result.reasons,
        proposedChanges: result.proposedChanges,
        executed: Boolean(result.executed)
    };
}

async function runCli(argv = process.argv.slice(2)) {
    const options = parseArgs(argv);
    if (options.help) {
        console.log("Uso: node scripts/repairAffiliateCheckJobs.js --job <jobId> [--execute] | --all-safe [--execute]");
        return 0;
    }
    await connectDB();
    try {
        const results = [];
        if (options.allSafe) {
            const candidates = await findSafeCandidates();
            for (const candidate of candidates) {
                results.push(options.execute ? await executeRepair(candidate.jobId) : candidate);
            }
        } else {
            results.push(options.execute ? await executeRepair(options.jobId) : await analyzeJob(options.jobId));
        }
        for (const result of results) console.log(JSON.stringify(publicReport(result, options.execute), null, 2));
        return results.every(result => result.safe) ? 0 : 2;
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) {
    runCli().then(code => process.exit(code)).catch(error => {
        console.error(JSON.stringify({ success: false, message: error.message }));
        process.exit(1);
    });
}

module.exports = {
    analyzeJob,
    executeRepair,
    findSafeCandidates,
    parseArgs,
    publicReport,
    runCli
};
