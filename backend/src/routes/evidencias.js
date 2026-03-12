/**
 * ============================================================
 * RUTAS DE EVIDENCIAS (evidencias.js)
 * ============================================================
 * Define los endpoints para gestión de evidencias (.ZIP)
 * Todos los endpoints requieren autenticación y roles específicos.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { requireAuth } = require('../middlewares/authMiddleware');
const { validateZipUpload } = require('../middlewares/validateZipUpload');
const {
    uploadEvidencia,
    markAsComplete,
    listEvidencias,
    downloadEvidencia,
    getVentasElegibles,
    getEvidenciaByVentaId
} = require('../controllers/evidenciaController');

/**
 * Configuración de Multer para subida temporal de archivos
 * Los archivos se guardan temporalmente y luego se mueven a la carpeta final
 */
const upload = multer({
    dest: path.join(__dirname, '../../storage/temp'), // Carpeta temporal
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
});

/**
 * Middleware para verificar roles permitidos
 */
function requireRole(...roles) {
    return (req, res, next) => {
        const userRole = req.user?.role?.toLowerCase();
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                ok: false,
                message: 'No tiene permisos para acceder a este recurso'
            });
        }
        next();
    };
}

/* ========== RUTAS ========== */

/**
 * POST /api/evidencias/upload
 * Sube o reemplaza archivo ZIP de evidencia
 * Roles: Gerencia, Administrativo
 */
router.post(
    '/upload',
    requireAuth,
    requireRole('gerencia', 'administrativo'),
    upload.single('file'),
    validateZipUpload,
    uploadEvidencia
);

/**
 * PATCH /api/evidencias/:ventaId/complete
 * Marca evidencia como "terminada"
 * Roles: Gerencia, Administrativo
 */
router.patch(
    '/:ventaId/complete',
    requireAuth,
    requireRole('gerencia', 'administrativo'),
    markAsComplete
);

/**
 * GET /api/evidencias
 * Lista evidencias con filtros opcionales
 * Query params: fechaDesde, fechaHasta, estado, cuil, nombre
 * Roles: Gerencia, Administrativo
 */
router.get(
    '/',
    requireAuth,
    requireRole('gerencia', 'administrativo'),
    listEvidencias
);

/**
 * GET /api/evidencias/ventas-elegibles
 * Obtiene ventas elegibles para evidencias (sin evidencia terminada)
 * Roles: Gerencia, Administrativo
 */
router.get(
    '/ventas-elegibles',
    requireAuth,
    requireRole('gerencia', 'administrativo'),
    getVentasElegibles
);

/**
 * GET /api/evidencias/:ventaId
 * Obtiene evidencia específica por ventaId
 * Roles: Gerencia, Administrativo
 */
router.get(
    '/:ventaId',
    requireAuth,
    requireRole('gerencia', 'administrativo'),
    getEvidenciaByVentaId
);

/**
 * GET /api/evidencias/:ventaId/download
 * Descarga archivo ZIP de evidencia
 * Control de acceso según estado:
 * - terminada: Solo Gerencia
 * - incompleta/en_proceso: Gerencia y Administrativo
 */
router.get(
    '/:ventaId/download',
    requireAuth,
    requireRole('gerencia', 'administrativo'),
    downloadEvidencia
);

module.exports = router;
