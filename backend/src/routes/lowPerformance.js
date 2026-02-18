/**
 * ============================================================
 * RUTAS DE BAJO RENDIMIENTO (lowPerformance.js)
 * ============================================================
 * Gestión de evaluaciones de bajo rendimiento de supervisores.
 * Acceso exclusivo para Gerencia.
 */

const express = require('express');
const router = express.Router();
const lowPerformanceController = require('../controllers/lowPerformanceController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Middleware para verificar que el usuario es Gerencia
const isGerencia = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'gerencia') {
        return res.status(403).json({ 
            message: 'Acceso denegado. Solo Gerencia puede acceder a este recurso.' 
        });
    }
    next();
};

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Todas las rutas requieren rol Gerencia
router.use(isGerencia);

// Obtener todos los registros de bajo rendimiento
router.get('/', lowPerformanceController.getAll);

// Obtener estadísticas generales
router.get('/stats', lowPerformanceController.getStats);

// Obtener evaluación del periodo actual
router.get('/current-period', lowPerformanceController.getCurrentPeriod);

// Obtener historial de un supervisor específico
router.get('/history/:supervisorId', lowPerformanceController.getSupervisorHistory);

// Evaluar periodo actual o específico
router.post('/evaluate', lowPerformanceController.evaluatePeriod);

// Evaluar periodos históricos
router.post('/evaluate-historical', lowPerformanceController.evaluateHistorical);

// Eliminar un registro
router.delete('/:id', lowPerformanceController.deleteRecord);

module.exports = router;
