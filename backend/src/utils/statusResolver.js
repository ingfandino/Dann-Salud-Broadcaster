/**
 * ============================================================
 * STATUS SYNCHRONIZATION RESOLVER
 * ============================================================
 * Centralized utility for synchronizing status fields between
 * Registro de ventas (administrative) and Seguimiento (operational).
 *
 * BUSINESS RULES:
 * 1. Forward mappings (Registro de ventas → Seguimiento) are ONE-WAY ONLY
 * 2. Seguimiento cannot assign: Pendiente, QR hecho (Temporal), Baja laboral sin nueva alta
 * 3. Seguimiento updates use DIRECT SYNC for all assignable statuses
 * 4. Records in Registro de ventas must remain visible even with operational statuses
 */

/**
 * One-way forward mappings from administrative to operational status.
 * These are intentional business mappings that must be preserved.
 */
const ADMIN_TO_SEGUIMIENTO_STATUS_MAP = {
  "Hacer QR": "Pendiente",
  "QR hecho (Temporal)": "Baja laboral sin nueva alta"
};

/**
 * Statuses that Seguimiento CANNOT assign directly.
 * These must only come from forward mapping.
 */
const SEGUIMIENTO_NON_ASSIGNABLE_STATUSES = [
  "Pendiente",
  "QR hecho (Temporal)",
  "Baja laboral sin nueva alta"
];

/**
 * Statuses that Seguimiento CAN assign.
 * All of these use direct sync (both fields get the same value).
 */
const SEGUIMIENTO_ASSIGNABLE_STATUSES = [
  "Mensaje enviado",
  "En videollamada",
  "Rechazada",
  "Falta documentación",
  "Falta clave",
  "Falta clave (por ARCA)",
  "Reprogramada",
  "Reprogramada (falta confirmar hora)",
  "Reprogramada (solo clave)",
  "Completa",
  "No atendió",
  "Tiene dudas",
  "Falta clave y documentación",
  "No le llegan los mensajes",
  "Cortó",
  "Autovinculación",
  "Caída",
  "Rehacer vídeo",
  "QR hecho",
  "QR hecho pero pendiente de aprobación",
  "AFIP",
  "Baja laboral con nueva alta",
  "En revisión",
  "Remuneración no válida",
  "Cargada",
  "Aprobada",
  "Aprobada pero no reconoce clave",
  "El afiliado cambió la clave"
];

/**
 * Resolves status update based on source interface.
 *
 * @param {Object} params
 * @param {string} params.sourceInterface - "registro_ventas" | "seguimiento"
 * @param {string} params.incomingStatus - The new status value
 * @returns {Object} { status, statusAdministrativo, syncType, warning, isValid }
 */
function resolveStatusUpdate({ sourceInterface, incomingStatus }) {
  // Validate source
  if (!sourceInterface) {
    return {
      status: incomingStatus,
      statusAdministrativo: incomingStatus,
      syncType: "unknown_no_source",
      warning: "No sourceInterface provided. Using direct sync.",
      isValid: true
    };
  }

  if (!["registro_ventas", "seguimiento"].includes(sourceInterface)) {
    return {
      status: null,
      statusAdministrativo: null,
      syncType: "invalid_source",
      warning: `Invalid source interface: ${sourceInterface}`,
      isValid: false
    };
  }

  // Case 1: Update from Registro de ventas
  if (sourceInterface === "registro_ventas") {
    const mappedStatus = ADMIN_TO_SEGUIMIENTO_STATUS_MAP[incomingStatus];

    if (mappedStatus) {
      // One-way forward mapping applies
      return {
        status: mappedStatus,
        statusAdministrativo: incomingStatus,
        syncType: "forward_mapped",
        warning: null,
        isValid: true
      };
    }

    // Direct sync (no mapping needed)
    return {
      status: incomingStatus,
      statusAdministrativo: incomingStatus,
      syncType: "direct_sync",
      warning: null,
      isValid: true
    };
  }

  // Case 2: Update from Seguimiento
  if (sourceInterface === "seguimiento") {
    // Check if status is non-assignable (should never happen from Seguimiento)
    if (SEGUIMIENTO_NON_ASSIGNABLE_STATUSES.includes(incomingStatus)) {
      return {
        status: null,
        statusAdministrativo: null,
        syncType: "rejected_non_assignable",
        warning: `Seguimiento cannot assign status: ${incomingStatus}. This status is derived from forward mapping only.`,
        isValid: false
      };
    }

    // Check if status is in confirmed assignable list
    if (SEGUIMIENTO_ASSIGNABLE_STATUSES.includes(incomingStatus)) {
      // Direct sync: both fields get the same value
      return {
        status: incomingStatus,
        statusAdministrativo: incomingStatus,
        syncType: "seguimiento_direct_sync",
        warning: null,
        isValid: true
      };
    }

    // Unknown status - allow but flag for review
    return {
      status: incomingStatus,
      statusAdministrativo: incomingStatus,
      syncType: "unknown_status",
      warning: `Status "${incomingStatus}" not in confirmed assignable list. Using direct sync but verify business rule.`,
      isValid: true
    };
  }

  // Fallback (should never reach here)
  return {
    status: incomingStatus,
    statusAdministrativo: incomingStatus,
    syncType: "fallback_direct",
    warning: "Unexpected fallback to direct sync",
    isValid: true
  };
}

/**
 * Checks if a status pair represents a valid state.
 *
 * @param {string} statusAdministrativo - The administrative status
 * @param {string} status - The operational status
 * @returns {Object} classification result
 */
function classifyStatusPair(statusAdministrativo, status) {
  const pairKey = `${statusAdministrativo || 'null'}->${status || 'null'}`;

  // Check for valid one-way forward mapping
  const expectedFromAdmin = ADMIN_TO_SEGUIMIENTO_STATUS_MAP[statusAdministrativo];
  if (expectedFromAdmin && expectedFromAdmin === status) {
    return {
      type: "VALID_ONE_WAY_MAPPING",
      pair: pairKey,
      description: `Intentional forward mapping: ${statusAdministrativo} -> ${status}`,
      actionRequired: false
    };
  }

  // Both empty/null
  if (!status && !statusAdministrativo) {
    return {
      type: "VALID_BOTH_EMPTY",
      pair: pairKey,
      description: "Both fields are empty",
      actionRequired: false
    };
  }

  // Synchronized (same value)
  if (status === statusAdministrativo) {
    return {
      type: "VALID_SYNCED",
      pair: pairKey,
      description: "Fields are synchronized",
      actionRequired: false
    };
  }

  // Stale divergence: admin has forward mapping but status doesn't match
  if (expectedFromAdmin && status !== expectedFromAdmin) {
    return {
      type: "INVALID_STALE_DIVERGENCE",
      pair: pairKey,
      description: `${statusAdministrativo} should map to ${expectedFromAdmin}, but status is ${status}`,
      actionRequired: true,
      suggestedResolution: `Update both fields to synchronized value: ${status}`
    };
  }

  // Unknown divergence
  return {
    type: "UNKNOWN_DIVERGENCE",
    pair: pairKey,
    description: `No confirmed mapping or rule for this pair`,
    actionRequired: true,
    suggestedResolution: "Review business rule for this status combination"
  };
}

module.exports = {
  resolveStatusUpdate,
  classifyStatusPair,
  ADMIN_TO_SEGUIMIENTO_STATUS_MAP,
  SEGUIMIENTO_ASSIGNABLE_STATUSES,
  SEGUIMIENTO_NON_ASSIGNABLE_STATUSES
};
