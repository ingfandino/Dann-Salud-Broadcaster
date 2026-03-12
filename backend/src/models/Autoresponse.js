/**
 * ============================================================
 * MODELO DE RESPUESTA AUTOMÁTICA (Autoresponse)
 * ============================================================
 * Define respuestas automáticas que se envían cuando un contacto
 * escribe un mensaje que coincide con una palabra clave configurada.
 * 
 * Tipos de coincidencia:
 * - exact: El mensaje debe ser exactamente la palabra clave
 * - contains: El mensaje debe contener la palabra clave
 * 
 * Cada usuario puede tener un único "fallback" que responde
 * cuando ninguna otra regla coincide.
 */

const mongoose = require("mongoose");

const autoresponseSchema = new mongoose.Schema(
    {
        /** Usuario propietario de esta respuesta automática */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        /** Palabra clave que activa la respuesta */
        keyword: {
            type: String,
            trim: true,
            lowercase: true,
            sparse: true
        },
        /** Texto de la respuesta automática */
        response: {
            type: String,
            required: true
        },
        /** Estado activo/inactivo de la regla */
        active: {
            type: Boolean,
            default: true
        },
        /** Tipo de coincidencia: exact, contains, startsWith, endsWith */
        matchType: {
            type: String,
            enum: ["exact", "contains", "startsWith", "endsWith"],
            default: "contains"
        },
        /** Indica si es la respuesta por defecto cuando no hay coincidencias */
        isFallback: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

/**
 * Middleware pre-save: Garantiza que solo exista un fallback por usuario.
 */
autoresponseSchema.pre("save", async function (next) {
    if (this.isFallback) {
        const existing = await mongoose.models.Autoresponse.findOne({
            isFallback: true,
            createdBy: this.createdBy,
            _id: { $ne: this._id }
        });
        if (existing) {
            return next(new Error("Ya existe un autoresponse fallback para este usuario. Solo puede haber uno."));
        }
    }
    next();
});

/* ========== ÍNDICES DE UNICIDAD ========== */
/** Una keyword solo puede existir una vez por usuario */
autoresponseSchema.index(
  { createdBy: 1, keyword: 1 },
  { unique: true, partialFilterExpression: { keyword: { $type: "string" } } }
);
/** Solo un fallback por usuario */
autoresponseSchema.index(
  { createdBy: 1, isFallback: 1 },
  { unique: true, partialFilterExpression: { isFallback: true } }
);

module.exports = mongoose.model("Autoresponse", autoresponseSchema);