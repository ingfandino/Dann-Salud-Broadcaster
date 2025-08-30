// src/routes/sendConfigRoutes.js

const express = require("express");
const router = express.Router();
const { getConfig, updateConfig } = require("../controllers/sendConfigController");

router.get("/", getConfig);
router.put("/", updateConfig);

module.exports = router;