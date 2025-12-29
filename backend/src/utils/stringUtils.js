/**
 * ============================================================
 * UTILIDADES DE STRINGS (stringUtils.js)
 * ============================================================
 * Funciones auxiliares para manejo de cadenas de texto.
 */

/** Escapa caracteres especiales para uso en expresiones regulares */
function escapeRegex(string) {
    if (typeof string !== 'string') {
        return '';
    }
    return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = {
    escapeRegex
};
