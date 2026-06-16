"use strict";

const mongoose = require("mongoose");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateCheckConfig = require("../models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const User = require("../models/User");
const { AffiliateCheckError, getActiveCheckConfig } = require("./affiliateCheck.service");

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const TERMINAL_ROW_STATUSES = ["eligible", "assigned", "rejected", "failed", "cancelled"];
const SUPERVISOR_ROLES = ["supervisor", "supervisor_reventa"];
const TARGET_VIEW_ROLES = ["gerencia", "desarrollador"];

function normalizeRole(user) {
    return String(user?.role || "").trim().toLowerCase();
}

function argentinaCalendarDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: ARGENTINA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return values.year + "-" + values.month + "-" + values.day;
}

function argentinaDayRange(dateInput, now = new Date()) {
    const date = dateInput || argentinaCalendarDate(now);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match) throw new AffiliateCheckError("La fecha indicada no es válida", 400, "INVALID_DATE");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (
        calendarCheck.getUTCFullYear() !== year
        || calendarCheck.getUTCMonth() !== month - 1
        || calendarCheck.getUTCDate() !== day
    ) throw new AffiliateCheckError("La fecha indicada no es válida", 400, "INVALID_DATE");

    return {
        date,
        timezone: ARGENTINA_TIME_ZONE,
        start: new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0)),
        end: new Date(Date.UTC(year, month - 1, day + 1, 3, 0, 0, 0))
    };
}

async function resolveDashboardSupervisor({ user, supervisorId }) {
    const role = normalizeRole(user);
    if (SUPERVISOR_ROLES.includes(role)) return user._id;
    if (!TARGET_VIEW_ROLES.includes(role)) {
        throw new AffiliateCheckError("No tiene permisos para consultar métricas de chequeo", 403, "DASHBOARD_FORBIDDEN");
    }
    if (!supervisorId) return user._id;
    if (!mongoose.isValidObjectId(supervisorId)) {
        throw new AffiliateCheckError("Debe indicar un supervisor válido", 400, "TARGET_SUPERVISOR_REQUIRED");
    }
    const supervisor = await User.findOne({
        _id: supervisorId,
        role: { $in: SUPERVISOR_ROLES },
        active: true,
        deletedAt: null
    }).select("_id nombre role numeroEquipo").lean();
    if (!supervisor) {
        throw new AffiliateCheckError("Supervisor destino inválido o inactivo", 404, "TARGET_SUPERVISOR_NOT_FOUND");
    }
    return supervisor._id;
}

function emptyModeUsage() {
    return { extract_base: 0, check_new: 0, check_reusable: 0, check_import: 0 };
}

async function getDailyJobUsage({ supervisorId, start, end }) {
    const subject = new mongoose.Types.ObjectId(supervisorId);
    const rows = await AffiliateCheckJob.aggregate([
        {
            $match: {
                createdAt: { $gte: start, $lt: end },
                status: { $ne: "draft" },
                isDeleted: { $ne: true },
                mode: { $in: ["check_new", "check_reusable", "check_import"] },
                $or: [
                    { channelOwner: subject },
                    { "ownership.supervisorId": subject },
                    { requestedBy: subject }
                ]
            }
        },
        { $group: { _id: "$mode", consumed: { $sum: { $ifNull: ["$quota.consumed", 0] } }, jobs: { $sum: 1 } } }
    ]);
    const byMode = emptyModeUsage();
    let jobsCreatedToday = 0;
    for (const row of rows) {
        if (Object.prototype.hasOwnProperty.call(byMode, row._id)) byMode[row._id] = row.consumed || 0;
        jobsCreatedToday += row.jobs || 0;
    }
    return { byMode, jobsCreatedToday };
}

async function getDailyExtractionUsage({ supervisorId, start, end }) {
    return AffiliateAssignment.countDocuments({
        supervisorId,
        source: "extract_base",
        status: { $ne: "cancelled" },
        assignedAt: { $gte: start, $lt: end }
    });
}

