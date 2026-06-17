/**
 * ============================================================
 * MODELO DE CÓDIGO SCRAPEADO (ScrapedCode)
 * ============================================================
 * Registra cada DNI generado y probado por el bot de adquisición
 * de datos (dateasBot). Evita repetir códigos entre sesiones.
 */

const mongoose = require("mongoose");

const scrapedCodeSchema = new mongoose.Schema(
    {
        /** Código DNI de 8 dígitos generado */
        code: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        /** Estado del código tras la prueba */
        status: {
            type: String,
            enum: ["tested", "discarded", "saved"],
            default: "tested",
            index: true
        },
        /** Motivo de descarte (si aplica) */
        reason: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("ScrapedCode", scrapedCodeSchema);
