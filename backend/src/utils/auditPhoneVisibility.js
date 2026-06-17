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

function canViewAuditPhone(user, audit, existingCanViewPhone = false) {
    return Boolean(existingCanViewPhone) ||
        isAssignedAuditSupervisor(user, audit) ||
        isAssignedAuditAdvisor(user, audit);
}

function maskAuditPhoneIfNeeded(audit, user, existingCanViewPhone = false) {
    if (canViewAuditPhone(user, audit, existingCanViewPhone)) return audit;
    return {
        ...audit,
        telefono: "***",
    };
}

module.exports = {
    canViewAuditPhone,
    isAssignedAuditAdvisor,
    isAssignedAuditSupervisor,
    maskAuditPhoneIfNeeded,
};
