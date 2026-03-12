/**
 * ============================================================
 * RUTAS DE RECOVERY (recoveryRoutes.js)
 * ============================================================
 * Gestión de auditorías marcadas para reintento.
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { permit } = require('../middlewares/roleMiddleware');
const recovery = require('../controllers/recoveryController');

/* ========== RUTAS PROTEGIDAS ========== */
router.use(requireAuth, permit('administrativo', 'auditor', 'gerencia'));

router.get('/', recovery.list);
router.post('/', recovery.create);

module.exports = router;

