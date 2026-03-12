/**
 * ============================================================
 * CONTROLADOR DE BAJAS/SEPARACIONES (employeeSeparationController)
 * ============================================================
 * Gestiona los eventos de baja de empleados y sus liquidaciones.
 * Solo accesible para usuarios con rol Gerencia.
 */

const EmployeeSeparation = require('../models/EmployeeSeparation');
const Employee = require('../models/Employee');
const Audit = require('../models/Audit');

/**
 * Listar bajas/liquidaciones — consulta dinámica en tiempo real.
 * Fuente de verdad: colección Employee (no snapshots).
 * EmployeeSeparation se usa SOLO para estado de pago.
 * Ventana: mes actual completo + primera semana del mes siguiente.
 */
exports.listSeparations = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed

        // Ventana dinámica: mes actual completo + primera semana del mes siguiente
        const rangeStart = new Date(year, month, 1);
        const rangeEnd = new Date(year, month + 1, 7, 23, 59, 59, 999);

        console.log(`[SEPARATIONS] Consulta dinámica: ${rangeStart.toISOString()} → ${rangeEnd.toISOString()}`);

        // Pipeline sobre Employee (fuente de verdad en tiempo real)
        const employees = await Employee.aggregate([
            // 1. Empleados inactivos con fechaBaja REAL en la ventana dinámica
            {
                $match: {
                    activo: false,
                    fechaBaja: { $gte: rangeStart, $lte: rangeEnd }
                }
            },

            // Preservar _id original del empleado
            { $addFields: { _employeeOid: '$_id' } },

            // 2. Ordenar por fecha de baja descendente
            { $sort: { fechaBaja: -1 } },

            // 3. Lookup User para email/role
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    pipeline: [{ $project: { nombre: 1, email: 1, role: 1, numeroEquipo: 1 } }],
                    as: '_user'
                }
            },
            { $unwind: { path: '$_user', preserveNullAndEmptyArrays: true } },

            // 4. Lookup EmployeeSeparation SOLO para datos de pago (el más reciente)
            {
                $lookup: {
                    from: 'employeeseparations',
                    localField: '_id',
                    foreignField: 'employeeId',
                    pipeline: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 1 },
                        {
                            $project: {
                                _id: 1,
                                liquidacionPagada: 1,
                                fechaPagoLiquidacion: 1,
                                pagadaPor: 1
                            }
                        }
                    ],
                    as: '_separation'
                }
            },
            { $unwind: { path: '$_separation', preserveNullAndEmptyArrays: true } },

            // 5. Lookup pagadaPor user
            {
                $lookup: {
                    from: 'users',
                    localField: '_separation.pagadaPor',
                    foreignField: '_id',
                    pipeline: [{ $project: { nombre: 1 } }],
                    as: '_pagadaPor'
                }
            },
            { $unwind: { path: '$_pagadaPor', preserveNullAndEmptyArrays: true } },

            // 6. Proyección final — misma forma que antes para compatibilidad frontend
            {
                $project: {
                    _id: { $ifNull: ['$_separation._id', '$_employeeOid'] },
                    _employeeOid: 1,
                    employeeId: {
                        _id: '$_employeeOid',
                        nombreCompleto: '$nombreCompleto',
                        cargo: '$cargo',
                        numeroEquipo: '$numeroEquipo'
                    },
                    userId: '$_user',
                    nombreEmpleado: '$nombreCompleto',
                    cargo: '$cargo',
                    numeroEquipo: '$numeroEquipo',
                    fechaInicio: { $ifNull: ['$fechaReingreso', '$fechaIngreso'] },
                    fechaBaja: 1,
                    motivoBaja: { $ifNull: ['$motivoBaja', ''] },
                    motivoBajaNormalizado: 1,
                    liquidacionPagada: { $ifNull: ['$_separation.liquidacionPagada', false] },
                    fechaPagoLiquidacion: { $ifNull: ['$_separation.fechaPagoLiquidacion', null] },
                    pagadaPor: '$_pagadaPor',
                    createdAt: 1,
                    _userIdRef: '$userId'
                }
            }
        ]);

        // Calcular métricas QR en tiempo real para cada empleado
        const results = await Promise.all(employees.map(async (emp) => {
            const { ventasHistorico, ventasMesBaja } = await calculateSalesMetrics(
                emp._userIdRef,
                emp.fechaBaja
            );

            return {
                _id: emp._id,
                employeeId: emp.employeeId,
                userId: emp.userId,
                nombreEmpleado: emp.nombreEmpleado,
                cargo: emp.cargo,
                numeroEquipo: emp.numeroEquipo,
                fechaInicio: emp.fechaInicio,
                fechaBaja: emp.fechaBaja,
                motivoBaja: emp.motivoBaja,
                motivoBajaNormalizado: emp.motivoBajaNormalizado || null,
                correspondeLiquidacion:
                    emp.motivoBajaNormalizado === 'Despido por bajo rendimiento' ? 'Sí' : 'No',
                ventasQRHistorico: ventasHistorico,
                ventasQRMesBaja: ventasMesBaja,
                liquidacionPagada: emp.liquidacionPagada,
                fechaPagoLiquidacion: emp.fechaPagoLiquidacion,
                pagadaPor: emp.pagadaPor || null,
                createdAt: emp.createdAt
            };
        }));

        // Separar en pendientes y pagadas
        const pendientes = results.filter(s => !s.liquidacionPagada);
        const pagadas = results.filter(s => s.liquidacionPagada);

        console.log(`[SEPARATIONS] Resultado dinámico: ${results.length} total (${pendientes.length} pendientes, ${pagadas.length} pagadas)`);

        res.json({
            success: true,
            data: {
                pendientes,
                pagadas,
                total: results.length,
                mesActual: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
            }
        });
    } catch (error) {
        console.error('[SEPARATIONS] Error listing separations:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener bajas y liquidaciones'
        });
    }
};

