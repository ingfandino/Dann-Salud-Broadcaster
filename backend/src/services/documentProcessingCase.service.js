const Audit = require("../models/Audit");
const DocumentProcessingCase = require("../models/DocumentProcessingCase");
const DocumentProcessingFeatureConfig = require("../models/DocumentProcessingFeatureConfig");
const ObraSocialConfig = require("../models/ObraSocialConfig");
const documentProcessingBot = require("./documentProcessingBot.service");

async function getFeatureConfig() {
    const config = await DocumentProcessingFeatureConfig.findOne().sort({ createdAt: 1 }).lean();
    return config || {
        documentProcessingEnabled: false,
        documentProcessingInputsRequired: false,
        documentProcessingAutoTriggerEnabled: false,
    };
}

function normalizeSlug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function hasMinimumInputs(audit) {
    const images = audit?.multimedia?.images || [];
    return Boolean(images.length >= 2 && audit?.multimedia?.video && (audit?.email || audit?.multimedia?.afiliadoKey || audit?.clave));
}

function isEligibleAudit(audit, config) {
    if (!audit) return { eligible: false, reason: "audit_not_found" };
    if (!config.documentProcessingEnabled) return { eligible: false, reason: "feature_disabled" };
    if (audit.status !== "Completa") return { eligible: false, reason: "status_not_complete" };
    if (config.documentProcessingInputsRequired && !hasMinimumInputs(audit)) {
        return { eligible: false, reason: "missing_required_inputs" };
    }
    return { eligible: true };
}

async function resolveObraSocialConfig(audit) {
    const slug = normalizeSlug(audit.obraSocialVendida);
    return ObraSocialConfig.findOne({ slug, isActive: true });
}

function buildDocumentInputsFromAudit(audit) {
    const images = audit?.multimedia?.images || [];
    return {
        dniFrontPath: images[0] || null,
        dniBackPath: images[1] || null,
        videoAuditPath: audit?.multimedia?.video || null,
        email: audit?.email || "",
        arcaKeyProvided: Boolean(audit?.multimedia?.afiliadoKey || audit?.multimedia?.afiliadoKeyDefinitiva || audit?.clave),
        audioBackupPath: audit?.multimedia?.audioBackup || null,
    };
}

async function maybeCreateFromAudit(auditOrId, user) {
    const config = await getFeatureConfig();
    if (!config.documentProcessingEnabled) {
        return { created: false, skipped: true, reason: "feature_disabled", case: null };
    }

    const audit = typeof auditOrId === "string" || auditOrId?._bsontype === "ObjectID"
        ? await Audit.findById(auditOrId)
        : auditOrId;
    const eligibility = isEligibleAudit(audit, config);
    if (!eligibility.eligible) {
        return { created: false, skipped: true, reason: eligibility.reason, case: null };
    }

    const existing = await DocumentProcessingCase.findOne({ auditId: audit._id });
    if (existing) {
        return { created: false, skipped: false, reason: "already_exists", case: existing };
    }

    const obraSocialConfig = await resolveObraSocialConfig(audit);
    if (!obraSocialConfig) {
        return { created: false, skipped: true, reason: "obra_social_config_not_found", case: null };
    }

    const documentCase = await DocumentProcessingCase.create({
        auditId: audit._id,
        obraSocialId: obraSocialConfig._id,
        subBranchSlug: null,
        administrativeStatus: "pendiente",
        documentInputs: buildDocumentInputsFromAudit(audit),
        createdBy: user?._id || null,
        updatedBy: user?._id || null,
        history: [{ event: "case_created", by: user?._id || null, details: { source: "audit" } }],
    });

    if (config.documentProcessingAutoTriggerEnabled) {
        await documentProcessingBot.processCase(documentCase, user);
    }

    return { created: true, skipped: false, reason: null, case: documentCase };
}

function ensureMutable(documentCase) {
    if (documentCase.isLocked) {
        const error = new Error("El caso está bloqueado");
        error.statusCode = 400;
        throw error;
    }
}

async function updateInputs(documentCase, data, user) {
    ensureMutable(documentCase);
    const allowedFields = ["dniFrontPath", "dniBackPath", "videoAuditPath", "email", "arcaKeyProvided", "audioBackupPath"];
    for (const field of allowedFields) {
        if (field in data) {
            documentCase.documentInputs[field] = data[field];
        }
    }
    documentCase.updatedBy = user?._id || null;
    documentCase.history.push({ event: "inputs_updated", by: user?._id || null });
    await documentCase.save();
    return documentCase;
}

async function approveForObraSocial(documentCase, user) {
    ensureMutable(documentCase);
    documentCase.administrativeStatus = "aprobado_para_obra_social";
    documentCase.updatedBy = user?._id || null;
    documentCase.history.push({ event: "approved_for_obra_social", by: user?._id || null });
    await documentCase.save();
    return documentCase;
}

async function reviewByObraSocial(documentCase, action, reason, user) {
    ensureMutable(documentCase);
    const actionMap = {
        approve_for_qr: "aprobado_para_qr",
        request_correction: "correccion_solicitada",
        reject: "rechazado",
    };
    const status = actionMap[action];
    if (!status) {
        const error = new Error("Acción no válida");
        error.statusCode = 400;
        throw error;
    }

    documentCase.obraSocialReview = {
        status,
        reviewedBy: user?._id || null,
        reviewedAt: new Date(),
        reason: reason || "",
    };
    if (status === "correccion_solicitada") documentCase.administrativeStatus = "correccion_solicitada";
    if (status === "rechazado") documentCase.administrativeStatus = "rechazado";
    documentCase.updatedBy = user?._id || null;
    documentCase.history.push({ event: status === "aprobado_para_qr" ? "obra_social_approved_for_qr" : `obra_social_${status}`, by: user?._id || null, details: { reason: reason || "" } });
    await documentCase.save();
    return documentCase;
}

async function finalizeQr(documentCase, pdfPath, user) {
    ensureMutable(documentCase);
    if (documentCase.administrativeStatus !== "aprobado_para_obra_social" || documentCase.obraSocialReview?.status !== "aprobado_para_qr") {
        const error = new Error("El caso no está aprobado para generar QR");
        error.statusCode = 400;
        throw error;
    }
    documentCase.qrData = {
        status: "generated",
        pdfPath,
        uploadedBy: user?._id || null,
        uploadedAt: new Date(),
    };
    documentCase.administrativeStatus = "qr_hecho";
    documentCase.isLocked = true;
    documentCase.updatedBy = user?._id || null;
    documentCase.history.push({ event: "qr_uploaded", by: user?._id || null });
    documentCase.history.push({ event: "case_locked", by: user?._id || null });
    await documentCase.save();
    return documentCase;
}

module.exports = {
    getFeatureConfig,
    maybeCreateFromAudit,
    updateInputs,
    approveForObraSocial,
    reviewByObraSocial,
    finalizeQr,
};
