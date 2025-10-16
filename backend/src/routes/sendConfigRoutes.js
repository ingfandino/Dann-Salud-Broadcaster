// backend/src/routes/sendConfigRoutes.js

const express = require("express");
const router = express.Router();
const sendConfigController = require("../controllers/sendConfigController");

router.get("/", sendConfigController.getConfig);
router.put("/", sendConfigController.updateConfig);

module.exports = router;