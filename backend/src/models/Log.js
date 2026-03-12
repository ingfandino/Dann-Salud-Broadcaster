/**
 * ============================================================
 * MODELO DE REGISTRO DE LOG (Log)
 * ============================================================
 * Almacena registros de eventos del sistema para auditoría y debugging.
 * Los logs se pueden visualizar en el panel de administración.
 */

const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
    {
        /** Tipo de log: info, warning, o error */
        tipo: {
            type: String,
            enum: ["info", "warning", "error"],
            default: "info",
        },
        /** Descripción del evento */
        mensaje: {
            type: String,
            required: true,
        },
        /** Datos adicionales relacionados al evento */
        metadata: {
            type: Object,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);