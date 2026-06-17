/**
 * ============================================================
 * EXCEL HELPERS (excelHelpers.js)
 * ============================================================
 * Funciones de normalización y extracción de campos de archivos
 * Excel. Compartidas entre affiliateController (importación
 * productiva) y dataCheckController (chequeo temporal aislado).
 *
 * Extraídas de affiliateController.js para evitar duplicación.
 */

"use strict";

/**
 * Extrae un campo de una fila Excel buscando entre múltiples
 * nombres posibles de header (tolerante a variaciones).
 *
 * @param {object} row — Objeto fila de sheet_to_json
 * @param {string[]} possibleNames — Lista de sinónimos del header
 * @returns {string|null}
 */
function extractField(row, possibleNames) {
    for (const name of possibleNames) {
        for (const key in row) {
            if (normalizeString(key) === normalizeString(name)) {
                const value = row[key];
                return value !== null && value !== undefined && value !== ""
                    ? String(value).trim()
                    : null;
            }
        }
    }
    return null;
}

/**
 * Normaliza un string: lowercase, sin espacios, sin tildes.
 * Usado para comparación tolerante de headers.
 *
 * @param {string} str
 * @returns {string}
 */
function normalizeString(str) {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[áàäâ]/g, "a")
        .replace(/[éèëê]/g, "e")
        .replace(/[íìïî]/g, "i")
        .replace(/[óòöô]/g, "o")
        .replace(/[úùüû]/g, "u");
}

/**
 * Normaliza un teléfono: solo dígitos.
 *
 * @param {string} phone
 * @returns {string}
 */
function normalizePhone(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D/g, "");
}

/**
 * Normaliza un CUIL a su representacion canonica de 11 digitos.
 *
 * @param {string|number|null|undefined} cuil
 * @returns {string|null}
 */
function normalizeCuil(cuil) {
    if (cuil === null || cuil === undefined || cuil === "") return null;
    const digits = String(cuil).replace(/\D/g, "");
    return digits.length === 11 ? digits : null;
}

/**
 * Rota los tres telefonos canonicos cuando aparece un telefono nuevo.
 * El primer telefono entrante realmente nuevo pasa a telefono1; los
 * telefonos anteriores 1 y 2 se desplazan a 2 y 3. Telefonos entrantes
 * adicionales solo completan posiciones vacias.
 *
 * @param {Array<string|null|undefined>} existingPhones
 * @param {Array<string|null|undefined>} incomingPhones
 * @returns {string[]|null}
 */
function rotateCanonicalPhones(existingPhones, incomingPhones) {
    const unique = values => Array.from(new Set(values.map(normalizePhone).filter(Boolean)));
    const existing = unique(existingPhones).slice(0, 3);
    const incoming = unique(incomingPhones).slice(0, 3);
    const newPhones = incoming.filter(phone => !existing.includes(phone));
    if (newPhones.length === 0) return null;

    const finalPhones = [newPhones[0], existing[0] || null, existing[1] || null];
    for (const extraPhone of newPhones.slice(1)) {
        const emptyIndex = finalPhones.findIndex((phone, index) => index > 0 && !phone);
        if (emptyIndex === -1) break;
        finalPhones[emptyIndex] = extraPhone;
    }

    return finalPhones.filter(Boolean);
}


/**
 * Extrae campos adicionales no mapeados de una fila Excel.
 * Sanitiza claves para compatibilidad con MongoDB.
 *
 * @param {object} row
 * @returns {object|undefined}
 */
function extractAdditionalFields(row) {
    const standardFields = [
        "nombre", "name", "nombreyapellido", "apellidoynombre", "fullname",
        "cuil", "cuit", "dni", "documento",
        "obrasocial", "obra social", "obra_social", "os", "cobertura",
        "localidad", "ciudad", "location", "city",
        "telefono_1", "telefono1", "tel_1", "tel1", "phone_1", "phone1", "telefono", "celular",
        "telefono_2", "telefono2", "tel_2", "tel2", "phone_2", "phone2",
        "telefono_3", "telefono3", "tel_3", "tel3", "phone_3", "phone3",
        "telefono_4", "telefono4", "tel_4", "tel4",
        "telefono_5", "telefono5", "tel_5", "tel5",
        "edad", "age", "años",
        "codigoobrasocial", "codigo_obra_social", "codigo_os", "codigoos",
        "codigodeobrasocial", "codigo de obra social",
        "codigopostal", "codigo_postal", "codigo postal", "cp",
    ];

    const additional = {};
    for (const key in row) {
        if (!key || key.trim() === "") continue;

        const normalizedKey = normalizeString(key);
        if (!standardFields.some(f => normalizeString(f) === normalizedKey)) {
            let safeKey = String(key)
                .replace(/\./g, "_")
                .replace(/[^a-zA-Z0-9 _-]/g, "")
                .trim();

            if (safeKey.startsWith("$")) {
                safeKey = safeKey.replace(/^\$+/, "");
            }

            if (safeKey) {
                additional[safeKey] = String(row[key]);
            }
        }
    }
    return Object.keys(additional).length > 0 ? additional : undefined;
}

module.exports = {
    extractField,
    normalizeString,
    normalizePhone,
    normalizeCuil,
    rotateCanonicalPhones,
    extractAdditionalFields,
};
