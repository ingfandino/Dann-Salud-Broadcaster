// backend/src/config/connectedUsers.js

const connectedUsers = new Map();

function addUser(userId) {
    connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1);
}

function removeUser(userId) {
    if (!connectedUsers.has(userId)) return;
    const count = connectedUsers.get(userId) - 1;
    if (count <= 0) connectedUsers.delete(userId);
    else connectedUsers.set(userId, count);
}

function getConnectedCount() {
    return connectedUsers.size;
}

module.exports = { addUser, removeUser, getConnectedCount };