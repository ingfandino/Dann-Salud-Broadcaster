const crypto = require("crypto");
const dniOcrService = require("./dniOcr.service");

async function processCase(documentCase, user) {
    if (documentCase.isLocked) {
        throw new Error("El caso está bloqueado");
    }

    documentCase.botExecution = {
        ...(documentCase.botExecution || {}),
        executionId: crypto.randomUUID(),
        status: "running",
        startedAt: new Date(),
        completedAt: null,
        errorMessage: "",
    };
    documentCase.administrativeStatus = "en_proceso";
    documentCase.updatedBy = user?._id || null;
    documentCase.history.push({ event: "processing_started", by: user?._id || null });
    await documentCase.save();

    try {
        if (documentCase.documentInputs?.dniFrontPath) {
            documentCase.ocrData = await dniOcrService.extractDniData(documentCase.documentInputs.dniFrontPath);
        }
        documentCase.botExecution.status = "completed";
        documentCase.botExecution.completedAt = new Date();
        documentCase.history.push({ event: "processing_completed", by: user?._id || null });
    } catch (error) {
        documentCase.botExecution.status = "failed";
        documentCase.botExecution.completedAt = new Date();
        documentCase.botExecution.errorMessage = error.message;
        documentCase.history.push({ event: "processing_failed", by: user?._id || null, details: { message: error.message } });
    }

    await documentCase.save();
    return documentCase;
}

module.exports = {
    processCase,
};
