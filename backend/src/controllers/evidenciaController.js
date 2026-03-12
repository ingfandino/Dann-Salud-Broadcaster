/**
 * ============================================================
 * CONTROLADOR DE EVIDENCIAS (evidenciaController.js)
 * ============================================================
 * Gestiona la carga, consulta y descarga de archivos ZIP
 * de evidencias asociados a ventas (Audits).
 */

const Evidencia = require('../models/Evidencia');
const Audit = require('../models/Audit');
const logger = require('../utils/logger');
const {
    generateUniqueFileName,
    sanitizeFileName,
    getFilePath,
    deleteFile,
    getFileSizeKB,
    ensureEvidenciasDir
} = require('../utils/fileUtils');
const {
    canMarkAsComplete,
    shouldLockEvidencia,
    getNewEvidenciaEstado,
    validateEstadoChange
} = require('../utils/evidenciaUtils');
const fs = require('fs').promises;
const path = require('path');

/**
 * POST /api/evidencias/upload
 * Sube o reemplaza el archivo ZIP de una evidencia
 */
async function uploadEvidencia(req, res) {
    try {
        const { ventaId } = req.body;
        const userId = req.user._id;
        const file = req.file;

        // Validar ventaId
        if (!ventaId) {
            return res.status(400).json({
                ok: false,
                message: 'El ID de la venta es requerido'
            });
        }

        // Verificar que la venta existe
        const venta = await Audit.findById(ventaId);
        if (!venta) {
            return res.status(404).json({
                ok: false,
                message: 'Venta no encontrada'
            });
        }

        // Nota: Se eliminó el filtro por estado. Toda venta existente es elegible para evidencia.

        // Asegurar que el directorio existe
        await ensureEvidenciasDir();

        // Buscar evidencia existente
        let evidencia = await Evidencia.findOne({ ventaId });

        // Si existe y está bloqueada, rechazar
        if (evidencia && evidencia.isLocked) {
            return res.status(403).json({
                ok: false,
                message: 'La evidencia está bloqueada. No se puede reemplazar el archivo.'
            });
        }

        // Generar nombre único para el archivo
        const uniqueFileName = generateUniqueFileName();
        const filePath = getFilePath(uniqueFileName);

        // Mover archivo a la carpeta de evidencias
        await fs.rename(file.path, filePath);

        // Obtener tamaño del archivo
        const fileSizeKB = await getFileSizeKB(filePath);

        // Sanitizar nombre original
        const sanitizedOriginalName = sanitizeFileName(file.originalname);

        if (evidencia) {
            // REEMPLAZAR evidencia existente
            
            // Eliminar archivo anterior si existe
            if (evidencia.filePath) {
                await deleteFile(evidencia.filePath);
            }

            // Actualizar evidencia
            evidencia.filePath = filePath;
            evidencia.originalName = sanitizedOriginalName;
            evidencia.fileSizeKB = fileSizeKB;
            evidencia.uploadedBy = userId;
            evidencia.uploadedAt = new Date();
            evidencia.estado = 'en_proceso';
            
            // No bloquear en upload: el bloqueo ocurre al marcar como terminada
            evidencia.isLocked = false;

            await evidencia.save();

            logger.info(`[EVIDENCIA] Archivo reemplazado para venta ${ventaId} por usuario ${userId}`);

            return res.json({
                ok: true,
                message: 'Archivo reemplazado exitosamente',
                evidencia
            });

        } else {
            // CREAR nueva evidencia
            
            evidencia = new Evidencia({
                ventaId,
                estado: 'en_proceso',
                filePath,
                originalName: sanitizedOriginalName,
                fileSizeKB,
                uploadedBy: userId,
                uploadedAt: new Date(),
                isLocked: false
            });

            await evidencia.save();

            logger.info(`[EVIDENCIA] Nueva evidencia creada para venta ${ventaId} por usuario ${userId}`);

            return res.status(201).json({
                ok: true,
                message: 'Archivo subido exitosamente',
                evidencia
            });
        }

    } catch (error) {
        logger.error('[EVIDENCIA] Error en uploadEvidencia:', error);
        
        // Si hay error, intentar eliminar el archivo temporal
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                logger.error('[EVIDENCIA] Error al eliminar archivo temporal:', unlinkError);
            }
        }

        return res.status(500).json({
            ok: false,
            message: 'Error al subir el archivo',
            error: error.message
        });
    }
}

/**
 * PATCH /api/evidencias/:ventaId/complete
 * Marca una evidencia como "terminada"
 * Solo permite marcar si la venta está exactamente en estado "QR hecho"
 */
