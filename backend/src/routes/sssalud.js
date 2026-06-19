const express = require("express");
const router  = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit }      = require("../middlewares/roleMiddleware");
const ctrl            = require("../controllers/sssaludController");

router.use(requireAuth);

// GET  /api/sssalud/solver-status — verifica que el solver Python esté activo
router.get("/solver-status", permit("gerencia", "desarrollador"), ctrl.getSolverStatus);

// POST /api/sssalud/check-cuil — consulta individual
router.post("/check-cuil", permit("gerencia", "desarrollador"), ctrl.checkCuil);

// POST /api/sssalud/check-batch — consulta en lote (máx 100 CUILs por llamada)
router.post("/check-batch", permit("gerencia", "desarrollador"), ctrl.checkBatch);

module.exports = router;
