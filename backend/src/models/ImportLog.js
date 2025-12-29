/**
 * ============================================================
 * MODELO DE LOG DE IMPORTACIÓN
 * ============================================================
 * Registra las importaciones de archivos realizadas en el sistema.
 * Almacena el contenido del archivo para auditoría y reprocesamiento.
 */

const mongoose = require("mongoose");

const importLogSchema = new mongoose.Schema({
    /** Nombre del archivo importado */
    filename: String,
    /** Tipo de archivo */
    type: { type: String, enum: ["csv", "json", "txt"], required: true },
    /** Contenido del archivo (datos parseados) */
    content: mongoose.Schema.Types.Mixed,
    /** Fecha de importación */
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("ImportLog", importLogSchema);