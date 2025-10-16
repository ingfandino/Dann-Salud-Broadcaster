const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { permit } = require('../middlewares/roleMiddleware');
const recovery = require('../controllers/recoveryController');

// Roles permitidos: admin, auditor, revendedor
router.use(requireAuth, permit('admin', 'auditor', 'revendedor'));

router.get('/', recovery.list);
router.post('/', recovery.create);

module.exports = router;

