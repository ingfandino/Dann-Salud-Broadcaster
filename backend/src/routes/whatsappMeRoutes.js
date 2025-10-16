// backend/src/routes/whatsappMeRoutes.js

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/whatsappMeController");

// Todas requieren auth por estar montadas tras requireAuth en routes/index.js
router.get("/status", ctrl.getStatus);
router.get("/qr", ctrl.getQR);
router.post("/relink", ctrl.relink);
router.post("/logout", ctrl.logout);

module.exports = router;
