/**
 * ============================================================
 * CONTROLADOR DE AFILIADOS (affiliateController)
 * ============================================================
 * Gestiona la base de datos de afiliados (potenciales clientes).
 *
 * Funcionalidades principales:
 * - Importación masiva desde archivos Excel
 * - Exportación a supervisores para distribución
 * - Gestión de datos frescos vs reutilizables
 * - Estadísticas de la base de datos
 * - Configuración de exportaciones automáticas
 *
 * Permisos:
 * - Gerencia: acceso completo
 * - Supervisores: solo estadísticas y exportación de su equipo
 */

const mongoose = require("mongoose");
const Affiliate = require("../models/Affiliate");
const AffiliateImportJob = require("../models/AffiliateImportJob");
const { kickAffiliateImportProcessor } = require("../services/affiliateImport.service");
const { getLocalitiesByZone, normalize, ALL_KNOWN_LOCALITIES } = require("../constants/localityZones");
const Audit = require("../models/Audit");
const AffiliateExportConfig = require("../models/AffiliateExportConfig");
const AffiliateAssignment = require("../models/AffiliateAssignment");
const AffiliateOperationalState = require("../models/AffiliateOperationalState");
const AffiliateContribution = require("../models/AffiliateContribution");
const AffiliateCheckConfig = require("../models/AffiliateCheckConfig");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");
const AffiliateCheckRow = require("../models/AffiliateCheckRow");
const {
    AffiliateCheckError,
    MANAGER_ROLES: AFFILIATE_CHECK_MANAGER_ROLES,
    cancelAffiliateCheckJob,
    createAffiliateCheckJob,
    createImportedAffiliateCheckJob,
    getActiveCheckConfig,
    getAffiliateCheckObraSocialAvailability,
    getImportedAffiliateCheckAvailability,
    previewAffiliateCheckSelection
} = require("../services/affiliateCheck.service");
const { getAffiliateCheckDashboardSummary } = require("../services/affiliateCheckDashboard.service");
const {
    AffiliateCheckOperationError,
    buildJobScope,
    decorateJobs,
    exportAffiliateCheckJob,
    pauseAffiliateCheckJob,
    resumeAffiliateCheckJob,
    retryAffiliateCheckJob,
    softDeleteAffiliateCheckJob
} = require("../services/affiliateCheckOperations.service");
const { isValidPhone, normalizeCuil } = require("../utils/canSellUtils");
const User = require("../models/User");
const LeadAssignment = require("../models/LeadAssignment");
const Report = require("../models/Report");
const logger = require("../utils/logger");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs").promises;
const {
    resolveAffiliateImportReportPath,
    affiliateImportReportExists,
    logLegacyAffiliateImportReportAccess,
    buildAffiliateImportReportPath
} = require("../utils/affiliateImportReportStorage");

/** Middleware: Solo usuarios de rol Gerencia o Encargado */
exports.requireGerencia = (req, res, next) => {
    const role = req.user.role?.toLowerCase();
    if (role !== "gerencia" && role !== "encargado") {
        logger.warn(`⚠️ Acceso denegado a base de afiliados: ${req.user.email} (rol: ${req.user.role})`);
        return res.status(403).json({
            error: "Acceso denegado",
            message: "Solo usuarios de rol Gerencia o Encargado pueden acceder a esta funcionalidad"
        });
    }
    next();
};

// 🔐 Middleware: Gerencia o Supervisor o Encargado
exports.requireSupervisorOrGerencia = (req, res, next) => {
    const role = req.user.role?.toLowerCase();
    if (role !== "gerencia" && role !== "supervisor" && role !== "administrativo" && role !== "encargado") {
        return res.status(403).json({
            error: "Acceso denegado",
            message: "Solo Supervisores, Gerencia o Encargado pueden acceder"
        });
    }
    next();
};

const AFFILIATE_CHECK_ROLES = ["desarrollador", "gerencia", "encargado", "supervisor"];

exports.requireAffiliateCheckAccess = (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase();
    if (!AFFILIATE_CHECK_ROLES.includes(role)) {
        return res.status(403).json({ success: false, message: "No tiene permisos para usar Chequeo de datos" });
    }
    next();
};

exports.requireAffiliateCheckConfigWrite = (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase();
    if (!["desarrollador", "gerencia", "encargado"].includes(role)) {
        return res.status(403).json({ success: false, message: "No tiene permisos para modificar la configuración" });
    }
    next();
};

exports.requireAffiliateCheckProcessAccess = (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase();
    if (!["gerencia", "desarrollador"].includes(role)) {
        return res.status(403).json({ success: false, message: "No tiene permisos para procesar trabajos de chequeo" });
    }
    next();
};

function handleAffiliateCheckError(res, error, context) {
    logger.error(`[AFFILIATE-CHECK] ${context}:`, error);
    if (error instanceof AffiliateCheckError) {
        return res.status(error.statusCode).json({
            success: false,
            code: error.code,
            message: error.message,
            ...(error.jobStatus ? { jobStatus: error.jobStatus } : {})
        });
    }
    if (error instanceof AffiliateCheckOperationError || Number.isInteger(error?.statusCode)) {
        return res.status(error.statusCode || 400).json({
            success: false,
            code: error.code || "AFFILIATE_CHECK_OPERATION_ERROR",
            message: error.message
        });
    }
    if (error?.name === "ValidationError") {
        return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: "Error interno en Chequeo de datos" });
}

function pickCheckConfigUpdate(body = {}) {
    const update = {};
    if (body.dailyQuota && typeof body.dailyQuota === "object") {
        for (const key of ["checkNew", "checkReusable", "extractBase", "checkImport"]) {
            if (body.dailyQuota[key] !== undefined) update[`dailyQuota.${key}`] = body.dailyQuota[key];
        }
    }
    for (const key of ["ownershipDays", "verificationExpiryDays"]) {
        if (body[key] !== undefined) update[key] = body[key];
    }
    if (body.workers && typeof body.workers === "object") {
        for (const key of ["arca", "dateas", "padron", "codem"]) {
            if (body.workers[key] !== undefined) update[`workers.${key}`] = body.workers[key];
        }
    }
    if (body.features && typeof body.features === "object") {
        for (const key of ["checkNewEnabled", "checkReusableEnabled", "extractBaseEnabled", "checkImportEnabled"]) {
            if (body.features[key] !== undefined) update[`features.${key}`] = body.features[key];
        }
    }
    return update;
}

exports.getAffiliateCheckConfig = async (req, res) => {
    try {
        const config = await getActiveCheckConfig();
        return res.json({ success: true, config });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "get config");
    }
};

exports.updateAffiliateCheckConfig = async (req, res) => {
    try {
        const current = await getActiveCheckConfig();
        const config = await AffiliateCheckConfig.findOneAndUpdate(
            { _id: current._id, active: true },
            { $set: { ...pickCheckConfigUpdate(req.body), updatedBy: req.user._id } },
            { new: true, runValidators: true }
        ).lean();
        return res.json({ success: true, config });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "update config");
    }
};

exports.previewAffiliateCheck = async (req, res) => {
    try {
        const preview = await previewAffiliateCheckSelection({
            user: req.user,
            mode: req.body?.mode,
            requestedCount: req.body?.requestedCount,
            filters: req.body?.filters,
            supervisorId: req.body?.supervisorId,
            obraSocialSelection: req.body?.obraSocialSelection,
            obraSocial: req.body?.obraSocial
        });
        return res.json({ success: true, ...preview });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "preview");
    }
};

exports.getAffiliateCheckObraSocialAvailability = async (req, res) => {
    try {
        const result = await getAffiliateCheckObraSocialAvailability({
            user: req.user,
            mode: req.body?.mode,
            search: req.body?.search,
            limit: req.body?.limit,
            selectedCodes: req.body?.selectedCodes
        });
        return res.json({ success: true, ...result });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "obra social availability");
    }
};

exports.getAffiliateCheckDashboardSummary = async (req, res) => {
    try {
        const result = await getAffiliateCheckDashboardSummary({
            user: req.user,
            supervisorId: req.query?.supervisorId,
            date: req.query?.date
        });
        return res.json(result);
    } catch (error) {
        return handleAffiliateCheckError(res, error, "dashboard summary");
    }
};

exports.createAffiliateCheckJob = async (req, res) => {
    try {
        const job = await createAffiliateCheckJob({
            user: req.user,
            mode: req.body?.mode,
            requestedCount: req.body?.requestedCount,
            filters: req.body?.filters,
            supervisorId: req.body?.supervisorId,
            obraSocialSelection: req.body?.obraSocialSelection,
            obraSocial: req.body?.obraSocial
        });
        const response = { success: true, job };
        if (job._partialCreation) {
            response.partialCreation = true;
            response.partialMessage = job._partialMessage;
        }
        return res.status(job.mode === "extract_base" ? 200 : 202).json(response);
    } catch (error) {
        return handleAffiliateCheckError(res, error, "create job");
    }
};

exports.cancelAffiliateCheckJob = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) {
            return res.status(400).json({ success: false, message: "ID de trabajo inválido" });
        }
        const role = String(req.user?.role || "").toLowerCase();
        const job = await AffiliateCheckJob.findById(req.params.jobId).select("requestedBy status").lean();
        if (!job) return res.status(404).json({ success: false, message: "Trabajo no encontrado" });
        if (!AFFILIATE_CHECK_MANAGER_ROLES.includes(role)) {
            const isOwner = String(job.requestedBy) === String(req.user?._id);
            if (role !== "supervisor" || !isOwner || job.status !== "pending") {
                return res.status(403).json({
                    success: false,
                    message: "Solo puede cancelar trabajos pendientes propios"
                });
            }
        }
        const result = await cancelAffiliateCheckJob({
            jobId: req.params.jobId,
            cancelledBy: req.user._id,
            reason: req.body?.reason || "affiliate_check_job_cancelled"
        });
        return res.json({ success: true, ...result });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "cancel job");
    }
};

exports.processAffiliateCheckJob = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.jobId)) {
        return res.status(400).json({ success: false, message: "ID de trabajo inválido" });
    }
    logger.warn(`[AFFILIATE-CHECK] Manual monolithic processing rejected jobId=${req.params.jobId} userId=${req.user?._id || "unknown"}`);
    return res.status(409).json({
        success: false,
        code: "STAGED_PROCESSING_REQUIRED",
        message: "El procesamiento manual ya no está disponible. El trabajo será procesado por los workers por etapas."
    });
};

function canSeeAllAffiliateCheckJobs(req) {
    return AFFILIATE_CHECK_MANAGER_ROLES.includes(String(req.user?.role || "").toLowerCase());
}

