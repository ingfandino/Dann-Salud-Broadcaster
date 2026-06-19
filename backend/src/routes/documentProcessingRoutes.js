const express = require("express");
const router = express.Router();
const { permit } = require("../middlewares/roleMiddleware");
const documentProcessingConfigController = require("../controllers/documentProcessingConfigController");

const requireConfigAccess = permit("gerencia", "desarrollador");

router.get("/config", requireConfigAccess, documentProcessingConfigController.getConfig);
router.put("/config", requireConfigAccess, documentProcessingConfigController.updateConfig);

module.exports = router;