/**
 * Marcar una liquidación como pagada
 * Acepta tanto EmployeeSeparation ID como Employee ID (fallback)
 */
exports.markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;

        // Intentar encontrar por EmployeeSeparation ID primero
        let separation = await EmployeeSeparation.findById(id);

        // Fallback: buscar por employeeId (cuando el _id devuelto era el del Employee)
        if (!separation) {
            separation = await EmployeeSeparation.findOne({ employeeId: id }).sort({ createdAt: -1 });
        }

        if (!separation) {
            return res.status(404).json({
                success: false,
                message: 'Registro de baja no encontrado'
            });
        }

        if (separation.liquidacionPagada) {
            return res.status(400).json({
                success: false,
                message: 'Esta liquidación ya fue marcada como pagada'
            });
        }

        separation.liquidacionPagada = true;
        separation.fechaPagoLiquidacion = new Date();
        separation.pagadaPor = req.user._id;

        await separation.save();

        // Populate para retornar datos completos
        await separation.populate('pagadaPor', 'nombre');

        console.log(`[SEPARATIONS] Liquidación marcada como pagada: ${separation.nombreEmpleado} - por ${req.user.nombre}`);

        res.json({
            success: true,
            message: 'Liquidación marcada como pagada',
            data: separation
        });
    } catch (error) {
        console.error('[SEPARATIONS] Error marking as paid:', error);
        res.status(500).json({
            success: false,
            message: 'Error al marcar liquidación como pagada'
        });
    }
};

/**
 * Crear un registro de separación (uso interno)
 * Se llama desde employeeController cuando se da de baja a un empleado
 * 
 * @param {Object} employee - Documento del empleado
 * @param {ObjectId} createdBy - ID del usuario que realiza la baja
 * @param {String} motivoBaja - Motivo de la baja
 * @param {Date} fechaBaja - Fecha de la baja
 */
