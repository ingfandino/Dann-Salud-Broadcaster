const Expense = require('../models/Expense');
const User = require('../models/User');

/**
 * Obtener todos los gastos (con filtros opcionales)
 */
exports.getAllExpenses = async (req, res) => {
  try {
    const { mes, anio, categoria, search } = req.query;
    
    const filter = { deletedAt: null };
    
    // Filtro por mes y año
    if (mes && anio) {
      const startDate = new Date(anio, mes - 1, 1);
      const endDate = new Date(anio, mes, 0, 23, 59, 59);
      filter.fecha = { $gte: startDate, $lte: endDate };
    } else if (anio) {
      const startDate = new Date(anio, 0, 1);
      const endDate = new Date(anio, 11, 31, 23, 59, 59);
      filter.fecha = { $gte: startDate, $lte: endDate };
    }
    
    // Filtro por categoría
    if (categoria && categoria !== 'Todas') {
      filter.categoria = categoria;
    }
    
    // Búsqueda por texto
    if (search) {
      filter.$or = [
        { descripcion: { $regex: search, $options: 'i' } },
        { notas: { $regex: search, $options: 'i' } }
      ];
    }
    
    const expenses = await Expense.find(filter)
      .populate('responsable', 'nombre email')
      .populate('createdBy', 'nombre email')
      .populate('updatedBy', 'nombre email')
      .sort({ fecha: -1 })
      .lean();
    
    res.json({ ok: true, data: expenses });
  } catch (error) {
    console.error('Error al obtener gastos:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener gastos' });
  }
};

/**
 * Obtener un gasto por ID
 */
exports.getExpenseById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findOne({ _id: id, deletedAt: null })
      .populate('responsable', 'nombre email')
      .populate('createdBy', 'nombre email')
      .populate('updatedBy', 'nombre email')
      .lean();
    
    if (!expense) {
      return res.status(404).json({ ok: false, message: 'Gasto no encontrado' });
    }
    
    res.json({ ok: true, data: expense });
  } catch (error) {
    console.error('Error al obtener gasto:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener gasto' });
  }
};

/**
 * Crear un nuevo gasto
 */
exports.createExpense = async (req, res) => {
  try {
    const { fecha, categoria, descripcion, monto, metodoPago, responsable, notas } = req.body;
    
    // Validaciones
    if (!fecha || !categoria || !descripcion || !monto || !metodoPago || !responsable) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Todos los campos obligatorios deben ser completados' 
      });
    }
    
    if (monto <= 0) {
      return res.status(400).json({ 
        ok: false, 
        message: 'El monto debe ser mayor a 0' 
      });
    }
    
    // Verificar que el responsable existe
    const responsableUser = await User.findById(responsable);
    if (!responsableUser) {
      return res.status(404).json({ ok: false, message: 'Responsable no encontrado' });
    }
    
    const expense = new Expense({
      fecha,
      categoria,
      descripcion,
      monto,
      metodoPago,
      responsable,
      notas,
      createdBy: req.user._id
    });
    
    await expense.save();
    
    const populatedExpense = await Expense.findById(expense._id)
      .populate('responsable', 'nombre email')
      .populate('createdBy', 'nombre email')
      .lean();
    
    res.status(201).json({ 
      ok: true, 
      message: 'Gasto creado exitosamente',
      data: populatedExpense 
    });
  } catch (error) {
    console.error('Error al crear gasto:', error);
    res.status(500).json({ ok: false, message: 'Error al crear gasto' });
  }
};

