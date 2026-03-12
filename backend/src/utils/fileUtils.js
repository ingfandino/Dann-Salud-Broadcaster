/**
 * ============================================================
 * UTILIDADES DE GESTIÓN DE ARCHIVOS (fileUtils.js)
 * ============================================================
 * Funciones para manejo seguro de archivos ZIP de evidencias.
 * Incluye generación de nombres únicos, sanitización y validación.
 */

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

/**
 * Directorio base para almacenamiento de evidencias
 */
const EVIDENCIAS_DIR = path.join(__dirname, '../../storage/evidencias');

/**
 * Genera un nombre único para el archivo ZIP
 * Formato: {UUID}_{timestamp}.zip
 * 
 * @returns {string} Nombre único del archivo
 * 
 * @example
 * generateUniqueFileName()
 * // Returns: "a1b2c3d4-e5f6-7890-abcd-ef1234567890_1707753600000.zip"
 */
function generateUniqueFileName() {
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${uuid}_${timestamp}.zip`;
}

/**
 * Sanitiza el nombre original del archivo
 * Elimina caracteres peligrosos y limita longitud
 * 
 * @param {string} originalName - Nombre original del archivo
 * @returns {string} Nombre sanitizado
 * 
 * @example
 * sanitizeFileName("../../malicious file!@#.zip")
 * // Returns: "malicious_file.zip"
 */
function sanitizeFileName(originalName) {
    if (!originalName) return 'archivo.zip';
    
    // Extraer solo el nombre del archivo (sin path)
    let fileName = path.basename(originalName);
    
    // Reemplazar caracteres no permitidos por guión bajo
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Limitar longitud a 100 caracteres
    if (fileName.length > 100) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);
        fileName = nameWithoutExt.substring(0, 100 - ext.length) + ext;
    }
    
    // Asegurar que termine en .zip
    if (!fileName.toLowerCase().endsWith('.zip')) {
        fileName += '.zip';
    }
    
    return fileName;
}

/**
 * Obtiene la ruta completa del archivo en el filesystem
 * 
 * @param {string} fileName - Nombre del archivo
 * @returns {string} Ruta absoluta del archivo
 */
function getFilePath(fileName) {
    return path.join(EVIDENCIAS_DIR, fileName);
}

/**
 * Verifica si un archivo existe
 * 
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<boolean>} true si existe, false si no
 */
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Elimina un archivo del filesystem
 * 
 * @param {string} filePath - Ruta del archivo a eliminar
 * @returns {Promise<boolean>} true si se eliminó, false si no existía
 */
async function deleteFile(filePath) {
    try {
        const exists = await fileExists(filePath);
        if (exists) {
            await fs.unlink(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error al eliminar archivo:', error);
        return false;
    }
}

/**
 * Obtiene el tamaño de un archivo en KB
 * 
 * @param {string} filePath - Ruta del archivo
 * @returns {Promise<number>} Tamaño en KB
 */
async function getFileSizeKB(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return Math.round(stats.size / 1024); // Convertir bytes a KB
    } catch (error) {
        console.error('Error al obtener tamaño del archivo:', error);
        return 0;
    }
}

/**
 * Asegura que el directorio de evidencias existe
 * 
 * @returns {Promise<void>}
 */
async function ensureEvidenciasDir() {
    try {
        await fs.access(EVIDENCIAS_DIR);
    } catch {
        await fs.mkdir(EVIDENCIAS_DIR, { recursive: true });
    }
}

module.exports = {
    EVIDENCIAS_DIR,
    generateUniqueFileName,
    sanitizeFileName,
    getFilePath,
    fileExists,
    deleteFile,
    getFileSizeKB,
    ensureEvidenciasDir
};
