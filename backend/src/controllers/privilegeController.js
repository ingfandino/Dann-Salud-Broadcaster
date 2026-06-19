/**
 * ============================================================
 * CONTROLADOR DE PRIVILEGIOS (privilegeController.js)
 * ============================================================
 * CRUD para el sistema dinámico de permisos por rol.
 * Maneja tanto permisos a nivel módulo como a nivel interfaz.
 */

const RolePermission  = require("../models/RolePermission");
const PermissionAuditLog = require("../models/PermissionAuditLog");
const { invalidateRole, invalidateAll, getFromCache, setInCache, getCacheStats } = require("../utils/permissionCache");
const logger = require("../utils/logger");

/** Mapa canónico de módulos e interfaces de la plataforma */
const PLATFORM_STRUCTURE = [
    {
        id: "herramientas-contacto",
        label: "Herramientas de contacto",
        interfaces: [
            { id: "contactar-afiliados-administracion", label: "Administración de datos" },
            { id: "chequeo-datos",                      label: "Chequeo de datos" },
            { id: "contactar-afiliados-datos-dia",      label: "Datos del día" },
            { id: "mensajeria-masiva",                  label: "Mensajería Masiva" },
            { id: "reportes-globales",                  label: "Reportes de Mensajería" },
        ],
    },
    {
        id: "base-afiliados",
        label: "Base de Afiliados",
        interfaces: [
            { id: "base-afiliados-estadistica",   label: "Estadísticas" },
            { id: "base-afiliados-lista",          label: "Lista de afiliados" },
            { id: "base-afiliados-exitosas",       label: "Afiliaciones exitosas" },
            { id: "base-afiliados-fallidas",       label: "Afiliaciones fallidas" },
            { id: "base-afiliados-frescos",        label: "Datos frescos" },
            { id: "base-afiliados-reutilizables",  label: "Datos reutilizables" },
            { id: "base-afiliados-cargar",         label: "Cargar archivo" },
            { id: "base-afiliados-configuracion",  label: "Configuración de envíos" },
        ],
    },
    {
        id: "auditorias",
        label: "Auditorías",
        interfaces: [
            { id: "auditorias-seguimiento",  label: "Seguimiento" },
            { id: "auditorias-falta-clave",  label: "Falta clave" },
            { id: "auditorias-pendiente",    label: "Pendiente" },
            { id: "auditorias-rechazada",    label: "Rechazada" },
            { id: "auditorias-crear-turno",  label: "Crear turno" },
            { id: "auditorias-liquidacion",  label: "Liquidación" },
            { id: "auditorias-reventa",      label: "Disponibles para reventa" },
        ],
    },
    {
        id: "administracion",
        label: "Administración",
        interfaces: [
            { id: "administracion-registro-ventas", label: "Registro de ventas" },
            { id: "administracion-evidencias",      label: "Evidencias" },
            { id: "procesamiento-documental",       label: "Procesamiento documental" },
        ],
    },
    {
        id: "obras-sociales",
        label: "Obras Sociales",
        interfaces: [
            { id: "obras-sociales", label: "Obras Sociales" },
        ],
    },
    {
        id: "recursos-humanos",
        label: "Recursos Humanos",
        interfaces: [
            { id: "rrhh-agregar",              label: "Añadir empleado" },
            { id: "rrhh-activos",              label: "Activos" },
            { id: "rrhh-bajas-liquidaciones",  label: "Bajas y liquidaciones" },
            { id: "rrhh-bajo-rendimiento",     label: "Bajo rendimiento" },
            { id: "rrhh-estadisticas",         label: "Estadísticas" },
            { id: "rrhh-inactivos",            label: "Inactivos" },
            { id: "rrhh-telefonos",            label: "Teléfonos" },
        ],
    },
    {
        id: "contabilidad",
        label: "Contabilidad",
        interfaces: [
            { id: "contabilidad", label: "Contabilidad" },
        ],
    },
    {
        id: "configuracion-sistema",
        label: "Configuración de sistema",
        interfaces: [
            { id: "configuracion-privilegios",     label: "Control de privilegios" },
            { id: "gestion-usuarios",              label: "Gestión de Usuarios" },
            { id: "palabras-prohibidas-mensajeria", label: "Palabras prohibidas" },
            { id: "configuracion-procesamiento-documental", label: "Configuración del flujo documental" },
        ],
    },
];

