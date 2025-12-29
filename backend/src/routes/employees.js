/**
 * ============================================================
 * RUTAS DE EMPLEADOS (employees.js)
 * ============================================================
 * Gestión de información de RR.HH de empleados.
 * Acceso para Gerencia, RR.HH y Supervisores.
 */

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { requireAuth } = require('../middlewares/authMiddleware');
const uploadDNI = require('../middlewares/uploadDNIMiddleware');

// Middleware para verificar que el usuario es Gerencia, RR.HH. o Supervisor
const isGerenciaRRHHOrSupervisor = (req, res, next) => {
    const role = req.user?.role?.toLowerCase();
    if (role !== 'gerencia' && role !== 'rr.hh' && role !== 'supervisor') {
        return res.status(403).json({ message: 'Acceso denegado. Solo Gerencia, RR.HH. o Supervisor pueden acceder a este recurso.' });
    }
    next();
};

// Middleware para verificar permisos de edición/borrado
// Gerencia y RR.HH.: Acceso total
// Supervisor: Solo puede editar/borrar empleados de su mismo numeroEquipo
const canEditDelete = async (req, res, next) => {
    const role = req.user?.role?.toLowerCase();

    // Gerencia y RR.HH. tienen acceso total
    if (role === 'gerencia' || role === 'rr.hh') {
        return next();
    }

    // Supervisor: debe verificar que el empleado pertenezca a su equipo
    if (role === 'supervisor') {
        try {
            const Employee = require('../models/Employee');
            const User = require('../models/User');

            const employee = await Employee.findById(req.params.id).populate('userId');
            if (!employee) {
                return res.status(404).json({ message: 'Empleado no encontrado' });
            }

            // Verificar que el empleado pertenezca al mismo numeroEquipo del supervisor
            const supervisorNumeroEquipo = req.user.numeroEquipo;
            const employeeNumeroEquipo = employee.userId?.numeroEquipo || employee.numeroEquipo;

            if (supervisorNumeroEquipo && supervisorNumeroEquipo === employeeNumeroEquipo) {
                return next();
            }

            return res.status(403).json({
                message: 'Acceso denegado. Solo puedes editar/eliminar empleados de tu equipo.'
            });
        } catch (error) {
            console.error('Error en middleware canEditDelete:', error);
            return res.status(500).json({ message: 'Error al verificar permisos' });
        }
    }

    return res.status(403).json({
        message: 'Acceso denegado. Solo Gerencia, RR.HH. o Supervisor pueden editar/eliminar empleados.'
    });
};

// Todas las rutas requieren autenticación
router.use(requireAuth);

// CRUD de empleados
router.get('/', isGerenciaRRHHOrSupervisor, employeeController.getAllEmployees); // Lectura: Gerencia, RR.HH. y Supervisor
router.get('/:id', isGerenciaRRHHOrSupervisor, employeeController.getEmployeeById); // Lectura: Gerencia, RR.HH. y Supervisor
router.post('/', isGerenciaRRHHOrSupervisor, employeeController.createEmployee); // Crear: Gerencia, RR.HH. y Supervisor
router.put('/:id', canEditDelete, employeeController.updateEmployee); // Editar: Gerencia, RR.HH. y Supervisor (solo su equipo)
router.delete('/:id', canEditDelete, employeeController.deleteEmployee); // Borrar: Gerencia, RR.HH. y Supervisor (solo su equipo)

// Estadísticas de empleado - Acceso para Gerencia, RR.HH. y Supervisor
router.get('/stats/:userId', isGerenciaRRHHOrSupervisor, employeeController.getEmployeeStats);

// Ruta para subir foto de DNI
router.post('/upload-dni', isGerenciaRRHHOrSupervisor, uploadDNI.single('fotoDNI'), employeeController.uploadDNI);

module.exports = router;
