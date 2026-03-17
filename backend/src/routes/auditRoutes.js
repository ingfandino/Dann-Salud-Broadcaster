/**
 * ============================================================
 * RUTAS DE AUDITORÍAS (auditRoutes.js)
 * ============================================================
 * CRUD y operaciones de auditorías (ventas).
 * Incluye estadísticas, exportación y gestión de multimedia.
 */

const express = require('express');
const router = express.Router();
const auditCtrl = require('../controllers/auditController');
const { requireAuth } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

/* ========== RUTAS ESPECÍFICAS (antes de :id) ========== */
router.get('/available-slots', requireAuth, auditCtrl.getAvailableSlots);
router.get('/sales-stats', requireAuth, auditCtrl.getSalesStats);
router.get('/by-cuil/:cuil', requireAuth, auditCtrl.getAuditByCuil);
router.get('/export', requireAuth, auditCtrl.exportByDate);
router.get("/date-range", requireAuth, auditCtrl.getAuditsByDateRange);
router.get('/stats/supervisors', requireAuth, auditCtrl.getSupervisorStats);
router.get('/stats/obras-sociales', requireAuth, auditCtrl.getObraSocialStats);
router.get('/reventa/export', requireAuth, auditCtrl.exportReventa);
router.get('/reventa', requireAuth, auditCtrl.getReventa);

// ✅ Batch recalcular supervisores (ANTES de rutas con :id)
const { permit } = require('../middlewares/roleMiddleware');
router.post('/recalculate-supervisors', requireAuth, permit('gerencia'), auditCtrl.recalculateSupervisors);

// ✅ Carga masiva desde Excel (solo Gerencia)
router.post('/bulk-import', requireAuth, permit('gerencia'), auditCtrl.bulkImportAudits);

// 📌 CRUD y listados
router.post('/', requireAuth, auditCtrl.createAudit);
router.get('/', requireAuth, auditCtrl.getAuditsByDate);
router.patch('/:id/status', requireAuth, auditCtrl.updateStatus);
router.patch('/:id/revision', requireAuth, auditCtrl.markRevision);
router.patch('/:id/toggle-en-proceso', requireAuth, auditCtrl.toggleEnProceso);
router.patch('/:id', requireAuth, auditCtrl.updateAudit);
// ⚠️ DELETE: rol "encargado" explícitamente prohibido
router.delete('/:id', requireAuth, (req, res, next) => {
    if (req.user.role === 'encargado') {
        return res.status(403).json({ message: 'No autorizado para eliminar auditorías' });
    }
    next();
}, auditCtrl.deleteAudit);

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