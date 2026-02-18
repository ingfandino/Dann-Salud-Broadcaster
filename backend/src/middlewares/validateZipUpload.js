/**
 * ============================================================
 * MIDDLEWARE DE VALIDACIÓN DE ARCHIVOS ZIP (validateZipUpload.js)
 * ============================================================
 * Valida archivos ZIP antes de procesarlos.
 * Verifica extensión, MIME type, tamaño y permisos de usuario.
 * 
 * NUNCA confiar en validaciones del frontend.
 */

const logger = require('../utils/logger');

/**
 * Tamaño máximo permitido: 100 MB en bytes
 */
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

/**
 * Tamaño máximo permitido: 100,000 KB
 */
const MAX_FILE_SIZE_KB = 100000; // 100 MB en KB

/**
 * MIME types válidos para archivos ZIP
 */
const VALID_MIME_TYPES = [
    'application/zip',
    'application/x-zip-compressed',
    'application/x-zip',
    'application/octet-stream' // Algunos navegadores usan este MIME
];

/**
 * Extensiones válidas
 */
const VALID_EXTENSIONS = ['.zip'];

/**
 * Roles permitidos para subir evidencias
 */
const ALLOWED_ROLES = ['gerencia', 'administrativo'];

/**
 * Middleware de validación de archivos ZIP
 * 
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Función next de Express
 */
function validateZipUpload(req, res, next) {
    try {
        // 1. Verificar que el usuario esté autenticado
        if (!req.user) {
            logger.warn('[VALIDATE_ZIP] Intento de subida sin autenticación');
            return res.status(401).json({
                ok: false,
                message: 'No autenticado'
            });
        }

        // 2. Verificar rol del usuario
        const userRole = req.user.role?.toLowerCase();
        if (!ALLOWED_ROLES.includes(userRole)) {
            logger.warn(`[VALIDATE_ZIP] Usuario ${req.user._id} (rol: ${userRole}) sin permisos para subir evidencias`);
            return res.status(403).json({
                ok: false,
                message: 'No tiene permisos para subir evidencias'
            });
        }

        // 3. Verificar que existe un archivo
        if (!req.file) {
            logger.warn(`[VALIDATE_ZIP] Usuario ${req.user._id} intentó subir sin archivo`);
            return res.status(400).json({
                ok: false,
                message: 'No se proporcionó ningún archivo'
            });
        }

        const file = req.file;

        // 4. Validar extensión del archivo
        const fileName = file.originalname?.toLowerCase() || '';
        const hasValidExtension = VALID_EXTENSIONS.some(ext => fileName.endsWith(ext));
        
        if (!hasValidExtension) {
            logger.warn(`[VALIDATE_ZIP] Usuario ${req.user._id} intentó subir archivo con extensión inválida: ${fileName}`);
            return res.status(400).json({
                ok: false,
                message: 'Solo se permiten archivos .zip'
            });
        }

        // 5. Validar MIME type
        const fileMimeType = file.mimetype?.toLowerCase() || '';
        const hasValidMimeType = VALID_MIME_TYPES.includes(fileMimeType);
        
        if (!hasValidMimeType) {
            logger.warn(`[VALIDATE_ZIP] Usuario ${req.user._id} intentó subir archivo con MIME inválido: ${fileMimeType}`);
            return res.status(400).json({
                ok: false,
                message: 'El tipo de archivo no es válido. Solo se permiten archivos ZIP'
            });
        }

        // 6. Validar tamaño del archivo
        const fileSizeBytes = file.size || 0;
        const fileSizeKB = Math.round(fileSizeBytes / 1024);
        
        if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
            logger.warn(`[VALIDATE_ZIP] Usuario ${req.user._id} intentó subir archivo demasiado grande: ${fileSizeKB} KB`);
            return res.status(400).json({
                ok: false,
                message: `El archivo es demasiado grande. Tamaño máximo: 100 MB (${fileSizeKB} KB proporcionados)`
            });
        }

        // 7. Validar que el archivo no esté vacío
        if (fileSizeBytes === 0) {
            logger.warn(`[VALIDATE_ZIP] Usuario ${req.user._id} intentó subir archivo vacío`);
            return res.status(400).json({
                ok: false,
                message: 'El archivo está vacío'
            });
        }

        // ✅ Todas las validaciones pasaron
        logger.info(`[VALIDATE_ZIP] Archivo válido de usuario ${req.user._id}: ${fileName} (${fileSizeKB} KB)`);
        
        // Agregar información adicional al request para uso posterior
        req.fileInfo = {
            sizeKB: fileSizeKB,
            originalName: file.originalname,
            mimeType: file.mimetype
        };

        next();

    } catch (error) {
        logger.error('[VALIDATE_ZIP] Error en validación:', error);
        return res.status(500).json({
            ok: false,
            message: 'Error al validar el archivo'
        });
    }
}

module.exports = {
    validateZipUpload,
    MAX_FILE_SIZE_KB,
    MAX_FILE_SIZE_BYTES,
    VALID_MIME_TYPES,
    VALID_EXTENSIONS,
    ALLOWED_ROLES
};