exports.createSeparation = async (employee, createdBy, motivoBaja, fechaBaja) => {
    try {
        // Obtener el empleado completo para asegurar que tenemos todos los campos
        const fullEmployee = await Employee.findById(employee._id);

        if (!fullEmployee) {
            throw new Error(`Empleado no encontrado: ${employee._id}`);
        }

        // ⚠️ GUARD: deactivateEmployee DEBE haber persistido fechaBaja ANTES de llamar aquí.
        // Si este error salta, alguien reordenó el flujo en deactivateEmployee.
        if (!fullEmployee.fechaBaja) {
            throw new Error(
                `[SEPARATIONS] ERROR DE ORDEN: fullEmployee.fechaBaja es null/undefined para ${fullEmployee.nombreCompleto} (${employee._id}). ` +
                `deactivateEmployee debe hacer save() ANTES de llamar a createSeparation().`
            );
        }

        // Determinar fecha de inicio del período
        // Si tiene fechaReingreso, usar esa; si no, usar fechaIngreso original
        let fechaInicio = fullEmployee.fechaReingreso || fullEmployee.fechaIngreso;

        // DEBUG: Mostrar valores disponibles
        console.log('[SEPARATIONS] Datos del empleado para separación:');
        console.log(`  - fechaIngreso: ${fullEmployee.fechaIngreso}`);
        console.log(`  - fechaReingreso: ${fullEmployee.fechaReingreso}`);
        console.log(`  - fechaInicio seleccionada: ${fechaInicio}`);

        // Normalizar fechas a solo DATE (DD/MM/YYYY sin timestamp)
        // Usamos 12:00 UTC para evitar problemas de zona horaria (off-by-one day)
        // IMPORTANTE: Usar métodos getUTC* para preservar la fecha original
        const normalizeToDate = (date) => {
            if (!date) return null;
            const d = new Date(date);
            // Usar getUTCFullYear, getUTCMonth, getUTCDate para preservar la fecha
            return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
        };

        const fechaInicioNormalized = normalizeToDate(fechaInicio);
        const fechaBajaNormalized = normalizeToDate(fechaBaja);

        // Calcular métricas de ventas "QR hecho"
        const { ventasHistorico, ventasMesBaja } = await calculateSalesMetrics(
            fullEmployee.userId,
            fechaBaja
        );

        // Crear el registro de separación
        const separation = new EmployeeSeparation({
            employeeId: fullEmployee._id,
            userId: fullEmployee.userId,
            nombreEmpleado: fullEmployee.nombreCompleto,
            cargo: fullEmployee.cargo,
            numeroEquipo: fullEmployee.numeroEquipo,
            fechaInicio: fechaInicioNormalized,
            fechaBaja: fechaBajaNormalized,
            motivoBaja: motivoBaja || '',
            motivoBajaNormalizado: fullEmployee.motivoBajaNormalizado || null,
            ventasQRHistorico: ventasHistorico,
            ventasQRMesBaja: ventasMesBaja,
            liquidacionPagada: false,
            createdBy: createdBy
        });

        await separation.save();

        console.log(`[SEPARATIONS] Registro de baja creado para: ${fullEmployee.nombreCompleto}`);
        console.log(`  - Período: ${fechaInicioNormalized?.toLocaleDateString('es-AR')} → ${fechaBajaNormalized?.toLocaleDateString('es-AR')}`);
        console.log(`  - Ventas QR histórico: ${ventasHistorico}`);
        console.log(`  - Ventas QR mes baja: ${ventasMesBaja}`);

        return separation;
    } catch (error) {
        console.error('[SEPARATIONS] Error creating separation record:', error);
        throw error;
    }
};

/**
 * Calcula las métricas de ventas "QR hecho" para un usuario
 * 
 * @param {ObjectId} userId - ID del usuario (asesor)
 * @param {Date} fechaBaja - Fecha de la baja
 * @returns {Object} { ventasHistorico, ventasMesBaja }
 */