exports.getAffiliateCheckJob = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) {
            return res.status(400).json({ success: false, message: "ID de trabajo inválido" });
        }
        const filter = buildJobScope(req.user, req.params.jobId);
        const job = await AffiliateCheckJob.findOne(filter).lean();
        if (!job) return res.status(404).json({ success: false, message: "Trabajo no encontrado" });
        const [decoratedJob] = await decorateJobs([job], req.user);
        const rowCounts = await AffiliateCheckRow.aggregate([
            { $match: { jobId: job._id } },
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        return res.json({
            success: true,
            job: decoratedJob,
            rowCounts: Object.fromEntries(rowCounts.map(row => [row._id, row.count]))
        });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "get job");
    }
};

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

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
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const calendarCheck = new Date(Date.UTC(year, month - 1, day));
    if (
        calendarCheck.getUTCFullYear() !== year
        || calendarCheck.getUTCMonth() !== month - 1
        || calendarCheck.getUTCDate() !== day
    ) return null;

    // Argentina has used UTC-03:00 continuously throughout the platform's operational period.
    return {
        date,
        start: new Date(Date.UTC(year, month - 1, day, 3)),
        end: new Date(Date.UTC(year, month - 1, day + 1, 3))
    };
}

exports.listAffiliateCheckJobs = async (req, res) => {
    try {
        const filter = { isDeleted: { $ne: true } };
        const seeAll = req.query?.all === "true" && canSeeAllAffiliateCheckJobs(req);
        if (!seeAll) filter.requestedBy = req.user._id;
        if (req.query?.mode) filter.mode = req.query.mode;
        const dayRange = argentinaDayRange(req.query?.date);
        if (!dayRange) {
            return res.status(400).json({ success: false, message: "La fecha indicada no es válida." });
        }
        filter.createdAt = { $gte: dayRange.start, $lt: dayRange.end };
        const limit = Math.min(Math.max(Number(req.query?.limit) || 25, 1), 100);
        const jobs = await AffiliateCheckJob.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
        const decoratedJobs = await decorateJobs(jobs, req.user);
        return res.json({ success: true, date: dayRange.date, jobs: decoratedJobs });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "list jobs");
    }
};

// Upload only stores the workbook and creates a pending import job.
exports.uploadAffiliates = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se proporcionó archivo" });
        }

        const job = await AffiliateImportJob.create({
            originalFilename: req.file.originalname,
            storedFilename: req.file.filename,
            uploadedBy: req.user._id,
            status: "pending"
        });

        logger.info(`[AFFILIATE-IMPORT][job:${job._id}] Trabajo creado para ${req.file.originalname}`);
        if (process.env.AFFILIATE_IMPORT_IN_PROCESS !== "false") {
            kickAffiliateImportProcessor();
        }

        return res.status(202).json({
            success: true,
            async: true,
            importJobId: job._id,
            status: job.status,
            message: "Trabajo de importación creado. El procesamiento continuará en segundo plano."
        });
    } catch (error) {
        logger.error("Error creando trabajo de importación de afiliados:", error);
        return res.status(500).json({
            error: "Error creando trabajo de importación",
            message: error.message
        });
    }
};

exports.uploadExternalAffiliateCheckFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No se proporcionó archivo" });
        }
        const job = await AffiliateImportJob.create({
            originalFilename: req.file.originalname,
            storedFilename: req.file.filename,
            uploadedBy: req.user._id,
            source: "external_check",
            status: "pending"
        });
        if (process.env.AFFILIATE_IMPORT_IN_PROCESS !== "false") {
            kickAffiliateImportProcessor();
        }
        return res.status(202).json({
            success: true,
            importJobId: job._id,
            status: job.status
        });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "upload external file");
    }
};

function buildImportJobAccessFilter(req, jobId) {
    const filter = { _id: jobId };
    if (req.user.role?.toLowerCase() !== "gerencia") {
        filter.uploadedBy = req.user._id;
    }
    return filter;
}

function serializeRejectionSummary(summary) {
    if (!summary) return {};
    if (summary instanceof Map) return Object.fromEntries(summary);
    return summary;
}

async function buildAffiliateImportReportAvailability(job, field, url) {
    const storedPath = job?.[field];
    const available = Boolean(storedPath) && await affiliateImportReportExists(storedPath);
    return {
        available,
        url: available ? url : null
    };
}

async function downloadAffiliateImportReport(res, job, field, missingMessage, notFoundMessage, context) {
    const storedPath = job?.[field];
    if (!storedPath) {
        return res.status(404).json({ success: false, message: missingMessage });
    }

    const resolved = resolveAffiliateImportReportPath(storedPath);
    if (!resolved.authorized) {
        logger.warn("[AFFILIATE-IMPORT][job:" + job._id + "] Ruta de reporte no autorizada (" + context + ")");
        return res.status(403).json({ success: false, message: "Ruta de reporte no autorizada" });
    }

    const exists = await fs.access(resolved.filePath).then(() => true).catch(() => false);
    if (!exists) {
        return res.status(404).json({ success: false, message: notFoundMessage });
    }

    logLegacyAffiliateImportReportAccess(storedPath, context);
    return res.download(resolved.filePath, path.basename(resolved.filePath));
}

function buildExternalImportAccessFilter(req, importJobId) {
    const filter = { _id: importJobId, source: "external_check" };
    if (!canSeeAllAffiliateCheckJobs(req)) filter.uploadedBy = req.user._id;
    return filter;
}

async function findAccessibleExternalImport(req, projection) {
    if (!mongoose.isValidObjectId(req.params.importJobId)) return null;
    return AffiliateImportJob.findOne(
        buildExternalImportAccessFilter(req, req.params.importJobId),
        projection
    ).lean();
}

exports.getExternalAffiliateCheckImport = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.importJobId)) {
            return res.status(400).json({ success: false, message: "ID de importación inválido" });
        }
        const job = await findAccessibleExternalImport(req, {
            status: 1, totalRows: 1, createdCount: 1, updatedCount: 1,
            existingLinkedCount: 1, rejectedCount: 1,
            batchId: 1, rejectedFilePath: 1, updatedFilePath: 1
        });
        if (!job) {
            return res.status(404).json({ success: false, message: "Trabajo de importación no encontrado" });
        }
        const availability = ["completed", "completed_with_errors"].includes(job.status)
            ? await getImportedAffiliateCheckAvailability(job._id)
            : { eligibleCount: 0, checkableCount: 0, excludedCount: 0, exclusionReasons: {} };
        const rejectedReport = await buildAffiliateImportReportAvailability(
            job,
            "rejectedFilePath",
            "/affiliates/check/external-file/" + job._id + "/rejected-file"
        );
        const updatedReport = await buildAffiliateImportReportAvailability(
            job,
            "updatedFilePath",
            "/affiliates/check/external-file/" + job._id + "/updated-file"
        );
        return res.json({
            success: true,
            job: {
                _id: job._id,
                status: job.status,
                totalRows: job.totalRows,
                createdCount: job.createdCount,
                updatedCount: job.updatedCount,
                existingLinkedCount: job.existingLinkedCount || 0,
                rejectedCount: job.rejectedCount,
                checkableCount: availability.checkableCount,
                excludedCount: availability.excludedCount || 0,
                exclusionReasons: availability.exclusionReasons || {},
                batchId: job.batchId || null,
                rejectedFileAvailable: rejectedReport.available,
                rejectedFileUrl: rejectedReport.url,
                updatedFileAvailable: updatedReport.available,
                updatedFileUrl: updatedReport.url
            }
        });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "get external import");
    }
};

async function downloadExternalImportReport(req, res, field, missingMessage) {
    const job = await findAccessibleExternalImport(req, { [field]: 1 });
    if (!job) {
        return res.status(404).json({ success: false, message: "Trabajo de importación no encontrado" });
    }
    return downloadAffiliateImportReport(
        res,
        job,
        field,
        missingMessage,
        "Reporte no encontrado",
        "external-" + field
    );
}

exports.downloadExternalAffiliateCheckRejectedFile = async (req, res) => {
    try {
        return await downloadExternalImportReport(req, res, "rejectedFilePath", "El trabajo no tiene reporte de rechazados");
    } catch (error) {
        return handleAffiliateCheckError(res, error, "download external rejected report");
    }
};

exports.downloadExternalAffiliateCheckUpdatedFile = async (req, res) => {
    try {
        return await downloadExternalImportReport(req, res, "updatedFilePath", "El trabajo no tiene reporte de actualizados");
    } catch (error) {
        return handleAffiliateCheckError(res, error, "download external updated report");
    }
};

exports.createExternalAffiliateCheckJob = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.importJobId)) {
            return res.status(400).json({ success: false, message: "ID de importación inválido" });
        }
        const accessible = await findAccessibleExternalImport(req, { _id: 1 });
        if (!accessible) {
            return res.status(404).json({ success: false, message: "Trabajo de importación no encontrado" });
        }
        const job = await createImportedAffiliateCheckJob({
            user: req.user,
            importJobId: accessible._id,
            requestedCount: req.body?.requestedCount,
            supervisorId: req.body?.supervisorId
        });
        return res.status(202).json({ success: true, job });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "create external check job");
    }
};

