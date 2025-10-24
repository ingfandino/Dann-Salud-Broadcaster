// backend/src/routes/reportRoutes.js

const express = require("express");
const { getReports, createReport } = require("../controllers/reportsController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

const router = express.Router();

// 🔒 proteger rutas, solo usuarios autenticados
router.get("/", requireAuth, permit("gerencia"), getReports);
router.post("/", requireAuth, permit("gerencia"), createReport);

module.exports = router;