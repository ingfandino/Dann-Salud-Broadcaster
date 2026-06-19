/**
 * ============================================================
 * ADMIN CHECK ROW (AdminCheckRow.js)
 * ============================================================
 * Modelo para cada fila parseada de un archivo Excel de
 * "Chequeado Administrativo". Almacena datos originales y
 * resultados de CODEM, ARCA, DATEAS y Padrón.
 *
 * Auto-purgado via TTL index a las 24 horas.
 * Relación: N filas → 1 AdminCheckSession
 */

"use strict";

const mongoose = require("mongoose");

/* ─── Sub-schemas para resultados por etapa ───────────── */

const codemResultSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: [
                "pending", "success", "no_active_os", "table_not_found",
                "invalid_cuil_format", "cuil_mismatch", "manual_review",
                "parse_error", "input_missing", "invalid_identifier",
                "portal_unavailable", "error", "skipped",
            ],
            default: "pending",
        },
        cuil:                  { type: String, default: null },
        codigoObraSocial:      { type: String, default: null },
        descripcionObraSocial: { type: String, default: null },
        situacion:             { type: String, default: null },
        activeRows:            { type: mongoose.Schema.Types.Mixed, default: null },
        errorMessage:          { type: String, default: null },
        checkedAt:             { type: Date, default: null },
    },
    { _id: false }
);

const arcaResultSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "success", "error", "skipped", "skipped_missing_cuil", "no_data", "captcha"],
            default: "pending",
        },
        trabaja:        { type: Boolean, default: null },
        ultimoAporte:   { type: String, default: null },
        inicioLaboral:  { type: String, default: null },
        trimPagos:      { type: Number, default: null },
        errorMessage:   { type: String, default: null },
        checkedAt:      { type: Date, default: null },
    },
    { _id: false }
);

const dateasResultSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "success", "error", "skipped"],
            default: "pending",
        },
        edad:          { type: Number, default: null },
        nombre:        { type: String, default: null },
        provincia:     { type: String, default: null },
        localidad:     { type: String, default: null },
        errorMessage:  { type: String, default: null },
        checkedAt:     { type: Date, default: null },
    },
    { _id: false }
);

const padronResultSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "success", "not_found", "captcha_failed", "error", "skipped", "skipped_missing_cuil"],
            default: "pending",
        },
        obraSocialDetectada: { type: String, default: null },
        periodoDesde:        { type: String, default: null },
        canSell:             { type: Boolean, default: null },
        nextChangeDate:      { type: String, default: null },
        monthsElapsed:       { type: Number, default: null },
        estado:              { type: String, default: null },
        errorMessage:        { type: String, default: null },
        checkedAt:           { type: Date, default: null },
    },
    { _id: false }
);

/* ─── Schema principal ───────────────────────────────── */

const adminCheckRowSchema = new mongoose.Schema(
    {
        /** Referencia a la sesión padre */
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AdminCheckSession",
            required: true,
            index: true,
        },

        /** Índice de fila en el archivo original (1-based, post-header) */
        rowIndex: { type: Number, required: true },

        /** Datos originales extraídos del Excel */
        original: {
            nombre:     { type: String, default: null },
            cuil:       { type: String, default: null },
            dni:        { type: String, default: null },
            obraSocial: { type: String, default: null },
            localidad:  { type: String, default: null },
            telefono1:  { type: String, default: null },
            edad:       { type: String, default: null },
            additionalFields: { type: mongoose.Schema.Types.Mixed, default: null },
        },

        /** CUIL normalizado (solo dígitos, 11) — puede venir del Excel o de CODEM */
        cuilNormalized: { type: String, default: null, index: true },

        /** DNI normalizado (solo dígitos, 7-8) — para modo DNI */
        dniNormalized: { type: String, default: null, index: true },

        /** Resultado CODEM */
        codem: { type: codemResultSchema, default: () => ({}) },

        /** Resultado ARCA */
        arca: { type: arcaResultSchema, default: () => ({}) },

        /** Resultado DATEAS */
        dateas: { type: dateasResultSchema, default: () => ({}) },

        /** Resultado Padrón SSSalud */
        padron: { type: padronResultSchema, default: () => ({}) },

        /** Resultado de persistencia en Affiliate */
        persistence: {
            status: {
                type: String,
                enum: ["pending", "created", "updated", "skipped", "error"],
                default: "pending",
            },
            affiliateId: { type: mongoose.Schema.Types.ObjectId, ref: "Affiliate", default: null },
            errorMessage: { type: String, default: null },
        },

        /** TTL para auto-purga */
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: true,
    }
);

/* ─── Indexes ────────────────────────────────────────── */

adminCheckRowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

adminCheckRowSchema.index({ sessionId: 1, "codem.status": 1 });
adminCheckRowSchema.index({ sessionId: 1, "arca.status": 1 });
adminCheckRowSchema.index({ sessionId: 1, "dateas.status": 1 });
adminCheckRowSchema.index({ sessionId: 1, "padron.status": 1 });

module.exports = mongoose.model("AdminCheckRow", adminCheckRowSchema);
