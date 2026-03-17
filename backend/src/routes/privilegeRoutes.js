/**
 * ============================================================
 * RUTAS DE PRIVILEGIOS (privilegeRoutes.js)
 * ============================================================
 * Gestión del sistema dinámico de permisos por rol.
 * Accesible para: gerencia, desarrollador.
 */

const express = require("express");
const router  = express.Router();
const { permit } = require("../middlewares/roleMiddleware");
const ctrl = require("../controllers/privilegeController");

/** Solo gerencia y desarrollador pueden gestionar privilegios */
const requirePrivilegeAccess = permit("gerencia", "desarrollador");

/** Estructura de plataforma (módulos e interfaces) */
router.get("/structure",  requirePrivilegeAccess, ctrl.getPlatformStructure);

/** Permisos del usuario autenticado (cualquier rol puede consultar los suyos) */
router.get("/my-permissions", ctrl.getMyPermissions);

/** Permisos de un rol específico */
router.get("/role/:role",  requirePrivilegeAccess, ctrl.getPermissionsByRole);

/** Crear/actualizar permisos */
router.post("/",           requirePrivilegeAccess, ctrl.upsertPermission);

/** Historial de auditoría */
router.get("/audit-log",   requirePrivilegeAccess, ctrl.getAuditLog);

/** Estado y gestión de caché */
router.get("/cache/status", requirePrivilegeAccess, ctrl.getCacheStatus);
router.post("/cache/flush", requirePrivilegeAccess, ctrl.flushCache);

module.exports = router;
