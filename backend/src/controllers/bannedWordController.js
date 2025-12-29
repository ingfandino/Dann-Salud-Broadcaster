/**
 * ============================================================
 * CONTROLADOR DE PALABRAS PROHIBIDAS (bannedWordController)
 * ============================================================
 * Gestiona el filtro de contenido y palabras prohibidas.
 * Solo Gerencia puede administrar las palabras, pero el sistema
 * monitorea mensajes de todos los usuarios y genera alertas.
 * 
 * Categorías: ofensiva, legal, competencia, otra
 * Severidades: baja, media, alta, crítica
 */

const BannedWord = require("../models/BannedWord");
const BannedWordDetection = require("../models/BannedWordDetection");
const User = require("../models/User");
const InternalMessage = require("../models/InternalMessage");
const logger = require("../utils/logger");

/** Middleware: Solo usuarios de rol Gerencia */
exports.requireGerencia = (req, res, next) => {
    if (req.user.role !== "gerencia") {
        return res.status(403).json({
            success: false,
            message: "Acceso denegado. Solo usuarios de Gerencia pueden gestionar palabras prohibidas."
        });
    }
    next();
};

// ➕ Agregar palabra prohibida
exports.addBannedWord = async (req, res) => {
    try {
        const { word, category, severity, notes } = req.body;

        if (!word || !word.trim()) {
            return res.status(400).json({
                success: false,
                message: "La palabra es obligatoria"
            });
        }

        // Verificar si ya existe
        const existing = await BannedWord.findOne({
            word: word.toLowerCase().trim()
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.active
                    ? "Esta palabra ya está en la lista"
                    : "Esta palabra existe pero está inactiva. Puede reactivarla."
            });
        }

        const bannedWord = new BannedWord({
            word: word.toLowerCase().trim(),
            category: category || "otra",
            severity: severity || "media",
            addedBy: req.user.id,
            notes
        });

        await bannedWord.save();
        await bannedWord.populate("addedBy", "name email");

        logger.info(`Palabra prohibida agregada: "${word}" por ${req.user.nombre || req.user.name || req.user.email}`);

        res.json({
            success: true,
            message: "Palabra agregada correctamente",
            bannedWord
        });

    } catch (error) {
        logger.error("Error agregando palabra prohibida:", error);
        res.status(500).json({
            success: false,
            message: "Error al agregar la palabra"
        });
    }
};

// 📋 Listar palabras prohibidas
exports.getBannedWords = async (req, res) => {
    try {
        const { active, category, search } = req.query;

        const filter = {};
        if (active !== undefined) filter.active = active === "true";
        if (category) filter.category = category;
        if (search) filter.word = { $regex: search, $options: "i" };

        const bannedWords = await BannedWord.find(filter)
            .populate("addedBy", "name email")
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: bannedWords.length,
            bannedWords
        });

    } catch (error) {
        logger.error("Error obteniendo palabras prohibidas:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener las palabras"
        });
    }
};

// 🗑️ Eliminar palabra prohibida
exports.deleteBannedWord = async (req, res) => {
    try {
        const { id } = req.params;

        const bannedWord = await BannedWord.findById(id);

        if (!bannedWord) {
            return res.status(404).json({
                success: false,
                message: "Palabra no encontrada"
            });
        }

        await BannedWord.findByIdAndDelete(id);

        logger.info(`Palabra prohibida eliminada: "${bannedWord.word}" por ${req.user.nombre || req.user.name || req.user.email}`);

        res.json({
            success: true,
            message: "Palabra eliminada correctamente"
        });

    } catch (error) {
        logger.error("Error eliminando palabra prohibida:", error);
        res.status(500).json({
            success: false,
            message: "Error al eliminar la palabra"
        });
    }
};

// ✏️ Actualizar palabra prohibida
exports.updateBannedWord = async (req, res) => {
    try {
        const { id } = req.params;
        const { category, severity, notes, active } = req.body;

        const bannedWord = await BannedWord.findByIdAndUpdate(
            id,
            { category, severity, notes, active },
            { new: true, runValidators: true }
        ).populate("addedBy", "name email");

        if (!bannedWord) {
            return res.status(404).json({
                success: false,
                message: "Palabra no encontrada"
            });
        }

        res.json({
            success: true,
            message: "Palabra actualizada correctamente",
            bannedWord
        });

    } catch (error) {
        logger.error("Error actualizando palabra prohibida:", error);
        res.status(500).json({
            success: false,
            message: "Error al actualizar la palabra"
        });
    }
};

// 🔍 Detectar palabras prohibidas en texto
exports.detectBannedWords = async (text) => {
    try {
        if (!text || typeof text !== "string") return [];

        const textLower = text.toLowerCase();

        // Obtener todas las palabras activas
        const bannedWords = await BannedWord.find({ active: true });

        const detected = [];

        for (const bannedWord of bannedWords) {
            // Buscar la palabra con límites de palabra para evitar falsos positivos
            const regex = new RegExp(`\\b${bannedWord.word}\\b`, "gi");
            const matches = text.match(regex);

            if (matches) {
                detected.push({
                    wordId: bannedWord._id,
                    word: bannedWord.word,
                    category: bannedWord.category,
                    severity: bannedWord.severity,
                    occurrences: matches.length,
                    matches: matches
                });
            }
        }

        return detected;

    } catch (error) {
        logger.error("Error detectando palabras prohibidas:", error);
        return [];
    }
};

