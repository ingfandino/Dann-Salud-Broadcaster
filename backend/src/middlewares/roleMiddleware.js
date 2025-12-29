/**
 * ============================================================
 * MIDDLEWARE DE ROLES (roleMiddleware.js)
 * ============================================================
 * Control de acceso basado en roles de usuario.
 * Incluye helpers para filtrar por equipo/supervisor.
 */

const User = require("../models/User");

/** Permite acceso solo si el rol del usuario está en la lista */
exports.permit = (...roles) => {
    const allowed = roles.map(r => (r || '').toLowerCase());
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: "No autenticado" });
        const role = (req.user.role || '').toLowerCase();
        if (!allowed.includes(role)) {
            return res.status(403).json({ error: "No autorizado" });
        }
        next();
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
    if (role === "administrativo" || role === "gerencia") return {}; // sin restricción

    if (role === "supervisor") {
        const team = await getTeamUserIds(req.user._id);
        return { [ownerField]: { $in: team } };
    }

    // asesor → solo sus propios recursos
    return { [ownerField]: req.user._id };
};