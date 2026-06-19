"use strict";

const Audit = require("../models/Audit");
const { normalizeCuil, isValidNormalizedCuil, buildCuilLooseRegex } = require("./cuilUtils");

const DUPLICATE_CUIL_MESSAGE = "Ya existe una venta/auditoria activa con este CUIL.";

function buildDuplicateAuditPayload(audit) {
    if (!audit) return null;
    return {
        duplicateAuditId: audit._id,
        duplicateEstado: audit.status || null,
        duplicateNombre: audit.nombre || null,
    };
}

async function findBlockingAuditByCuilNormalized(cuilNormalized, excludeAuditId = null) {
    const normalized = normalizeCuil(cuilNormalized);
    if (!normalized) return null;

    const looseRegex = buildCuilLooseRegex(normalized);
    const query = {
        status: { $ne: "Rechazada" },
        $or: [
            { cuilNormalized: normalized },
            { cuil: normalized },
        ],
    };

    if (looseRegex) {
        query.$or.push({ cuil: looseRegex });
    }

    if (excludeAuditId) {
        query._id = { $ne: excludeAuditId };
    }

    return Audit.findOne(query)
        .select("_id nombre cuil cuilNormalized status createdAt asesor")
        .lean();
}

function buildDuplicateCuilResponse(audit) {
    return {
        error: true,
        code: "DUPLICATE_CUIL",
        message: DUPLICATE_CUIL_MESSAGE,
        ...buildDuplicateAuditPayload(audit),
    };
}

module.exports = {
    DUPLICATE_CUIL_MESSAGE,
    normalizeCuil,
    isValidNormalizedCuil,
    findBlockingAuditByCuilNormalized,
    buildDuplicateCuilResponse,
};
