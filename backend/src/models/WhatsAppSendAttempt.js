const mongoose = require("mongoose");

const whatsappSendAttemptSchema = new mongoose.Schema({
    flow: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    sourceId: { type: String, required: false }, // optional string/objectId depending on source
    engine: { type: String, required: false },
    recipientMasked: { type: String, required: false },
    jidDomain: { type: String, required: false },
    sendStatus: { type: String, required: true },
    messageId: { type: String, required: false },
    errorCode: { type: String, required: false },
    errorMessage: { type: String, required: false },
    metadata: { type: mongoose.Schema.Types.Mixed, required: false },
}, { timestamps: true });

whatsappSendAttemptSchema.index({ createdAt: -1 });
whatsappSendAttemptSchema.index({ flow: 1, createdAt: -1 });
whatsappSendAttemptSchema.index({ userId: 1, createdAt: -1 });
whatsappSendAttemptSchema.index({ sendStatus: 1, createdAt: -1 });
whatsappSendAttemptSchema.index({ sourceId: 1 });

module.exports = mongoose.model("WhatsAppSendAttempt", whatsappSendAttemptSchema);
