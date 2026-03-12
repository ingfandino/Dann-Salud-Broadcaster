/**
 * ============================================================
 * MODELO DE LOG DE RESPUESTAS AUTOMÁTICAS
 * ============================================================
 * Registra cada vez que se envía una respuesta automática.
 * Permite evitar spam (ventana de tiempo) y generar reportes
 * de efectividad de las auto-respuestas.
 */

const mongoose = require("mongoose");

const autoResponseLogSchema = new mongoose.Schema(
  {
    /** Usuario propietario de la regla */
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /** ID del chat de WhatsApp (ej: "12345@c.us") */
    chatId: { type: String, required: true, index: true },
    /** Referencia a la regla de auto-respuesta usada */
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: "Autoresponse", required: true },
    /** Timestamp de cuándo se respondió */
    respondedAt: { type: Date, default: Date.now, index: true },
    /** Job de envío asociado (si aplica) */
    job: { type: mongoose.Schema.Types.ObjectId, ref: "SendJob", index: true },
    /** Contacto asociado */
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    /** Palabra clave que activó la respuesta */
    keyword: { type: String },
    /** Texto de la respuesta enviada */
    response: { type: String },
    /** Si fue una respuesta fallback (comodín) */
    isFallback: { type: Boolean, default: false },
    /** Mensaje original del usuario que activó la respuesta */
    userMessage: { type: String },
  },
  { timestamps: true }
);

/* ========== ÍNDICES PARA OPTIMIZACIÓN ========== */
autoResponseLogSchema.index({ createdBy: 1, chatId: 1, respondedAt: -1 });
autoResponseLogSchema.index({ job: 1, respondedAt: -1 });

module.exports = mongoose.model("AutoResponseLog", autoResponseLogSchema);
