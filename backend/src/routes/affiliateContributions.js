const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");
const ctrl = require("../controllers/affiliateContributionController");

router.use(requireAuth);

// POST /api/affiliate-contributions/run — disparo manual (solo Gerencia)
router.post("/run", permit("gerencia"), ctrl.runVerification);

// GET /api/affiliate-contributions/stats — resumen de estados (solo Gerencia)
router.get("/stats", permit("gerencia"), ctrl.getStats);

module.exports = router;
