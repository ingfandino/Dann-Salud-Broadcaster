// backend/src/middlewares/uploadDNIMiddleware.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Directorio donde guardamos fotos de DNI
const uploadDir = path.join(__dirname, '../../uploads/dni');
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
        cb(null, `dni-${unique}${safeExt}`);
    },
});

// Filtro básico por mimetype (solo imágenes)
const fileFilter = (req, file, cb) => {
    const allowed = [
        'image/jpeg',
        'image/jpg',
        'image/png'
    ];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos JPG y PNG'), false);
    }
};

const uploadDNI = multer({ 
    storage, 
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Máximo 5MB
});

module.exports = uploadDNI;
