/**
 * ============================================================
 * CONTROLADOR DE EMPLEADOS (employeeController)
 * ============================================================
 * Gestiona la información de Recursos Humanos de los empleados.
 * Extiende los datos de usuario con información laboral,
 * documentación, y estado del empleado.
 * 
 * Usado por el módulo de RR.HH para gestión de personal.
 */

const Employee = require('../models/Employee');
const User = require('../models/User');
const Audit = require('../models/Audit');
const InternalMessage = require('../models/InternalMessage');
const separationController = require('./employeeSeparationController');

/** Obtiene todos los empleados con datos de usuario */
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.find()
            .populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt')
            .populate('createdBy', 'nombre email')
            .sort({ createdAt: -1 });

        // Actualizar automáticamente el cargo si el rol del usuario cambió
        const updates = [];
        for (const employee of employees) {
            if (employee.userId && employee.userId.role && employee.cargo !== employee.userId.role) {
                updates.push(
                    Employee.findByIdAndUpdate(employee._id, { cargo: employee.userId.role })
                );
                // Actualizar el objeto en memoria para devolver el valor correcto
                employee.cargo = employee.userId.role;
            }
        }

        // Ejecutar todas las actualizaciones en paralelo si hay cambios
        if (updates.length > 0) {
            await Promise.all(updates);
        }

        res.json(employees);
    } catch (error) {
        console.error('Error al obtener empleados:', error);
        res.status(500).json({ message: 'Error al obtener empleados' });
    }
};

/**
 * Obtener un empleado por ID
 */
exports.getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;

        const employee = await Employee.findById(id)
            .populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt')
            .populate('createdBy', 'nombre email')
            .populate('updatedBy', 'nombre email');

        if (!employee) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Error al obtener empleado:', error);
        res.status(500).json({ message: 'Error al obtener empleado' });
    }
};

/**
 * Crear un nuevo empleado
 */
exports.createEmployee = async (req, res) => {
    try {
        const {
            userId,
            nombreCompleto,
            telefonoPersonal,
            fechaEntrevista,
            fechaIngreso,
            cargo,
            numeroEquipo,
            firmoContrato,
            activo,
            fotoDNI,
            notas
        } = req.body;

        // Verificar que el usuario existe
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar que no exista ya un empleado para este usuario
        const existing = await Employee.findOne({ userId });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe un empleado asociado a este usuario' });
        }

        // ✅ VALIDACIÓN DE EQUIPO PARA SUPERVISOR/ENCARGADO
        // Supervisor/Encargado solo puede crear empleados de su mismo equipo
        const creatorRole = req.user?.role?.toLowerCase();
        if (creatorRole === 'supervisor' || creatorRole === 'encargado') {
            const supervisorNumeroEquipo = req.user.numeroEquipo ? String(req.user.numeroEquipo) : null;
            const targetUserNumeroEquipo = user.numeroEquipo ? String(user.numeroEquipo) : null;

            if (!supervisorNumeroEquipo) {
                return res.status(403).json({
                    message: 'Tu cuenta de supervisor no tiene un número de equipo asignado.'
                });
            }

            if (supervisorNumeroEquipo !== targetUserNumeroEquipo) {
                return res.status(403).json({
                    message: 'Solo puedes crear empleados de tu mismo equipo.'
                });
            }
        }

        const employee = new Employee({
            userId,
            nombreCompleto,
            telefonoPersonal,
            fechaEntrevista: fechaEntrevista || null,
            fechaIngreso: fechaIngreso || user.createdAt,
            cargo: cargo || user.role,
            numeroEquipo: numeroEquipo || user.numeroEquipo || '',
            firmoContrato: firmoContrato || false,
            fotoDNI: fotoDNI || '',
            activo: activo !== undefined ? activo : true,
            notas: notas || '',
            createdBy: req.user._id
        });

        await employee.save();

        await employee.populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt');

        res.status(201).json(employee);
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).json({ message: 'Error al crear empleado' });
    }
};

/**
 * Actualizar un empleado (SOLO campos editables).
 * NO modifica: activo, fechaReingreso (siempre protegidos).
 * fechaBaja y fechaEgreso: protegidos para todos EXCEPTO Gerencia,
 * que puede corregirlos en empleados inactivos con validaciones.
 */
exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body };
        const isGerencia = req.user?.role?.toLowerCase() === 'gerencia';

        // ── BLINDAJE: campos siempre protegidos ──
        delete updates.activo;
        delete updates.fechaReingreso;

        // ── fechaBaja / fechaEgreso: solo Gerencia puede modificarlos ──
        if (!isGerencia) {
            delete updates.fechaBaja;
            delete updates.fechaEgreso;
        } else if (updates.fechaBaja !== undefined) {
            // Validar antes de permitir la escritura
            const currentEmployee = await Employee.findById(id);
            if (!currentEmployee) {
                return res.status(404).json({ message: 'Empleado no encontrado' });
            }
            if (currentEmployee.activo) {
                return res.status(400).json({ message: 'No se puede modificar la fecha de baja de un empleado activo. Use el endpoint de desactivación.' });
            }
            const nuevaFechaBaja = new Date(updates.fechaBaja);
            if (isNaN(nuevaFechaBaja.getTime())) {
                return res.status(400).json({ message: 'La fecha de baja no es válida.' });
            }
            const hoy = new Date(); hoy.setHours(23, 59, 59, 999);
            if (nuevaFechaBaja > hoy) {
                return res.status(400).json({ message: 'La fecha de baja no puede ser futura.' });
            }
            if (currentEmployee.fechaIngreso && nuevaFechaBaja < new Date(currentEmployee.fechaIngreso)) {
                return res.status(400).json({ message: 'La fecha de baja no puede ser anterior a la fecha de ingreso.' });
            }
            // Sincronizar fechaEgreso con fechaBaja
            updates.fechaEgreso = nuevaFechaBaja;
        }

        // Agregar quién modificó
        updates.updatedBy = req.user._id;

        const employee = await Employee.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        )
            .populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt')
            .populate('createdBy', 'nombre email')
            .populate('updatedBy', 'nombre email');

        if (!employee) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Error al actualizar empleado:', error);
        res.status(500).json({ message: 'Error al actualizar empleado' });
    }
};

/**
 * Desactivar (dar de baja) a un empleado.
 *
 * REGLAS:
 *  1. Requiere obligatoriamente `motivoBaja` y `fechaEgreso` en el body.
 *  2. Solo actúa si el empleado está actualmente activo.
 *     Si ya está inactivo → responde 400 sin crear separación duplicada.
 *  3. Establece fechaBaja = fechaEgreso recibida (NUNCA new Date() automático).
 *  4. Desactiva el User asociado.
 *  5. Crea un único documento en EmployeeSeparation.
 */
exports.deactivateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivoBaja, motivoBajaNormalizado, fechaEgreso } = req.body;

        // ── Validaciones obligatorias ──
        if (!motivoBaja || !String(motivoBaja).trim()) {
            return res.status(400).json({ message: 'El campo motivoBaja es obligatorio para dar de baja.' });
        }
        if (!fechaEgreso) {
            return res.status(400).json({ message: 'El campo fechaEgreso es obligatorio para dar de baja.' });
        }

        const currentEmployee = await Employee.findById(id);
        if (!currentEmployee) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        // ── Idempotencia: si ya está inactivo, NO volver a procesar ──
        if (currentEmployee.activo === false) {
            return res.status(400).json({
                message: 'El empleado ya se encuentra inactivo. No se puede volver a dar de baja.'
            });
        }

        // ── Parsear la fecha recibida (NUNCA usar new Date() por defecto) ──
        const fechaBaja = new Date(fechaEgreso);

        // ── Aplicar cambios al empleado ──
        currentEmployee.activo = false;
        currentEmployee.fechaBaja = fechaBaja;
        currentEmployee.fechaEgreso = fechaBaja;
        currentEmployee.motivoBaja = String(motivoBaja).trim();
        if (motivoBajaNormalizado !== undefined) {
            currentEmployee.motivoBajaNormalizado = motivoBajaNormalizado;
        }
        currentEmployee.updatedBy = req.user._id;
        await currentEmployee.save();

        // ── Desactivar el User asociado ──
        if (currentEmployee.userId) {
            await User.findByIdAndUpdate(currentEmployee.userId, { active: false });
            console.log(`👤 Usuario ${currentEmployee.userId} desactivado automáticamente por baja de empleado.`);
        }

        // ── Crear registro de separación (único) ──
        try {
            await separationController.createSeparation(
                currentEmployee,
                req.user._id,
                currentEmployee.motivoBaja,
                fechaBaja
            );
            console.log(`📋 Registro de baja creado para: ${currentEmployee.nombreCompleto}`);
        } catch (sepError) {
            console.error('Error al crear registro de baja (no bloqueante):', sepError);
        }

        // ── Devolver el empleado actualizado con populates ──
        const employee = await Employee.findById(id)
            .populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt')
            .populate('createdBy', 'nombre email')
            .populate('updatedBy', 'nombre email');

        res.json(employee);
    } catch (error) {
        console.error('Error al desactivar empleado:', error);
        res.status(500).json({ message: 'Error al desactivar empleado' });
    }
};