/** Roles de la plataforma (excluye desarrollador que siempre tiene todo) */
const PLATFORM_ROLES = [
    "gerencia",
    "administrativo",
    "supervisor",
    "asesor",
    "auditor",
    "RR.HH",
    "recuperador",
    "encargado",
    "independiente",
    "obra_social",
];

/** Devuelve la estructura completa de módulos e interfaces */
exports.getPlatformStructure = (req, res) => {
    res.json({ ok: true, structure: PLATFORM_STRUCTURE, roles: PLATFORM_ROLES });
};

/**
 * Obtiene todos los permisos de un rol específico.
 * Usa caché en memoria para evitar consultas repetidas.
 */
exports.getPermissionsByRole = async (req, res) => {
    try {
        const { role } = req.params;

        // Desarrollador siempre tiene todo — devolver sin consultar BD
        if (role.toLowerCase() === "desarrollador") {
            return res.json({ ok: true, role, permissions: _buildFullAccess(role) });
        }

        // Intentar desde caché
        const cached = getFromCache(role);
        if (cached) {
            return res.json({ ok: true, role, permissions: cached, fromCache: true });
        }

        const records = await RolePermission.find({ role }).lean();
        setInCache(role, records);

        res.json({ ok: true, role, permissions: records });
    } catch (err) {
        logger.error("privilegeController.getPermissionsByRole:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

/**
 * Obtiene los permisos efectivos del usuario autenticado.
 * Usado por el frontend para filtrar el sidebar dinámicamente.
 */
exports.getMyPermissions = async (req, res) => {
    try {
        const role = req.user.role;

        // Desarrollador y gerencia siempre tienen acceso total
        if (role.toLowerCase() === "desarrollador" || role.toLowerCase() === "gerencia") {
            return res.json({ ok: true, role, permissions: _buildFullAccess(role), fullAccess: true });
        }

        const cached = getFromCache(role);
        if (cached) {
            return res.json({ ok: true, role, permissions: cached, fromCache: true });
        }

        const records = await RolePermission.find({ role }).lean();
        setInCache(role, records);

        res.json({ ok: true, role, permissions: records });
    } catch (err) {
        logger.error("privilegeController.getMyPermissions:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

/**
 * Guarda o actualiza los permisos de un rol para un interfaceId.
 * Si level === 'module', replica el permiso a todos los hijos del módulo.
 */
exports.upsertPermission = async (req, res) => {
    try {
        const { role, moduleId, interfaceId, level, permissions } = req.body;

        if (!role || !moduleId || !interfaceId || !permissions) {
            return res.status(400).json({ ok: false, error: "Faltan campos requeridos: role, moduleId, interfaceId, permissions" });
        }

        // Seguridad: nadie puede quitarse acceso a configuracion-privilegios si es el último
        if (interfaceId === "configuracion-privilegios" || interfaceId === "configuracion-sistema") {
            await _guardLastConfigAccess(role, permissions, res);
            if (res.headersSent) return;
        }

        const updatedBy = req.user._id;
        const changedInterfaces = [];

        if (level === "module") {
            // Aplicar a todas las interfaces del módulo
            const module = PLATFORM_STRUCTURE.find(m => m.id === moduleId);
            if (!module) {
                return res.status(400).json({ ok: false, error: `Módulo '${moduleId}' no encontrado` });
            }

            for (const iface of module.interfaces) {
                const previous = await RolePermission.findOne({ role, interfaceId: iface.id }).lean();
                await RolePermission.findOneAndUpdate(
                    { role, interfaceId: iface.id },
                    { $set: { moduleId, interfaceId: iface.id, level: "module", permissions, updatedBy } },
                    { upsert: true, new: true }
                );
                changedInterfaces.push({ interfaceId: iface.id, previous });
            }
        } else {
            // Aplicar solo a la interfaz seleccionada
            const previous = await RolePermission.findOne({ role, interfaceId }).lean();
            await RolePermission.findOneAndUpdate(
                { role, interfaceId },
                { $set: { moduleId, interfaceId, level: "interface", permissions, updatedBy } },
                { upsert: true, new: true }
            );
            changedInterfaces.push({ interfaceId, previous });
        }

        // Registrar audit log para cada interfaz cambiada
        const auditEntries = changedInterfaces.map(({ interfaceId: iid, previous }) => ({
            changedBy: updatedBy,
            role,
            moduleId,
            interfaceId: iid,
            level: level || "interface",
            previousPermissions: previous?.permissions || null,
            newPermissions: permissions,
            timestamp: new Date(),
        }));
        await PermissionAuditLog.insertMany(auditEntries);

        // Invalida caché del rol afectado
        invalidateRole(role);

        logger.info(`[PRIVILEGES] ${req.user.email} actualizó permisos: rol=${role}, módulo=${moduleId}, nivel=${level}, interfaces=${changedInterfaces.length}`);

        res.json({ ok: true, message: "Permisos actualizados correctamente", changedCount: changedInterfaces.length });
    } catch (err) {
        logger.error("privilegeController.upsertPermission:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

/**
 * Obtiene el historial de auditoría de cambios de permisos.
 */
exports.getAuditLog = async (req, res) => {
    try {
        const { role, limit = 100, skip = 0 } = req.query;
        const filter = role ? { role } : {};

        const [logs, total] = await Promise.all([
            PermissionAuditLog.find(filter)
                .sort({ timestamp: -1 })
                .limit(Number(limit))
                .skip(Number(skip))
                .populate("changedBy", "nombre email role")
                .lean(),
            PermissionAuditLog.countDocuments(filter),
        ]);

        res.json({ ok: true, logs, total });
    } catch (err) {
        logger.error("privilegeController.getAuditLog:", err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

/**
 * Devuelve estadísticas de la caché para diagnóstico.
 */
exports.getCacheStatus = (req, res) => {
    res.json({ ok: true, cache: getCacheStats() });
};

/**
 * Invalida manualmente toda la caché (útil tras migraciones).
 */
exports.flushCache = (req, res) => {
    invalidateAll();
    logger.info(`[PRIVILEGES] Caché invalidada manualmente por ${req.user.email}`);
    res.json({ ok: true, message: "Caché de permisos invalidada" });
};

// ─────────────────────────────────────────────
// HELPERS PRIVADOS
// ─────────────────────────────────────────────

/** Construye un objeto de acceso total para roles sin restricciones */
function _buildFullAccess(role) {
    const fullPerms = { acceder: true, ver: true, editar: true, eliminar: true };
    return PLATFORM_STRUCTURE.flatMap(mod =>
        mod.interfaces.map(iface => ({
            role,
            moduleId:    mod.id,
            interfaceId: iface.id,
            level:       "interface",
            permissions: fullPerms,
        }))
    );
}

/**
 * Previene que se elimine el acceso a Configuración de sistema
 * del último rol que actualmente tiene acceso a ella.
 */
async function _guardLastConfigAccess(role, newPermissions, res) {
    if (newPermissions.acceder !== false) return; // no están quitando acceso

    // Contar cuántos roles distintos tienen acceder=true a configuracion-privilegios
    const rolesWithAccess = await RolePermission.distinct("role", {
        interfaceId: "configuracion-privilegios",
        "permissions.acceder": true,
    });

    const isLastRole = rolesWithAccess.length <= 1 &&
        (rolesWithAccess.length === 0 || rolesWithAccess[0] === role);

    if (isLastRole) {
        res.status(400).json({
            ok: false,
            error: "No se puede eliminar el acceso a 'Control de privilegios' del último rol que lo tiene. Asigna primero acceso a otro rol.",
        });
    }
}
