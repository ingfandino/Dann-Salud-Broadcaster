const mongoose = require("mongoose");

const { Schema } = mongoose;

const fileSchema = new Schema(
    {
        label: { type: String, default: "" },
        type: { type: String, default: "" },
        path: { type: String, default: "" },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const documentProcessingCaseSchema = new Schema(
    {
        auditId: { type: Schema.Types.ObjectId, ref: "Audit", required: true, unique: true, index: true },
        obraSocialId: { type: Schema.Types.ObjectId, ref: "ObraSocialConfig", required: true, index: true },
        subBranchSlug: { type: String, default: null },
        administrativeStatus: {
            type: String,
            enum: ["pendiente", "en_proceso", "aprobado_para_obra_social", "correccion_solicitada", "rechazado", "qr_hecho"],
            default: "pendiente",
            index: true,
        },
        documentInputs: {
            dniFrontPath: { type: String, default: null },
            dniBackPath: { type: String, default: null },
            videoAuditPath: { type: String, default: null },
            email: { type: String, default: "" },
            arcaKeyProvided: { type: Boolean, default: false },
            audioBackupPath: { type: String, default: null },
        },
        ocrData: {
            dniNumber: { type: String, default: "" },
            cuilFromDni: { type: String, default: "" },
            birthDate: { type: String, default: "" },
            address: { type: String, default: "" },
            fieldConfidence: { type: Schema.Types.Mixed, default: {} },
            identityValidation: { type: Schema.Types.Mixed, default: {} },
            originalExtractedValues: { type: Schema.Types.Mixed, default: {} },
            correctedValues: { type: Schema.Types.Mixed, default: {} },
        },
        generatedDocuments: { type: [fileSchema], default: [] },
        manualDocuments: { type: [fileSchema], default: [] },
        botExecution: {
            executionId: { type: String, default: null },
            status: { type: String, enum: ["not_started", "running", "completed", "failed"], default: "not_started" },
            startedAt: { type: Date, default: null },
            completedAt: { type: Date, default: null },
            errorMessage: { type: String, default: "" },
            rawBotLogs: { type: Schema.Types.Mixed, default: null },
            internalExecutionTraces: { type: Schema.Types.Mixed, default: null },
            internalDebuggingDetails: { type: Schema.Types.Mixed, default: null },
        },
        obraSocialReview: {
            status: {
                type: String,
                enum: ["pendiente", "aprobado_para_qr", "correccion_solicitada", "rechazado"],
                default: "pendiente",
            },
            reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
            reviewedAt: { type: Date, default: null },
            reason: { type: String, default: "" },
        },
        qrData: {
            status: { type: String, enum: ["pending", "generated"], default: "pending" },
            pdfPath: { type: String, default: null },
            uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
            uploadedAt: { type: Date, default: null },
        },
        isLocked: { type: Boolean, default: false },
        history: {
            type: [
                {
                    event: { type: String, required: true },
                    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
                    at: { type: Date, default: Date.now },
                    details: { type: Schema.Types.Mixed, default: {} },
                },
            ],
            default: [],
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
        updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("DocumentProcessingCase", documentProcessingCaseSchema);
