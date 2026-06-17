"use strict";

function normalizeCuil(value) {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\D/g, "");
}

function isValidNormalizedCuil(value) {
    return /^\d{11}$/.test(value || "");
}

function buildCuilLooseRegex(value) {
    const normalized = normalizeCuil(value);
    if (!normalized) return null;
    return new RegExp(`^\\D*${normalized.split("").join("\\D*")}\\D*$`);
}

module.exports = {
    normalizeCuil,
    isValidNormalizedCuil,
    buildCuilLooseRegex,
};