async function getDailyRowSummary({ supervisorId, start, end }) {
    const subject = new mongoose.Types.ObjectId(supervisorId);
    const [rows, assignments] = await Promise.all([
        AffiliateCheckRow.aggregate([
            {
                $lookup: {
                    from: "affiliatecheckjobs",
                    localField: "jobId",
                    foreignField: "_id",
                    as: "job"
                }
            },
            { $unwind: "$job" },
            {
                $match: {
                    "job.createdAt": { $gte: start, $lt: end },
                    "job.isDeleted": { $ne: true },
                    "job.mode": { $in: ["check_new", "check_reusable", "check_import"] },
                    $or: [
                        { "job.channelOwner": subject },
                        { "job.ownership.supervisorId": subject },
                        { "job.requestedBy": subject }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    eligibleRowsToday: { $sum: { $cond: [{ $eq: ["$canSell", true] }, 1, 0] } },
                    generalStockToday: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "eligible"] }, { $eq: ["$canSell", true] }] }, 1, 0] } },
                    errorsToday: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
                    terminalRowsToday: { $sum: { $cond: [{ $in: ["$status", TERMINAL_ROW_STATUSES] }, 1, 0] } }
                }
            }
        ]),
        AffiliateAssignment.aggregate([
            {
                $match: {
                    supervisorId: subject,
                    source: "check_job",
                    status: "active",
                    assignedAt: { $gte: start, $lt: end },
                    sourceJobId: { $ne: null }
                }
            },
            {
                $lookup: {
                    from: "affiliatecheckjobs",
                    localField: "sourceJobId",
                    foreignField: "_id",
                    as: "job"
                }
            },
            { $unwind: "$job" },
            {
                $match: {
                    "job.mode": { $in: ["check_new", "check_reusable", "check_import"] },
                    "job.isDeleted": { $ne: true }
                }
            },
            { $group: { _id: null, assignedToStockToday: { $sum: 1 } } }
        ])
    ]);
    const result = rows[0] || {
        eligibleRowsToday: 0,
        generalStockToday: 0,
        errorsToday: 0,
        terminalRowsToday: 0
    };
    result.assignedToStockToday = Math.min(assignments[0]?.assignedToStockToday || 0, result.eligibleRowsToday || 0);
    return result;
}

async function getAffiliateCheckDashboardSummary({ user, supervisorId, date, now = new Date() }) {
    const subject = await resolveDashboardSupervisor({ user, supervisorId });
    const range = argentinaDayRange(date, now);
    const config = await getActiveCheckConfig();
    const [usage, extractUsed, rowSummary, activeAssignments] = await Promise.all([
        getDailyJobUsage({ supervisorId: subject, start: range.start, end: range.end }),
        getDailyExtractionUsage({ supervisorId: subject, start: range.start, end: range.end }),
        getDailyRowSummary({ supervisorId: subject, start: range.start, end: range.end }),
        AffiliateAssignment.countDocuments({
            supervisorId: subject,
            status: "active",
            expiresAt: { $gt: now }
        })
    ]);

    const limits = {
        extract_base: Number(config?.dailyQuota?.extractBase || 0),
        check_new: Number(config?.dailyQuota?.checkNew || 0),
        check_reusable: Number(config?.dailyQuota?.checkReusable || 0)
    };
    const used = usage.byMode;
    used.extract_base = extractUsed;
    return {
        success: true,
        date: range.date,
        timezone: range.timezone,
        supervisorId: String(subject),
        quota: {
            extract: {
                used: used.extract_base || 0,
                limit: limits.extract_base,
                remaining: Math.max(0, limits.extract_base - (used.extract_base || 0))
            },
            checkNew: {
                used: used.check_new || 0,
                limit: limits.check_new,
                remaining: Math.max(0, limits.check_new - (used.check_new || 0))
            },
            checkReusable: {
                used: used.check_reusable || 0,
                limit: limits.check_reusable,
                remaining: Math.max(0, limits.check_reusable - (used.check_reusable || 0))
            }
        },
        summary: {
            checksPerformedToday: (used.check_new || 0) + (used.check_reusable || 0),
            jobsCreatedToday: usage.jobsCreatedToday,
            activeAssignments,
            eligibleRowsToday: rowSummary.eligibleRowsToday || 0,
            assignedToStockToday: rowSummary.assignedToStockToday || 0,
            generalStockToday: rowSummary.generalStockToday || 0,
            errorsToday: rowSummary.errorsToday || 0
        }
    };
}

module.exports = {
    ARGENTINA_TIME_ZONE,
    argentinaCalendarDate,
    argentinaDayRange,
    getAffiliateCheckDashboardSummary,
    resolveDashboardSupervisor
};
