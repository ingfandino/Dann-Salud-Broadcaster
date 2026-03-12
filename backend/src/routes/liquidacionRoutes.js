/**
 * ============================================================
 * RUTAS DE LIQUIDACIÓN (liquidacionRoutes.js)
 * ============================================================
 * Lista y exporta auditorías con estado "QR hecho".
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { permit } = require('../middlewares/roleMiddleware');
const liquidacion = require('../controllers/liquidacionController');

/* ========== RUTAS PROTEGIDAS ========== */
router.use(requireAuth, permit('administrativo', 'auditor', 'gerencia', 'supervisor', 'supervisor_reventa', 'asesor', 'recuperador', 'encargado', 'independiente'));

router.get('/', liquidacion.list);
router.get('/by-tipo', liquidacion.listByTipo);
router.get('/stats-monthly', liquidacion.statsMonthly);

// Ruta DIRECTA sin middleware adicional para debugging
router.post('/export-direct', liquidacion.exportLiquidationDirect);

// Ruta normal
router.post('/export', liquidacion.exportLiquidation);

module.exports = router;
