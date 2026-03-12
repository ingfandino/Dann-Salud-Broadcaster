const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Middleware de autenticación
router.use(requireAuth);

// Middleware de verificación de rol
router.use((req, res, next) => {
  const userRole = req.user?.role?.toLowerCase();
  if (userRole !== 'gerencia' && userRole !== 'encargado') {
    return res.status(403).json({ error: 'Acceso denegado. Solo Gerencia y Encargado pueden acceder.' });
  }
  next();
});

// Rutas de gastos
router.get('/', expenseController.getAllExpenses);
router.get('/stats', expenseController.getExpenseStats);
router.get('/:id', expenseController.getExpenseById);
router.post('/', expenseController.createExpense);
router.put('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
