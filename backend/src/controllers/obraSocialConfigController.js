const ObraSocialConfig = require("../models/ObraSocialConfig");
const { assertConfigMaintainer } = require("../utils/obraSocialAccess");

function handleError(res, error) {
    res.status(error.statusCode || 500).json({ error: error.message || "Error interno" });
}

exports.listConfigs = async (req, res) => {
    try {
        assertConfigMaintainer(req.user);
        const configs = await ObraSocialConfig.find().sort({ displayName: 1 });
        res.json(configs);
    } catch (error) {
        handleError(res, error);
    }
};

exports.getConfig = async (req, res) => {
    try {
        assertConfigMaintainer(req.user);
        const config = await ObraSocialConfig.findById(req.params.id);
        if (!config) return res.status(404).json({ error: "Configuración no encontrada" });
        res.json(config);
    } catch (error) {
        handleError(res, error);
    }
};

exports.createConfig = async (req, res) => {
    try {
        assertConfigMaintainer(req.user);
        const config = await ObraSocialConfig.create(req.body);
        res.status(201).json(config);
    } catch (error) {
        handleError(res, error);
    }
};

exports.updateConfig = async (req, res) => {
    try {
        assertConfigMaintainer(req.user);
        const allowedFields = ["displayName", "slug", "isActive", "subBranches", "cardColor", "minimumPaidPeriodsRequired", "portalEnabled"];
        const update = {};
        for (const field of allowedFields) {
            if (field in req.body) update[field] = req.body[field];
        }
        const config = await ObraSocialConfig.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!config) return res.status(404).json({ error: "Configuración no encontrada" });
        res.json(config);
    } catch (error) {
        handleError(res, error);
    }
};

exports.listPortalEnabledConfigs = async (req, res) => {
    try {
        const configs = await ObraSocialConfig.find({ isActive: true, portalEnabled: true })
            .select("displayName slug subBranches cardColor portalEnabled")
            .sort({ displayName: 1 });
        res.json(configs);
    } catch (error) {
        handleError(res, error);
    }
};
