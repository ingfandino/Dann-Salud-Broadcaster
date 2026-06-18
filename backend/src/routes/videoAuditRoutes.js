const express = require('express');
const router = express.Router();
const videoAuditCtrl = require('../controllers/videoAuditController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { permit } = require('../middlewares/roleMiddleware');

const multer = require('multer');
const fs = require('fs');
const path = require('path');

const checkFeatureFlag = (req, res, next) => {
    if (process.env.ENABLE_VIDEO_AUDIT_MVP !== 'true') {
        return res.status(404).json({ error: 'Video Audit MVP disabled' });
    }
    next();
};

const checkRoomFeatureFlag = (req, res, next) => {
    if (process.env.ENABLE_VIDEO_AUDIT_ROOM_MVP !== 'true') {
        return res.status(404).json({ error: 'Video Audit Room MVP disabled' });
    }
    next();
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const ventaId = req.body.ventaId;
        if (!ventaId) return cb(new Error("ventaId is required"), null);
        const dir = path.join(__dirname, '../../storage/video-audits', ventaId);
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${file.fieldname}-${timestamp}-${safeName}`);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 120 * 1024 * 1024 // 120MB max (raised for WebRTC recordings)
    },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (file.fieldname === 'video') {
            const allowedMime = ['video/mp4', 'video/webm', 'video/quicktime'];
            const allowedExt = ['.mp4', '.webm', '.mov'];
            if (!allowedExt.includes(ext)) {
                 return cb(new Error(`Invalid video extension: ${ext}. Allowed: mp4, webm, mov.`));
            }
            if (!allowedMime.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
                return cb(new Error(`Invalid video format: ${file.mimetype}. Allowed MIME: mp4, webm, mov or octet-stream.`));
            }
        } else if (file.fieldname === 'audioBackup') {
            const allowedMime = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm', 'video/webm', 'video/mp4', 'video/quicktime'];
            const allowedExt = ['.mp3', '.m4a', '.wav', '.ogg', '.webm', '.mp4', '.mov'];
            if (!allowedExt.includes(ext)) {
                 return cb(new Error(`Invalid backup extension: ${ext}. Allowed: mp3, m4a, wav, ogg, webm, mp4, mov.`));
            }
            if (!allowedMime.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
                return cb(new Error(`Invalid backup format: ${file.mimetype}. Allowed MIME: audio or video or octet-stream.`));
            }
        }
        cb(null, true);
    }
});

/* ========== PUBLIC ROUTES (no auth) ========== */
router.get('/public/:publicToken', checkRoomFeatureFlag, videoAuditCtrl.getPublicRoom);
router.post('/public/:publicToken/join', checkRoomFeatureFlag, videoAuditCtrl.joinPublicRoom);

/* ========== PROTECTED ROUTES ========== */
router.use(requireAuth);
router.use(checkFeatureFlag);

router.get('/:ventaId', permit('gerencia', 'administrativo', 'auditor', 'supervisor', 'recuperador', 'encargado', 'desarrollador'), videoAuditCtrl.getVideoAudit);
router.post('/upload', permit('gerencia', 'administrativo', 'auditor', 'supervisor', 'encargado', 'desarrollador'), (req, res, next) => {
    upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'audioBackup', maxCount: 1 }
    ])(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, videoAuditCtrl.uploadVideoAudit);
router.get('/:ventaId/download/video', permit('gerencia', 'administrativo', 'auditor', 'supervisor', 'recuperador', 'encargado', 'desarrollador'), videoAuditCtrl.downloadVideo);
router.get('/:ventaId/download/audioBackup', permit('gerencia', 'administrativo', 'auditor', 'supervisor', 'recuperador', 'encargado', 'desarrollador'), videoAuditCtrl.downloadAudio);

/* ========== ROOM ROUTES (protected) ========== */
router.post('/:ventaId/room', checkRoomFeatureFlag, permit('gerencia', 'administrativo', 'auditor', 'supervisor', 'encargado', 'desarrollador'), videoAuditCtrl.createOrGetRoom);
router.post('/:ventaId/room/send-invitation', checkRoomFeatureFlag, permit('gerencia', 'administrativo', 'auditor', 'supervisor', 'encargado', 'desarrollador'), videoAuditCtrl.sendInvitation);

module.exports = router;
