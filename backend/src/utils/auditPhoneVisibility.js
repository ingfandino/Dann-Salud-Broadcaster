function idToString(value) {
    if (!value) return null;
    if (value._id) return String(value._id);
    return String(value);
}

function isAssignedAuditSupervisor(user, audit) {
    const userId = idToString(user);
    const supervisorId = idToString(audit?.supervisorSnapshot?._id);
    return !!userId && !!supervisorId && userId === supervisorId;
}

function isAssignedAuditAdvisor(user, audit) {
    const userId = idToString(user);
    const advisorId = idToString(audit?.asesor);
    return !!userId && !!advisorId && userId === advisorId;
}

function isAssignedAuditAuditor(user, audit) {
    const userId = idToString(user);
    const auditorId = idToString(audit?.auditor);
    return !!userId && !!auditorId && userId === auditorId;
}

function normalizeAuditPhoneRole(role) {
    return String(role || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

const PRIVILEGED_PHONE_ROLES = new Set([
    "gerencia",
    "desarrollador",
    "admin",
    "administrativo",
    "encargado",
]);

function sanitizeTelefonoHistory(telefonoHistory, canViewPhone) {
    if (!Array.isArray(telefonoHistory)) return telefonoHistory;
    if (canViewPhone) return telefonoHistory;

    return telefonoHistory.map(entry => ({
        ...entry,
        previousValue: null,
        newValue: null,
        phoneValuesHidden: true,
    }));
}

function canViewAuditPhone(user, audit, existingCanViewPhone = false) {
    const role = normalizeAuditPhoneRole(user?.role);
    return PRIVILEGED_PHONE_ROLES.has(role) ||
        Boolean(existingCanViewPhone) ||
        isAssignedAuditSupervisor(user, audit) ||
        isAssignedAuditAdvisor(user, audit) ||
        isAssignedAuditAuditor(user, audit);
}

function maskAuditPhoneIfNeeded(audit, user, existingCanViewPhone = false) {
    const canViewPhone = canViewAuditPhone(user, audit, existingCanViewPhone);
    if (canViewPhone) {
        return {
            ...audit,
            telefonoHistory: sanitizeTelefonoHistory(audit?.telefonoHistory, true),
            telefonoMasked: null,
            canViewTelefono: true,
        };
    }
    return {
        ...audit,
        telefono: null,
        telefonoHistory: sanitizeTelefonoHistory(audit?.telefonoHistory, false),
        telefonoMasked: "***",
        canViewTelefono: false,
    };
}

module.exports = {
    canViewAuditPhone,
    isAssignedAuditAdvisor,
    isAssignedAuditAuditor,
    isAssignedAuditSupervisor,
    maskAuditPhoneIfNeeded,
    normalizeAuditPhoneRole,
};
