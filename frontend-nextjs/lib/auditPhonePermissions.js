const AUDIT_PHONE_EDIT_ROLES = Object.freeze(["gerencia", "desarrollador"]);

function normalizeUserRole(role) {
    return String(role || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

function canEditExistingAuditPhone(role) {
    return AUDIT_PHONE_EDIT_ROLES.includes(normalizeUserRole(role));
}

function isMaskedPhoneValue(value) {
    return typeof value === "string" && value.includes("*");
}

function normalizeAuditPhoneInput(value) {
    return String(value || "").replace(/\D/g, "");
}

function getEditableAuditPhoneInitialValue(audit, role) {
    if (!canEditExistingAuditPhone(role)) return "";
    const telefono = audit?.telefono;
    if (isMaskedPhoneValue(telefono)) return "";
    return telefono || "";
}

function hasAuditPhoneChanged(audit, nextPhone) {
    if (!nextPhone || isMaskedPhoneValue(nextPhone)) return false;
    return normalizeAuditPhoneInput(audit?.telefono) !== normalizeAuditPhoneInput(nextPhone);
}

function buildAuditGenericUpdatePayload(form) {
    const payload = { ...form };
    delete payload.telefono;
    delete payload.telefonoHistory;
    return payload;
}

module.exports = {
    AUDIT_PHONE_EDIT_ROLES,
    normalizeUserRole,
    canEditExistingAuditPhone,
    isMaskedPhoneValue,
    normalizeAuditPhoneInput,
    getEditableAuditPhoneInitialValue,
    hasAuditPhoneChanged,
    buildAuditGenericUpdatePayload,
};
