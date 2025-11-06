// backend/src/models/AutoResponseLog.js

const mongoose = require("mongoose");

const autoResponseLogSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    chatId: { type: String, required: true, index: true }, // e.g., "12345@c.us"
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: "Autoresponse", required: true },
    respondedAt: { type: Date, default: Date.now, index: true },
    // ✅ MEJORA 3: Campos adicionales para reporte detallado
    job: { type: mongoose.Schema.Types.ObjectId, ref: "SendJob", index: true },
    contact: { type: mongoose.Schema.Types.ObjectId, ref: "Contact" },
    keyword: { type: String }, // Keyword que activó la respuesta
    response: { type: String }, // Respuesta enviada
    isFallback: { type: Boolean, default: false }, // Si fue respuesta comodín
    userMessage: { type: String }, // Mensaje del usuario que activó la auto-respuesta
  },
  { timestamps: true }
);

// Index to quickly find logs within a time window per user/contact
autoResponseLogSchema.index({ createdBy: 1, chatId: 1, respondedAt: -1 });
autoResponseLogSchema.index({ job: 1, respondedAt: -1 }); // ✅ Para reportes por job

module.exports = mongoose.model("AutoResponseLog", autoResponseLogSchema);