exports.getAffiliateImportJob = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) {
            return res.status(400).json({ success: false, message: "ID de importación inválido" });
        }

        const job = await AffiliateImportJob.findOne(
            buildImportJobAccessFilter(req, req.params.jobId),
            {
                originalFilename: 1,
                uploadedBy: 1,
                status: 1,
                totalRows: 1,
                processedRows: 1,
                createdCount: 1,
                updatedCount: 1,
                rejectedCount: 1,
                rejectionSummary: 1,
                rejectedFilePath: 1,
                updatedFilePath: 1,
                errorMessage: 1,
                startedAt: 1,
                finishedAt: 1,
                createdAt: 1,
                updatedAt: 1
            }
        ).lean();

        if (!job) {
            return res.status(404).json({ success: false, message: "Trabajo de importación no encontrado" });
        }

        const rejectedReport = await buildAffiliateImportReportAvailability(
            job,
            "rejectedFilePath",
            "/affiliates/import-jobs/" + job._id + "/rejected-file"
        );
        const updatedReport = await buildAffiliateImportReportAvailability(
            job,
            "updatedFilePath",
            "/affiliates/import-jobs/" + job._id + "/updated-file"
        );

        return res.json({
            success: true,
            job: {
                ...job,
                rejectionSummary: serializeRejectionSummary(job.rejectionSummary),
                rejectedFileAvailable: rejectedReport.available,
                rejectedFileUrl: rejectedReport.url,
                updatedFileAvailable: updatedReport.available,
                updatedFileUrl: updatedReport.url
            }
        });
    } catch (error) {
        logger.error("Error obteniendo trabajo de importación:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.downloadAffiliateImportRejectedFile = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) {
            return res.status(400).json({ success: false, message: "ID de importación inválido" });
        }

        const job = await AffiliateImportJob.findOne(
            buildImportJobAccessFilter(req, req.params.jobId),
            { rejectedFilePath: 1 }
        ).lean();

        if (!job) {
            return res.status(404).json({ success: false, message: "Trabajo de importación no encontrado" });
        }

        return downloadAffiliateImportReport(
            res,
            job,
            "rejectedFilePath",
            "El trabajo no tiene reporte de rechazados",
            "Reporte de rechazados no encontrado",
            "normal-rejectedFilePath"
        );
    } catch (error) {
        logger.error("Error descargando reporte de importación:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

exports.downloadAffiliateImportUpdatedFile = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.jobId)) {
            return res.status(400).json({ success: false, message: "ID de importación inválido" });
        }

        const job = await AffiliateImportJob.findOne(
            buildImportJobAccessFilter(req, req.params.jobId),
            { updatedFilePath: 1 }
        ).lean();

        if (!job) {
            return res.status(404).json({ success: false, message: "Trabajo de importación no encontrado" });
        }

        return downloadAffiliateImportReport(
            res,
            job,
            "updatedFilePath",
            "El trabajo no tiene reporte de actualizados",
            "Reporte de actualizados no encontrado",
            "normal-updatedFilePath"
        );
    } catch (error) {
        logger.error("Error descargando reporte de actualizados:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// 📥 Descargar reporte de duplicados
exports.downloadReport = async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = await buildAffiliateImportReportPath(filename);

        /* Seguridad: verificar que el archivo existe y está en el directorio correcto */
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
            return res.status(404).json({ error: "Reporte no encontrado" });
        }

        res.download(filePath, filename, (err) => {
            if (err) {
                logger.error("Error descargando reporte:", err);
                res.status(500).json({ error: "Error descargando reporte" });
            }
        });

    } catch (error) {
        logger.error("Error en downloadReport:", error);
        res.status(500).json({ error: error.message });
    }
};

/** Escapes regex special characters so locality names are matched literally. */
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Converts a stored "MM/YYYY" contribution period to an integer YYYYMM
 * for range comparison. Returns 0 for unrecognised formats.
 */
function periodToNum(p) {
    if (!p) return 0;
    const [mm, yyyy] = p.split("/");
    if (!mm || !yyyy) return 0;
    return parseInt(yyyy + mm.padStart(2, "0"), 10);
}

function formatPadron(padron) {
    if (!padron || !padron.status) return 'Pendiente';
    switch (padron.status) {
        case 'not_found':
        case 'found_expired':
            return 'No';
        case 'found_active': {
            if (padron.periodoDesde) {
                const [mm, yyyy] = String(padron.periodoDesde).split('/');
                if (mm && yyyy) {
                    const d = new Date(parseInt(yyyy), parseInt(mm) - 1 + 12, 1);
                    const rel = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    return `S\u00ed (${rel})`;
                }
            }
            return 'S\u00ed';
        }
        case 'captcha_failed':
        case 'error':
            return 'Error';
        default:
            return 'Pendiente';
    }
}

