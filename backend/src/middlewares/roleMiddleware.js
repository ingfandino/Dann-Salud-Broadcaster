/**
 * ============================================================
 * MIDDLEWARE DE ROLES (roleMiddleware.js)
 * ============================================================
 * Control de acceso basado en roles de usuario.
 * Incluye helpers para filtrar por equipo/supervisor.
 */

const User = require("../models/User");
const logger = require("../utils/logger");

/** Permite acceso solo si el rol del usuario está en la lista.
 *  El rol 'desarrollador' siempre pasa, independientemente de la lista. */
exports.permit = (...roles) => {
    const allowed = roles.map(r => (r || '').toLowerCase());
    return (req, res, next) => {
        if (!req.user) {
            logger.warn(`[PERMIT] No autenticado - ${req.method} ${req.path}`);
            return res.status(401).json({ error: "No autenticado" });
        }
        const role = (req.user.role || '').toLowerCase();
        // Desarrollador bypasses ALL role checks
        if (role === 'desarrollador') {
            return next();
        }
        if (!allowed.includes(role)) {
            logger.warn(`[PERMIT] Acceso denegado - Usuario: ${req.user.email}, Rol: "${role}", Roles permitidos: [${allowed.join(', ')}], Ruta: ${req.method} ${req.path}`);
            return res.status(403).json({ error: "No autorizado" });
        }
        logger.info(`[PERMIT] Acceso permitido - Usuario: ${req.user.email}, Rol: "${role}", Ruta: ${req.method} ${req.path}`);
        next();
    };
};

/**
 * Middleware de permisos dinámicos.
 * Valida que el rol del usuario tenga el permiso requerido para una interfaz.
 * 
 * Roles que siempre pasan: desarrollador, gerencia.
 * Para el resto, consulta RolePermission en BD (con caché).
 *
 * @param {string} interfaceId - ID de la interfaz (ej: "auditorias-seguimiento")
 * @param {string} permissionType - "acceder" | "ver" | "editar" | "eliminar"
 */
exports.requirePermission = (interfaceId, permissionType = "acceder") => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "No autenticado" });
            }

            const role = (req.user.role || '').toLowerCase();

            // Desarrollador y gerencia siempre tienen acceso total
            if (role === 'desarrollador' || role === 'gerencia') {
                return next();
            }

            const { getFromCache, setInCache } = require("../utils/permissionCache");
            const RolePermission = require("../models/RolePermission");

            // Intentar desde caché
            let rolePerms = getFromCache(req.user.role);
            if (!rolePerms) {
                rolePerms = await RolePermission.find({ role: req.user.role }).lean();
                setInCache(req.user.role, rolePerms);
            }

            const record = rolePerms.find(p => p.interfaceId === interfaceId);

            if (!record || !record.permissions || !record.permissions[permissionType]) {
                logger.warn(`[PERMISSION] Denegado - Usuario: ${req.user.email}, Rol: "${req.user.role}", interfaz: "${interfaceId}", permiso: "${permissionType}"`);
                return res.status(403).json({
                    error: "Acceso denegado",
                    code: "INSUFFICIENT_PERMISSIONS",
                    message: `No tienes permiso '${permissionType}' para '${interfaceId}'`,
                });
            }

            next();
        } catch (err) {
            // En caso de fallo al resolver permisos: denegar por defecto
            logger.error(`[PERMISSION] Error resolviendo permisos: ${err.message}`);
            return res.status(403).json({ error: "Acceso denegado", code: "PERMISSION_RESOLUTION_ERROR" });
        }
    };
};

// Devuelve IDs de usuarios supervisados por un supervisor
async function getTeamUserIds(supervisorId) {
    const users = await User.find({ supervisor: supervisorId }).select("_id");
    return users.map(u => u._id);
}
exports.getTeamUserIds = getTeamUserIds;

// Construye filtro por rol para createdBy (u otro campo)
exports.buildOwnerFilter = async (req, ownerField = "createdBy") => {
    const role = req.user.role;
    // Encargado tiene acceso transversal igual que gerencia (pero sin poder borrar)
    if (role === "administrativo" || role === "gerencia" || role === "encargado") return {}; // sin restricción

    if (role === "supervisor") {
        const team = await getTeamUserIds(req.user._id);
        return { [ownerField]: { $in: team } };
    }

    // asesor → solo sus propios recursos
    return { [ownerField]: req.user._id };
};