/**
 * Reactivar a un empleado previamente dado de baja.
 *
 * REGLAS:
 *  1. Solo actúa si el empleado está actualmente inactivo.
 *  2. Establece fechaReingreso con la fecha actual.
 *  3. Limpia fechaBaja, fechaEgreso, motivoBaja, motivoBajaNormalizado.
 *  4. Reactiva el User asociado.
 */
exports.reactivateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const currentEmployee = await Employee.findById(id);
        if (!currentEmployee) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        if (currentEmployee.activo === true) {
            return res.status(400).json({ message: 'El empleado ya se encuentra activo.' });
        }

        // ── Aplicar reactivación ──
        currentEmployee.activo = true;
        currentEmployee.fechaReingreso = new Date();

        // ⚠️ NOTA ARQUITECTÓNICA: Los campos de baja se limpian intencionalmente.
        // El modelo Employee refleja SOLO el estado actual del empleado.
        // El historial completo de bajas (fechas, motivos, métricas) se preserva
        // en la colección EmployeeSeparation (modelo EmployeeSeparation).
        // Cualquier reporte o consulta histórica DEBE usar EmployeeSeparation,
        // NUNCA Employee.fechaBaja / Employee.motivoBaja.
        currentEmployee.fechaBaja = null;
        currentEmployee.fechaEgreso = null;
        currentEmployee.motivoBaja = '';
        currentEmployee.motivoBajaNormalizado = null;
        currentEmployee.updatedBy = req.user._id;
        await currentEmployee.save();

        // ── Reactivar User asociado ──
        if (currentEmployee.userId) {
            await User.findByIdAndUpdate(currentEmployee.userId, { active: true });
            console.log(`👤 Usuario ${currentEmployee.userId} reactivado automáticamente.`);
            console.log(`📅 Fecha de reingreso guardada: ${currentEmployee.fechaReingreso.toLocaleDateString()}`);
        }

        const employee = await Employee.findById(id)
            .populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt')
            .populate('createdBy', 'nombre email')
            .populate('updatedBy', 'nombre email');

        res.json(employee);
    } catch (error) {
        console.error('Error al reactivar empleado:', error);
        res.status(500).json({ message: 'Error al reactivar empleado' });
    }
};

/**
 * Eliminar un empleado (eliminación real del registro)
 */
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        // Obtener el empleado antes de eliminarlo para notificaciones
        const employee = await Employee.findById(id).populate('userId', 'nombre email role numeroEquipo');

        if (!employee) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        // Eliminar el registro completamente
        await Employee.findByIdAndDelete(id);

        // Si el usuario que eliminó es supervisor/encargado, notificar a RR.HH. y Gerencia
        const userRole = req.user.role?.toLowerCase();
        if (userRole === 'supervisor' || userRole === 'encargado') {
            // Buscar usuarios de RR.HH. y Gerencia
            const recipients = await User.find({
                $or: [
                    { role: 'RR.HH' },
                    { role: 'gerencia' }
                ],
                active: true
            }).select('_id');

            if (recipients.length > 0) {
                const message = new InternalMessage({
                    from: req.user._id,
                    to: recipients.map(u => u._id),
                    subject: '🗑️ Empleado eliminado por Supervisor',
                    message: `El supervisor ${req.user.nombre} ha eliminado al empleado:\n\n` +
                        `📋 Nombre: ${employee.nombreCompleto}\n` +
                        `👤 Usuario: ${employee.userId?.nombre || 'N/A'}\n` +
                        `📧 Email: ${employee.userId?.email || 'N/A'}\n` +
                        `🏢 Equipo: ${employee.numeroEquipo || 'Sin equipo'}\n` +
                        `💼 Cargo: ${employee.cargo}\n\n` +
                        `⏰ Fecha de eliminación: ${new Date().toLocaleString('es-AR')}`,
                    read: false
                });

                await message.save();
            }
        }

        res.json({ message: 'Empleado eliminado correctamente', employee });
    } catch (error) {
        console.error('Error al eliminar empleado:', error);
        res.status(500).json({ message: 'Error al eliminar empleado' });
    }
};

/**
 * Subir foto de DNI
 */
exports.uploadDNI = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se proporcionó ningún archivo' });
        }

        // Devolver la ruta relativa del archivo
        const filePath = `/uploads/dni/${req.file.filename}`;

        res.json({
            message: 'Archivo subido correctamente',
            fotoDNI: filePath
        });
    } catch (error) {
        console.error('Error al subir foto de DNI:', error);
        res.status(500).json({ message: 'Error al subir foto de DNI' });
    }
};

