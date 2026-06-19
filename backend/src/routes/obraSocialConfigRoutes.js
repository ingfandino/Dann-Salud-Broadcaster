const express = require("express");
const router = express.Router();
const controller = require("../controllers/obraSocialConfigController");

router.get("/portal-enabled", controller.listPortalEnabledConfigs);
router.get("/", controller.listConfigs);
router.get("/:id", controller.getConfig);
router.post("/", controller.createConfig);
router.put("/:id", controller.updateConfig);

module.exports = router;
