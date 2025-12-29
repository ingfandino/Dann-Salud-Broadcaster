/**
 * ============================================================
 * RUTAS DE ASIGNACIONES (assignments.js)
 * ============================================================
 * Gestión de asignación de leads a asesores ("Datos del día").
 * Distribución, seguimiento y reasignación de contactos.
 */

const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignmentController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

/* ========== RUTAS SUPERVISOR/GERENCIA ========== */
router.post(
    "/distribute",
    requireAuth,
    permit("supervisor", "gerencia"),
    assignmentController.distribute
);

// Rutas Asesor/Auditor (y Supervisor/Gerencia para ver sus propios leads si quisieran)
router.get(
    "/my-leads",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.getMyLeads
);

router.get(
    "/my-leads/export",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.exportMyLeads
);

router.patch(
    "/:id/status",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.updateStatus
);

router.post(
    "/:id/interaction",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.logInteraction
);

router.post(
    "/:id/whatsapp",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.sendWhatsApp
);

router.post(
    "/:id/reschedule",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.reschedule
);

// ✅ Reasignar a supervisor
router.post(
    "/:id/reassign",
    requireAuth,
    permit("asesor", "supervisor", "gerencia", "auditor"),
    assignmentController.reassign
);

router.post(
    "/recycle",
    requireAuth,
    permit("gerencia"),
    assignmentController.recycle
);

module.exports = router;
