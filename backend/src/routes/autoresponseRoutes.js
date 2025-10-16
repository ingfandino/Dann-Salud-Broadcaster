// backend/src/routes/autoresponseRoutes.js

const express = require("express");
const router = express.Router();
const { validationResult } = require("express-validator");
const { createAutoresponseValidator, updateAutoresponseValidator } = require("../validators/autoresponseValidator");
const autoresponseController = require("../controllers/autoresponseController");

// CRUD
router.post("/", createAutoresponseValidator, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return autoresponseController.createAutoresponse(req, res, next);
});

router.get("/", autoresponseController.getAutoresponses);
router.get("/:id", autoresponseController.getAutoresponseById);
router.get("/settings/env", (req, res) => {
  const minutes = Number(process.env.AUTORESPONSE_WINDOW_MINUTES || 30);
  res.json({ windowMinutes: minutes });
});
router.put("/:id", updateAutoresponseValidator, (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return autoresponseController.updateAutoresponse(req, res, next);
});

router.delete("/:id", autoresponseController.deleteAutoresponse);

module.exports = router;