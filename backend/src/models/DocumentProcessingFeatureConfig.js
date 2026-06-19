const mongoose = require("mongoose");

const documentProcessingFeatureConfigSchema = new mongoose.Schema(
    {
        documentProcessingEnabled: {
            type: Boolean,
            default: false,
        },
        documentProcessingInputsRequired: {
            type: Boolean,
            default: false,
        },
        documentProcessingAutoTriggerEnabled: {
            type: Boolean,
            default: false,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("DocumentProcessingFeatureConfig", documentProcessingFeatureConfigSchema);
