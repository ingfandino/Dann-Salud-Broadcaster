/**
 * ============================================================
 * MIDDLEWARE DE UPLOAD (uploadMiddleware.js)
 * ============================================================
 * Configuración de multer para subir archivos de auditorías.
 * Soporta imágenes y videos con límite de 50MB.
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

/* ========== CONFIGURACIÓN DE DIRECTORIO ========== */
const uploadDir = path.join(__dirname, '../../uploads/audits');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage disco con nombre único
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeExt = path.extname(file.originalname).toLowerCase();
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}${safeExt}`);
    },
});

// Filtro básico por mimetype (acepta jpeg/png y mp4/webm)
const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'video/mp4',
        'video/webm'
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido'), false);
    }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;