/**
 * ============================================================
 * TEMPORARY DATA CHECK SESSION (TemporaryDataCheckSession.js)
 * ============================================================
 * Modelo para sesiones de chequeo de datos temporales.
 * Cada sesión representa un archivo Excel subido por un usuario
 * para verificación aislada contra ARCA, DATEAS y Padrón.
 *
 * AISLAMIENTO TOTAL:
 *   - NO interactúa con Affiliate, AffiliateContribution, CanSell
 *   - Datos auto-purgados via TTL indexes (24h rows, 72h sesión)
 *   - Archivos de disco purgados por dataCheckCleanupJob
 *
 * Acceso:
 *   - Owner-only: cada usuario ve solo sus sesiones
 *   - Excepción: gerencia ve todas las sesiones
 */

"use strict";

const mongoose = require("mongoose");

const progressSubSchema = new mongoose.Schema(
    {
        processed: { type: Number, default: 0 },
        total:     { type: Number, default: 0 },
        errors:    { type: Number, default: 0 },
    },
    { _id: false }
);

const STAGE_STATUSES = ["idle", "pending", "processing", "done", "error"];

const stageStatusSubSchema = new mongoose.Schema(
    {
        arca:   { type: String, enum: STAGE_STATUSES, default: "idle" },
        dateas: { type: String, enum: STAGE_STATUSES, default: "idle" },
        padron: { type: String, enum: STAGE_STATUSES, default: "idle" },
    },
    { _id: false }
);

const syncSummarySubSchema = new mongoose.Schema(
    {
        inserted: { type: Number, default: 0 },
        updated: { type: Number, default: 0 },
        omittedMissingPhone: { type: Number, default: 0 },
        omittedMissingName: { type: Number, default: 0 },
        omittedMissingCuil: { type: Number, default: 0 },
        omittedMissingRequired: { type: Number, default: 0 },
        canSellErrors: { type: Number, default: 0 },
        errors: { type: Number, default: 0 },
        totalProcessed: { type: Number, default: 0 },
        syncedAt: { type: Date, default: null },
    },
    { _id: false }
);

const temporaryDataCheckSessionSchema = new mongoose.Schema(
    {
        /** Usuario que subió el archivo */
        uploadedByUserId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        /** Nombre original del archivo Excel subido */
        originalFileName: { type: String, default: "" },

        /** Ruta al archivo original subido (para cleanup) */
        originalFilePath: { type: String, default: null },

        /** Estado de la sesión — pipeline secuencial */
        status: {
            type: String,
            enum: [
                "uploading",
                "parsing",
                "queued",
                "processing",
                "generating_excel",
                "completed",
                "error",
                // Legacy
                "arca_pending",
                "arca_processing",
                "dateas_pending",
                "dateas_processing",
                "padron_pending",
                "padron_processing",
            ],
            default: "uploading",
            index: true,
        },

        /** Total de filas parseadas del Excel */
        totalRows: { type: Number, default: 0 },

        /** Estado por etapa individual (orquestación paralela) */
        stageStatus: { type: stageStatusSubSchema, default: () => ({}) },

        /** Progreso por etapa */
        progress: {
            arca:   { type: progressSubSchema, default: () => ({}) },
            dateas: { type: progressSubSchema, default: () => ({}) },
            padron: { type: progressSubSchema, default: () => ({}) },
        },

        /** Ruta al archivo Excel resultado (generado tras completar) */
        resultFilePath: { type: String, default: null },

        /** Mensaje de error (si status === 'error') */
        errorMessage: { type: String, default: null },

        syncSummary: { type: syncSummarySubSchema, default: null },

        /**
         * TTL para auto-purga de datos crudos (filas) — 24 horas.
         * Las TemporaryDataCheckRow asociadas usan este valor.
         */
        rawDataExpiresAt: { type: Date },

        /**
         * TTL para auto-purga de la sesión completa — 72 horas.
         * Incluye metadata y archivo resultado.
         */
        sessionExpiresAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

/* ─── Hooks ──────────────────────────────────────────────── */

/**
 * Pre-save: calcular fechas de expiración automáticamente.
 */
temporaryDataCheckSessionSchema.pre("save", function (next) {
    if (this.isNew) {
        const now = new Date();
        if (!this.rawDataExpiresAt) {
            this.rawDataExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
        }
        if (!this.sessionExpiresAt) {
            this.sessionExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // +72h
        }
    }
    next();
});

/* ─── Indexes ────────────────────────────────────────────── */

/** TTL index: MongoDB auto-purga documentos cuando sessionExpiresAt < now */
temporaryDataCheckSessionSchema.index(
    { sessionExpiresAt: 1 },
    { expireAfterSeconds: 0 }
);

/** Compound index para queries frecuentes del worker */
temporaryDataCheckSessionSchema.index({ status: 1, createdAt: 1 });

/** Indexes para polling paralelo de workers */
temporaryDataCheckSessionSchema.index({ status: 1, "stageStatus.arca": 1, createdAt: 1 });
temporaryDataCheckSessionSchema.index({ status: 1, "stageStatus.dateas": 1, createdAt: 1 });
temporaryDataCheckSessionSchema.index({ status: 1, "stageStatus.padron": 1, createdAt: 1 });

/** Index para listar sesiones por usuario */
temporaryDataCheckSessionSchema.index({ uploadedByUserId: 1, createdAt: -1 });

module.exports = mongoose.model(
    "TemporaryDataCheckSession",
    temporaryDataCheckSessionSchema
);
