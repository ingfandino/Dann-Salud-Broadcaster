// backend/src/utils/stringUtils.js

/**
 * Escapa caracteres especiales para usar en una expresión regular.
 * @param {string} string - La cadena a escapar.
 * @returns {string} - La cadena escapada.
 */
function escapeRegex(string) {
    if (typeof string !== 'string') {
        return '';
    }
    return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

module.exports = {
    escapeRegex
};
