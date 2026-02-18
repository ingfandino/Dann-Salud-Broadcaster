/**
 * ============================================================
 * RUTAS DE TELÉFONOS CORPORATIVOS (phones.js)
 * ============================================================
 * Gestión de teléfonos corporativos y su historial de recargas.
 * Acceso para Gerencia y Supervisores (con restricciones).
 */

const express = require('express');
const router = express.Router();
const phoneController = require('../controllers/phoneController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Middleware para verificar que el usuario es Gerencia o Supervisor
const isGerenciaOrSupervisor = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'gerencia' && role !== 'supervisor' && role !== 'encargado') {
        return res.status(403).json({ 
            message: 'Acceso denegado. Solo Gerencia, Supervisores y Encargados pueden acceder a este recurso.' 
        });
    }
    next();
};

// Middleware para verificar que el usuario es Gerencia (para operaciones de eliminación)
const isGerencia = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'gerencia') {
        return res.status(403).json({ 
            message: 'Acceso denegado. Solo Gerencia puede realizar esta acción.' 
        });
    }
    next();
};

// Todas las rutas requieren autenticación
router.use(requireAuth);

// ========== CRUD DE TELÉFONOS ==========

// Listar teléfonos (filtrado por rol)
router.get('/', isGerenciaOrSupervisor, phoneController.getAllPhones);

// Obtener estadísticas
router.get('/stats', isGerenciaOrSupervisor, phoneController.getPhoneStats);

// Obtener asesores de un equipo (para dropdown)
router.get('/asesores/:numeroEquipo', isGerenciaOrSupervisor, phoneController.getAsesoresByEquipo);

// Obtener teléfono por ID
router.get('/:id', isGerenciaOrSupervisor, phoneController.getPhoneById);

// Crear teléfono
router.post('/', isGerenciaOrSupervisor, phoneController.createPhone);

// Actualizar teléfono
router.put('/:id', isGerenciaOrSupervisor, phoneController.updatePhone);

// Eliminar teléfono (solo Gerencia)
router.delete('/:id', isGerencia, phoneController.deletePhone);

// ========== HISTORIAL DE RECARGAS ==========

// Agregar recarga/gasto
router.post('/:id/recharges', isGerenciaOrSupervisor, phoneController.addRecharge);

// Eliminar recarga (solo Gerencia)
router.delete('/:id/recharges/:rechargeId', isGerencia, phoneController.deleteRecharge);

module.exports = router;
