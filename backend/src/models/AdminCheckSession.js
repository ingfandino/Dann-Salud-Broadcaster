/**
 * ============================================================
 * ADMIN CHECK SESSION (AdminCheckSession.js)
 * ============================================================
 * Modelo para sesiones de "Chequeado Administrativo".
 * Cada sesión representa un archivo Excel subido para
 * verificación con CODEM, ARCA, DATEAS y Padrón.
 *
 * Pipeline paralelo:
 *   CUIL → CODEM + DATEAS + ARCA + Padrón simultáneamente
 *   DNI  → Fase 1: CODEM + DATEAS | Fase 2: ARCA + Padrón
 *
 * Modos:
 *   - "cuil": el Excel trae CUIL de 11 dígitos
 *   - "dni":  el Excel trae DNI de 7/8 dígitos; CODEM provee CUIL
 *
 * Acceso:
 *   - Roles: administrativo, encargado, gerencia, desarrollador
 *   - Owner-only; gerencia/desarrollador ven todas
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

const STAGE_STATUSES = ["idle", "pending", "processing", "done", "error", "waiting_cuil"];

const stageStatusSubSchema = new mongoose.Schema(
    {
        codem:  { type: String, enum: STAGE_STATUSES, default: "idle" },
        dateas: { type: String, enum: STAGE_STATUSES, default: "idle" },
        arca:   { type: String, enum: STAGE_STATUSES, default: "idle" },
        padron: { type: String, enum: STAGE_STATUSES, default: "idle" },
    },
    { _id: false }
);

const adminCheckSessionSchema = new mongoose.Schema(
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

        /** Modo de procesamiento */
        mode: {
            type: String,
            enum: ["cuil", "dni"],
            required: true,
        },

        /** Estado de la sesión — pipeline paralelo */
        status: {
            type: String,
            enum: [
                "uploading",
                "parsing",
                "queued",
                "processing",
                "generating_excel",
                "persisting",
                "completed",
                "error",
                // Legacy (backward compat — no se usan en flujo nuevo)
                "codem_pending", "codem_processing",
                "dateas_pending", "dateas_processing",
                "arca_pending", "arca_processing",
                "padron_pending", "padron_processing",
            ],
            default: "uploading",
            index: true,
        },

        /** Estado por etapa individual (orquestación paralela) */
        stageStatus: { type: stageStatusSubSchema, default: () => ({}) },

        /** Total de filas parseadas del Excel */
        totalRows: { type: Number, default: 0 },

        /** Progreso por etapa */
        progress: {
            codem:  { type: progressSubSchema, default: () => ({}) },
            arca:   { type: progressSubSchema, default: () => ({}) },
            dateas: { type: progressSubSchema, default: () => ({}) },
            padron: { type: progressSubSchema, default: () => ({}) },
        },

        /** Ruta al archivo Excel resultado */
        resultFilePath: { type: String, default: null },

        /** Estadísticas de persistencia */
        persistenceStats: {
            created:  { type: Number, default: 0 },
            updated:  { type: Number, default: 0 },
            skipped:  { type: Number, default: 0 },
            errors:   { type: Number, default: 0 },
        },

        /** Mensaje de error (si status === 'error') */
        errorMessage: { type: String, default: null },

        /** TTL para auto-purga de filas — 24 horas */
        rawDataExpiresAt: { type: Date },

        /** TTL para auto-purga de la sesión completa — 72 horas */
        sessionExpiresAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

/* ─── Hooks ──────────────────────────────────────────────── */

adminCheckSessionSchema.pre("save", function (next) {
    if (this.isNew) {
        const now = new Date();
        if (!this.rawDataExpiresAt) {
            this.rawDataExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
        if (!this.sessionExpiresAt) {
            this.sessionExpiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        }
    }
    next();
});

/* ─── Indexes ────────────────────────────────────────────── */

adminCheckSessionSchema.index(
    { sessionExpiresAt: 1 },
    { expireAfterSeconds: 0 }
);

adminCheckSessionSchema.index({ status: 1, createdAt: 1 });
adminCheckSessionSchema.index({ uploadedByUserId: 1, createdAt: -1 });

// Compound indexes for parallel worker polling (stageStatus-based)
adminCheckSessionSchema.index({ status: 1, "stageStatus.codem": 1, createdAt: 1 });
adminCheckSessionSchema.index({ status: 1, "stageStatus.dateas": 1, createdAt: 1 });
adminCheckSessionSchema.index({ status: 1, "stageStatus.arca": 1, createdAt: 1 });
adminCheckSessionSchema.index({ status: 1, "stageStatus.padron": 1, createdAt: 1 });

module.exports = mongoose.model("AdminCheckSession", adminCheckSessionSchema);
