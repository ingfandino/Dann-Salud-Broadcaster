function getRole(user) {
    return (user?.role || "").toLowerCase();
}

function isConfigMaintainer(user) {
    const role = getRole(user);
    return role === "gerencia" || role === "desarrollador";
}

function isDocumentProcessingAdmin(user) {
    const role = getRole(user);
    return role === "administrativo" || role === "gerencia" || role === "desarrollador";
}

function isObraSocialUser(user) {
    return getRole(user) === "obra_social";
}

function sameId(left, right) {
    if (!left || !right) return false;
    return String(left) === String(right);
}

function canAccessCase(user, documentCase) {
    if (isDocumentProcessingAdmin(user)) return true;
    if (!isObraSocialUser(user)) return false;
    return sameId(user.obraSocialId, documentCase?.obraSocialId?._id || documentCase?.obraSocialId);
}

function assertConfigMaintainer(user) {
    if (!isConfigMaintainer(user)) {
        const error = new Error("Acceso denegado");
        error.statusCode = 403;
        throw error;
    }
}

function assertDocumentProcessingAdmin(user) {
    if (!isDocumentProcessingAdmin(user)) {
        const error = new Error("Acceso denegado");
        error.statusCode = 403;
        throw error;
    }
}

function assertCaseAccess(user, documentCase) {
    if (!canAccessCase(user, documentCase)) {
        const error = new Error("Acceso denegado");
        error.statusCode = 403;
        throw error;
    }
}

module.exports = {
    isConfigMaintainer,
    isDocumentProcessingAdmin,
    isObraSocialUser,
    canAccessCase,
    assertConfigMaintainer,
    assertDocumentProcessingAdmin,
    assertCaseAccess,
};
