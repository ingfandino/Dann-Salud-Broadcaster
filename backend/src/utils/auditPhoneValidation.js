"use strict";

const MASKED_PHONE_PLACEHOLDER = "***";

class AuditPhoneValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "AuditPhoneValidationError";
        this.statusCode = 400;
    }
}

function hasMaskedPhonePlaceholder(value) {
    return typeof value === "string" && value.includes("*");
}

function normalizeAuditPhone(value, options = {}) {
    const fieldName = options.fieldName || "telefono";
    const required = options.required !== false;

    if (value === null || value === undefined || String(value).trim() === "") {
        if (!required) return null;
        throw new AuditPhoneValidationError(`${fieldName} es requerido`);
    }

    const raw = String(value).trim();
    if (raw === MASKED_PHONE_PLACEHOLDER || hasMaskedPhonePlaceholder(raw)) {
        throw new AuditPhoneValidationError(`${fieldName} no puede contener valores enmascarados`);
    }

    const normalized = raw.replace(/\D/g, "");
    if (normalized.length !== 10) {
        throw new AuditPhoneValidationError(`${fieldName} debe tener exactamente 10 digitos`);
    }

    return normalized;
}

module.exports = {
    AuditPhoneValidationError,
    MASKED_PHONE_PLACEHOLDER,
    hasMaskedPhonePlaceholder,
    normalizeAuditPhone,
};
