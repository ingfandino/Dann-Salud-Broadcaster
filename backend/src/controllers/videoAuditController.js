const VideoAudit = require('../models/VideoAudit');
const Audit = require('../models/Audit');
const { recordWhatsAppSendAttempt } = require('../services/whatsappSendAttemptService');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { isReady, sendMessage, getActiveEngine } = require('../services/whatsappUnified');
const { formatWhatsAppJid, maskJid } = require('../utils/whatsappJid');
const { getIO } = require('../config/socket');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

let ffmpegAvailable = null;
async function isFfmpegAvailable() {
    if (ffmpegAvailable !== null) return ffmpegAvailable;
    try {
        await execPromise('ffmpeg -version');
        ffmpegAvailable = true;
    } catch (e) {
        ffmpegAvailable = false;
    }
    return ffmpegAvailable;
}
function generateShortCode(length = 8) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // avoiding ambiguous I, 1, O, 0
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/* ========== HELPERS ========== */

function getPublicBaseUrl(req) {
    if (process.env.FRONTEND_PUBLIC_URL) {
        return process.env.FRONTEND_PUBLIC_URL;
    }
    console.warn('[VideoAudit] FRONTEND_PUBLIC_URL missing; falling back to request origin');
    return process.env.FRONTEND_BASE_URL || req.get('origin') || req.get('referer') || 'http://localhost:5000';
}

function buildInvitationMessage({ nombre, cuil, auditorNombre, horaTurno, link }) {
    const nombreStr = nombre ? `*${nombre.trim()}*` : '*buen día*';
    const cuilStr = cuil ? `_${cuil.trim()}_` : '_CUIL no informado_';
    const auditorStr = auditorNombre ? auditorNombre.trim() : 'el equipo de auditoría';
    const horaStr = horaTurno ? horaTurno.trim() : 'el horario acordado';

    return `Hola ${nombreStr} (${cuilStr}), mi nombre es ${auditorStr}. Te escribo en representación de Dann+Salud 😄

Tenemos una auditoría programada para avanzar con el alta de la cobertura y emisión de credenciales a las ${horaStr}. *Para continuar, por favor ingresá al siguiente enlace*:

${link}

La auditoría podrá ser grabada únicamente para validar la gestión.
No necesitás descargar ninguna aplicación.

¡Quedo atento! Muchas gracias.`;
}