async function markAsComplete(req, res) {
    try {
        const { ventaId } = req.params;
        const userId = req.user._id;

        // Buscar evidencia
        const evidencia = await Evidencia.findOne({ ventaId });
        if (!evidencia) {
            return res.status(404).json({
                ok: false,
                message: 'Evidencia no encontrada'
            });
        }

        // Verificar que existe archivo ZIP
        if (!evidencia.filePath) {
            return res.status(400).json({
                ok: false,
                message: 'Debe subir un archivo ZIP antes de marcar como terminada'
            });
        }

        // Obtener estado actual de la venta
        const venta = await Audit.findById(ventaId);
        if (!venta) {
            return res.status(404).json({
                ok: false,
                message: 'Venta no encontrada'
            });
        }

        // Validar que se puede marcar como terminada
        const validation = validateEstadoChange(evidencia, 'terminada', venta.status);
        if (!validation.valid) {
            return res.status(400).json({
                ok: false,
                message: validation.message
            });
        }

        // Actualizar estado y bloquear si corresponde
        evidencia.estado = 'terminada';
        evidencia.isLocked = shouldLockEvidencia(venta.status, evidencia.filePath);
        await evidencia.save();

        logger.info(`[EVIDENCIA] Evidencia ${evidencia._id} marcada como terminada por usuario ${userId}`);

        return res.json({
            ok: true,
            message: 'Evidencia marcada como terminada',
            evidencia
        });

    } catch (error) {
        logger.error('[EVIDENCIA] Error en markAsComplete:', error);
        return res.status(500).json({
            ok: false,
            message: 'Error al marcar como terminada',
            error: error.message
        });
    }
}

/**
 * GET /api/evidencias
 * Lista evidencias con filtros
 */
async function listEvidencias(req, res) {
    try {
        const {
            fechaDesde,
            fechaHasta,
            estado,
            cuil,
            nombre,
            administrativos
        } = req.query;

        // Construir filtro
        const filter = {};

        // Filtro por estado de evidencia
        if (estado) {
            filter.estado = estado;
        }

        // Filtro por fecha de subida
        if (fechaDesde || fechaHasta) {
            filter.uploadedAt = {};
            if (fechaDesde) {
                filter.uploadedAt.$gte = new Date(fechaDesde);
            }
            if (fechaHasta) {
                const hasta = new Date(fechaHasta);
                hasta.setHours(23, 59, 59, 999);
                filter.uploadedAt.$lte = hasta;
            }
        }

        // Buscar evidencias
        let evidencias = await Evidencia.find(filter)
            .populate({
                path: 'ventaId',
                select: 'nombre cuil telefono obraSocialVendida status administrador',
                populate: {
                    path: 'administrador',
                    select: 'nombre email'
                }
            })
            .populate('uploadedBy', 'nombre email')
            .sort({ uploadedAt: -1 })
            .lean();

        // Filtrar evidencias huérfanas (ventaId eliminado)
        evidencias = evidencias.filter(ev => ev.ventaId != null);

        // Filtros adicionales por campos de la venta (después del populate)
        if (cuil || nombre) {
            evidencias = evidencias.filter(ev => {
                if (!ev.ventaId) return false;
                
                if (cuil && ev.ventaId.cuil) {
                    if (!ev.ventaId.cuil.includes(cuil)) return false;
                }
                
                if (nombre && ev.ventaId.nombre) {
                    if (!ev.ventaId.nombre.toLowerCase().includes(nombre.toLowerCase())) return false;
                }
                
                return true;
            });
        }

        // Filtro por administrativos (array de IDs)
        if (administrativos) {
            const adminIds = typeof administrativos === 'string'
                ? administrativos.split(',').map(id => id.trim()).filter(Boolean)
                : Array.isArray(administrativos) ? administrativos : [];
            if (adminIds.length > 0) {
                evidencias = evidencias.filter(ev => {
                    if (!ev.ventaId) return false;
                    const adminId = ev.ventaId.administrador?._id?.toString() || ev.ventaId.administrador?.toString();
                    return adminId && adminIds.includes(adminId);
                });
            }
        }

        return res.json({
            ok: true,
            evidencias,
            total: evidencias.length
        });

    } catch (error) {
        logger.error('[EVIDENCIA] Error en listEvidencias:', error);
        return res.status(500).json({
            ok: false,
            message: 'Error al listar evidencias',
            error: error.message
        });
    }
}

/**
 * GET /api/evidencias/:ventaId/download
 * Descarga el archivo ZIP de una evidencia
 */
async function downloadEvidencia(req, res) {
    try {
        const { ventaId } = req.params;
        const userRole = req.user.role?.toLowerCase();

        // Buscar evidencia
        const evidencia = await Evidencia.findOne({ ventaId });
        if (!evidencia) {
            return res.status(404).json({
                ok: false,
                message: 'Evidencia no encontrada'
            });
        }

        // Verificar que existe archivo
        if (!evidencia.filePath) {
            return res.status(404).json({
                ok: false,
                message: 'No hay archivo disponible para descargar'
            });
        }

        // Control de acceso según estado de evidencia
        if (evidencia.estado === 'terminada') {
            // Solo Gerencia puede descargar evidencias terminadas
            if (userRole !== 'gerencia') {
                return res.status(403).json({
                    ok: false,
                    message: 'Solo Gerencia puede descargar evidencias terminadas'
                });
            }
        } else {
            // Incompleta o en_proceso: Administrativo y Gerencia pueden descargar
            if (!['gerencia', 'administrativo'].includes(userRole)) {
                return res.status(403).json({
                    ok: false,
                    message: 'No tiene permisos para descargar esta evidencia'
                });
            }
        }

        // Verificar que el archivo existe en el filesystem
        try {
            await fs.access(evidencia.filePath);
        } catch {
            logger.error(`[EVIDENCIA] Archivo no encontrado en filesystem: ${evidencia.filePath}`);
            return res.status(404).json({
                ok: false,
                message: 'El archivo no está disponible en el servidor'
            });
        }

        // Servir archivo por stream
        const fileName = evidencia.originalName || 'evidencia.zip';
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        const fileStream = require('fs').createReadStream(evidencia.filePath);
        fileStream.pipe(res);

        logger.info(`[EVIDENCIA] Usuario ${req.user._id} descargó evidencia ${evidencia._id}`);

    } catch (error) {
        logger.error('[EVIDENCIA] Error en downloadEvidencia:', error);
        return res.status(500).json({
            ok: false,
            message: 'Error al descargar el archivo',
            error: error.message
        });
    }
}

