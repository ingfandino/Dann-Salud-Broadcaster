"use strict";

const mongoose = require("mongoose");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const LeadAssignment = require("../models/LeadAssignment");

const MANAGER_ROLES = ["desarrollador", "gerencia", "encargado", "administrativo"];
const SUPERVISOR_ROLES = ["supervisor", "supervisor_reventa"];
const ACTIVE_JOB_STATUSES = ["pending", "processing", "pausing", "paused", "retrying", "stuck"];
const ERROR_JOB_STATUSES = ["failed", "stuck", "completed_with_errors", "partially_cancelled"];

function normalizeRole(user) {
    return String(user?.role || "").trim().toLowerCase();
}

function asObjectId(value) {
    if (!value) return null;
    return value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value);
}

function shortRef(value) {
    if (!value) return null;
    const text = String(value);
    return text.length > 8 ? text.slice(-8) : text;
}

function buildScope(user) {
    const role = normalizeRole(user);
    if (SUPERVISOR_ROLES.includes(role)) return { role, supervisorId: asObjectId(user._id), management: false };
    if (MANAGER_ROLES.includes(role)) return { role, supervisorId: null, management: true };
    return { role, supervisorId: null, management: false };
}

function scopedSupervisorFilter(scope, field = "supervisorId") {
    return scope.supervisorId ? { [field]: scope.supervisorId } : {};
}

function scopedJobFilter(scope) {
    if (!scope.supervisorId) return {};
    return {
        $or: [
            { channelOwner: scope.supervisorId },
            { "ownership.supervisorId": scope.supervisorId },
            { requestedBy: scope.supervisorId }
        ]
    };
}

function mapCheckJob(job) {
    return {
        jobRef: shortRef(job._id),
        mode: job.mode,
        status: job.status,
        requestedCount: job.requestedCount || 0,
        selectedCount: job.selectedCount || 0,
        eligibleCount: job.eligibleCount || 0,
        assignedCount: job.assignedCount || 0,
        rejectedCount: job.rejectedCount || 0,
        failedCount: job.failedCount || 0,
        createdAt: job.createdAt || null,
        finishedAt: job.finishedAt || null,
        sourceImportRef: shortRef(job.sourceImportJobId),
        supervisorRef: shortRef(job.ownership?.supervisorId || job.channelOwner)
    };
}

function mapDistribution(assignment) {
    return {
        assignmentRef: shortRef(assignment._id),
        stockAssignmentRef: shortRef(assignment.sourceStockAssignment),
        checkJobRef: shortRef(assignment.sourceCheckJob),
        supervisorRef: shortRef(assignment.supervisor),
        advisorRef: shortRef(assignment.assignedTo),
        assignedAt: assignment.assignedAt || null,
        status: assignment.status,
        sourceType: assignment.sourceType,
        currentOutcomeAt: assignment.lastOutcomeAt || null
    };
}

function mapOutcome(assignment) {
    return {
        assignmentRef: shortRef(assignment._id),
        checkJobRef: shortRef(assignment.sourceCheckJob),
        supervisorRef: shortRef(assignment.supervisor),
        advisorRef: shortRef(assignment.assignedTo),
        outcome: assignment.status,
        outcomeAt: assignment.lastOutcomeAt || null,
        sourceType: assignment.sourceType
    };
}

async function getAffiliateFlowManagementSnapshot({ user, now = new Date(), limit = 5 } = {}) {
    const scope = buildScope(user);
    const safeLimit = Math.max(1, Math.min(10, Number(limit) || 5));
    const activeStockFilter = {
        status: "active",
        expiresAt: { $gt: now },
        ...scopedSupervisorFilter(scope)
    };
    const activeLeadFilter = {
        active: true,
        ...scopedSupervisorFilter(scope, "supervisor")
    };
    const activeJobFilter = {
        status: { $in: ACTIVE_JOB_STATUSES },
        isDeleted: { $ne: true },
        ...scopedJobFilter(scope)
    };
    const errorJobFilter = {
        status: { $in: ERROR_JOB_STATUSES },
        isDeleted: { $ne: true },
        ...scopedJobFilter(scope)
    };
    const recentJobFilter = {
        isDeleted: { $ne: true },
        ...scopedJobFilter(scope)
    };

    const [
        processingReservations,
        eligible,
        nonEligible,
        availableGeneralStock,
        supervisorOwned,
        advisorAssigned,
        recheckRequired,
        activeJobs,
        errorsOrStuckJobs,
        recentCheckJobs,
        recentDistributions,
        recentAdvisorOutcomes
    ] = await Promise.all([
        AffiliateOperationalState.countDocuments({
            $or: [
                { currentCheckJobId: { $ne: null } },
                { verificationStatus: "checking" }
            ]
        }),
        AffiliateOperationalState.countDocuments({
            canSell: true,
            verificationStatus: "checked",
            saleStatus: "none"
        }),
        AffiliateOperationalState.countDocuments({
            $or: [
                { canSell: false },
                { verificationStatus: { $in: ["no_data", "captcha", "error"] } }
            ]
        }),
        AffiliateOperationalState.countDocuments({
            availableForSale: true,
            $or: [
                { "ownership.supervisorId": null },
                { "ownership.supervisorId": { $exists: false } }
            ]
        }),
        AffiliateAssignment.countDocuments(activeStockFilter),
        LeadAssignment.countDocuments(activeLeadFilter),
        AffiliateOperationalState.countDocuments({ verificationStatus: "expired" }),
        AffiliateCheckJob.countDocuments(activeJobFilter),
        AffiliateCheckJob.countDocuments(errorJobFilter),
        AffiliateCheckJob.find(recentJobFilter)
            .sort({ createdAt: -1 })
            .limit(safeLimit)
            .select("mode status requestedCount selectedCount eligibleCount assignedCount rejectedCount failedCount createdAt finishedAt sourceImportJobId ownership.supervisorId channelOwner")
            .lean(),
        LeadAssignment.find({
            sourceStockAssignment: { $ne: null },
            ...activeLeadFilter
        })
            .sort({ assignedAt: -1, _id: -1 })
            .limit(safeLimit)
            .select("assignedTo supervisor assignedAt status sourceType sourceStockAssignment sourceCheckJob lastOutcomeAt")
            .lean(),
        LeadAssignment.find({
            lastOutcomeAt: { $ne: null },
            ...activeLeadFilter
        })
            .sort({ lastOutcomeAt: -1, _id: -1 })
            .limit(safeLimit)
            .select("assignedTo supervisor status sourceType sourceCheckJob lastOutcomeAt")
            .lean()
    ]);

    return {
        scope: {
            role: scope.role,
            management: scope.management,
            supervisorRef: shortRef(scope.supervisorId)
        },
        counts: {
            processingReservations,
            eligible,
            nonEligible,
            availableGeneralStock,
            supervisorOwned,
            advisorAssigned,
            recheckRequired,
            activeJobs,
            errorsOrStuckJobs
        },
        recentCheckJobs: recentCheckJobs.map(mapCheckJob),
        recentDistributions: recentDistributions.map(mapDistribution),
        recentAdvisorOutcomes: recentAdvisorOutcomes.map(mapOutcome)
    };
}

module.exports = {
    getAffiliateFlowManagementSnapshot,
    shortRef
};