async function calculateSalesMetrics(userId, fechaBaja) {
    try {
        // Total histórico de ventas "QR hecho" donde el usuario es el asesor
        const ventasHistorico = await Audit.countDocuments({
            asesor: userId,
            status: 'QR hecho'
        });

        // Ventas "QR hecho" del mes de la baja
        const startOfMonth = new Date(fechaBaja.getFullYear(), fechaBaja.getMonth(), 1);
        const endOfMonth = new Date(fechaBaja.getFullYear(), fechaBaja.getMonth() + 1, 0, 23, 59, 59, 999);

        const ventasMesBaja = await Audit.countDocuments({
            asesor: userId,
            status: 'QR hecho',
            $or: [
                // Fecha de creación del QR en el mes de baja
                {
                    fechaCreacionQR: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                },
                // O scheduledAt en el mes de baja (para compatibilidad)
                {
                    fechaCreacionQR: null,
                    scheduledAt: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                }
            ]
        });

        return { ventasHistorico, ventasMesBaja };
    } catch (error) {
        console.error('[SEPARATIONS] Error calculating sales metrics:', error);
        return { ventasHistorico: 0, ventasMesBaja: 0 };
    }
}

/**
 * Actualizar motivoBajaNormalizado de una separación (y su empleado vinculado)
 * Acepta tanto EmployeeSeparation ID como Employee ID (fallback)
 * Solo Gerencia puede usar este endpoint
 */
exports.updateMotivoBaja = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivoBajaNormalizado } = req.body;

        const validValues = [
            null,
            'Renuncia',
            'Despido por bajo rendimiento',
            'Despido por inasistencias'
        ];

        if (!validValues.includes(motivoBajaNormalizado)) {
            return res.status(400).json({
                success: false,
                message: `Valor inválido. Valores permitidos: ${validValues.filter(Boolean).join(', ')}`
            });
        }

        // Intentar encontrar EmployeeSeparation primero
        let separation = await EmployeeSeparation.findById(id);
        let employeeId;

        if (separation) {
            // Actualizar separación
            separation.motivoBajaNormalizado = motivoBajaNormalizado;
            await separation.save();
            employeeId = separation.employeeId;
        } else {
            // Fallback: el ID puede ser un Employee ID
            employeeId = id;
        }

        // Siempre actualizar Employee (fuente de verdad para la vista)
        const employee = await Employee.findByIdAndUpdate(
            employeeId,
            { motivoBajaNormalizado },
            { new: true }
        );

        if (!employee && !separation) {
            return res.status(404).json({
                success: false,
                message: 'Registro de baja no encontrado'
            });
        }

        // Recalcular correspondeLiquidacion
        const correspondeLiquidacion =
            motivoBajaNormalizado === 'Despido por bajo rendimiento' ? 'Sí' : 'No';

        const nombre = employee?.nombreCompleto || separation?.nombreEmpleado || 'Desconocido';
        console.log(`[SEPARATIONS] motivoBajaNormalizado actualizado: ${nombre} → ${motivoBajaNormalizado}`);

        res.json({
            success: true,
            message: 'Motivo de baja actualizado',
            data: { motivoBajaNormalizado, correspondeLiquidacion }
        });
    } catch (error) {
        console.error('[SEPARATIONS] Error updating motivoBaja:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar motivo de baja'
        });
    }
};

/**
 * Obtener separación por ID
 */
exports.getSeparationById = async (req, res) => {
    try {
        const { id } = req.params;

        const separation = await EmployeeSeparation.findById(id)
            .populate('employeeId', 'nombreCompleto cargo numeroEquipo')
            .populate('userId', 'nombre email role')
            .populate('pagadaPor', 'nombre')
            .populate('createdBy', 'nombre');

        if (!separation) {
            return res.status(404).json({
                success: false,
                message: 'Registro de baja no encontrado'
            });
        }

        res.json({ success: true, data: separation });
    } catch (error) {
        console.error('[SEPARATIONS] Error getting separation:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener registro de baja'
        });
    }
};