/**
 * GET /api/evidencias/ventas-elegibles
 * Obtiene lista de ventas elegibles para evidencias (sin evidencia "terminada")
 * Soporta paginación y filtros de búsqueda
 * 
 * Query params:
 *   page (default 1), limit (default 50), nombre, cuil, fechaDesde, fechaHasta
 */
async function getVentasElegibles(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const { nombre, cuil, fechaDesde, fechaHasta, administrativos } = req.query;

        // Obtener todas las evidencias terminadas
        const evidenciasTerminadas = await Evidencia.find({ estado: 'terminada' })
            .select('ventaId')
            .lean();

        const ventasConEvidenciaTerminada = evidenciasTerminadas.map(e => e.ventaId);

        // Construir filtro base — solo ventas que tuvieron estado "Completa" en su historial
        const filter = {
            _id: { $nin: ventasConEvidenciaTerminada },
            'statusHistory': { $elemMatch: { value: 'Completa' } }
        };

        // Filtros de búsqueda
        if (nombre) {
            filter.nombre = { $regex: nombre, $options: 'i' };
        }
        if (cuil) {
            filter.cuil = { $regex: cuil, $options: 'i' };
        }
        // Filtro por administrativos (array de IDs)
        if (administrativos) {
            const adminIds = typeof administrativos === 'string'
                ? administrativos.split(',').map(id => id.trim()).filter(Boolean)
                : Array.isArray(administrativos) ? administrativos : [];
            if (adminIds.length > 0) {
                const mongoose = require('mongoose');
                filter.administrador = { $in: adminIds.map(id => new mongoose.Types.ObjectId(id)) };
            }
        }

        if (fechaDesde || fechaHasta) {
            filter.$or = [
                { fechaCreacionQR: {} },
                { createdAt: {} }
            ];
            // Filtrar por fechaCreacionQR o createdAt
            const dateFilter = {};
            if (fechaDesde) {
                dateFilter.$gte = new Date(fechaDesde);
            }
            if (fechaHasta) {
                const hasta = new Date(fechaHasta);
                hasta.setHours(23, 59, 59, 999);
                dateFilter.$lte = hasta;
            }
            filter.$or = [
                { fechaCreacionQR: dateFilter },
                { fechaCreacionQR: null, createdAt: dateFilter }
            ];
        }

        // Contar total para paginación
        const total = await Audit.countDocuments(filter);
        const totalPages = Math.ceil(total / limit);
        const skip = (page - 1) * limit;

        // Buscar ventas elegibles con paginación
        const ventas = await Audit.find(filter)
            .select('_id nombre cuil telefono obraSocialVendida status fechaCreacionQR createdAt administrador')
            .populate('administrador', 'nombre email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.json({
            ok: true,
            ventas,
            total,
            page,
            totalPages,
            limit
        });

    } catch (error) {
        logger.error('[EVIDENCIA] Error en getVentasElegibles:', error);
        return res.status(500).json({
            ok: false,
            message: 'Error al obtener ventas elegibles',
            error: error.message
        });
    }
}

/**
 * GET /api/evidencias/:ventaId
 * Obtiene una evidencia específica por ventaId
 */
async function getEvidenciaByVentaId(req, res) {
    try {
        const { ventaId } = req.params;

        const evidencia = await Evidencia.findOne({ ventaId })
            .populate('ventaId', 'nombre cuil telefono obraSocialVendida status')
            .populate('uploadedBy', 'nombre email')
            .lean();

        if (!evidencia) {
            return res.status(404).json({
                ok: false,
                message: 'Evidencia no encontrada'
            });
        }

        return res.json({
            ok: true,
            evidencia
        });

    } catch (error) {
        logger.error('[EVIDENCIA] Error en getEvidenciaByVentaId:', error);
        return res.status(500).json({
            ok: false,
            message: 'Error al obtener evidencia',
            error: error.message
        });
    }
}

module.exports = {
    uploadEvidencia,
    markAsComplete,
    listEvidencias,
    downloadEvidencia,
    getVentasElegibles,
    getEvidenciaByVentaId
};