/**
 * Actualizar un gasto
 */
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, categoria, descripcion, monto, metodoPago, responsable, notas } = req.body;
    
    const expense = await Expense.findOne({ _id: id, deletedAt: null });
    
    if (!expense) {
      return res.status(404).json({ ok: false, message: 'Gasto no encontrado' });
    }
    
    // Validaciones
    if (monto && monto <= 0) {
      return res.status(400).json({ 
        ok: false, 
        message: 'El monto debe ser mayor a 0' 
      });
    }
    
    // Verificar que el responsable existe si se está actualizando
    if (responsable) {
      const responsableUser = await User.findById(responsable);
      if (!responsableUser) {
        return res.status(404).json({ ok: false, message: 'Responsable no encontrado' });
      }
    }
    
    // Actualizar campos
    if (fecha) expense.fecha = fecha;
    if (categoria) expense.categoria = categoria;
    if (descripcion) expense.descripcion = descripcion;
    if (monto) expense.monto = monto;
    if (metodoPago) expense.metodoPago = metodoPago;
    if (responsable) expense.responsable = responsable;
    if (notas !== undefined) expense.notas = notas;
    expense.updatedBy = req.user._id;
    
    await expense.save();
    
    const updatedExpense = await Expense.findById(expense._id)
      .populate('responsable', 'nombre email')
      .populate('createdBy', 'nombre email')
      .populate('updatedBy', 'nombre email')
      .lean();
    
    res.json({ 
      ok: true, 
      message: 'Gasto actualizado exitosamente',
      data: updatedExpense 
    });
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    res.status(500).json({ ok: false, message: 'Error al actualizar gasto' });
  }
};

/**
 * Eliminar un gasto (soft delete)
 */
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    const expense = await Expense.findOne({ _id: id, deletedAt: null });
    
    if (!expense) {
      return res.status(404).json({ ok: false, message: 'Gasto no encontrado' });
    }
    
    expense.deletedAt = new Date();
    expense.updatedBy = req.user._id;
    await expense.save();
    
    res.json({ ok: true, message: 'Gasto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    res.status(500).json({ ok: false, message: 'Error al eliminar gasto' });
  }
};

/**
 * Obtener estadísticas de gastos
 */
exports.getExpenseStats = async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Mes actual
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    // Mes anterior
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
    
    // Trimestre actual
    const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
    const startOfQuarter = new Date(currentYear, quarterStartMonth, 1);
    const endOfQuarter = new Date(currentYear, quarterStartMonth + 3, 0, 23, 59, 59);
    
    // Gasto total del mes
    const currentMonthExpenses = await Expense.aggregate([
      {
        $match: {
          fecha: { $gte: startOfMonth, $lte: endOfMonth },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Gasto total del mes anterior
    const lastMonthExpenses = await Expense.aggregate([
      {
        $match: {
          fecha: { $gte: startOfLastMonth, $lte: endOfLastMonth },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' }
        }
      }
    ]);
    
    // Gasto total del trimestre
    const quarterExpenses = await Expense.aggregate([
      {
        $match: {
          fecha: { $gte: startOfQuarter, $lte: endOfQuarter },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$monto' }
        }
      }
    ]);
    
    // Gastos por categoría (mes actual)
    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          fecha: { $gte: startOfMonth, $lte: endOfMonth },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: '$categoria',
          total: { $sum: '$monto' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { total: -1 }
      }
    ]);
    
    // Gastos mensuales (últimos 6 meses)
    const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1);
    const monthlyExpenses = await Expense.aggregate([
      {
        $match: {
          fecha: { $gte: sixMonthsAgo, $lte: endOfMonth },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$fecha' },
            month: { $month: '$fecha' }
          },
          total: { $sum: '$monto' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);
    
    const currentMonthTotal = currentMonthExpenses[0]?.total || 0;
    const lastMonthTotal = lastMonthExpenses[0]?.total || 0;
    const variation = lastMonthTotal > 0 
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;
    
    res.json({
      ok: true,
      data: {
        currentMonth: {
          total: currentMonthTotal,
          count: currentMonthExpenses[0]?.count || 0
        },
        lastMonth: {
          total: lastMonthTotal
        },
        quarter: {
          total: quarterExpenses[0]?.total || 0
        },
        variation: Math.round(variation * 100) / 100,
        byCategory: expensesByCategory,
        monthlyTrend: monthlyExpenses
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ ok: false, message: 'Error al obtener estadísticas' });
  }
};
