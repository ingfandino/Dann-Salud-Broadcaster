const express = require("express");
const router = express.Router();
const autoresponseController = require("../controllers/autoresponseController");
const {
    createAutoresponseValidator,
    updateAutoresponseValidator,
} = require("../validators/autoresponseValidator");
const validateRequest = require("../middlewares/validateRequest");

// CRUD
router.post(
    "/",
    createAutoresponseValidator,
    validateRequest,
    autoresponseController.createAutoresponse
);

router.get("/", autoresponseController.getAutoresponses);
router.get("/:id", autoresponseController.getAutoresponseById);

router.put(
    "/:id",
    updateAutoresponseValidator,
    validateRequest,
    autoresponseController.updateAutoresponse
);

router.delete("/:id", autoresponseController.deleteAutoresponse);

module.exports = router;
