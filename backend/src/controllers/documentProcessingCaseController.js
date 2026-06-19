const path = require("path");
const DocumentProcessingCase = require("../models/DocumentProcessingCase");
const documentProcessingCaseService = require("../services/documentProcessingCase.service");
const documentProcessingBot = require("../services/documentProcessingBot.service");
const documentStorage = require("../services/documentStorage.service");
const { sanitizeForObraSocial } = require("../utils/documentProcessingSanitizer");
const {
    assertDocumentProcessingAdmin,
    assertCaseAccess,
    isObraSocialUser,
} = require("../utils/obraSocialAccess");

function handleError(res, error) {
    res.status(error.statusCode || 500).json({ error: error.message || "Error interno" });
}

async function getCaseOr404(id) {
    const documentCase = await DocumentProcessingCase.findById(id).populate("auditId").populate("obraSocialId");
    if (!documentCase) {
        const error = new Error("Caso no encontrado");
        error.statusCode = 404;
        throw error;
    }
    return documentCase;
}

exports.listCases = async (req, res) => {
    try {
        assertDocumentProcessingAdmin(req.user);
        const cases = await DocumentProcessingCase.find()
            .populate("auditId", "nombre cuil telefono obraSocialVendida status scheduledAt email")
            .populate("obraSocialId", "displayName slug cardColor")
            .sort({ updatedAt: -1 })
            .limit(200);
        res.json(cases);
    } catch (error) {
        handleError(res, error);
    }
};

exports.getCaseById = async (req, res) => {
    try {
        const documentCase = await getCaseOr404(req.params.id);
        assertCaseAccess(req.user, documentCase);
        const payload = isObraSocialUser(req.user) ? sanitizeForObraSocial(documentCase.toObject()) : documentCase;
        res.json(payload);
    } catch (error) {
        handleError(res, error);
    }
};

exports.createFromAudit = async (req, res) => {
    try {
        assertDocumentProcessingAdmin(req.user);
        const result = await documentProcessingCaseService.maybeCreateFromAudit(req.params.auditId, req.user);
        res.status(result.created ? 201 : 200).json(result);
    } catch (error) {
        handleError(res, error);
    }
};

exports.updateInputs = async (req, res) => {
    try {
        assertDocumentProcessingAdmin(req.user);
        const documentCase = await getCaseOr404(req.params.id);
        const updated = await documentProcessingCaseService.updateInputs(documentCase, req.body, req.user);
        res.json(updated);
    } catch (error) {
        handleError(res, error);
    }
};

exports.triggerProcessing = async (req, res) => {
    try {
        assertDocumentProcessingAdmin(req.user);
        const documentCase = await getCaseOr404(req.params.id);
        const updated = await documentProcessingBot.processCase(documentCase, req.user);
        res.json(updated);
    } catch (error) {
        handleError(res, error);
    }
};

exports.approveForObraSocial = async (req, res) => {
    try {
        assertDocumentProcessingAdmin(req.user);
        const documentCase = await getCaseOr404(req.params.id);
        const updated = await documentProcessingCaseService.approveForObraSocial(documentCase, req.user);
        res.json(updated);
    } catch (error) {
        handleError(res, error);
    }
};

exports.obraSocialReview = async (req, res) => {
    try {
        const role = (req.user?.role || "").toLowerCase();
        if (!["obra_social", "gerencia", "desarrollador"].includes(role)) {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        const documentCase = await getCaseOr404(req.params.id);
        assertCaseAccess(req.user, documentCase);
        const updated = await documentProcessingCaseService.reviewByObraSocial(documentCase, req.body.action, req.body.reason, req.user);
        res.json(isObraSocialUser(req.user) ? sanitizeForObraSocial(updated.toObject()) : updated);
    } catch (error) {
        handleError(res, error);
    }
};

exports.uploadFinalQr = async (req, res) => {
    try {
        assertDocumentProcessingAdmin(req.user);
        const documentCase = await getCaseOr404(req.params.id);
        const file = req.file;
        if (!file) return res.status(400).json({ error: "PDF QR requerido" });
        const extension = path.extname(file.originalname || ".pdf") || ".pdf";
        const relativePath = `${documentCase._id}/qr-${Date.now()}${extension}`;
        await documentStorage.saveFile(relativePath, file.buffer);
        const updated = await documentProcessingCaseService.finalizeQr(documentCase, relativePath, req.user);
        res.json(updated);
    } catch (error) {
        handleError(res, error);
    }
};

exports.downloadFinalQr = async (req, res) => {
    try {
        const documentCase = await getCaseOr404(req.params.id);
        assertCaseAccess(req.user, documentCase);
        if (documentCase.administrativeStatus !== "qr_hecho" || documentCase.qrData?.status !== "generated" || !documentCase.qrData?.pdfPath) {
            return res.status(404).json({ error: "QR final no disponible" });
        }
        const fileBuffer = await documentStorage.readFile(documentCase.qrData.pdfPath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="qr-${documentCase._id}.pdf"`);
        res.send(fileBuffer);
    } catch (error) {
        handleError(res, error);
    }
};

exports.listObraSocialCases = async (req, res) => {
    try {
        const role = (req.user?.role || "").toLowerCase();
        const canSeeAll = role === "gerencia" || role === "desarrollador";
        const query = canSeeAll ? {} : { obraSocialId: req.user?.obraSocialId };
        if (!canSeeAll && !req.user?.obraSocialId) return res.status(403).json({ error: "Usuario sin obra social asignada" });
        const cases = await DocumentProcessingCase.find(query)
            .populate("auditId", "nombre cuil telefono obraSocialVendida status scheduledAt email")
            .populate("obraSocialId", "displayName slug cardColor")
            .sort({ updatedAt: -1 })
            .limit(200);
        res.json(sanitizeForObraSocial(cases.map((item) => item.toObject())));
    } catch (error) {
        handleError(res, error);
    }
};

exports.getObraSocialCaseById = async (req, res) => {
    try {
        const documentCase = await getCaseOr404(req.params.id);
        assertCaseAccess(req.user, documentCase);
        res.json(sanitizeForObraSocial(documentCase.toObject()));
    } catch (error) {
        handleError(res, error);
    }
};
