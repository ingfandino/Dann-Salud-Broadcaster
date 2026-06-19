const DocumentProcessingFeatureConfig = require("../models/DocumentProcessingFeatureConfig");
const logger = require("../utils/logger");

const CONFIG_FIELDS = [
    "documentProcessingEnabled",
    "documentProcessingInputsRequired",
    "documentProcessingAutoTriggerEnabled",
];

async function getOrCreateConfig() {
    let config = await DocumentProcessingFeatureConfig.findOne().sort({ createdAt: 1 });
    if (!config) {
        config = await DocumentProcessingFeatureConfig.create({});
    }
    return config;
}

exports.getConfig = async (req, res) => {
    try {
        const config = await getOrCreateConfig();
        res.json({ ok: true, config });
    } catch (err) {
        logger.error("documentProcessingConfigController.getConfig:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

exports.updateConfig = async (req, res) => {
    try {
        const update = {};
        for (const field of CONFIG_FIELDS) {
            if (typeof req.body[field] === "boolean") {
                update[field] = req.body[field];
            }
        }
        update.updatedBy = req.user?._id || null;

        const current = await getOrCreateConfig();
        const config = await DocumentProcessingFeatureConfig.findByIdAndUpdate(
            current._id,
            { $set: update },
            { new: true }
        );

        res.json({ ok: true, config });
    } catch (err) {
        logger.error("documentProcessingConfigController.updateConfig:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};