exports.getVideoAudit = async (req, res) => {
    try {
        const { ventaId } = req.params;
        const videoAudit = await VideoAudit.findOne({ ventaId }).lean();

        if (!videoAudit) {
            return res.status(200).json({ status: 'empty', isLocked: false });
        }

        if (videoAudit.room) {
            delete videoAudit.room.publicToken;
        }

        res.status(200).json(videoAudit);
    } catch (error) {
        console.error('Error fetching VideoAudit:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.uploadVideoAudit = async (req, res) => {
    console.log('[VideoAudit] upload start');
    console.log('[VideoAudit] req.body:', JSON.stringify(req.body));

    // Summary of files
    const filesSummary = {};
    if (req.files) {
        Object.keys(req.files).forEach(key => {
            filesSummary[key] = req.files[key].map(f => ({ name: f.originalname, size: f.size, path: f.path }));
        });
    }
    console.log('[VideoAudit] req.files summary:', JSON.stringify(filesSummary));

    try {
        const { ventaId, replacementReason } = req.body;
        console.log('[VideoAudit] ventaId:', ventaId);

        if (!ventaId) {
            console.log('[VideoAudit] Error: ventaId is missing');
            return res.status(400).json({ error: 'ventaId is required' });
        }

        console.log('[VideoAudit] Audit lookup start for ventaId:', ventaId);
        // Ensure valid ObjectId to avoid cast errors hanging or crashing
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(ventaId)) {
            console.log('[VideoAudit] Error: Invalid ObjectId format for ventaId:', ventaId);
            return res.status(400).json({ error: 'Invalid ventaId format' });
        }

        const audit = await Audit.findById(ventaId);
        console.log('[VideoAudit] Audit lookup result:', audit ? 'Found' : 'Not found');

        if (!audit) {
            return res.status(404).json({ error: 'Audit not found' });
        }

        let videoAudit = await VideoAudit.findOne({ ventaId });
        if (!videoAudit) {
            videoAudit = new VideoAudit({ ventaId, status: 'empty' });
            console.log('[VideoAudit] Created new VideoAudit document in memory');
        } else {
            console.log('[VideoAudit] Found existing VideoAudit document');
        }

        // Handle locking
        if (videoAudit.isLocked) {
            const role = req.user && req.user.role ? req.user.role.toLowerCase() : '';
            if (role !== 'gerencia' && role !== 'desarrollador') {
                return res.status(403).json({ error: 'This record is locked. Only gerencia or desarrollador can modify it.' });
            }
            if (!replacementReason) {
                return res.status(400).json({ error: 'Replacement reason is required for locked records.' });
            }
        }

        // Validate sizes again specifically for audio
        if (req.files && req.files['audioBackup']) {
            const file = req.files['audioBackup'][0];
            if (file.size > 50 * 1024 * 1024) {
                return res.status(400).json({ error: 'Backup file exceeds 50 MB limit' });
            }
        }

        let updated = false;

        const processFile = (fileField) => {
            const file = req.files[fileField][0];

            if (videoAudit[fileField] && videoAudit[fileField].path) {
                videoAudit.replacementHistory.push({
                    reason: replacementReason || 'No reason provided',
                    replacedAt: new Date(),
                    replacedBy: req.user ? req.user._id : null,
                    fileType: fileField,
                    oldPath: videoAudit[fileField].path
                });
            }

            videoAudit[fileField] = {
                path: file.path,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                uploadedAt: new Date(),
                fallbackWebmPath: file.fallbackWebmPath || undefined
            };
            updated = true;
        };

        let conversionWarning = null;

        if (req.files && req.files['video']) {
            const file = req.files['video'][0];
            if (file.mimetype === 'video/webm' || file.originalname.toLowerCase().endsWith('.webm')) {
                const ffmpegIsAvailable = await isFfmpegAvailable();
                if (ffmpegIsAvailable) {
                    const originalWebmPath = file.path;
                    try {
                        const parsedPath = path.parse(file.path);
                        const outputPath = path.join(parsedPath.dir, `VideoAudit_Recording_${ventaId}_${Date.now()}.mp4`);

                        console.log(`[VideoAudit] Starting FFmpeg conversion: ${originalWebmPath} -> ${outputPath}`);

                        await execPromise(
                            `ffmpeg -y -i "${originalWebmPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`,
                            { timeout: 300000 }
                        );

                        if (!fs.existsSync(outputPath)) {
                            throw new Error('MP4 output file not found after conversion');
                        }

                        const stats = fs.statSync(outputPath);

                        file.fallbackWebmPath = originalWebmPath;
                        file.path = outputPath;
                        file.mimetype = 'video/mp4';
                        file.originalname = file.originalname.replace(/\.webm$/i, '.mp4');
                        file.size = stats.size;

                        console.log(`[VideoAudit] Conversion success. MP4 size: ${file.size} bytes. Removing original WebM...`);

                        // Remove original WebM only after MP4 is confirmed on disk
                        try {
                            fs.unlinkSync(originalWebmPath);
                            console.log(`[VideoAudit] Original WebM removed: ${originalWebmPath}`);
                        } catch (unlinkErr) {
                            console.warn(`[VideoAudit] Could not remove original WebM (non-fatal): ${unlinkErr.message}`);
                        }
                    } catch (conversionError) {
                        console.error('[VideoAudit] FFmpeg conversion failed:', conversionError.message || conversionError);
                        conversionWarning = 'La grabación se guardó, pero no pudo convertirse a MP4.';
                        // Keep original WebM as fallback - reset path
                        file.path = originalWebmPath;
                    }
                } else {
                    console.warn('[VideoAudit] FFmpeg not available, keeping original WebM file.');
                }
            }

            processFile('video');
        }
        if (req.files && req.files['audioBackup']) {
            processFile('audioBackup');
        }

        if (updated) {
            if (videoAudit.video?.path && videoAudit.audioBackup?.path) {
                videoAudit.status = 'complete';
            } else if (videoAudit.video?.path) {
                videoAudit.status = 'video_uploaded';
            } else if (videoAudit.audioBackup?.path) {
                videoAudit.status = 'audio_uploaded';
            }

            console.log('[VideoAudit] VideoAudit upsert payload ready. Updating status to:', videoAudit.status);
            try {
                await videoAudit.save();
                console.log('[VideoAudit] VideoAudit upsert success');
            } catch (saveError) {
                console.error('[VideoAudit] VideoAudit upsert failure:', saveError);
                throw saveError; // Re-throw to be caught by the outer catch block
            }
        }

        console.log('[VideoAudit] response sent: 200 OK');
        res.status(200).json({
            message: 'Files uploaded successfully',
            videoAudit,
            warning: conversionWarning
        });
    } catch (error) {
        console.error('[VideoAudit] Error uploading to VideoAudit:', error);

        // Clean up newly uploaded files on error to avoid orphaned files
        if (req.files) {
            console.log('[VideoAudit] Cleaning up newly uploaded files due to error...');
            Object.keys(req.files).forEach(field => {
                req.files[field].forEach(file => {
                    if (fs.existsSync(file.path)) {
                        try {
                            fs.unlinkSync(file.path);
                            console.log(`[VideoAudit] Deleted orphaned file: ${file.path}`);
                        } catch (err) {
                            console.error(`[VideoAudit] Failed to delete orphaned file: ${file.path}`, err);
                        }
                    }
                });
            });
        }

        res.status(500).json({ error: 'Server error during upload', details: error.message });
    }
};

exports.downloadVideo = async (req, res) => {
    try {
        const { ventaId } = req.params;
        const videoAudit = await VideoAudit.findOne({ ventaId });

        if (!videoAudit || !videoAudit.video || !videoAudit.video.path) {
            return res.status(404).json({ error: 'Video not found' });
        }

        const filePath = videoAudit.video.path;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File missing on disk' });
        }

        res.download(filePath, videoAudit.video.originalName);
    } catch (error) {
        console.error('Error downloading video:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.downloadAudio = async (req, res) => {
    try {
        const { ventaId } = req.params;
        const videoAudit = await VideoAudit.findOne({ ventaId });

        if (!videoAudit || !videoAudit.audioBackup || !videoAudit.audioBackup.path) {
            return res.status(404).json({ error: 'Audio not found' });
        }

        const filePath = videoAudit.audioBackup.path;
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File missing on disk' });
        }

        res.download(filePath, videoAudit.audioBackup.originalName);
    } catch (error) {
        console.error('Error downloading audio:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

/* ========== ROOM / LINK METHODS ========== */

exports.createOrGetRoom = async (req, res) => {
    try {
        const { ventaId } = req.params;
        const publicBaseUrl = process.env.FRONTEND_PUBLIC_URL || req.body?.publicBaseUrl || getPublicBaseUrl(req);
        const userId = req.user?._id;

        if (!ventaId) {
            return res.status(400).json({ error: 'ventaId is required' });
        }

        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(ventaId)) {
            return res.status(400).json({ error: 'Invalid ventaId format' });
        }

        let videoAudit = await VideoAudit.findOne({ ventaId });
        if (!videoAudit) {
            videoAudit = new VideoAudit({ ventaId, status: 'empty' });
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const forceRegenerate = req.body?.forceRegenerate === true;
        const oldRoom = videoAudit.room || {};

        if (!forceRegenerate && oldRoom.publicToken && oldRoom.status !== 'expired' && oldRoom.status !== 'cancelled') {
            if (oldRoom.expiresAt && new Date(oldRoom.expiresAt) < now) {
                oldRoom.status = 'expired';
            } else {
                let updated = false;
                if (!oldRoom.shortCode) {
                    let isUnique = false;
                    let newShortCode = null;
                    while (!isUnique) {
                        newShortCode = generateShortCode(8);
                        const existing = await VideoAudit.findOne({ 'room.shortCode': newShortCode });
                        if (!existing) {
                            isUnique = true;
                        }
                    }
                    oldRoom.shortCode = newShortCode;
                    updated = true;
                }

                if (!oldRoom.publicUrl || oldRoom.publicUrl.includes('/video-auditoria/')) {
                    oldRoom.publicUrl = `${publicBaseUrl}/va/${oldRoom.shortCode}`;
                    updated = true;
                }

                if (updated) {
                    videoAudit.room = oldRoom;
                    await videoAudit.save();
                }

                return res.status(200).json({
                    room: oldRoom,
                    message: 'Existing room returned'
                });
            }
        }

        const publicToken = crypto.randomBytes(32).toString('hex');
        const roomId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

        let shortCode = oldRoom.shortCode || null;
        if (!shortCode || forceRegenerate) {
            let isUnique = false;
            while (!isUnique) {
                shortCode = generateShortCode(8);
                const existing = await VideoAudit.findOne({ 'room.shortCode': shortCode });
                if (!existing) {
                    isUnique = true;
                }
            }
        }

        const publicUrl = `${publicBaseUrl}/va/${shortCode}`;

        videoAudit.room = {
            roomId,
            publicToken,
            shortCode,
            publicUrl,
            status: oldRoom.status === 'affiliate_joined' ? 'affiliate_joined' : 'created',
            createdAt: now,
            createdBy: userId || null,
            lastInvitationSentAt: oldRoom.lastInvitationSentAt || null,
            lastInvitationSentBy: oldRoom.lastInvitationSentBy || null,
            affiliateJoinedAt: oldRoom.affiliateJoinedAt || null,
            expiresAt
        };

        await videoAudit.save();

        res.status(200).json({
            room: videoAudit.room,
            message: 'Room created successfully'
        });
    } catch (error) {
        console.error('[VideoAudit] Error creating room:', error);
        res.status(500).json({ error: 'Server error creating room', details: error.message });
    }
};

exports.sendInvitation = async (req, res) => {
    try {
        const { ventaId } = req.params;
        const userId = req.user?._id;
        const userName = req.user?.nombre || req.user?.name || "Auditor";
        const engine = getActiveEngine();

        if (!ventaId) {
            return res.status(400).json({ error: "ventaId is required" });
        }

        const videoAudit = await VideoAudit.findOne({ ventaId });
        if (!videoAudit || !videoAudit.room || !videoAudit.room.publicToken) {
            return res.status(404).json({ error: "Room not found for this sale" });
        }

        let roomUpdated = false;
        if (!videoAudit.room.shortCode) {
            let isUnique = false;
            let newShortCode = null;
            while (!isUnique) {
                newShortCode = generateShortCode(8);
                const existing = await VideoAudit.findOne({ "room.shortCode": newShortCode });
                if (!existing) {
                    isUnique = true;
                }
            }
            videoAudit.room.shortCode = newShortCode;
            roomUpdated = true;
        }

        if (!videoAudit.room.publicUrl || videoAudit.room.publicUrl.includes("/video-auditoria/")) {
            const publicBaseUrl = process.env.FRONTEND_PUBLIC_URL || getPublicBaseUrl(req);
            videoAudit.room.publicUrl = `${publicBaseUrl}/va/${videoAudit.room.shortCode}`;
            roomUpdated = true;
        }

        if (roomUpdated) {
            await videoAudit.save();
        }

        if (!videoAudit.room.publicUrl) {
            return res.status(400).json({
                ok: false,
                sendStatus: "failed",
                code: "MISSING_PUBLIC_URL",
                message: "No se encontro el link de videoauditoria. Genera el link nuevamente e intenta enviar la invitacion.",
                engine
            });
        }

        if (videoAudit.room.status === "expired") {
            return res.status(400).json({ ok: false, sendStatus: "failed", error: "Room expired. Generate a new link.", code: "ROOM_EXPIRED", engine });
        }

        if (videoAudit.room.status === "cancelled") {
            return res.status(400).json({ ok: false, sendStatus: "failed", error: "Room cancelled. Generate a new link.", code: "ROOM_CANCELLED", engine });
        }

        const audit = await Audit.findById(ventaId).select("nombre telefono cuil scheduledAt");
        if (!audit || !audit.telefono) {
            return res.status(400).json({
                ok: false,
                sendStatus: "failed",
                code: "INVALID_RECIPIENT_PHONE",
                message: "La venta no tiene un telefono valido para enviar la invitacion. Copia el link y envialo manualmente.",
                engine,
                fallback: {
                    copyLinkAvailable: true,
                    publicUrl: videoAudit.room.publicUrl
                },
                room: videoAudit.room
            });
        }

        const isConnected = isReady(userId);
        if (!isConnected) {
            await recordWhatsAppSendAttempt({
                flow: "videoaudit",
                userId: userId || null,
                sourceId: ventaId,
                engine,
                recipient: audit.telefono,
                sendStatus: "not_connected"
            });
            return res.status(503).json({
                ok: false,
                sendStatus: "not_connected",
                code: "WHATSAPP_NOT_CONNECTED",
                message: "Tu WhatsApp no esta conectado. Vinculalo nuevamente o copia el enlace.",
                engine,
                fallback: {
                    copyLinkAvailable: true,
                    publicUrl: videoAudit.room.publicUrl
                },
                room: videoAudit.room
            });
        }

        const horaTurno = audit.scheduledAt
            ? new Date(audit.scheduledAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
            : null;

        const messageText = buildInvitationMessage({
            nombre: audit.nombre,
            cuil: audit.cuil,
            auditorNombre: userName,
            horaTurno,
            link: videoAudit.room.publicUrl
        });

        if (messageText.includes("{{") || messageText.includes("}}")) {
            return res.status(400).json({
                ok: false,
                sendStatus: "failed",
                code: "TEMPLATE_INTERPOLATION_FAILED",
                message: "No se pudo preparar correctamente el mensaje de invitacion. Copia el link y envialo manualmente.",
                engine
            });
        }

        let toJid;
        try {
            toJid = formatWhatsAppJid(audit.telefono, engine);
        } catch (jidError) {
            await recordWhatsAppSendAttempt({
                flow: "videoaudit",
                userId: userId || null,
                sourceId: ventaId,
                engine,
                recipient: audit.telefono,
                sendStatus: "failed",
                errorCode: jidError.code || "INVALID_WHATSAPP_PHONE",
                errorMessage: jidError.message
            });
            return res.status(400).json({
                ok: false,
                sendStatus: "failed",
                code: "INVALID_RECIPIENT_PHONE",
                message: "La venta no tiene un telefono valido para enviar la invitacion. Copia el enlace y envialo manualmente.",
                engine,
                fallback: {
                    copyLinkAvailable: true,
                    publicUrl: videoAudit.room.publicUrl
                },
                room: videoAudit.room
            });
        }

        let sendResult;
        try {
            await recordWhatsAppSendAttempt({
                flow: "videoaudit",
                userId: userId || null,
                sourceId: ventaId,
                engine,
                jid: toJid,
                recipient: audit.telefono,
                sendStatus: "queued"
            });
            sendResult = await sendMessage(userId, toJid, messageText);
        } catch (waError) {
            const status = waError.status || (waError.code === "WHATSAPP_SEND_UNAVAILABLE" ? "unavailable" : "failed");
            const code = waError.code || (status === "unavailable" ? "WHATSAPP_SEND_UNAVAILABLE" : "WHATSAPP_SEND_FAILED");
            await recordWhatsAppSendAttempt({
                flow: "videoaudit",
                userId: userId || null,
                sourceId: ventaId,
                engine,
                jid: toJid,
                recipient: audit.telefono,
                sendStatus: status,
                errorCode: code,
                errorMessage: waError.message
            });
            return res.status(502).json({
                ok: false,
                sendStatus: status,
                code,
                message: status === "unavailable"
                    ? "El servicio de WhatsApp no tiene un metodo de envio disponible para esta sesion."
                    : "No se pudo enviar la invitacion por WhatsApp. Podes copiar el enlace y enviarlo manualmente.",
                engine,
                fallback: {
                    copyLinkAvailable: true,
                    publicUrl: videoAudit.room.publicUrl
                },
                room: videoAudit.room
            });
        }

        if (!sendResult || sendResult.status !== "accepted") {
            const status = sendResult?.status || "failed";
            const code = status === "unavailable" ? "WHATSAPP_SEND_UNAVAILABLE" : "WHATSAPP_SEND_FAILED";
            await recordWhatsAppSendAttempt({
                flow: "videoaudit",
                userId: userId || null,
                sourceId: ventaId,
                engine,
                jid: toJid,
                recipient: audit.telefono,
                sendStatus: status,
                errorCode: code,
                errorMessage: sendResult?.message || "Not accepted"
            });
            return res.status(502).json({
                ok: false,
                sendStatus: status,
                code,
                message: status === "unavailable"
                    ? "El servicio de WhatsApp no esta disponible para esta sesion. Copia el enlace o reconecta WhatsApp."
                    : "No se pudo enviar la invitacion. Podes copiar el enlace y enviarlo manualmente.",
                engine,
                fallback: {
                    copyLinkAvailable: true,
                    publicUrl: videoAudit.room.publicUrl
                },
                room: videoAudit.room
            });
        }

        if (videoAudit.room.status !== "affiliate_joined") {
            videoAudit.room.status = "invitation_sent";
        }
        videoAudit.room.lastInvitationSentAt = new Date();
        videoAudit.room.lastInvitationSentBy = userId || null;
        await videoAudit.save();

        await recordWhatsAppSendAttempt({
            flow: "videoaudit",
            userId: userId || null,
            sourceId: ventaId,
            engine: sendResult.engine || engine,
            jid: toJid,
            recipient: audit.telefono,
            sendStatus: "accepted",
            messageId: sendResult.messageId || null
        });

        return res.status(200).json({
            ok: true,
            sendStatus: "accepted",
            message: "Invitacion aceptada por WhatsApp. No pudimos confirmar entrega todavia.",
            engine: sendResult.engine || engine,
            messageId: sendResult.messageId || null,
            jid: maskJid(toJid),
            room: videoAudit.room
        });
    } catch (error) {
        console.error("[VideoAudit] Error sending invitation:", error);
        res.status(500).json({ error: "Server error sending invitation", details: error.message });
    }
};

exports.getPublicRoom = async (req, res) => {
    try {
        const { publicToken } = req.params;
        if (!publicToken) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const videoAudit = await VideoAudit.findOne({
            $or: [
                { 'room.publicToken': publicToken },
                { 'room.shortCode': publicToken }
            ]
        }).select('room ventaId');
        if (!videoAudit || !videoAudit.room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const now = new Date();
        if (videoAudit.room.expiresAt && new Date(videoAudit.room.expiresAt) < now) {
            videoAudit.room.status = 'expired';
            await videoAudit.save();
        }

        const audit = await Audit.findById(videoAudit.ventaId).select('nombre status');

        return res.status(200).json({
            roomStatus: videoAudit.room.status,
            affiliateFirstName: audit?.nombre ? audit.nombre.split(' ')[0] : null,
            organizationName: 'Dann Salud',
            expiresAt: videoAudit.room.expiresAt
        });
    } catch (error) {
        console.error('[VideoAudit] Error fetching public room:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

exports.joinPublicRoom = async (req, res) => {
    try {
        const { publicToken } = req.params;
        if (!publicToken) {
            return res.status(400).json({ error: 'Token is required' });
        }

        const videoAudit = await VideoAudit.findOne({
            $or: [
                { 'room.publicToken': publicToken },
                { 'room.shortCode': publicToken }
            ]
        }).select('room ventaId');
        if (!videoAudit || !videoAudit.room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        const now = new Date();
        if (videoAudit.room.expiresAt && new Date(videoAudit.room.expiresAt) < now) {
            videoAudit.room.status = 'expired';
            await videoAudit.save();
            return res.status(410).json({ error: 'Room has expired', code: 'ROOM_EXPIRED' });
        }

        if (videoAudit.room.status === 'cancelled') {
            return res.status(410).json({ error: 'Room has been cancelled', code: 'ROOM_CANCELLED' });
        }

        if (videoAudit.room.status === 'affiliate_joined') {
            return res.status(200).json({
                message: 'Already joined',
                roomStatus: videoAudit.room.status,
                affiliateJoinedAt: videoAudit.room.affiliateJoinedAt
            });
        }

        videoAudit.room.status = 'affiliate_joined';
        videoAudit.room.affiliateJoinedAt = now;
        await videoAudit.save();

        try {
            const { getIO } = require('../config/socket');
            const io = getIO();
            // Notify auditors subscribed to this specific audit room
            io.to(`audit_${String(videoAudit.ventaId)}`).emit('videoaudit:affiliate_joined', {
                ventaId: String(videoAudit.ventaId),
                joinedAt: now
            });
            // Also notify auditors subscribed to the global audits room (auditorias-seguimiento)
            io.to('audits_all').emit('videoaudit:affiliate_joined', {
                ventaId: String(videoAudit.ventaId),
                joinedAt: now
            });
        } catch (socketErr) {
            console.warn('[VideoAudit] Socket emit failed (non-critical):', socketErr.message);
        }

        return res.status(200).json({
            message: 'Joined successfully',
            roomStatus: videoAudit.room.status,
            affiliateJoinedAt: videoAudit.room.affiliateJoinedAt
        });
    } catch (error) {
        console.error('[VideoAudit] Error joining public room:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};
