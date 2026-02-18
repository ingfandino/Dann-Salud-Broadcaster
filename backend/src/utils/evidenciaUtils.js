/**
 * ============================================================
 * UTILIDADES DE EVIDENCIAS (evidenciaUtils.js)
 * ============================================================
 * Funciones para validar estados de ventas y gestionar
 * el ciclo de vida de las evidencias.
 */

/**
 * Estado de venta que permite marcar evidencia como "terminada"
 * REGLA SIMPLIFICADA: Solo "QR hecho"
 */
const ESTADO_QR_VALIDO = 'QR hecho';

/**
 * Estados de venta elegibles para tener evidencia
 * (todos los estados del requerimiento EXCEPTO Rechazada, Caída, Completa)
 */
const ESTADOS_ELEGIBLES_EVIDENCIA = [
    'Pendiente',
    'QR hecho',
    'QR hecho (Temporal)',
    'QR hecho pero pendiente de aprobación',
    'Hacer QR',
    'AFIP',
    'Baja laboral con nueva alta',
    'Baja laboral sin nueva alta',
    'Padrón',
    'En revisión',
    'Remuneración no válida',
    'Cargada',
    'Aprobada',
    'Aprobada, pero no reconoce clave',
    'Rehacer vídeo',
    'Falta documentación',
    'Falta clave',
    'Falta clave y documentación',
    'El afiliado cambió la clave',
    'Autovinculación'
];

/**
 * Verifica si una venta puede tener su evidencia marcada como "terminada"
 * Solo es posible si la venta está exactamente en estado "QR hecho"
 * 
 * @param {string} ventaStatus - Estado actual de la venta (Audit.status)
 * @returns {boolean} true si puede marcarse como terminada, false si no
 * 
 * @example
 * canMarkAsComplete('QR hecho') // true
 * canMarkAsComplete('QR hecho pero pendiente de aprobación') // false
 * canMarkAsComplete('Pendiente') // false
 */
function canMarkAsComplete(ventaStatus) {
    if (!ventaStatus) return false;
    return ventaStatus === ESTADO_QR_VALIDO;
}

/**
 * Determina si una evidencia debe bloquearse (isLocked = true)
 * Se bloquea cuando la venta ESTÁ en estado "QR hecho" Y ya tiene archivo subido.
 * Si la venta está en "QR hecho" pero NO tiene archivo, se permite la subida inicial.
 * 
 * @param {string} ventaStatus - Estado actual de la venta (Audit.status)
 * @param {string|null} filePath - Ruta del archivo de la evidencia (null si no existe)
 * @returns {boolean} true si debe bloquearse, false si no
 * 
 * @example
 * shouldLockEvidencia('QR hecho', '/path/to/file.zip') // true (bloquear, ya tiene archivo)
 * shouldLockEvidencia('QR hecho', null) // false (permitir subida inicial)
 * shouldLockEvidencia('En revisión', '/path/to/file.zip') // false (permitir modificaciones)
 * shouldLockEvidencia('Pendiente', null) // false (permitir modificaciones)
 */
function shouldLockEvidencia(ventaStatus, filePath) {
    if (!ventaStatus) return false;
    return ventaStatus === ESTADO_QR_VALIDO && !!filePath;
}

/**
 * Verifica si una venta es elegible para tener evidencia
 * Excluye: Rechazada, Caída, Completa
 * 
 * @param {string} ventaStatus - Estado actual de la venta (Audit.status)
 * @returns {boolean} true si es elegible, false si no
 * 
 * @example
 * isElegibleParaEvidencia('Pendiente') // true
 * isElegibleParaEvidencia('Rechazada') // false
 */
function isElegibleParaEvidencia(ventaStatus) {
    if (!ventaStatus) return false;
    return ESTADOS_ELEGIBLES_EVIDENCIA.includes(ventaStatus);
}

/**
 * Valida si se puede cambiar el estado de una evidencia
 * 
 * @param {Object} evidencia - Documento de evidencia
 * @param {string} nuevoEstado - Nuevo estado solicitado
 * @param {string} ventaStatus - Estado actual de la venta
 * @returns {Object} { valid: boolean, message: string }
 */
function validateEstadoChange(evidencia, nuevoEstado, ventaStatus) {
    // Si está bloqueada, no se puede cambiar
    if (evidencia.isLocked) {
        return {
            valid: false,
            message: 'La evidencia está bloqueada. No se puede cambiar el estado.'
        };
    }
    
    // Si se intenta marcar como "terminada", verificar estado de venta
    if (nuevoEstado === 'terminada' && !canMarkAsComplete(ventaStatus)) {
        return {
            valid: false,
            message: `No se puede marcar como terminada. La venta debe estar exactamente en "QR hecho". Estado actual: ${ventaStatus}`
        };
    }
    
    // Si no hay archivo y se intenta marcar como "terminada" o "en_proceso"
    if (!evidencia.filePath && (nuevoEstado === 'terminada' || nuevoEstado === 'en_proceso')) {
        return {
            valid: false,
            message: 'Debe subir un archivo ZIP antes de cambiar el estado.'
        };
    }
    
    return { valid: true, message: 'OK' };
}

module.exports = {
    ESTADO_QR_VALIDO,
    ESTADOS_ELEGIBLES_EVIDENCIA,
    canMarkAsComplete,
    shouldLockEvidencia,
    isElegibleParaEvidencia,
    validateEstadoChange
};
