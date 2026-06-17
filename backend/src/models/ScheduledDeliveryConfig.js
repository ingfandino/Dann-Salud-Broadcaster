/**
 * ============================================================
 * MODELO DE CONFIGURACIÓN DE ENVÍO PROGRAMADO (ScheduledDeliveryConfig)
 * ============================================================
 * Persiste la configuración de un bloque de envío programado por supervisor.
 * Solo puede existir una configuración activa por supervisor.
 */

const mongoose = require("mongoose");

const obraSocialEntrySchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    cantidad: { type: Number, required: true, min: 1 }
}, { _id: false });

const dateFilterSchema = new mongoose.Schema({
    type: { type: String, enum: ["exact", "month"], required: true },
    exactDate: { type: String, trim: true },  // YYYY-MM-DD
    year: { type: String, trim: true },        // YYYY
    month: { type: String, trim: true }        // MM
}, { _id: false });

const scheduledDeliveryConfigSchema = new mongoose.Schema({
    /** Supervisor que recibirá los leads */
    supervisorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    /** Zonas de procedencia de los leads */
    zones: [{ type: String, trim: true }],

    /** Filtro de fecha de carga (opcional — se mantiene por compatibilidad con configs existentes) */
    dateFilter: { type: dateFilterSchema, required: false },

    /** Distribución por obra social */
    obrasSociales: [obraSocialEntrySchema],

    /** Total de leads a enviar (suma de cantidades por OS) */
    totalQuantity: { type: Number, required: true, min: 1 },

    /** Porcentaje de leads frescos (0-100) */
    freshPct: { type: Number, default: 70, min: 0, max: 100 },

    /** Porcentaje de leads reutilizables (0-100) */
    reusablePct: { type: Number, default: 30, min: 0, max: 100 },

    /** Hora programada de ejecución (HH:mm, Argentina timezone) */
    scheduledHour: { type: String, required: true, trim: true },

    /** Config activa o desactivada */
    active: { type: Boolean, default: true, index: true },

    /** Usuario que creó la configuración */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    /** Última vez que se ejecutó */
    lastExecutedAt: { type: Date },

    /** Notas opcionales */
    notes: { type: String, trim: true }
}, { timestamps: true });

/* Solo una config activa por supervisor */
scheduledDeliveryConfigSchema.index(
    { supervisorId: 1, active: 1 },
    { unique: true, partialFilterExpression: { active: true } }
);

module.exports = mongoose.model("ScheduledDeliveryConfig", scheduledDeliveryConfigSchema);
