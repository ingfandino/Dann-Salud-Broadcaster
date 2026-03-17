/**
 * ============================================================
 * CACHÉ DE PERMISOS (permissionCache.js)
 * ============================================================
 * Caché en memoria por rol con TTL de 5 minutos.
 * Evita consultas repetidas a la BD por cada request.
 */

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** @type {Map<string, { data: any, expiresAt: number }>} */
const cache = new Map();

/**
 * Obtiene permisos cacheados para un rol.
 * @param {string} role
 * @returns {any|null} datos cacheados o null si expiró/no existe
 */
exports.getFromCache = (role) => {
    const entry = cache.get(role);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(role);
        return null;
    }
    return entry.data;
};

/**
 * Guarda permisos en caché para un rol.
 * @param {string} role
 * @param {any} data
 */
exports.setInCache = (role, data) => {
    cache.set(role, {
        data,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
};

/**
 * Invalida la caché de un rol específico.
 * @param {string} role
 */
exports.invalidateRole = (role) => {
    cache.delete(role);
};

/**
 * Invalida toda la caché.
 */
exports.invalidateAll = () => {
    cache.clear();
};

/**
 * Estadísticas de caché para diagnóstico.
 */
exports.getCacheStats = () => ({
    size: cache.size,
    roles: Array.from(cache.keys()),
});
