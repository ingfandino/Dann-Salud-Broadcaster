const express = require("express");
const multer = require("multer");
const router = express.Router();
const controller = require("../controllers/documentProcessingCaseController");

const upload = multer({ storage: multer.memoryStorage() });

router.get("/cases", controller.listCases);
router.get("/cases/:id", controller.getCaseById);
router.post("/cases/from-audit/:auditId", controller.createFromAudit);
router.put("/cases/:id/inputs", controller.updateInputs);
router.post("/cases/:id/process", controller.triggerProcessing);
router.post("/cases/:id/approve-for-obra-social", controller.approveForObraSocial);
router.post("/cases/:id/qr", upload.single("qrPdf"), controller.uploadFinalQr);
router.get("/cases/:id/final-qr", controller.downloadFinalQr);

router.get("/obra-social/cases", controller.listObraSocialCases);
router.get("/obra-social/cases/:id", controller.getObraSocialCaseById);
router.post("/obra-social/cases/:id/review", controller.obraSocialReview);
router.get("/obra-social/cases/:id/final-qr", controller.downloadFinalQr);

module.exports = router;
