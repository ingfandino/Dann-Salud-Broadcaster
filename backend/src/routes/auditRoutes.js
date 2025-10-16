// backend/src/routes/auditRoutes.js

const express = require('express');
const router = express.Router();
const auditCtrl = require('../controllers/auditController');
const { requireAuth } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// 📌 Rutas específicas primero
router.get('/available-slots', requireAuth, auditCtrl.getAvailableSlots);
router.get('/by-cuil/:cuil', requireAuth, auditCtrl.getAuditByCuil);
router.get('/export', requireAuth, auditCtrl.exportByDate);
router.get("/date-range", requireAuth, auditCtrl.getAuditsByDateRange);

// 📌 CRUD y listados
router.post('/', requireAuth, auditCtrl.createAudit);
router.get('/', requireAuth, auditCtrl.getAuditsByDate);
router.patch('/:id/status', requireAuth, auditCtrl.updateStatus);
router.patch('/:id', requireAuth, auditCtrl.updateAudit);
router.delete('/:id', requireAuth, auditCtrl.deleteAudit);

// 📌 Multimedia
router.post(
    '/:id/multimedia',
    requireAuth,
    upload.fields([
        { name: 'images', maxCount: 2 },
        { name: 'video', maxCount: 1 },
        { name: 'audioBackup', maxCount: 1 },
    ]),
    auditCtrl.uploadMultimedia
);

module.exports = router;