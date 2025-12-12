const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignmentController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

// Rutas Supervisor/Gerencia
router.post(
    "/distribute",
    requireAuth,
    permit("supervisor", "gerencia"),
    assignmentController.distribute
);

// Rutas Asesor (y Supervisor/Gerencia para ver sus propios leads si quisieran)
router.get(
    "/my-leads",
    requireAuth,
    permit("asesor", "supervisor", "gerencia"),
    assignmentController.getMyLeads
);

router.get(
    "/my-leads/export",
    requireAuth,
    permit("asesor", "supervisor", "gerencia"),
    assignmentController.exportMyLeads
);

router.patch(
    "/:id/status",
    requireAuth,
    permit("asesor", "supervisor", "gerencia"),
    assignmentController.updateStatus
);

router.post(
    "/:id/interaction",
    requireAuth,
    permit("asesor", "supervisor", "gerencia"),
    assignmentController.logInteraction
);

router.post(
    "/:id/whatsapp",
    requireAuth,
    permit("asesor", "supervisor", "gerencia"),
    assignmentController.sendWhatsApp
);

router.post(
    "/:id/reschedule",
    requireAuth,
    permit("asesor", "supervisor", "gerencia"),
    assignmentController.reschedule
);

router.post(
    "/recycle",
    requireAuth,
    permit("gerencia"),
    assignmentController.recycle
);

module.exports = router;
