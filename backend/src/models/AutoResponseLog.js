// backend/src/models/AutoResponseLog.js

const mongoose = require("mongoose");

const autoResponseLogSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    chatId: { type: String, required: true, index: true }, // e.g., "12345@c.us"
    ruleId: { type: mongoose.Schema.Types.ObjectId, ref: "Autoresponse", required: true },
    respondedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Index to quickly find logs within a time window per user/contact
autoResponseLogSchema.index({ createdBy: 1, chatId: 1, respondedAt: -1 });

module.exports = mongoose.model("AutoResponseLog", autoResponseLogSchema);
