/**
 * ============================================================
 * CONTROLADOR DE MENSAJES INTERNOS (internalMessageController)
 * ============================================================
 * Sistema de mensajería interna entre usuarios de la plataforma.
 * Similar a un sistema de correo electrónico interno.
 * 
 * Funcionalidades:
 * - Bandeja de entrada y enviados
 * - Adjuntos de archivos
 * - Marcar como leído/favorito
 * - Archivar y eliminar
 * - Responder y reenviar mensajes
 */

const InternalMessage = require("../models/InternalMessage");
const User = require("../models/User");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

/** Obtiene la bandeja de entrada del usuario */
exports.getInbox = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20, unreadOnly = false } = req.query;

        const filter = {
            to: userId,
            deletedBy: { $ne: userId },
            archived: false
        };

        if (unreadOnly === "true") {
            filter.read = false;
        }

        const messages = await InternalMessage.find(filter)
            .populate("from", "nombre email role numeroEquipo")
            .populate("to", "nombre email")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        const total = await InternalMessage.countDocuments(filter);

        res.json({
            messages,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        logger.error("Error obteniendo inbox:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📤 Obtener mensajes enviados
exports.getSent = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const filter = {
            from: userId,
            deletedBy: { $ne: userId }
        };

        const messages = await InternalMessage.find(filter)
            .populate("from", "nombre email role numeroEquipo")
            .populate("to", "nombre email role numeroEquipo")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        const total = await InternalMessage.countDocuments(filter);

        res.json({
            messages,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        logger.error("Error obteniendo mensajes enviados:", error);
        res.status(500).json({ error: error.message });
    }
};

// ⭐ Obtener mensajes destacados
exports.getStarred = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 20 } = req.query;

        const filter = {
            $or: [{ from: userId }, { to: userId }],
            starred: true,
            deletedBy: { $ne: userId }
        };

        const messages = await InternalMessage.find(filter)
            .populate("from", "nombre email role numeroEquipo")
            .populate("to", "nombre email role numeroEquipo")
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        const total = await InternalMessage.countDocuments(filter);

        res.json({
            messages,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        logger.error("Error obteniendo destacados:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📊 Contador de no leídos
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const count = await InternalMessage.countDocuments({
            to: userId,
            read: false,
            deletedBy: { $ne: userId },
            archived: false
        });

        res.json({ unreadCount: count });
    } catch (error) {
        logger.error("Error obteniendo contador de no leídos:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📩 Obtener mensaje por ID
exports.getMessageById = async (req, res) => {
    try {
        const userId = req.user._id;
        const messageId = req.params.id;

        const message = await InternalMessage.findOne({
            _id: messageId,
            $or: [{ from: userId }, { to: userId }],
            deletedBy: { $ne: userId }
        })
            .populate("from", "nombre email role numeroEquipo")
            .populate("to", "nombre email role numeroEquipo")
            .populate("replyTo", "subject content createdAt");

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        // Marcar como leído si es el destinatario
        if (message.to._id.toString() === userId.toString() && !message.read) {
            message.read = true;
            message.readAt = new Date();
            await message.save();

            // Emitir evento de mensaje leído via Socket.io
            const io = req.app.get("io");
            if (io) {
                io.to(`user_${message.from._id}`).emit("message_read", {
                    messageId: message._id,
                    readBy: userId,
                    readAt: message.readAt
                });
            }
        }

        res.json(message);
    } catch (error) {
        logger.error("Error obteniendo mensaje:", error);
        res.status(500).json({ error: error.message });
    }
};

// ✉️ Enviar mensaje (soporta múltiples destinatarios, roles y reenvío)
exports.sendMessage = async (req, res) => {
    try {
        let { to, roles, subject, content, replyTo, isForward } = req.body;
        const fromUserId = req.user._id;

        // FormData envía arrays como 'to[]', parsear correctamente
        if (req.body["to[]"]) {
            to = Array.isArray(req.body["to[]"]) ? req.body["to[]"] : [req.body["to[]"]];
        }
        
        // Parsear roles si viene como array de FormData
        if (req.body["roles[]"]) {
            roles = Array.isArray(req.body["roles[]"]) ? req.body["roles[]"] : [req.body["roles[]"]];
        }

        let validRecipients = [];

        // Opción 1: Envío por ROLES/GRUPOS
        if (roles && (Array.isArray(roles) ? roles.length > 0 : roles)) {
            const rolesArray = Array.isArray(roles) ? roles : [roles];
            const rolesLower = rolesArray.map(r => r.toLowerCase());
            
            logger.info(`📨 Enviando mensaje a roles: ${rolesLower.join(", ")}`);
            
            validRecipients = await User.find({
                role: { $in: rolesLower },
                active: true,
                _id: { $ne: fromUserId } // Excluir al remitente
            }).select("_id nombre email role");
            
            if (validRecipients.length === 0) {
                return res.status(404).json({ error: "No se encontraron usuarios activos para los roles especificados" });
            }
            
            logger.info(`✅ Encontrados ${validRecipients.length} usuarios para roles: ${rolesLower.join(", ")}`);
        }
        // Opción 2: Envío por USUARIOS INDIVIDUALES
        else if (to) {
            // Convertir 'to' a array si no lo es (compatibilidad con envío simple)
            const recipients = Array.isArray(to) ? to : [to];
            
            if (recipients.length === 0) {
                return res.status(400).json({ error: "Debe especificar al menos un destinatario" });
            }

            // Validar que todos los destinatarios existen
            validRecipients = await User.find({
                _id: { $in: recipients },
                active: true
            }).select("_id nombre email");

            if (validRecipients.length === 0) {
                return res.status(404).json({ error: "No se encontraron destinatarios válidos" });
            }

            if (validRecipients.length !== recipients.length) {
                logger.warn(`⚠️ Algunos destinatarios no encontrados. Esperados: ${recipients.length}, Encontrados: ${validRecipients.length}`);
            }
        } else {
            return res.status(400).json({ error: "Debe especificar destinatarios (usuarios o roles)" });
        }

        // Procesar archivos adjuntos
        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                attachments.push({
                    filename: file.filename,
                    originalName: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: file.path
                });
            }
        }

        // Crear un mensaje para cada destinatario
        const createdMessages = [];
        const io = req.app.get("io");

        for (const recipient of validRecipients) {
            const messageData = {
                from: fromUserId,
                to: recipient._id,
                subject: subject || "(Sin asunto)",
                content,
                attachments,
                replyTo: replyTo || null
            };
            
            // Si es reenvío, agregar información de reenvío
            if (isForward === "true" || isForward === true) {
                messageData.isForward = true;
                messageData.forwardedFrom = fromUserId;
            }
            
            const newMessage = new InternalMessage(messageData);

            await newMessage.save();

            // Poblar para respuesta
            await newMessage.populate("from", "nombre email role numeroEquipo");
            await newMessage.populate("to", "nombre email role numeroEquipo");

            createdMessages.push(newMessage);

            // Emitir notificación en tiempo real
            if (io) {
                io.to(`user_${recipient._id}`).emit("new_message", {
                    _id: newMessage._id,
                    from: newMessage.from,
                    subject: newMessage.subject,
                    content: newMessage.content.substring(0, 100) + "...",
                    createdAt: newMessage.createdAt,
                    hasAttachments: attachments.length > 0
                });
            }
        }

        logger.info(`📨 Mensaje enviado de ${req.user.nombre || req.user.name || req.user.email} a ${validRecipients.length} destinatario(s)`);

        // Retornar el primer mensaje (o todos si es útil)
        res.status(201).json({
            success: true,
            sentCount: createdMessages.length,
            recipients: validRecipients.map(r => ({ id: r._id, nombre: r.nombre })),
            message: createdMessages[0] // Primer mensaje como referencia
        });
    } catch (error) {
        logger.error("Error enviando mensaje:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ Eliminar mensaje (soft delete)
exports.deleteMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const messageId = req.params.id;

        const message = await InternalMessage.findOne({
            _id: messageId,
            $or: [{ from: userId }, { to: userId }]
        });

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        // Agregar usuario a deletedBy
        if (!message.deletedBy.includes(userId)) {
            message.deletedBy.push(userId);
            await message.save();
        }

        res.json({ message: "Mensaje eliminado" });
    } catch (error) {
        logger.error("Error eliminando mensaje:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ Eliminar TODOS los mensajes del usuario (soft delete)
exports.deleteAllMessages = async (req, res) => {
    try {
        const userId = req.user._id;

        // Buscar todos los mensajes donde el usuario es from o to y que no hayan sido eliminados por él
        const messages = await InternalMessage.find({
            $or: [{ from: userId }, { to: userId }],
            deletedBy: { $ne: userId }
        });

        let deletedCount = 0;
        
        // Agregar usuario a deletedBy en cada mensaje
        for (const message of messages) {
            if (!message.deletedBy.includes(userId)) {
                message.deletedBy.push(userId);
                await message.save();
                deletedCount++;
            }
        }

        logger.info(`✅ Usuario ${userId} eliminó ${deletedCount} mensajes de su buzón`);
        res.json({ 
            message: `Se eliminaron ${deletedCount} mensaje(s)`,
            deletedCount 
        });
    } catch (error) {
        logger.error("Error eliminando todos los mensajes:", error);
        res.status(500).json({ error: error.message });
    }
};

// ⭐ Marcar/desmarcar mensaje como destacado
exports.toggleStarred = async (req, res) => {
    try {
        const userId = req.user._id;
        const messageId = req.params.id;

        const message = await InternalMessage.findOne({
            _id: messageId,
            $or: [{ from: userId }, { to: userId }]
        });

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        message.starred = !message.starred;
        await message.save();

        res.json({ starred: message.starred });
    } catch (error) {
        logger.error("Error marcando mensaje:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📥 Marcar como leído/no leído
exports.markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const messageId = req.params.id;
        const { read } = req.body;

        const message = await InternalMessage.findOne({
            _id: messageId,
            to: userId
        });

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        message.read = read;
        message.readAt = read ? new Date() : null;
        await message.save();

        res.json({ read: message.read });
    } catch (error) {
        logger.error("Error marcando como leído:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📦 Descargar adjunto
exports.downloadAttachment = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId, attachmentId } = req.params;

        const message = await InternalMessage.findOne({
            _id: messageId,
            $or: [{ from: userId }, { to: userId }]
        });

        if (!message) {
            return res.status(404).json({ error: "Mensaje no encontrado" });
        }

        const attachment = message.attachments.find(
            a => a._id.toString() === attachmentId
        );

        if (!attachment) {
            return res.status(404).json({ error: "Adjunto no encontrado" });
        }

        const filePath = path.resolve(attachment.path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Archivo no encontrado en disco" });
        }

        res.download(filePath, attachment.originalName);
    } catch (error) {
        logger.error("Error descargando adjunto:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📋 Listar usuarios disponibles para enviar mensaje
exports.getAvailableRecipients = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { q } = req.query;

        const filter = {
            _id: { $ne: currentUserId },
            active: true
        };

        if (q) {
            filter.$or = [
                { nombre: { $regex: q, $options: "i" } },
                { email: { $regex: q, $options: "i" } }
            ];
        }

        const users = await User.find(filter)
            .select("nombre email role numeroEquipo")
            .sort({ nombre: 1 })
            .limit(50)
            .lean();

        res.json(users);
    } catch (error) {
        logger.error("Error obteniendo destinatarios:", error);
        res.status(500).json({ error: error.message });
    }
};
