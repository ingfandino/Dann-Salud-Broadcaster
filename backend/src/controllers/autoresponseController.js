// backend/src/controllers/autoresponseController.js

const Autoresponse = require("../models/Autoresponse");
const logger = require("../utils/logger");

// Crear autorespuesta
exports.createAutoresponse = async (req, res) => {
    try {
        const { keyword, response, isFallback = false } = req.body;

        if (!keyword && !isFallback) {
            return res.status(400).json({ error: "Se requiere 'keyword' a menos que sea fallback" });
        }

        const createdBy = req.user._id;

        // Validación: fallback único por usuario
        if (isFallback) {
            const existingFallback = await Autoresponse.findOne({ isFallback: true, createdBy });
            if (existingFallback) {
                return res.status(400).json({
                    error: "Ya existe un autoresponse fallback. Solo puede haber uno."
                });
            }
        }

        // Validación: keywords únicos por usuario
        if (keyword) {
            const existingKeyword = await Autoresponse.findOne({ keyword: keyword.trim().toLowerCase(), createdBy });
            if (existingKeyword) {
                return res.status(400).json({
                    error: `Ya existe un autoresponse para la palabra clave '${keyword}'`
                });
            }
        }

        const autoresponse = new Autoresponse({
            keyword: keyword ? keyword.trim().toLowerCase() : null,
            response,
            isFallback,
            createdBy
        });

        await autoresponse.save();
        res.status(201).json(autoresponse);
    } catch (err) {
        logger.error(" Error creando autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Listar todas
exports.getAutoresponses = async (req, res) => {
    try {
        const autoresponses = await Autoresponse.find({ createdBy: req.user._id });
        res.json(autoresponses);
    } catch (err) {
        logger.error(" Error listando autoresponses:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Obtener por ID
exports.getAutoresponseById = async (req, res) => {
    try {
        const autoresponse = await Autoresponse.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!autoresponse) return res.status(404).json({ error: "Autoresponse no encontrado" });
        res.json(autoresponse);
    } catch (err) {
        logger.error(" Error obteniendo autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Actualizar
exports.updateAutoresponse = async (req, res) => {
    try {
        const { keyword, isFallback } = req.body;

        // Validación: fallback único (si intentan activar)
        if (isFallback) {
            const existingFallback = await Autoresponse.findOne({
                isFallback: true,
                createdBy: req.user._id,
                _id: { $ne: req.params.id } // excluir el que estamos editando
            });
            if (existingFallback) {
                return res.status(400).json({
                    error: "Ya existe un autoresponse fallback. Solo puede haber uno."
                });
            }
        }

        // Validación: keywords únicos (si intentan cambiarlo)
        if (keyword) {
            const existingKeyword = await Autoresponse.findOne({
                keyword: keyword.trim().toLowerCase(),
                createdBy: req.user._id,
                _id: { $ne: req.params.id } // excluir el que estamos editando
            });
            if (existingKeyword) {
                return res.status(400).json({
                    error: `Ya existe un autoresponse para la palabra clave '${keyword}'`
                });
            }
        }

        const autoresponse = await Autoresponse.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id },
            {
                ...req.body,
                keyword: keyword ? keyword.trim().toLowerCase() : null
            },
            { new: true }
        );

        if (!autoresponse) return res.status(404).json({ error: "Autoresponse no encontrado" });
        res.json(autoresponse);
    } catch (err) {
        logger.error(" Error actualizando autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Eliminar
exports.deleteAutoresponse = async (req, res) => {
    try {
        const autoresponse = await Autoresponse.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
        if (!autoresponse) return res.status(404).json({ error: "Autoresponse no encontrado" });
        res.json({ message: "Autoresponse eliminado" });
    } catch (err) {
        logger.error(" Error eliminando autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};