/**
 * Obtener estadísticas de un empleado según su rol
 */
exports.getEmployeeStats = async (req, res) => {
    try {
        const { userId } = req.params;

        // Obtener el usuario y su ficha de empleado
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const employee = await Employee.findOne({ userId })
            .populate('userId', 'nombre email role numeroEquipo active teamHistory createdAt');

        if (!employee) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        const role = user.role?.toLowerCase();
        const stats = {
            employee,
            role,
            stats: {}
        };

        // Calcular fechas de referencia
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Estados válidos para contar ventas completadas
        const validStates = ['QR hecho', 'Cargada', 'Aprobada'];

        // ASESOR: Estadísticas individuales
        if (role === 'asesor') {
            // QR Hechos en la última semana
            const qrWeek = await Audit.countDocuments({
                asesor: userId,
                status: { $in: validStates },
                createdAt: { $gte: startOfWeek }
            });

            // QR Hechos en el mes actual
            const qrMonth = await Audit.countDocuments({
                asesor: userId,
                status: { $in: validStates },
                createdAt: { $gte: startOfMonth }
            });

            // Total de ventas incompletas (estados que NO son válidos)
            const incomplete = await Audit.countDocuments({
                asesor: userId,
                status: { $nin: validStates }
            });

            // Máximo de QR en una semana (estimación últimos 3 meses)
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(now.getMonth() - 3);

            const audits = await Audit.find({
                asesor: userId,
                status: { $in: validStates },
                createdAt: { $gte: threeMonthsAgo }
            }).select('createdAt');

            // Agrupar por semana
            const weeklyCount = {};
            audits.forEach(audit => {
                const date = new Date(audit.createdAt);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekKey = weekStart.toISOString().split('T')[0];
                weeklyCount[weekKey] = (weeklyCount[weekKey] || 0) + 1;
            });

            const maxWeek = Math.max(...Object.values(weeklyCount), 0);

            // Máximo de QR en un mes
            const monthlyCount = {};
            audits.forEach(audit => {
                const date = new Date(audit.createdAt);
                const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
                monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
            });

            const maxMonth = Math.max(...Object.values(monthlyCount), 0);

            stats.stats = {
                qrWeek,
                qrMonth,
                maxQrWeek: maxWeek,
                maxQrMonth: maxMonth,
                incomplete
            };
        }

        // SUPERVISOR: Estadísticas del equipo
        // Replicando la lógica exacta de liquidacionController.js
        else if (role === 'supervisor') {
            const numeroEquipo = user.numeroEquipo;

            if (!numeroEquipo) {
                return res.status(400).json({ message: 'Supervisor sin número de equipo asignado' });
            }

            // QR Hechos del equipo en la última semana
            // Buscar auditorías donde el asesor tenga el mismo numeroEquipo que el supervisor
            const qrWeek = await Audit.find({
                status: { $in: validStates },
                createdAt: { $gte: startOfWeek }
            }).populate('asesor', 'numeroEquipo').lean().then(audits => {
                return audits.filter(audit =>
                    audit.asesor?.numeroEquipo === numeroEquipo
                ).length;
            });

            // QR Hechos del equipo en el mes actual
            const qrMonth = await Audit.find({
                status: { $in: validStates },
                createdAt: { $gte: startOfMonth }
            }).populate('asesor', 'numeroEquipo').lean().then(audits => {
                return audits.filter(audit =>
                    audit.asesor?.numeroEquipo === numeroEquipo
                ).length;
            });

            // Total de ventas incompletas del equipo
            const incomplete = await Audit.find({
                status: { $nin: validStates }
            }).populate('asesor', 'numeroEquipo').lean().then(audits => {
                return audits.filter(audit =>
                    audit.asesor?.numeroEquipo === numeroEquipo
                ).length;
            });

            // Contar miembros del equipo
            const teamMembers = await User.find({ numeroEquipo, active: true });

            stats.stats = {
                qrWeek,
                qrMonth,
                incomplete,
                teamSize: teamMembers.length
            };
        }

        // ENCARGADO: Estadísticas de TODOS los equipos (como Gerencia/Admin)
        else if (role === 'encargado') {
            // QR Hechos de TODOS los equipos en la última semana
            const qrWeek = await Audit.countDocuments({
                status: { $in: validStates },
                createdAt: { $gte: startOfWeek }
            });

            // QR Hechos de TODOS los equipos en el mes actual
            const qrMonth = await Audit.countDocuments({
                status: { $in: validStates },
                createdAt: { $gte: startOfMonth }
            });

            // Total de ventas incompletas de TODOS los equipos
            const incomplete = await Audit.countDocuments({
                status: { $nin: validStates }
            });

            // Contar todos los usuarios activos
            const totalUsers = await User.countDocuments({ active: true });

            stats.stats = {
                qrWeek,
                qrMonth,
                incomplete,
                totalUsers
            };
        }

        // AUDITOR: Estadísticas de auditorías completadas + ventas (como asesor)
        else if (role === 'auditor') {
            // === ESTADÍSTICAS DE AUDITORÍAS ===
            // Auditorías en la última semana
            const auditsWeek = await Audit.countDocuments({
                auditor: userId,
                status: { $in: validStates },
                statusUpdatedAt: { $gte: startOfWeek }
            });

            // Auditorías en el mes actual
            const auditsMonth = await Audit.countDocuments({
                auditor: userId,
                status: { $in: validStates },
                statusUpdatedAt: { $gte: startOfMonth }
            });

            // Auditorías en el mes anterior
            const auditsLastMonth = await Audit.countDocuments({
                auditor: userId,
                status: { $in: validStates },
                statusUpdatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            });

            // Total de auditorías hechas
            const totalAudits = await Audit.countDocuments({
                auditor: userId,
                status: { $in: validStates }
            });

            // === ESTADÍSTICAS DE VENTAS (como asesor) ===
            // QR Hechos en la última semana
            const qrWeek = await Audit.countDocuments({
                asesor: userId,
                status: { $in: validStates },
                createdAt: { $gte: startOfWeek }
            });

            // QR Hechos en el mes actual
            const qrMonth = await Audit.countDocuments({
                asesor: userId,
                status: { $in: validStates },
                createdAt: { $gte: startOfMonth }
            });

            // Total de ventas incompletas
            const incomplete = await Audit.countDocuments({
                asesor: userId,
                status: { $nin: validStates }
            });

            // Máximo de QR en una semana (últimos 3 meses)
            const threeMonthsAgo = new Date(now);
            threeMonthsAgo.setMonth(now.getMonth() - 3);

            const audits = await Audit.find({
                asesor: userId,
                status: { $in: validStates },
                createdAt: { $gte: threeMonthsAgo }
            }).select('createdAt');

            // Agrupar por semana
            const weeklyCount = {};
            audits.forEach(audit => {
                const date = new Date(audit.createdAt);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                const weekKey = weekStart.toISOString().split('T')[0];
                weeklyCount[weekKey] = (weeklyCount[weekKey] || 0) + 1;
            });

            const maxWeek = Math.max(...Object.values(weeklyCount), 0);

            // Máximo de QR en un mes
            const monthlyCount = {};
            audits.forEach(audit => {
                const date = new Date(audit.createdAt);
                const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
                monthlyCount[monthKey] = (monthlyCount[monthKey] || 0) + 1;
            });

            const maxMonth = Math.max(...Object.values(monthlyCount), 0);

            stats.stats = {
                // Estadísticas de auditorías
                auditsWeek,
                auditsMonth,
                auditsLastMonth,
                totalAudits,
                // Estadísticas de ventas
                qrWeek,
                qrMonth,
                maxQrWeek: maxWeek,
                maxQrMonth: maxMonth,
                incomplete
            };
        }

        // ADMIN: Estadísticas de QR generados
        else if (role === 'administrativo') {
            // QR generados en la última semana
            const qrWeek = await Audit.countDocuments({
                administrador: userId,
                status: { $in: validStates },
                statusUpdatedAt: { $gte: startOfWeek }
            });

            // QR generados en el mes actual
            const qrMonth = await Audit.countDocuments({
                administrador: userId,
                status: { $in: validStates },
                statusUpdatedAt: { $gte: startOfMonth }
            });

            // QR generados en el mes anterior
            const qrLastMonth = await Audit.countDocuments({
                administrador: userId,
                status: { $in: validStates },
                statusUpdatedAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
            });

            // Total de QR generados
            const totalQr = await Audit.countDocuments({
                administrador: userId,
                status: { $in: validStates }
            });

            stats.stats = {
                qrWeek,
                qrMonth,
                qrLastMonth,
                totalQr
            };
        }

        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas del empleado:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas del empleado' });
    }
};

/**
 * Obtener fecha de ingreso de un empleado por userId (para Liquidación)
 */
exports.getIngresoByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const employee = await Employee.findOne({ userId }).select('fechaIngreso');

        res.json({ fechaIngreso: employee?.fechaIngreso || null });
    } catch (error) {
        console.error('Error al obtener fecha de ingreso:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};
