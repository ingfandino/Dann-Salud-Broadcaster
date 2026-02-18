/**
 * ============================================================
 * RUTAS DE BAJAS/SEPARACIONES (employeeSeparationRoutes)
 * ============================================================
 * Endpoints para gestionar bajas de empleados y liquidaciones.
 * Solo accesibles para usuarios con rol Gerencia.
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/employeeSeparationController');
const { requireAuth } = require('../middlewares/authMiddleware');

/**
 * Middleware para verificar rol Gerencia
 */
const gerenciaOnly = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'gerencia') {
        return res.status(403).json({
            success: false,
            message: 'Acceso denegado. Esta funcionalidad es exclusiva para Gerencia.'
        });
    }
    next();
};

/**
 * @route   GET /api/separations
 * @desc    Listar bajas/liquidaciones del mes actual
 * @access  Gerencia only
 */
router.get('/', requireAuth, gerenciaOnly, controller.listSeparations);

/**
 * @route   GET /api/separations/:id
 * @desc    Obtener una separación por ID
 * @access  Gerencia only
 */
router.get('/:id', requireAuth, gerenciaOnly, controller.getSeparationById);

/**
 * @route   PATCH /api/separations/:id/mark-paid
 * @desc    Marcar liquidación como pagada
 * @access  Gerencia only
 */
router.patch('/:id/mark-paid', requireAuth, gerenciaOnly, controller.markAsPaid);

/**
 * @route   PATCH /api/separations/:id/motivo-baja
 * @desc    Actualizar motivoBajaNormalizado de una separación
 * @access  Gerencia only
 */
router.patch('/:id/motivo-baja', requireAuth, gerenciaOnly, controller.updateMotivoBaja);

module.exports = router;