// 🔍 Buscar/filtrar afiliados
exports.searchAffiliates = async (req, res) => {
    try {
        const { query, search, obraSocial, localidad, zona, page = 1, limit = 100, userId, verificationStatus, periodFrom, periodTo, trimPagos, soloDisponibles } = req.query;
        const searchTerm = search || query;

        const filter = { active: true };

        /* Búsqueda por texto (nombre, CUIL, teléfono) */
        if (searchTerm) {
            const normalizedQuery = searchTerm.trim();
            filter.$or = [
                { nombre: { $regex: normalizedQuery, $options: "i" } },
                { cuil: { $regex: normalizedQuery, $options: "i" } },
                { telefono1: { $regex: normalizedQuery, $options: "i" } },
                { telefono2: { $regex: normalizedQuery, $options: "i" } },
                { telefono3: { $regex: normalizedQuery, $options: "i" } }
            ];
        }

        /* Filtro por obra social — acepta string único o array de strings */
        if (obraSocial) {
            if (Array.isArray(obraSocial)) {
                if (obraSocial.length > 0) filter.obraSocial = { $in: obraSocial };
            } else if (obraSocial !== "all") {
                filter.obraSocial = obraSocial;
            }
        }

        /* Filtro por usuario (para estadísticas de RRHH) */
        if (userId) {
            filter.uploadedBy = userId;
        }

        /* Filtro por localidad (partial case-insensitive match) */
        if (localidad && !zona) {
            filter.localidad = { $regex: localidad.trim(), $options: "i" };
        }

        /* Filtro por zona geográfica */
        if (zona && zona.toLowerCase() !== "todos") {
            const zoneLocalities = getLocalitiesByZone(zona);

            if (zoneLocalities === null) {
                // PROVINCIA = everything NOT in any known zone.
                // $nor + case-insensitive regex exact match is used instead of $nin
                // because $nin is strict equality and won't match stored values like
                // "Avellaneda" against the normalized "avellaneda" in our set.
                filter.$nor = Array.from(ALL_KNOWN_LOCALITIES).map(l => ({
                    localidad: { $regex: `^${escapeRegex(l)}$`, $options: "i" }
                }));
            } else if (zoneLocalities.length > 0) {
                const zoneRegexList = zoneLocalities.map(
                    l => new RegExp(`^${escapeRegex(l)}$`, "i")
                );
                if (localidad) {
                    // Both filters: $and combines the zone membership check
                    // with the free-text localidad search.
                    // Cannot merge $in + $regex + $options into one field object
                    // — that is invalid MongoDB syntax.
                    filter.$and = [
                        { localidad: { $in: zoneRegexList } },
                        { localidad: { $regex: localidad.trim(), $options: "i" } }
                    ];
                } else {
                    // Zone only: case-insensitive exact match against zone list.
                    filter.localidad = { $in: zoneRegexList };
                }
            }
        }

        /* ── Contribution-based pre-filters (verificationStatus, period range) ─ */
        const hasContribFilter =
            (verificationStatus && (Array.isArray(verificationStatus) ? verificationStatus.length : true)) ||
            periodFrom ||
            periodTo;

        if (hasContribFilter) {
            const statuses = verificationStatus
                ? (Array.isArray(verificationStatus) ? verificationStatus : [verificationStatus]).filter(Boolean)
                : [];

            const includePending    = statuses.includes("pending");
            const nonPendingStatuses = statuses.filter(s => s !== "pending");

            if (includePending && nonPendingStatuses.length === 0 && !periodFrom && !periodTo) {
                // "Pending-only" with no period filter.
                // "Pending" = no contribution doc at all OR verification.status is "pending"/null.
                // Efficient path: exclude affiliates that DO have a confirmed non-pending status.
                const excluded = await AffiliateContribution.find(
                    { "verification.status": { $nin: ["pending", null] } },
                    { affiliateId: 1 }
                ).lean();
                filter._id = { $nin: excluded.map(c => c.affiliateId) };
            } else {
                // All other cases: $in query on explicit statuses.
                const contribFilter = {};
                if (statuses.length > 0) {
                    contribFilter["verification.status"] = { $in: statuses };
                }

                const contribs = await AffiliateContribution.find(
                    contribFilter,
                    { affiliateId: 1, lastContributionPeriod: 1 }
                ).lean();

                // Period range: JS-level filter converting stored "MM/YYYY" → YYYYMM number
                let filtered = contribs;
                if (periodFrom || periodTo) {
                    const fromNum = periodFrom ? parseInt(periodFrom, 10) : 0;
                    const toNum   = periodTo   ? parseInt(periodTo,   10) : 999999;
                    filtered = contribs.filter(c => {
                        const n = periodToNum(c.lastContributionPeriod);
                        return n >= fromNum && n <= toNum;
                    });
                }

                let matchingIds = filtered.map(c => c.affiliateId);

                // "pending" + other statuses (no period filter): also include affiliates
                // with no contribution doc (they are implicitly pending).
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

                filter._id = { $in: matchingIds };
            }
        }

        /* ── Trim. pagos filter (last3ClosedMonthsPaidCount) ─────────────── */
        if (trimPagos) {
            const trimValues = (Array.isArray(trimPagos) ? trimPagos : [trimPagos]).map(Number);
            const includesZero = trimValues.includes(0);
            const nonZeroVals = trimValues.filter(v => v !== 0);

            const idSet = new Set();

            if (nonZeroVals.length > 0) {
                const contribs = await AffiliateContribution.find(
                    { last3ClosedMonthsPaidCount: { $in: nonZeroVals } },
                    { affiliateId: 1 }
                ).lean();
                for (const c of contribs) idSet.add(String(c.affiliateId));
            }

            if (includesZero) {
                // "zero" = count > 0 affiliates are excluded; rest qualify
                const positiveIds = await AffiliateContribution.distinct('affiliateId', {
                    last3ClosedMonthsPaidCount: { $gt: 0 }
                });
                const positiveSet = new Set(positiveIds.map(String));
                const zeroAffiliates = await Affiliate.find(
                    { active: true, _id: { $nin: positiveIds } },
                    { _id: 1 }
                ).lean();
                for (const a of zeroAffiliates) idSet.add(String(a._id));
            }

            const trimMatchIds = Array.from(idSet);
            if (filter._id) {
                const existingSet = new Set(filter._id.$in.map(String));
                filter._id = { $in: trimMatchIds.filter(id => existingSet.has(id)) };
            } else {
                filter._id = { $in: trimMatchIds };
            }
        }

        /* ── Solo disponibles para venta (canSell === true en AffiliateContribution) ── */
        if (soloDisponibles === 'true') {
            const canSellIds = await AffiliateContribution.distinct('affiliateId', { canSell: true });
            if (filter._id && filter._id.$in) {
                const existingSet = new Set(filter._id.$in.map(String));
                filter._id = { $in: canSellIds.filter(id => existingSet.has(String(id))) };
            } else {
                filter._id = { $in: canSellIds };
            }
        }

        const freshCountFilter = {
            $and: [
                filter,
                { dataSource: "fresh" },
                { $or: [{ ultimoUso: { $exists: false } }, { ultimoUso: null }] },
                { $or: [{ isUsed: { $exists: false } }, { isUsed: false }] }
            ]
        };
        const reusableCountFilter = {
            $and: [
                filter,
                {
                    $or: [
                        { dataSource: "reusable" },
                        { isUsed: true },
                        { ultimoUso: { $exists: true, $ne: null } }
                    ]
                }
            ]
        };

        const [total, freshCount, reusableCount] = await Promise.all([
            Affiliate.countDocuments(filter),
            Affiliate.countDocuments(freshCountFilter),
            Affiliate.countDocuments(reusableCountFilter),
        ]);

        let queryBuilder = Affiliate.find(filter)
            .populate("uploadedBy", "nombre email")
            .sort({ uploadDate: -1 });

        /* Si limit es 0 o 'all', no paginar (traer todo) */
        if (limit !== "0" && limit !== 0 && limit !== "all") {
            queryBuilder = queryBuilder
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit));
        }

        const affiliates = await queryBuilder.lean();

        // ── Enriquecer con datos de verificación de aportes ──
        if (affiliates.length) {
            const affiliateIds = affiliates.map((a) => a._id);
            const contributions = await AffiliateContribution.find(
                { affiliateId: { $in: affiliateIds } },
                { affiliateId: 1, lastContributionPeriod: 1, last3ClosedMonthsPaidCount: 1, "verification.status": 1, "verification.checkedAt": 1, padron: 1 }
            ).lean();

            // Batch-fetch CUILs con 'QR hecho' para Condición 5 de CanSell
            const affiliateCuilVariants = new Set();
            for (const affiliate of affiliates) {
                const rawCuil = affiliate.cuil ? String(affiliate.cuil).trim() : "";
                const normalized = normalizeCuil(rawCuil);
                if (rawCuil) affiliateCuilVariants.add(rawCuil);
                if (normalized) {
                    affiliateCuilVariants.add(normalized);
                    if (normalized.length === 11) {
                        affiliateCuilVariants.add(`${normalized.slice(0, 2)}-${normalized.slice(2, 10)}-${normalized.slice(10)}`);
                    }
                }
            }
            const qrHechoAudits = await Audit.find(
                affiliateCuilVariants.size > 0
                    ? { status: "QR hecho", cuil: { $in: Array.from(affiliateCuilVariants) } }
                    : { _id: null },
                { cuil: 1 }
            ).lean();
            const qrHechoCuils = new Set(qrHechoAudits.map(a => normalizeCuil(a.cuil)).filter(Boolean));

            const contribMap = {};
            for (const c of contributions) {
                contribMap[String(c.affiliateId)] = c;
            }

            for (const affiliate of affiliates) {
                const contrib = contribMap[String(affiliate._id)];
                const padronData = contrib?.padron ?? null;
                const mergedContrib = contrib
                    ? {
                          lastContributionPeriod: contrib.lastContributionPeriod || null,
                          last3ClosedMonthsPaidCount: contrib.last3ClosedMonthsPaidCount ?? null,
                          verificationStatus: contrib.verification?.status || "pending",
                          verificationCheckedAt: contrib.verification?.checkedAt || null,
                          padron: padronData,
                      }
                    : {
                          lastContributionPeriod: null,
                          last3ClosedMonthsPaidCount: null,
                          verificationStatus: "pending",
                          verificationCheckedAt: null,
                          padron: null,
                      };
                if (process.env.DEBUG_TRIM_PAGOS === "1" && mergedContrib.last3ClosedMonthsPaidCount !== null) {
                    console.log(`[TRIM-PAGOS] merged contribution: affiliateId=${affiliate._id} lastContributionPeriod=${mergedContrib.lastContributionPeriod} last3ClosedMonthsPaidCount=${mergedContrib.last3ClosedMonthsPaidCount}`);
                }
                affiliate.contribution = mergedContrib;

                // Calcular disponibleParaVenta — Regla estricta de 5 condiciones
                const trim    = mergedContrib.last3ClosedMonthsPaidCount;
                const vStatus = mergedContrib.verificationStatus;
                const pStatus = padronData?.status ?? null;
                // Condición 1: Trim. pagos > 0
                const c1_trim   = trim != null && trim > 0;
                // Condición 2: Padrón = "No" — confirmado como not_found o found_expired
                const c2_padron = pStatus === "not_found" || pStatus === "found_expired";
                // Condición 3: Verificación ARCA = success
                const c3_verif  = vStatus === "success";
                // Condición 4: Teléfono_1 con al menos 10 dígitos válidos
                const c4_phone  = isValidPhone(affiliate.telefono1);
                // Condición 5: No aparece en Afiliaciones exitosas
                const c5_noQr   = !qrHechoCuils.has(normalizeCuil(affiliate.cuil));
                affiliate.disponibleParaVenta = c1_trim && c2_padron && c3_verif && c4_phone && c5_noQr;
            }
        }

        res.json({
            affiliates,
            pagination: {
                page: Number(page),
                limit: limit === "0" || limit === "all" ? total : Number(limit),
                total,
                freshCount,
                reusableCount,
                pages: (limit === "0" || limit === "all") ? 1 : Math.ceil(total / Number(limit))
            }
        });

    } catch (error) {
        logger.error("Error buscando afiliados:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📊 Estado de la base (Dashboard Phase 3)
exports.getBaseStatus = async (req, res) => {
    try {
        // Aggregate totals
        const totalsResult = await AffiliateOperationalState.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    availableForSale: {
                        $sum: { $cond: [{ $eq: ["$availableForSale", true] }, 1, 0] }
                    },
                    unchecked: {
                        $sum: { $cond: [{ $eq: ["$verificationStatus", "unchecked"] }, 1, 0] }
                    },
                    expired: {
                        $sum: { $cond: [{ $eq: ["$verificationStatus", "expired"] }, 1, 0] }
                    },
                    fresh: {
                        $sum: { $cond: [{ $eq: ["$freshness", "fresh"] }, 1, 0] }
                    },
                    reusable: {
                        $sum: { $cond: [{ $eq: ["$freshness", "reusable"] }, 1, 0] }
                    },
                    qrDone: {
                        $sum: { $cond: [{ $eq: ["$saleStatus", "qr_done"] }, 1, 0] }
                    }
                }
            }
        ]);

        const totals = totalsResult[0] || {
            total: 0, availableForSale: 0, unchecked: 0, expired: 0, fresh: 0, reusable: 0, qrDone: 0
        };

        // Verification health
        const verificationHealthResult = await AffiliateOperationalState.aggregate([
            {
                $group: {
                    _id: "$verificationStatus",
                    count: { $sum: 1 }
                }
            }
        ]);

        const vhMap = {};
        verificationHealthResult.forEach(item => {
            vhMap[item._id] = item.count;
        });

        const verificationHealth = {
            unchecked: vhMap["unchecked"] || 0,
            checked: vhMap["checked"] || 0,
            expired: vhMap["expired"] || 0,
            error: vhMap["error"] || 0,
            captcha: vhMap["captcha"] || 0,
            noData: vhMap["no_data"] || 0
        };

        // By Obra Social
        const byObraSocialResult = await AffiliateOperationalState.aggregate([
            {
                $group: {
                    _id: "$obraSocial",
                    total: { $sum: 1 },
                    availableForSale: {
                        $sum: { $cond: [{ $eq: ["$availableForSale", true] }, 1, 0] }
                    },
                    unchecked: {
                        $sum: { $cond: [{ $eq: ["$verificationStatus", "unchecked"] }, 1, 0] }
                    },
                    expired: {
                        $sum: { $cond: [{ $eq: ["$verificationStatus", "expired"] }, 1, 0] }
                    },
                    qrDone: {
                        $sum: { $cond: [{ $eq: ["$saleStatus", "qr_done"] }, 1, 0] }
                    }
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        const byObraSocial = byObraSocialResult.map(item => ({
            obraSocial: item._id || "Sin dato",
            total: item.total,
            availableForSale: item.availableForSale,
            unchecked: item.unchecked,
            expired: item.expired,
            qrDone: item.qrDone
        }));

        // Recent imports
        const recentImportsList = await AffiliateImportJob.find({})
            .sort({ createdAt: -1 })
            .limit(5)
            .select("originalFilename createdAt createdCount updatedCount rejectedCount status rejectedFilePath updatedFilePath")
            .lean();

        const recentImports = await Promise.all(recentImportsList.map(async job => {
            const rejectedReport = await buildAffiliateImportReportAvailability(
                job,
                "rejectedFilePath",
                "/affiliates/import-jobs/" + job._id + "/rejected-file"
            );
            const updatedReport = await buildAffiliateImportReportAvailability(
                job,
                "updatedFilePath",
                "/affiliates/import-jobs/" + job._id + "/updated-file"
            );
            return {
                id: job._id,
                archivo: job.originalFilename,
                fecha: job.createdAt,
                nuevos: job.createdCount,
                actualizados: job.updatedCount,
                rechazados: job.rejectedCount,
                estado: job.status,
                rejectedFileAvailable: rejectedReport.available,
                rejectedFileUrl: rejectedReport.url,
                updatedFileAvailable: updatedReport.available,
                updatedFileUrl: updatedReport.url
            };
        }));

        // Alerts logic
        const alerts = [];
        if (totals.unchecked > 0) {
            alerts.push({
                type: "warning",
                title: `Hay ${totals.unchecked.toLocaleString()} datos pendientes de chequeo`,
                description: `Representan el ${totals.total ? ((totals.unchecked / totals.total) * 100).toFixed(1) : 0}% del total de la base.`
            });
        }

        const obrasSocialesLowStock = byObraSocial.filter(os => os.availableForSale < 1000).length;
        if (obrasSocialesLowStock > 0) {
            alerts.push({
                type: "warning",
                title: `${obrasSocialesLowStock} obras sociales tienen stock bajo`,
                description: "Revisá el detalle y tomá acción."
            });
        }

        if (totals.expired > 0) {
            alerts.push({
                type: "danger",
                title: `${totals.expired.toLocaleString()} registros tienen chequeo vencido`,
                description: `Representan el ${totals.total ? ((totals.expired / totals.total) * 100).toFixed(1) : 0}% del total de la base.`
            });
        }

        res.json({
            totals,
            verificationHealth,
            byObraSocial,
            recentImports,
            alerts
        });

    } catch (error) {
        logger.error("Error obteniendo estado de la base:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📊 Obtener estadísticas
exports.getStats = async (req, res) => {
    try {
        const total = await Affiliate.countDocuments({ active: true });

        // ✅ Estadísticas de exportación
        const exported = await Affiliate.countDocuments({ active: true, exported: true });
        // Disponibles = cualquier cosa que NO sea exported: true (incluye false, null, undefined)
        const available = await Affiliate.countDocuments({ active: true, exported: { $ne: true } });

        // Top 10 obras sociales (para estadísticas generales)
        const obrasSociales = await Affiliate.aggregate([
            { $match: { active: true } },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // ✅ TODAS las obras sociales con afiliados disponibles (para configuración)
        // Incluye: exported: false, null, undefined (cualquier cosa que NO sea true)
        const obrasSocialesDisponibles = await Affiliate.aggregate([
            { $match: { active: true, exported: { $ne: true } } },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { _id: 1 } } // Orden alfabético
        ]);

        const recentBatches = await Affiliate.aggregate([
            { $match: { active: true } },
            {
                $group: {
                    _id: "$batchId",
                    count: { $sum: 1 },
                    sourceFile: { $first: "$sourceFile" },
                    uploadDate: { $first: "$uploadDate" }
                }
            },
            { $sort: { uploadDate: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            total,
            exported,
            available,
            obrasSociales: obrasSociales.map(os => ({ name: os._id, count: os.count })),
            obrasSocialesDisponibles: obrasSocialesDisponibles.map(os => ({ name: os._id, count: os.count })),
            recentBatches
        });

    } catch (error) {
        logger.error("Error obteniendo estadísticas:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📊 Obtener estadísticas para Supervisor (Datos disponibles para repartir)
exports.getSupervisorStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role.toLowerCase();

        if (role === 'supervisor') {
            const now = new Date();
            const stockAssignments = await AffiliateAssignment.find({
                supervisorId: userId,
                status: "active",
                expiresAt: { $gt: now }
            })
                .populate("affiliateId", "obraSocial dataSource active")
                .populate("operationalStateId")
                .sort({ assignedAt: 1, _id: 1 })
                .lean();

            const affiliateIds = stockAssignments.map(item => item.affiliateId?._id).filter(Boolean);
            const statesByAffiliate = await AffiliateOperationalState.find({ affiliateId: { $in: affiliateIds } })
                .lean()
                .then(rows => new Map(rows.map(row => [String(row.affiliateId), row])));

            const available = stockAssignments.filter(item => {
                const affiliate = item.affiliateId;
                if (!affiliate || affiliate.active === false) return false;
                const state = item.operationalStateId || statesByAffiliate.get(String(affiliate._id));
                if (!state) return false;
                const ownershipSupervisor = state.ownership?.supervisorId;
                if (ownershipSupervisor && String(ownershipSupervisor) !== String(userId)) return false;
                if (state.canSell !== true) return false;
                if (state.verificationStatus !== "checked") return false;
                if (state.saleStatus !== "none") return false;
                if (state.currentCheckJobId) return false;
                if (state.verificationExpiresAt && new Date(state.verificationExpiresAt) <= now) return false;
                return true;
            });

            let freshCount = 0;
            let reusableCount = 0;
            const obraSocialCounts = new Map();

            for (const item of available) {
                const affiliate = item.affiliateId;
                const state = item.operationalStateId || statesByAffiliate.get(String(affiliate._id));
                const source = state?.freshness || state?.dataSource || affiliate?.dataSource || item.source;
                if (source === "reusable") reusableCount += 1;
                else freshCount += 1;

                const obraSocial = affiliate?.obraSocial || "Sin obra social";
                obraSocialCounts.set(obraSocial, (obraSocialCounts.get(obraSocial) || 0) + 1);
            }

            const byObraSocial = Array.from(obraSocialCounts.entries())
                .map(([obraSocial, count]) => ({ obraSocial, count }))
                .sort((a, b) => b.count - a.count);

            logger.info(`📊 getSupervisorStats stock verificado: supervisor=${userId}, fresh=${freshCount}, reusable=${reusableCount}`);
            return res.json({ freshCount, reusableCount, byObraSocial });
        }

        // Si es supervisor, solo ve lo asignado a él
        const baseFilter = { active: true };

        if (role === 'supervisor') {
            baseFilter.exportedTo = userId;
        }

        // Debug: Ver total de affiliates asignados a este supervisor
        const totalAssigned = await Affiliate.countDocuments(baseFilter);

        // ✅ FIX: Usar campo dataSource para clasificar
        // Datos Frescos: dataSource = 'fresh' o sin dataSource (legacy), y no usados
        const freshCount = await Affiliate.countDocuments({
            ...baseFilter,
            $or: [
                { dataSource: 'fresh' },
                { dataSource: { $exists: false } }
            ],
            isUsed: { $ne: true }
        });

        // Datos Reutilizables: dataSource = 'reusable' y no usados
        const reusableCount = await Affiliate.countDocuments({
            ...baseFilter,
            dataSource: 'reusable',
            isUsed: { $ne: true }
        });

        // Debug log
        logger.info(`📊 getSupervisorStats para ${req.user.nombre}: total=${totalAssigned}, fresh=${freshCount}, reusable=${reusableCount}`);

        // Desglose por Obra Social (de todos los disponibles: no usados)
        const byObraSocial = await Affiliate.aggregate([
            {
                $match: {
                    ...baseFilter,
                    isUsed: { $ne: true }
                }
            },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            freshCount,
            reusableCount,
            byObraSocial: byObraSocial.map(os => ({ obraSocial: os._id, count: os.count }))
        });

    } catch (error) {
        logger.error("Error obteniendo estadísticas de supervisor:", error);
        res.status(500).json({ error: error.message });
    }
};

// ⚙️ Configurar exportación programada
exports.configureExport = async (req, res) => {
    try {
        const {
            sendType,
            affiliatesPerFile,
            obraSocialDistribution,
            supervisorConfigs,
            scheduledTime,
            filters,
            dataSourceMix,
            createdAtFilter
        } = req.body;

        if (!scheduledTime) {
            return res.status(400).json({ error: "Falta la hora programada" });
        }

        // Validar hora
        if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
            return res.status(400).json({ error: "Formato de hora inválido (use HH:mm)" });
        }

        // Validar según tipo de envío
        if (sendType === "masivo") {
            if (!affiliatesPerFile) {
                return res.status(400).json({ error: "Falta cantidad de afiliados por archivo" });
            }

            // Validar distribución de obras sociales si existe
            if (obraSocialDistribution && obraSocialDistribution.length > 0) {
                const total = obraSocialDistribution.reduce((sum, d) => sum + d.cantidad, 0);
                if (total !== affiliatesPerFile) {
                    return res.status(400).json({
                        error: `La suma de la distribución (${total}) debe coincidir con el total (${affiliatesPerFile})`
                    });
                }
            }
        } else if (sendType === "avanzado") {
            if (!supervisorConfigs || supervisorConfigs.length === 0) {
                return res.status(400).json({ error: "Faltan configuraciones de supervisores" });
            }

            // Validar cada configuración de supervisor
            for (const supConfig of supervisorConfigs) {
                if (!supConfig.supervisorId || !supConfig.affiliatesPerFile) {
                    return res.status(400).json({
                        error: "Cada supervisor debe tener ID y cantidad de afiliados"
                    });
                }

                // Validar distribución si existe
                if (supConfig.obraSocialDistribution && supConfig.obraSocialDistribution.length > 0) {
                    const total = supConfig.obraSocialDistribution.reduce((sum, d) => sum + d.cantidad, 0);
                    if (total !== supConfig.affiliatesPerFile) {
                        return res.status(400).json({
                            error: `La distribución del supervisor ${supConfig.supervisorId} no coincide con su total`
                        });
                    }
                }
            }
        }

        // Desactivar configuración anterior
        await AffiliateExportConfig.updateMany({ active: true }, { active: false });

        // Crear nueva configuración
        const config = new AffiliateExportConfig({
            configuredBy: req.user._id,
            sendType: sendType || "masivo",
            affiliatesPerFile: sendType === "masivo" ? Number(affiliatesPerFile) : undefined,
            obraSocialDistribution: sendType === "masivo" ? (obraSocialDistribution || []) : undefined,
            supervisorConfigs: sendType === "avanzado" ? supervisorConfigs : undefined,
            scheduledTime,
            filters: filters || {},
            dataSourceMix: dataSourceMix || { enabled: true, freshPercentage: 100, reusablePercentage: 0 },
            createdAtFilter: createdAtFilter || 'sin_filtro',
            active: true
        });

        await config.save();

        logger.info(`⚙️ Configuración guardada: ${sendType} - ${scheduledTime}`);

        res.json({
            success: true,
            config
        });

    } catch (error) {
        logger.error("Error configurando exportación:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📋 Obtener configuración actual
exports.getExportConfig = async (req, res) => {
    try {
        const config = await AffiliateExportConfig.findOne({ active: true })
            .populate("configuredBy", "nombre email")
            .populate("supervisorConfigs.supervisorId", "nombre email numeroEquipo")
            .lean();

        res.json({ config });

    } catch (error) {
        logger.error("Error obteniendo configuración:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ Eliminar afiliado (soft delete)
exports.deleteAffiliate = async (req, res) => {
    try {
        const { id } = req.params;

        const affiliate = await Affiliate.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        );

        if (!affiliate) {
            return res.status(404).json({ error: "Afiliado no encontrado" });
        }

        logger.info(`🗑️ Afiliado eliminado: ${affiliate.nombre} (${affiliate.cuil})`);

        res.json({ success: true, message: "Afiliado eliminado" });

    } catch (error) {
        logger.error("Error eliminando afiliado:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📋 Obtener obras sociales disponibles (de afiliados 'frescos' no exportados)
exports.getAvailableObrasSociales = async (req, res) => {
    try {
        // Obtener obras sociales distintas de afiliados no exportados
        // Incluye: exported: false, null, undefined (cualquier cosa que NO sea true)
        const obrasSociales = await Affiliate.distinct("obraSocial", {
            exported: { $ne: true },
            active: true
        });

        // Ordenar alfabéticamente
        obrasSociales.sort();

        logger.info(`📋 Obras sociales disponibles: ${obrasSociales.length}`);

        res.json({ obrasSociales });

    } catch (error) {
        logger.error("Error obteniendo obras sociales disponibles:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🆕 GESTIÓN DE LEADS - Lógica completa de clasificación

const ESTADOS_USADO_AUDITORIAS = [
    "Falta clave y documentación", "No le llegan los mensajes", "Cortó", "Autovinculación",
    "Caída", "Rehacer vídeo", "Pendiente", "QR hecho", "AFIP", "Baja laboral con nueva alta",
    "Baja laboral sin nueva alta", "En revisión", "Remuneración no válida",
    "Cargada", "Aprobada", "Aprobada pero no reconoce clave", "Completa", "Reprogramada", // ✅ Canonical: no comma
    "Mensaje enviado", "En videollamada", "Rechazada", "Falta documentación", "Falta clave",
    "Falta clave (por ARCA)"
];

const ESTADOS_REUTILIZABLE_24H = [
    "Reprogramada (falta confirmar hora)", "No atendió", "Tiene dudas", "Mensaje enviado", "En videollamada"
];

async function calcularClasificacion() {
    const cuilsUsadosSet = new Set();

    const leadAssignmentsUsados = await LeadAssignment.find({
        status: { $in: ['Venta', 'No le interesa'] }
    }).populate('affiliate', 'cuil').lean();

    for (const la of leadAssignmentsUsados) {
        if (la.affiliate?.cuil) cuilsUsadosSet.add(la.affiliate.cuil);
    }

    const cuilsAuditUsados = await Audit.distinct('cuil', {
        cuil: { $exists: true, $ne: null },
        status: { $in: ESTADOS_USADO_AUDITORIAS }
    });
    cuilsAuditUsados.forEach(c => cuilsUsadosSet.add(c));

    const cuilsReutilizablesSet = new Set();
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const telefonosConMensajeExitoso = await Report.distinct('telefono', {
        messageStatus: { $in: ['enviado', 'recibido'] }
    });

    if (telefonosConMensajeExitoso.length > 0) {
        const affiliatesConMensaje = await Affiliate.find({
            active: true,
            telefono1: { $in: telefonosConMensajeExitoso }
        }, 'cuil').lean();

        for (const aff of affiliatesConMensaje) {
            if (aff.cuil && !cuilsUsadosSet.has(aff.cuil)) {
                cuilsReutilizablesSet.add(aff.cuil);
            }
        }
    }

    const leadAssignmentsReutilizables = await LeadAssignment.find({
        status: { $nin: ['Venta', 'Pendiente', 'No le interesa'] }
    }).populate('affiliate', 'cuil').lean();

    for (const la of leadAssignmentsReutilizables) {
        if (la.affiliate?.cuil && !cuilsUsadosSet.has(la.affiliate.cuil)) {
            cuilsReutilizablesSet.add(la.affiliate.cuil);
        }
    }

    const auditsReutilizables24h = await Audit.find({
        cuil: { $exists: true, $ne: null },
        status: { $in: ESTADOS_REUTILIZABLE_24H },
        updatedAt: { $lt: hace24h }
    }, 'cuil').lean();

    for (const audit of auditsReutilizables24h) {
        if (audit.cuil && !cuilsUsadosSet.has(audit.cuil)) {
            cuilsReutilizablesSet.add(audit.cuil);
        }
    }

    return { cuilsUsados: cuilsUsadosSet, cuilsReutilizables: cuilsReutilizablesSet };
}

exports.getFreshData = async (req, res) => {
    try {
        const { cuilsUsados, cuilsReutilizables } = await calcularClasificacion();
        const cuilsNoFrescos = new Set([...cuilsUsados, ...cuilsReutilizables]);

        const freshAffiliates = await Affiliate.find({
            active: true,
            cuil: { $nin: Array.from(cuilsNoFrescos), $exists: true, $ne: null }
        })
            .select('nombre cuil obraSocial telefono1 localidad')
            .sort({ uploadDate: -1 })
            .lean();

        const data = freshAffiliates.map(a => ({
            _id: a._id,
            nombre: a.nombre,
            cuil: a.cuil,
            obraSocial: a.obraSocial || '-',
            telefono: a.telefono1 || '-',
            localidad: a.localidad || '-'
        }));

        res.json({ data, total: data.length });
    } catch (error) {
        logger.error("Error getting fresh data:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getReusableData = async (req, res) => {
    try {
        const { cuilsUsados, cuilsReutilizables } = await calcularClasificacion();

        const reusableAffiliates = await Affiliate.find({
            active: true,
            cuil: { $in: Array.from(cuilsReutilizables) }
        })
            .select('nombre cuil obraSocial telefono1 localidad')
            .sort({ uploadDate: -1 })
            .lean();

        const cuilToAuditStatus = {};
        const audits = await Audit.find({
            cuil: { $in: Array.from(cuilsReutilizables) }
        }).select('cuil status').sort({ updatedAt: -1 }).lean();

        for (const audit of audits) {
            if (audit.cuil && !cuilToAuditStatus[audit.cuil]) {
                cuilToAuditStatus[audit.cuil] = audit.status;
            }
        }

        const data = reusableAffiliates.map(a => ({
            _id: a._id,
            nombre: a.nombre,
            cuil: a.cuil,
            obraSocial: a.obraSocial || '-',
            telefono: a.telefono1 || '-',
            localidad: a.localidad || '-',
            estado: cuilToAuditStatus[a.cuil] || 'Sin estado',
            source: 'affiliate'
        }));

        res.json({ data, total: data.length });
    } catch (error) {
        logger.error("Error getting reusable data:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Distribuir Afiliados
exports.distributeAffiliates = async (req, res) => {
    try {
        const { distribution, source } = req.body; // distribution: [{ userId, quantity }], source: 'fresh' | 'reusable'

        if (!distribution || !Array.isArray(distribution)) {
            return res.status(400).json({ error: "Distribución inválida" });
        }

        const results = [];

        for (const item of distribution) {
            const { userId, quantity } = item;

            // Filtro base
            const filter = { active: true };
            if (source === 'fresh') {
                filter.isUsed = false;
            } else {
                filter.leadStatus = 'Reutilizable'; // Simplificación para reutilizables
            }

            // Buscar candidatos
            const candidates = await Affiliate.find(filter).limit(Number(quantity));
            const ids = candidates.map(c => c._id);

            if (ids.length > 0) {
                await Affiliate.updateMany(
                    { _id: { $in: ids } },
                    {
                        $set: {
                            assignedTo: userId,
                            leadStatus: 'Asignado',
                            assignedAt: new Date(),
                            isUsed: true // Marcar como usado
                        }
                    }
                );
                results.push({ userId, assigned: ids.length });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        logger.error("Error distributing affiliates:", error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Obtener Asignados (Para Asesor)
exports.getAssignedAffiliates = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        const filter = { assignedTo: userId, active: true };

        // Si status es 'pending', mostrar Asignado, Pendiente, No contesta (para reintentar)
        if (status === 'pending') {
            filter.leadStatus = { $in: ['Asignado', 'Pendiente', 'No contesta', 'Llamado'] };
        } else if (status) {
            filter.leadStatus = status;
        }

        const affiliates = await Affiliate.find(filter)
            .sort({ assignedAt: -1 })
            .lean();

        res.json({ affiliates });
    } catch (error) {
        logger.error("Error getting assigned affiliates:", error);
        res.status(500).json({ error: error.message });
    }
};

// 5. Actualizar Estado de Lead
exports.updateAffiliateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const userId = req.user._id;

        const affiliate = await Affiliate.findById(id);
        if (!affiliate) return res.status(404).json({ error: "Afiliado no encontrado" });

        // Validar que el usuario sea el asignado o gerencia
        if (affiliate.assignedTo?.toString() !== userId.toString() && req.user.role !== 'gerencia') {
            return res.status(403).json({ error: "No tienes permiso para gestionar este lead" });
        }

        affiliate.leadStatus = status;
        affiliate.lastInteraction = new Date();
        affiliate.interactionHistory.push({
            status,
            note,
            date: new Date(),
            by: userId
        });

        await affiliate.save();

        res.json({ success: true, affiliate });
    } catch (error) {
        logger.error("Error updating affiliate status:", error);
        res.status(500).json({ error: error.message });
    }
};

// 6. Obtener Afiliaciones Fallidas (Agregado de Audits y Affiliates)
exports.getFailedAffiliations = async (req, res) => {
    try {
        // 1. Fetch Failed Audits
        const auditStatuses = [
            'Cortó',
            'Rechazada',
            'Caída',
            'No le llegan los mensajes',
            'Baja laboral sin nueva alta'
        ];

        const failedAuditsPromise = Audit.find({
            status: { $in: auditStatuses }
        })
            .populate({
                path: 'asesor',
                select: 'nombre supervisor',
                populate: { path: 'supervisor', select: 'nombre' }
            })
            .populate('supervisorSnapshot', 'nombre')
            .sort({ scheduledAt: -1 })
            .lean();

        // 2. Fetch Failed Affiliates (Leads)
        const failedAffiliatesPromise = Affiliate.find({
            active: true,
            leadStatus: 'Fallido'
        })
            .populate({
                path: 'assignedTo',
                select: 'nombre supervisor',
                populate: { path: 'supervisor', select: 'nombre' }
            })
            .sort({ lastInteraction: -1 })
            .lean();

        const [audits, affiliates] = await Promise.all([failedAuditsPromise, failedAffiliatesPromise]);

        // 3. Normalize Data
        const normalizedAudits = audits.map(a => {
            let supervisorName = '-';
            if (a.supervisorSnapshot?.nombre) {
                supervisorName = a.supervisorSnapshot.nombre;
            } else if (a.asesor?.supervisor?.nombre) {
                supervisorName = a.asesor.supervisor.nombre;
            }

            return {
                _id: a._id,
                nombre: a.nombre,
                cuil: a.cuil || '-',
                telefono: a.telefono,
                obraSocial: a.obraSocialVendida || a.obraSocialAnterior || '-',
                leadStatus: a.status,
                lastInteraction: a.scheduledAt,
                assignedTo: a.asesor ? { nombre: a.asesor.nombre } : null,
                supervisor: supervisorName,
                source: 'audit',
                motivo: a.datosExtra || '-'
            };
        });

        const normalizedAffiliates = affiliates.map(a => {
            let supervisorName = '-';
            if (a.assignedTo?.supervisor?.nombre) {
                supervisorName = a.assignedTo.supervisor.nombre;
            }

            return {
                _id: a._id,
                nombre: a.nombre,
                cuil: a.cuil,
                telefono: a.telefono1,
                obraSocial: a.obraSocial,
                leadStatus: a.leadStatus,
                lastInteraction: a.lastInteraction || a.updatedAt,
                assignedTo: a.assignedTo ? { nombre: a.assignedTo.nombre } : null,
                supervisor: supervisorName,
                source: 'affiliate',
                motivo: '-'
            };
        });

        // 4. Merge and Sort
        const allFailed = [...normalizedAudits, ...normalizedAffiliates].sort((a, b) => {
            return new Date(b.lastInteraction) - new Date(a.lastInteraction);
        });

        // 5. Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedResults = allFailed.slice(startIndex, endIndex);

        // 6. Calculate Stats
        const stats = allFailed.reduce((acc, curr) => {
            const status = curr.leadStatus || 'Desconocido';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        res.json({
            affiliates: paginatedResults,
            total: allFailed.length,
            pages: Math.ceil(allFailed.length / limit),
            currentPage: page,
            stats // Return stats
        });

    } catch (error) {
        logger.error("Error getting failed affiliations:", error);
        res.status(500).json({ error: error.message });
    }
};

// 9. Cancelar envíos programados
exports.cancelExports = async (req, res) => {
    try {
        const { type } = req.body; // 'today' or 'indefinite'

        if (!['today', 'indefinite'].includes(type)) {
            return res.status(400).json({ error: 'Invalid cancellation type. Must be "today" or "indefinite"' });
        }

        const config = await AffiliateExportConfig.findOne({ active: true });

        if (!config) {
            return res.status(404).json({ error: 'No active export configuration found' });
        }

        config.cancellation = {
            type,
            cancelledAt: new Date(),
            cancelledBy: req.user._id,
            skipDate: type === 'today' ? new Date() : null
        };

        await config.save();

        logger.info(`📵 Exports cancelled (${type}) by ${req.user.email}`);

        res.json({
            message: type === 'today'
                ? 'Exports cancelled for today only. Will resume tomorrow automatically.'
                : 'Exports cancelled indefinitely. Save a new configuration to resume.',
            config
        });

    } catch (error) {
        logger.error("Error cancelling exports:", error);
        res.status(500).json({ error: error.message });
    }
};

// 10. Exportar TODA la base de afiliados a .xlsx (solo para usuario específico)
exports.exportAllAffiliates = async (req, res) => {
    try {
        const userName = req.user?.nombre || req.user?.name || "";
        if (!userName.toLowerCase().includes("daniel") || !userName.toLowerCase().includes("fandiño")) {
            return res.status(403).json({ error: "No autorizado para esta exportación" });
        }

        logger.info(`📊 Exportando TODA la base de afiliados por ${userName}`);

        const affiliates = await Affiliate.find({})
            .sort({ uploadDate: -1 })
            .lean();

        if (affiliates.length === 0) {
            return res.status(404).json({ error: "No hay afiliados en la base de datos" });
        }

        const allContribMap = {};
        if (affiliates.length) {
            const allIds = affiliates.map(a => a._id);
            const allContribs = await AffiliateContribution.find(
                { affiliateId: { $in: allIds } },
                { affiliateId: 1, lastContributionPeriod: 1, last3ClosedMonthsPaidCount: 1, padron: 1 }
            ).lean();
            for (const c of allContribs) { allContribMap[String(c.affiliateId)] = c; }
        }

        const data = affiliates.map(a => {
            const contrib = allContribMap[String(a._id)];
            return {
                "Nombre": a.nombre || "-",
                "CUIL": a.cuil || "-",
                "Obra Social": a.obraSocial || "-",
                "Teléfono 1": a.telefono1 || "-",
                "Teléfono 2": a.telefono2 || "-",
                "Localidad": a.localidad || "-",
                "Edad": a.edad || "-",
                "Trim. pagos": contrib?.last3ClosedMonthsPaidCount != null ? contrib.last3ClosedMonthsPaidCount : "-",
                "Últ. Período Aporte": contrib?.lastContributionPeriod || "-",
                "Padrón": formatPadron(contrib?.padron),
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Afiliados");

        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `base_afiliados_completa_${new Date().toISOString().split('T')[0]}.xlsx`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

        logger.info(`✅ Exportación completa: ${affiliates.length} afiliados`);

    } catch (error) {
        logger.error("Error exportando base completa:", error);
        res.status(500).json({ error: error.message });
    }
};

// 11. Limpiar datos frescos anteriores (marcarlos como reutilizables)
exports.cleanupFreshData = async (req, res) => {
    try {
        const batchId = `cleanup_${Date.now()}`;

        // Obtener CUILs que YA están en auditorías
        const auditsWithCuil = await Audit.find({
            cuil: { $exists: true, $ne: null }
        }).distinct('cuil').lean();

        // Marcar como 'reusable' todos los Affiliates frescos no usados
        const cleanupResult = await Affiliate.updateMany(
            {
                active: true,
                exported: { $ne: true },
                cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
                dataSource: { $ne: 'reusable' }
            },
            {
                $set: {
                    dataSource: 'reusable',
                    isUsed: true,
                    obsoletedAt: new Date(),
                    obsoletedByBatchId: batchId
                }
            }
        );

        logger.info(`🧹 Limpieza manual: ${cleanupResult.modifiedCount} datos frescos marcados como reutilizables por ${req.user.email}`);

        res.json({
            success: true,
            message: `${cleanupResult.modifiedCount} datos frescos anteriores movidos a reutilizables`,
            cleanedCount: cleanupResult.modifiedCount,
            batchId
        });

    } catch (error) {
        logger.error("Error cleaning up fresh data:", error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * ============================================================
 * OBTENER STOCK POR OBRA SOCIAL - ENVÍOS AVANZADOS
 * ============================================================
 * Devuelve la disponibilidad de datos frescos y reutilizables
 * para una obra social específica, en tiempo real.
 *
 * @param {string} obraSocial - Nombre de la obra social (query param)
 * @returns {Object} { obraSocial, freshCount, reusableCount, totalCount }
 */
exports.getStockByObraSocial = async (req, res) => {
    try {
        const { obraSocial } = req.query;

        if (!obraSocial) {
            return res.status(400).json({ error: "Falta el parámetro obraSocial" });
        }

        // Obtener CUILs que YA están en auditorías (para excluir de frescos)
        const auditsWithCuil = await Audit.find({
            cuil: { $exists: true, $ne: null }
        }).distinct('cuil').lean();

        // ========== STOCK FRESCO ==========
        // Affiliates activos cuyo CUIL no está en Auditorías y pertenecen a la obra social
        const freshCount = await Affiliate.countDocuments({
            active: true,
            obraSocial: obraSocial,
            cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
            dataSource: { $ne: 'reusable' },
            isUsed: { $ne: true }
        });

        // ========== STOCK REUTILIZABLE ==========
        // Audits con estados reutilizables que no han sido exportadas como reutilizables
        const reusableStatuses = ['No atendió', 'Tiene dudas', 'Reprogramada (falta confirmar hora)'];

        const reusableCount = await Audit.countDocuments({
            status: { $in: reusableStatuses },
            $or: [
                { obraSocialAnterior: obraSocial },
                { obraSocialVendida: obraSocial }
            ],
            cuil: { $exists: true, $ne: null },
            reusableExportedAt: { $exists: false }
        });

        const totalCount = freshCount + reusableCount;

        logger.info(`📊 Stock para ${obraSocial}: Fresh=${freshCount}, Reusable=${reusableCount}, Total=${totalCount}`);

        res.json({
            obraSocial,
            freshCount,
            reusableCount,
            totalCount
        });

    } catch (error) {
        logger.error("Error obteniendo stock por obra social:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 12. Exportación personalizada (full o filtrada) ─────────────────────────
exports.exportCustom = async (req, res) => {
    try {
        const userRole = req.user?.role?.toLowerCase();
        if (userRole !== "gerencia") {
            return res.status(403).json({ success: false, message: "Solo usuarios con rol Gerencia pueden exportar." });
        }
        const userName = req.user?.nombre || req.user?.name || req.user?.email || "usuario";

        logger.info(`[EXPORT-CUSTOM] body: ${JSON.stringify(req.body)}`);

        const { mode = "full", limit, zona, obraSocial: rawObraSocial, periodFrom, periodTo, affiliateIds, trimPagos: exportTrimPagos,
                search, localidad, verificationStatus, soloDisponibles } = req.body;

        // ── Input validation ────────────────────────────────────────────────────────────────────
        if (!["full", "custom", "selected", "filtered"].includes(mode)) {
            return res.status(400).json({ success: false, message: `Modo inválido: "${mode}". Use "full", "custom", "selected" o "filtered".` });
        }
        if (mode === "selected" && (!Array.isArray(affiliateIds) || affiliateIds.length === 0)) {
            return res.status(400).json({ success: false, message: "El modo 'selected' requiere un array 'affiliateIds' no vacío." });
        }

        const obraSocial = rawObraSocial ? String(rawObraSocial).trim() : null;

        if (mode === "custom") {
            const limitNum = Number(limit);
            if (!limit || isNaN(limitNum) || limitNum <= 0) {
                return res.status(400).json({ success: false, message: "El campo 'limit' debe ser un número mayor a 0." });
            }
        }
        if (mode === "filtered" && (!Array.isArray(affiliateIds) || affiliateIds.length === 0)) {
            /* 'filtered' mode uses the filter params — affiliateIds not required */
        }

        logger.info(`[EXPORT-CUSTOM] mode: ${mode} | limit: ${limit || "-"} | zona: ${zona || "-"} | obraSocial: "${obraSocial || ""}" | periodFrom: ${periodFrom || "-"} | periodTo: ${periodTo || "-"}`);

        let affiliates;

        if (mode === "selected") {
            const mongoose = require("mongoose");
            const ids = affiliateIds.map(id => new mongoose.Types.ObjectId(String(id)));
            affiliates = await Affiliate.find({ _id: { $in: ids } }).sort({ uploadDate: -1 }).lean();
            logger.info(`[EXPORT-CUSTOM] selected mode: ${affiliates.length} afiliados`);
        } else if (mode === "filtered") {
            /* ── Replicate searchAffiliates filter logic ─────────────────────── */
            const flt = { active: true };
            if (search) {
                const q = search.trim();
                flt.$or = [
                    { nombre:   { $regex: q, $options: "i" } },
                    { cuil:     { $regex: q, $options: "i" } },
                    { telefono1:{ $regex: q, $options: "i" } },
                ];
            }
            if (rawObraSocial) {
                const os = Array.isArray(rawObraSocial) ? rawObraSocial : [rawObraSocial];
                if (os.length) flt.obraSocial = { $in: os };
            }
            if (localidad && !zona) {
                flt.localidad = { $regex: localidad.trim(), $options: "i" };
            }
            if (zona && zona.toLowerCase() !== "todos") {
                const zoneLocalities = getLocalitiesByZone(zona);
                if (zoneLocalities === null) {
                    flt.$nor = Array.from(ALL_KNOWN_LOCALITIES).map(l => ({
                        localidad: { $regex: `^${escapeRegex(l)}$`, $options: "i" }
                    }));
                } else if (zoneLocalities.length > 0) {
                    flt.localidad = { $in: zoneLocalities.map(l => new RegExp(`^${escapeRegex(l)}$`, "i")) };
                }
            }
            /* Contribution-based filters */
            const hasContribFlt = (verificationStatus && (Array.isArray(verificationStatus) ? verificationStatus.length : true))
                || periodFrom || periodTo;
            if (hasContribFlt) {
                const cf = {};
                if (verificationStatus) {
                    const statuses = Array.isArray(verificationStatus) ? verificationStatus : [verificationStatus];
                    if (statuses.length) cf["verification.status"] = { $in: statuses };
                }
                const cfContribs = await AffiliateContribution.find(cf, { affiliateId: 1, lastContributionPeriod: 1 }).lean();
                let cfFiltered = cfContribs;
                if (periodFrom || periodTo) {
                    const fromN = periodFrom ? parseInt(periodFrom, 10) : 0;
                    const toN   = periodTo   ? parseInt(periodTo,   10) : 999999;
                    cfFiltered = cfContribs.filter(c => { const n = periodToNum(c.lastContributionPeriod); return n >= fromN && n <= toN; });
                }
                flt._id = { $in: cfFiltered.map(c => c.affiliateId) };
            }
            if (exportTrimPagos) {
                const trimValues = (Array.isArray(exportTrimPagos) ? exportTrimPagos : [exportTrimPagos]).map(Number);
                const tIdSet = new Set();
                const nonZero = trimValues.filter(v => v !== 0);
                if (nonZero.length) {
                    const ct = await AffiliateContribution.find({ last3ClosedMonthsPaidCount: { $in: nonZero } }, { affiliateId: 1 }).lean();
                    ct.forEach(c => tIdSet.add(String(c.affiliateId)));
                }
                if (trimValues.includes(0)) {
                    const posIds = await AffiliateContribution.distinct("affiliateId", { last3ClosedMonthsPaidCount: { $gt: 0 } });
                    const posSet = new Set(posIds.map(String));
                    const zeroAff = await Affiliate.find({ active: true, _id: { $nin: posIds } }, { _id: 1 }).lean();
                    zeroAff.forEach(a => tIdSet.add(String(a._id)));
                }
                const tIds = Array.from(tIdSet);
                if (flt._id) {
                    const ex = new Set(flt._id.$in.map(String));
                    flt._id = { $in: tIds.filter(id => ex.has(id)) };
                } else {
                    flt._id = { $in: tIds };
                }
            }
            /* ── Solo disponibles para venta (canSell === true) ── */
            if (soloDisponibles === true || soloDisponibles === 'true') {
                const canSellIds = await AffiliateContribution.distinct('affiliateId', { canSell: true });
                if (flt._id && flt._id.$in) {
                    const existingSet = new Set(flt._id.$in.map(String));
                    flt._id = { $in: canSellIds.filter(id => existingSet.has(String(id))) };
                } else {
                    flt._id = { $in: canSellIds };
                }
            }
            affiliates = await Affiliate.find(flt).sort({ uploadDate: -1 }).lean();
            logger.info(`[EXPORT-CUSTOM] filtered mode: ${affiliates.length} afiliados`);
        } else if (mode === "full") {
            affiliates = await Affiliate.find({}).sort({ uploadDate: -1 }).lean();
        } else {
            // ── Build affiliate filter ─────────────────────────────────────────
            const filter = { active: true };

            if (obraSocial) {
                filter.obraSocial = { $regex: `^${escapeRegex(obraSocial)}$`, $options: "i" };
            }

            if (zona && zona.toLowerCase() !== "todos") {
                const zoneLocalities = getLocalitiesByZone(zona);
                if (zoneLocalities === null) {
                    filter.$nor = Array.from(ALL_KNOWN_LOCALITIES).map(l => ({
                        localidad: { $regex: `^${escapeRegex(l)}$`, $options: "i" }
                    }));
                } else if (zoneLocalities.length > 0) {
                    filter.localidad = { $in: zoneLocalities.map(l => new RegExp(`^${escapeRegex(l)}$`, "i")) };
                }
            }

            // ── Contribution period pre-filter ────────────────────────────────
            if (periodFrom || periodTo) {
                const contribs = await AffiliateContribution.find(
                    {},
                    { affiliateId: 1, lastContributionPeriod: 1 }
                ).lean();

                const fromNum = periodFrom ? parseInt(periodFrom, 10) : 0;
                const toNum   = periodTo   ? parseInt(periodTo,   10) : 999999;

                const matchingIds = contribs
                    .filter(c => {
                        const n = periodToNum(c.lastContributionPeriod);
                        return n >= fromNum && n <= toNum;
                    })
                    .map(c => c.affiliateId);

                filter._id = { $in: matchingIds };
            }

            logger.info(`[EXPORT-CUSTOM] final filter: ${JSON.stringify(filter)}`);

            const effectiveLimit = limit && Number(limit) > 0 ? Number(limit) : null;
            let q = Affiliate.find(filter).sort({ uploadDate: -1 });
            if (effectiveLimit) q = q.limit(effectiveLimit);
            affiliates = await q.lean();
        }

        // Monthly reuse exclusion — applies to Personalizada (custom) and Filtrada (filtered).
        // Base completa (full) and Seleccionados (selected) are exempt.
        // Uses ultimoUso (Date) compared against midnight of the 1st of the current month
        // in Argentina time (UTC-3, no DST), so the comparison is calendar-month exact.
        if (mode === "custom") {
            const argNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
            const monthStart = new Date(Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), 1, 3, 0, 0));
            const before = affiliates.length;
            affiliates = affiliates.filter(a => !a.ultimoUso || a.ultimoUso < monthStart);
            const skipped = before - affiliates.length;
            if (skipped > 0) logger.info(`[EXPORT-CUSTOM] ${skipped} leads excluidos por reutilización en mes actual`);
        }

        logger.info(`[EXPORT-CUSTOM] matched affiliates (pre-exclusion): ${affiliates.length}`);

        // ── Successful-affiliation CUIL exclusion ─────────────────────────────
        // Applied to: custom only.
        if (mode === "custom") {
            const successfulCuils = await Audit.distinct("cuil", {
                status: "QR hecho",
                cuil: { $nin: [null, ""] }
            });

            if (successfulCuils.length > 0) {
                const successSet = new Set(successfulCuils.map(c => String(c).trim()));
                const beforeCount = affiliates.length;
                affiliates = affiliates.filter(a => {
                    const c = String(a.cuil || "").trim();
                    return c && !successSet.has(c);
                });
                const excluded = beforeCount - affiliates.length;

                if (excluded > 0) {
                    logger.info(`[EXPORT-CUSTOM] ${excluded} afiliados excluidos por CUIL en Afiliaciones exitosas`);

                }
            }
        }

        logger.info(`[EXPORT-CUSTOM] matched affiliates (final): ${affiliates.length}`);

        if (affiliates.length === 0) {
            const msg = obraSocial
                ? `No se encontraron afiliados para la obra social "${obraSocial}" con los filtros seleccionados.`
                : "No se encontraron afiliados que coincidan con los filtros indicados.";
            return res.status(422).json({ success: false, message: msg });
        }

        // ── Enrich with contribution data ─────────────────────────────────────
        const contribMap = {};
        if (affiliates.length) {
            const ids = affiliates.map(a => a._id);
            const contribs = await AffiliateContribution.find(
                { affiliateId: { $in: ids } },
                { affiliateId: 1, lastContributionPeriod: 1, last3ClosedMonthsPaidCount: 1, "verification.status": 1, padron: 1 }
            ).lean();
            for (const c of contribs) {
                contribMap[String(c.affiliateId)] = c;
            }
        }

        // ── Build XLSX ────────────────────────────────────────────────────────
        const data = affiliates.map(a => {
            const contrib = contribMap[String(a._id)];
            return {
                "Nombre": a.nombre || "-",
                "CUIL": a.cuil || "-",
                "Obra Social": a.obraSocial || "-",
                "Teléfono 1": a.telefono1 || "-",
                "Teléfono 2": a.telefono2 || "-",
                "Localidad": a.localidad || "-",
                "Edad": a.edad || "-",
                "Trim. pagos": contrib?.last3ClosedMonthsPaidCount != null ? contrib.last3ClosedMonthsPaidCount : "-",
                "Últ. Período Aporte": contrib?.lastContributionPeriod || "-",
                "Padrón": formatPadron(contrib?.padron),
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Afiliados");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const tag = mode === "full" ? "completa" : mode === "filtered" ? "filtrada" : mode === "selected" ? "seleccionados" : "personalizada";
        const filename = `base_afiliados_${tag}_${new Date().toISOString().split("T")[0]}.xlsx`;

        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

        logger.info(`✅ Exportación ${tag}: ${affiliates.length} afiliados por ${userName}`);

        // Stamp ultimoUso on exported leads for custom and filtered modes (fire-and-forget)
        if ((mode === "custom" || mode === "filtered") && affiliates.length > 0) {
            Affiliate.updateMany(
                { _id: { $in: affiliates.map(a => a._id) } },
                { $set: { ultimoUso: new Date() } }
            ).catch(err => logger.error(`[EXPORT-CUSTOM] ultimoUso update failed: ${err.message}`));
        }

    } catch (error) {
        logger.error(`[EXPORT-CUSTOM] error: ${error.stack || error.message}`);
        res.status(500).json({ success: false, message: "Ocurrió un error al generar la exportación.", detail: error.message });
    }
};

// ── 13. Obras sociales distintas (para filtro del modal de exportación) ──────
exports.getDistinctObrasSociales = async (req, res) => {
    try {
        const list = await Affiliate.distinct("obraSocial", { active: true });
        const sorted = list.filter(Boolean).sort((a, b) => a.localeCompare(b, "es"));
        res.json({ obrasSociales: sorted });
    } catch (error) {
        logger.error("Error obteniendo obras sociales distintas:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = exports;

exports.pauseAffiliateCheckJob = async (req, res) => {
    try {
        const job = await pauseAffiliateCheckJob({ user: req.user, jobId: req.params.jobId, reason: req.body?.reason });
        return res.json({ success: true, job });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "pause job");
    }
};

exports.resumeAffiliateCheckJob = async (req, res) => {
    try {
        const job = await resumeAffiliateCheckJob({ user: req.user, jobId: req.params.jobId });
        return res.json({ success: true, job });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "resume job");
    }
};

exports.retryAffiliateCheckJob = async (req, res) => {
    try {
        const job = await retryAffiliateCheckJob({ user: req.user, jobId: req.params.jobId, reason: req.body?.reason });
        return res.json({ success: true, job });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "retry job");
    }
};

exports.exportAffiliateCheckJob = async (req, res) => {
    try {
        const result = await exportAffiliateCheckJob({ user: req.user, jobId: req.params.jobId });
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
        return res.send(result.buffer);
    } catch (error) {
        return handleAffiliateCheckError(res, error, "export job");
    }
};

exports.softDeleteAffiliateCheckJob = async (req, res) => {
    try {
        const job = await softDeleteAffiliateCheckJob({ user: req.user, jobId: req.params.jobId, reason: req.body?.reason });
        return res.json({ success: true, jobId: job._id });
    } catch (error) {
        return handleAffiliateCheckError(res, error, "delete job");
    }
};