// 📢 Notificar detección de palabra prohibida
exports.notifyBannedWordDetection = async (detectionData) => {
    try {
        const { word, wordId, userId, campaignName, messageContent, detectedIn } = detectionData;

        // Guardar detección en BD
        const detection = new BannedWordDetection({
            word,
            wordId,
            userId,
            campaignName,
            messageContent,
            detectedIn,
            fullContext: messageContent,
            notifiedUsers: []
        });

        // Obtener datos del usuario que usó la palabra
        const user = await User.findById(userId);
        if (!user) {
            logger.error("Usuario no encontrado para notificación de palabra prohibida");
            return;
        }

        // 1. Obtener TODOS los usuarios de Gerencia
        const gerenciaUsers = await User.find({
            role: "gerencia",
            active: true
        });

        // 2. Si el usuario es Asesor, obtener su Supervisor (mismo numeroEquipo)
        let supervisor = null;
        if (user.role === "asesor" && user.numeroEquipo) {
            supervisor = await User.findOne({
                role: "supervisor",
                numeroEquipo: user.numeroEquipo,
                active: true
            });
        }

        // Preparar lista de usuarios a notificar
        const usersToNotify = [...gerenciaUsers];
        if (supervisor) {
            usersToNotify.push(supervisor);
        }

        // Crear mensaje de notificación
        const messageBody = `
🚨 **ALERTA: Palabra Prohibida Detectada**

**Palabra:** ${word}
**Usuario:** ${user.name} (${user.email})
**Rol:** ${user.role}
**Equipo/Grupo:** ${user.numeroEquipo || "N/A"}
**Campaña:** ${campaignName || "N/A"}
**Fecha:** ${new Date().toLocaleString("es-AR")}

**Contexto:**
"${messageContent.substring(0, 200)}${messageContent.length > 200 ? "..." : ""}"

⚠️ Esta detección ha sido registrada para auditoría.
        `.trim();

        // Enviar notificación interna a cada usuario
        /*
        for (const notifyUser of usersToNotify) {
            await InternalMessage.create({
                from: null, // Sistema
                to: notifyUser._id,
                subject: `⚠️ Alerta: Palabra Prohibida en Campaña`,
                body: messageBody,
                priority: "high",
                category: "alert",
                metadata: {
                    type: "banned_word_detection",
                    detectionId: detection._id,
                    userId: user._id,
                    word
                }
            });

            // Registrar en detección
            detection.notifiedUsers.push({
                userId: notifyUser._id,
                role: notifyUser.role,
                notifiedAt: new Date()
            });

            logger.info(`Notificación de palabra prohibida enviada a: ${notifyUser.email}`);
        }
        */

        await detection.save();

        // Emitir evento de Socket.IO para notificaciones en tiempo real
        if (global.io) {
            usersToNotify.forEach(notifyUser => {
                global.io.to(`user:${notifyUser._id}`).emit("bannedWordAlert", {
                    detection: detection._id,
                    word,
                    user: {
                        id: user._id,
                        name: user.name,
                        role: user.role,
                        numeroEquipo: user.numeroEquipo
                    },
                    campaignName,
                    timestamp: new Date()
                });
            });
        }

        return detection;

    } catch (error) {
        logger.error("Error notificando detección de palabra prohibida:", error);
    }
};

// 📊 Obtener historial de detecciones
exports.getDetections = async (req, res) => {
    try {
        const {
            userId,
            resolved,
            word,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        const filter = {};
        if (userId) filter.userId = userId;
        if (resolved !== undefined) filter.resolved = resolved === "true";
        if (word) filter.word = word;
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [detections, total] = await Promise.all([
            BannedWordDetection.find(filter)
                .populate("userId", "name email role numeroEquipo")
                .populate("wordId", "word category severity")
                .populate("resolvedBy", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            BannedWordDetection.countDocuments(filter)
        ]);

        res.json({
            success: true,
            detections,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error("Error obteniendo detecciones:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener el historial"
        });
    }
};

// ✅ Marcar detección como resuelta
exports.resolveDetection = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const detection = await BannedWordDetection.findByIdAndUpdate(
            id,
            {
                resolved: true,
                resolvedBy: req.user.id,
                resolvedAt: new Date(),
                notes
            },
            { new: true }
        ).populate("userId wordId resolvedBy");

        if (!detection) {
            return res.status(404).json({
                success: false,
                message: "Detección no encontrada"
            });
        }

        res.json({
            success: true,
            message: "Detección marcada como resuelta",
            detection
        });

    } catch (error) {
        logger.error("Error resolviendo detección:", error);
        res.status(500).json({
            success: false,
            message: "Error al resolver la detección"
        });
    }
};

// 📊 Estadísticas de palabras prohibidas
exports.getStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const filter = {};
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const [
            totalBannedWords,
            activeBannedWords,
            totalDetections,
            unresolvedDetections,
            topWords,
            topUsers
        ] = await Promise.all([
            BannedWord.countDocuments(),
            BannedWord.countDocuments({ active: true }),
            BannedWordDetection.countDocuments(filter),
            BannedWordDetection.countDocuments({ ...filter, resolved: false }),
            BannedWordDetection.aggregate([
                { $match: filter },
                { $group: { _id: "$word", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            BannedWordDetection.aggregate([
                { $match: filter },
                { $group: { _id: "$userId", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "users",
                        localField: "_id",
                        foreignField: "_id",
                        as: "user"
                    }
                },
                { $unwind: "$user" },
                {
                    $project: {
                        count: 1,
                        userName: "$user.name",
                        userEmail: "$user.email",
                        userRole: "$user.role"
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            stats: {
                totalBannedWords,
                activeBannedWords,
                totalDetections,
                unresolvedDetections,
                topWords,
                topUsers
            }
        });

    } catch (error) {
        logger.error("Error obteniendo estadísticas:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener estadísticas"
        });
    }
};
