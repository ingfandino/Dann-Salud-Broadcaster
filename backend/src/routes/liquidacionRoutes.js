const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { permit } = require('../middlewares/roleMiddleware');
const liquidacion = require('../controllers/liquidacionController');

// Roles permitidos: admin, auditor, revendedor, gerencia, supervisor
router.use(requireAuth, permit('admin', 'auditor', 'revendedor', 'gerencia', 'supervisor'));

router.get('/', liquidacion.list);

module.exports = router;
