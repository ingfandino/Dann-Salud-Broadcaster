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
 * Listar separaciones/bajas del mes actual
 * Retorna tanto pendientes como pagadas del mes en curso
 */
exports.listSeparations = async (req, res) => {
    try {
        // Obtener inicio y fin del mes actual
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Buscar todas las separaciones del mes actual
        const separations = await EmployeeSeparation.find({
            fechaBaja: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        })
            .populate('employeeId', 'nombreCompleto cargo numeroEquipo')
            .populate('userId', 'nombre email role numeroEquipo')
            .populate('pagadaPor', 'nombre')
            .populate('createdBy', 'nombre')
            .sort({ fechaBaja: -1 });

        // Agregar campo calculado correspondeLiquidacion a cada registro
        const separationsWithCalc = separations.map(s => {
            const obj = s.toObject();
            obj.correspondeLiquidacion =
                obj.motivoBajaNormalizado === 'Despido por bajo rendimiento'
                    ? 'Sí'
                    : 'No';
            return obj;
        });

        // Separar en pendientes y pagadas
        const pendientes = separationsWithCalc.filter(s => !s.liquidacionPagada);
        const pagadas = separationsWithCalc.filter(s => s.liquidacionPagada);

        res.json({
            success: true,
            data: {
                pendientes,
                pagadas,
                total: separationsWithCalc.length,
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
 */
exports.markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;

        const separation = await EmployeeSeparation.findById(id);

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

        const separation = await EmployeeSeparation.findById(id);
        if (!separation) {
            return res.status(404).json({
                success: false,
                message: 'Registro de baja no encontrado'
            });
        }

        // Actualizar separación
        separation.motivoBajaNormalizado = motivoBajaNormalizado;
        await separation.save();

        // Sincronizar con el empleado vinculado
        if (separation.employeeId) {
            await Employee.findByIdAndUpdate(separation.employeeId, { motivoBajaNormalizado });
        }

        // Recalcular correspondeLiquidacion
        const correspondeLiquidacion =
            motivoBajaNormalizado === 'Despido por bajo rendimiento' ? 'Sí' : 'No';

        console.log(`[SEPARATIONS] motivoBajaNormalizado actualizado: ${separation.nombreEmpleado} → ${motivoBajaNormalizado}`);

        res.json({
            success: true,
            message: 'Motivo de baja actualizado',
            data: { ...separation.toObject(), correspondeLiquidacion }
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
