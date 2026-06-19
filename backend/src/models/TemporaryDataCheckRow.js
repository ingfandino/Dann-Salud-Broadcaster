/**
 * ============================================================
 * TEMPORARY DATA CHECK ROW (TemporaryDataCheckRow.js)
 * ============================================================
 * Modelo para cada fila parseada de un archivo Excel de chequeo.
 * Almacena datos originales y resultados de ARCA, DATEAS y Padrón.
 *
 * AISLAMIENTO TOTAL:
 *   - Resultados NUNCA se escriben en Affiliate, AffiliateContribution, etc.
 *   - Auto-purgado via TTL index a las 24 horas
 *
 * Relación: N filas → 1 TemporaryDataCheckSession
 */

"use strict";

const mongoose = require("mongoose");

/* ─── Sub-schemas para resultados por etapa ───────────── */

const arcaResultSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "success", "error", "skipped"],
            default: "pending",
        },
        trabaja:        { type: Boolean, default: null },
        ultimoAporte:   { type: String, default: null },
        inicioLaboral:  { type: String, default: null },
        trimPagos:      { type: Number, default: null },
        errorMessage:  { type: String, default: null },
        checkedAt:     { type: Date, default: null },
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
            enum: ["pending", "success", "not_found", "captcha_failed", "error", "skipped"],
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

const temporaryDataCheckRowSchema = new mongoose.Schema(
    {
        /** Referencia a la sesión padre */
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "TemporaryDataCheckSession",
            required: true,
            index: true,
        },

        /** Índice de fila en el archivo original (1-based, post-header) */
        rowIndex: { type: Number, required: true },

        /** Datos originales extraídos del Excel */
        original: {
            nombre:     { type: String, default: null },
            cuil:       { type: String, default: null },
            obraSocial: { type: String, default: null },
            localidad:  { type: String, default: null },
            telefono1:  { type: String, default: null },
            /** Campos adicionales no mapeados (preservados tal cual) */
            additionalFields: { type: mongoose.Schema.Types.Mixed, default: null },
        },

        /** CUIL normalizado (solo dígitos) para búsquedas rápidas */
        cuilNormalized: { type: String, default: null, index: true },

        /** Resultado de verificación ARCA (aislado) */
        arca: { type: arcaResultSchema, default: () => ({}) },

        /** Resultado de enriquecimiento DATEAS (aislado) */
        dateas: { type: dateasResultSchema, default: () => ({}) },

        /** Resultado de consulta Padrón SSSalud (aislado) */
        padron: { type: padronResultSchema, default: () => ({}) },

        /**
         * TTL para auto-purga — copiado de session.rawDataExpiresAt (24h).
         * MongoDB borra automáticamente cuando expiresAt < now.
         */
        expiresAt: { type: Date, required: true },
    },
    {
        timestamps: true,
    }
);

/* ─── Indexes ────────────────────────────────────────── */

/** TTL index: auto-purga filas a las 24 horas */
temporaryDataCheckRowSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

/** Compound index para workers: buscar filas pendientes de una sesión */
temporaryDataCheckRowSchema.index({ sessionId: 1, "arca.status": 1 });
temporaryDataCheckRowSchema.index({ sessionId: 1, "dateas.status": 1 });
temporaryDataCheckRowSchema.index({ sessionId: 1, "padron.status": 1 });

module.exports = mongoose.model(
    "TemporaryDataCheckRow",
    temporaryDataCheckRowSchema
);
