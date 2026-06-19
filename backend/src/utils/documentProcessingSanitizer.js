const OBRA_SOCIAL_BLOCKED_FIELDS = [
    "userPasswordOriginal",
    "userPasswordCurrent",
    "rawBotLogs",
    "internalExecutionTraces",
    "internalDebuggingDetails",
    "arcaCredentials",
    "rawModuleDebugPayloads",
];

function sanitizeForObraSocial(payload) {
    if (Array.isArray(payload)) {
        return payload.map(sanitizeForObraSocial);
    }
    if (!payload || typeof payload !== "object") {
        return payload;
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(payload)) {
        if (OBRA_SOCIAL_BLOCKED_FIELDS.includes(key)) {
            continue;
        }
        sanitized[key] = sanitizeForObraSocial(value);
    }
    return sanitized;
}

module.exports = {
    OBRA_SOCIAL_BLOCKED_FIELDS,
    sanitizeForObraSocial,
};
