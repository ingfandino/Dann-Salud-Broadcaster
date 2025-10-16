// backend/src/routes/reportRoutes.js

const express = require("express");
const { getReports, createReport } = require("../controllers/reportsController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

// 🔒 proteger rutas, solo usuarios autenticados
router.get("/", requireAuth, getReports);
router.post("/", requireAuth, createReport);

module.exports = router;