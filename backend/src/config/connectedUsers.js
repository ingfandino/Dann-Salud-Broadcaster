/**
 * ============================================================
 * GESTIÓN DE USUARIOS CONECTADOS VÍA SOCKET
 * ============================================================
 * Este módulo mantiene un registro de los usuarios actualmente
 * conectados al sistema mediante WebSocket. Permite contar
 * conexiones múltiples del mismo usuario (diferentes pestañas/dispositivos).
 */

/** Mapa que almacena el ID del usuario y la cantidad de conexiones activas */
const connectedUsers = new Map();

/**
 * Registra una nueva conexión de un usuario.
 * Si el usuario ya tiene conexiones activas, incrementa el contador.
 * @param {string} userId - ID del usuario que se conecta
 */
function addUser(userId) {
    connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1);
}

/**
 * Registra la desconexión de un usuario.
 * Decrementa el contador de conexiones; si llega a cero, elimina al usuario.
 * @param {string} userId - ID del usuario que se desconecta
 */
function removeUser(userId) {
    if (!connectedUsers.has(userId)) return;
    const count = connectedUsers.get(userId) - 1;
    if (count <= 0) connectedUsers.delete(userId);
    else connectedUsers.set(userId, count);
}

/**
 * Obtiene la cantidad de usuarios únicos conectados actualmente.
 * @returns {number} Número de usuarios únicos conectados
 */
function getConnectedCount() {
    return connectedUsers.size;
}

module.exports = { addUser, removeUser, getConnectedCount };