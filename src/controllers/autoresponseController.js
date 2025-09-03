// src/controllers/autoresponseController.js

const Autoresponse = require("../models/Autoresponse");

// Crear autorespuesta
exports.createAutoresponse = async (req, res) => {
    try {
        const { keyword, response, isFallback = false } = req.body;

        if (!keyword && !isFallback) {
            return res.status(400).json({ error: "Se requiere 'keyword' a menos que sea fallback" });
        }

        // 🚨 Validación: fallback único
        if (isFallback) {
            const existingFallback = await Autoresponse.findOne({ isFallback: true });
            if (existingFallback) {
                return res.status(400).json({
                    error: "Ya existe un autoresponse fallback. Solo puede haber uno."
                });
            }
        }

        // 🚨 Validación: keywords únicos
        if (keyword) {
            const existingKeyword = await Autoresponse.findOne({ keyword: keyword.trim().toLowerCase() });
            if (existingKeyword) {
                return res.status(400).json({
                    error: `Ya existe un autoresponse para la palabra clave '${keyword}'`
                });
            }
        }

        const autoresponse = new Autoresponse({
            keyword: keyword ? keyword.trim().toLowerCase() : null,
            response,
            isFallback
        });

        await autoresponse.save();
        res.status(201).json(autoresponse);
    } catch (err) {
        console.error("❌ Error creando autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Listar todas
exports.getAutoresponses = async (_req, res) => {
    try {
        const autoresponses = await Autoresponse.find();
        res.json(autoresponses);
    } catch (err) {
        console.error("❌ Error listando autoresponses:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Obtener por ID
exports.getAutoresponseById = async (req, res) => {
    try {
        const autoresponse = await Autoresponse.findById(req.params.id);
        if (!autoresponse) return res.status(404).json({ error: "Autoresponse no encontrado" });
        res.json(autoresponse);
    } catch (err) {
        console.error("❌ Error obteniendo autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Actualizar
exports.updateAutoresponse = async (req, res) => {
    try {
        const { keyword, isFallback } = req.body;

        // 🚨 Validación: fallback único (si intentan activar)
        if (isFallback) {
            const existingFallback = await Autoresponse.findOne({
                isFallback: true,
                _id: { $ne: req.params.id } // excluir el que estamos editando
            });
            if (existingFallback) {
                return res.status(400).json({
                    error: "Ya existe un autoresponse fallback. Solo puede haber uno."
                });
            }
        }

        // 🚨 Validación: keywords únicos (si intentan cambiarlo)
        if (keyword) {
            const existingKeyword = await Autoresponse.findOne({
                keyword: keyword.trim().toLowerCase(),
                _id: { $ne: req.params.id } // excluir el que estamos editando
            });
            if (existingKeyword) {
                return res.status(400).json({
                    error: `Ya existe un autoresponse para la palabra clave '${keyword}'`
                });
            }
        }

        const autoresponse = await Autoresponse.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                keyword: keyword ? keyword.trim().toLowerCase() : null
            },
            { new: true }
        );

        if (!autoresponse) return res.status(404).json({ error: "Autoresponse no encontrado" });
        res.json(autoresponse);
    } catch (err) {
        console.error("❌ Error actualizando autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};

// Eliminar
exports.deleteAutoresponse = async (req, res) => {
    try {
        const autoresponse = await Autoresponse.findByIdAndDelete(req.params.id);
        if (!autoresponse) return res.status(404).json({ error: "Autoresponse no encontrado" });
        res.json({ message: "Autoresponse eliminado" });
    } catch (err) {
        console.error("❌ Error eliminando autoresponse:", err);
        res.status(500).json({ error: "Error interno" });
    }
};