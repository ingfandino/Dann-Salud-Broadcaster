// backend/src/services/affiliateExportService.js

const Affiliate = require("../models/Affiliate");
const AffiliateExportConfig = require("../models/AffiliateExportConfig");
const User = require("../models/User");
const InternalMessage = require("../models/InternalMessage");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs").promises;
const ExcelJS = require("exceljs");

/**
 * Obtener afiliados según distribución de obra social
 * @param {Array} distribution - Distribución [{obraSocial, cantidad}]
 * @param {Object} baseQuery - Query base para filtros
 * @param {Set} usedIds - IDs ya usados (para evitar duplicados)
 */
async function getAffiliatesByDistribution(distribution, baseQuery, usedIds = new Set()) {
    const affiliates = [];
    
    if (!distribution || distribution.length === 0) {
        // Sin distribución: obtener afiliados aleatorios
        return [];
    }
    
    for (const dist of distribution) {
        const query = { ...baseQuery, _id: { $nin: Array.from(usedIds) } };
        
        if (dist.obraSocial === "*") {
            // Obtener afiliados de obras sociales NO especificadas
            const usedObraSociales = distribution
                .filter(d => d.obraSocial !== "*")
                .map(d => d.obraSocial);
            
            if (usedObraSociales.length > 0) {
                query.obraSocial = { $nin: usedObraSociales };
            }
        } else {
            // Obtener afiliados de obra social específica
            query.obraSocial = dist.obraSocial;
        }
        
        const affs = await Affiliate.find(query)
            .limit(dist.cantidad)
            .sort({ uploadDate: 1 })
            .lean();
        
        affiliates.push(...affs);
        affs.forEach(aff => usedIds.add(aff._id));
        
        if (affs.length < dist.cantidad) {
            logger.warn(`⚠️ Solo se encontraron ${affs.length}/${dist.cantidad} afiliados de ${dist.obraSocial === "*" ? "otras obras sociales" : dist.obraSocial}`);
        }
    }
    
    return affiliates;
}

/**
 * Generar archivo XLSX con afiliados
 */
async function generateXLSXFile(supervisor, affiliates, uploadDir) {
    const formattedData = affiliates.map(aff => ({
        nombre: aff.nombre,
        telefono: aff.telefono1,
        obra_social: aff.obraSocial,
        localidad: aff.localidad,
        edad: aff.edad || "",
        cuil: aff.cuil
    }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Afiliados');
    
    worksheet.columns = [
        { header: 'nombre', key: 'nombre', width: 30 },
        { header: 'telefono', key: 'telefono', width: 15 },
        { header: 'obra_social', key: 'obra_social', width: 25 },
        { header: 'localidad', key: 'localidad', width: 20 },
        { header: 'edad', key: 'edad', width: 10 },
        { header: 'cuil', key: 'cuil', width: 15 }
    ];
    
    formattedData.forEach(row => worksheet.addRow(row));
    
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    
    const filename = `afiliados_${supervisor._id}_${Date.now()}.xlsx`;
    const filePath = path.join(uploadDir, filename);
    
    await workbook.xlsx.writeFile(filePath);
    
    return { filename, filePath, count: affiliates.length };
}

/**
 * Generar y enviar archivos XLSX de afiliados a supervisores
 * ✅ Soporte para envío MASIVO y AVANZADO
 * ✅ Distribución por obra social
 */
async function generateAndSendAffiliateCSVs() {
    try {
        logger.info("🔄 Iniciando generación programada de archivos XLSX de afiliados...");

        const config = await AffiliateExportConfig.findOne({ active: true });
        
        if (!config) {
            logger.info("⏸️ No hay configuración activa de exportación");
            return;
        }

        // Verificar si es hora de ejecutar
        const now = new Date();
        const [hours, minutes] = config.scheduledTime.split(":");
        const scheduledHour = parseInt(hours);
        const scheduledMinute = parseInt(minutes);
        
        if (now.getHours() !== scheduledHour || now.getMinutes() !== scheduledMinute) {
            return;
        }

        // Verificar si ya se ejecutó hoy
        if (config.lastExecuted) {
            const lastExecDate = new Date(config.lastExecuted);
            const today = new Date();
            if (
                lastExecDate.getDate() === today.getDate() &&
                lastExecDate.getMonth() === today.getMonth() &&
                lastExecDate.getFullYear() === today.getFullYear()
            ) {
                logger.info("✅ Ya se ejecutó hoy, saltando...");
                return;
            }
        }

        logger.info(`⏰ Ejecutando exportación programada (${config.scheduledTime})`);
        logger.info(`📋 Tipo de envío: ${config.sendType}`);

        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");
        await fs.mkdir(uploadDir, { recursive: true });

        const batchId = `batch_${Date.now()}`;
        const savedFiles = [];
        const usedAffiliateIds = new Set();
        
        // Query base para filtros globales
        // exported: { $ne: true } incluye false, null, undefined
        const baseQuery = { active: true, exported: { $ne: true } };
        if (config.filters) {
            if (config.filters.localidad) baseQuery.localidad = config.filters.localidad;
            if (config.filters.minAge || config.filters.maxAge) {
                baseQuery.edad = {};
                if (config.filters.minAge) baseQuery.edad.$gte = config.filters.minAge;
                if (config.filters.maxAge) baseQuery.edad.$lte = config.filters.maxAge;
            }
        }

        // ========== ENVÍO MASIVO ==========
        if (config.sendType === "masivo") {
            logger.info("📤 Modo: Envío Masivo");
            
            const supervisors = await User.find({ role: "supervisor", active: true }).lean();
            
            if (supervisors.length === 0) {
                logger.warn("⚠️ No hay supervisores activos");
                config.lastExecuted = new Date();
                await config.save();
                return;
            }
            
            logger.info(`👥 Supervisores activos: ${supervisors.length}`);
            
            for (const supervisor of supervisors) {
                let affiliates = [];
                
                // Con distribución de obras sociales
                if (config.obraSocialDistribution && config.obraSocialDistribution.length > 0) {
                    logger.info(`📊 Distribución por OS para ${supervisor.nombre}`);
                    affiliates = await getAffiliatesByDistribution(
                        config.obraSocialDistribution,
                        baseQuery,
                        usedAffiliateIds
                    );
                } else {
                    // Sin distribución: aleatorio
                    const query = { ...baseQuery, _id: { $nin: Array.from(usedAffiliateIds) } };
                    affiliates = await Affiliate.find(query)
                        .limit(config.affiliatesPerFile)
                        .sort({ uploadDate: 1 })
                        .lean();
                    
                    affiliates.forEach(aff => usedAffiliateIds.add(aff._id));
                }
                
                if (affiliates.length === 0) {
                    logger.warn(`⚠️ No hay afiliados disponibles para ${supervisor.nombre}`);
                    continue;
                }
                
                const fileInfo = await generateXLSXFile(supervisor, affiliates, uploadDir);
                savedFiles.push({
                    ...fileInfo,
                    supervisor,
                    affiliates: affiliates.map(a => a._id)
                });
                
                logger.info(`✅ Archivo generado para ${supervisor.nombre}: ${affiliates.length} afiliados`);
            }
        }
        
        // ========== ENVÍO AVANZADO ==========
        else if (config.sendType === "avanzado") {
            logger.info("⚙️ Modo: Envío Avanzado");
            
            if (!config.supervisorConfigs || config.supervisorConfigs.length === 0) {
                logger.warn("⚠️ No hay configuraciones de supervisores");
                config.lastExecuted = new Date();
                await config.save();
                return;
            }
            
            for (const supConfig of config.supervisorConfigs) {
                const supervisor = await User.findById(supConfig.supervisorId).lean();
                
                if (!supervisor || !supervisor.active) {
                    logger.warn(`⚠️ Supervisor ${supConfig.supervisorId} no encontrado o inactivo`);
                    continue;
                }
                
                let affiliates = [];
                
                // Con distribución de obras sociales
                if (supConfig.obraSocialDistribution && supConfig.obraSocialDistribution.length > 0) {
                    logger.info(`📊 Distribución personalizada para ${supervisor.nombre}`);
                    affiliates = await getAffiliatesByDistribution(
                        supConfig.obraSocialDistribution,
                        baseQuery,
                        usedAffiliateIds
                    );
                } else {
                    // Sin distribución: aleatorio
                    const query = { ...baseQuery, _id: { $nin: Array.from(usedAffiliateIds) } };
                    affiliates = await Affiliate.find(query)
                        .limit(supConfig.affiliatesPerFile)
                        .sort({ uploadDate: 1 })
                        .lean();
                    
                    affiliates.forEach(aff => usedAffiliateIds.add(aff._id));
                }
                
                if (affiliates.length === 0) {
                    logger.warn(`⚠️ No hay afiliados disponibles para ${supervisor.nombre}`);
                    continue;
                }
                
                const fileInfo = await generateXLSXFile(supervisor, affiliates, uploadDir);
                savedFiles.push({
                    ...fileInfo,
                    supervisor,
                    affiliates: affiliates.map(a => a._id)
                });
                
                logger.info(`✅ Archivo generado para ${supervisor.nombre}: ${affiliates.length} afiliados`);
            }
        }

        if (savedFiles.length === 0) {
            logger.warn("⚠️ No se generaron archivos");
            config.lastExecuted = new Date();
            await config.save();
            return;
        }

        logger.info(`✅ ${savedFiles.length} archivos XLSX generados`);
        
        // Marcar afiliados como exportados
        for (const fileInfo of savedFiles) {
            await Affiliate.updateMany(
                { _id: { $in: fileInfo.affiliates } },
                { 
                    $set: { 
                        exported: true,
                        exportedAt: new Date(),
                        exportedTo: fileInfo.supervisor._id,
                        exportBatchId: batchId
                    }
                }
            );
        }

        // Enviar notificaciones
        let systemUser = await User.findOne({ email: "system@dann-salud.com" });
        if (!systemUser) {
            const admins = await User.find({ role: "admin", active: true }).limit(1);
            systemUser = admins[0];
        }

        if (systemUser) {
            const subject = `📊 Tu Listado de Afiliados - ${new Date().toLocaleDateString("es-AR")}`;
            const io = global.io;
            
            for (const fileInfo of savedFiles) {
                const content = `¡Hola ${fileInfo.supervisor.nombre}!

Se ha generado tu listado de afiliados programado para hoy.

📋 Tu archivo: ${fileInfo.filename}
👥 Afiliados en tu archivo: ${fileInfo.count}
📅 Fecha: ${new Date().toLocaleDateString("es-AR")}

El archivo está listo para usar en campañas de mensajería masiva.

🔹 Para usar:
1. Ve a: Base de Afiliados → Exportaciones
2. Descarga tu archivo
3. Ve a Mensajería Masiva
4. Carga el archivo XLSX y crea tu campaña

⚠️ Este archivo es exclusivo para ti.

Att. Sistema Dann Salud`;
                
                const message = new InternalMessage({
                    from: systemUser._id,
                    to: fileInfo.supervisor._id,
                    subject,
                    content,
                    read: false
                });

                await message.save();

                if (io) {
                    io.to(`user_${fileInfo.supervisor._id}`).emit("new_message", {
                        _id: message._id,
                        from: { nombre: systemUser.nombre, email: systemUser.email },
                        subject: message.subject,
                        content: message.content.substring(0, 100) + "...",
                        createdAt: message.createdAt,
                        hasAttachments: false
                    });
                }

                logger.info(`📨 Mensaje enviado a: ${fileInfo.supervisor.nombre}`);
            }
        }

        config.lastExecuted = new Date();
        await config.save();

        logger.info(`✅ Exportación completada: ${savedFiles.length} supervisor(es)`);

    } catch (error) {
        logger.error("❌ Error en generación programada:", error);
    }
}

/**
 * Obtener archivos XLSX generados disponibles para descarga
 * @param {Object} user - Usuario que solicita (para filtrar por supervisor)
 */
async function getAvailableExports(user = null) {
    try {
        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");
        
        try {
            await fs.access(uploadDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(uploadDir);
        
        // Filtrar archivos XLSX
        const xlsxFiles = files.filter(f => f.endsWith('.xlsx'));
        
        const filesInfo = await Promise.all(
            xlsxFiles.map(async (filename) => {
                const filePath = path.join(uploadDir, filename);
                const stats = await fs.stat(filePath);
                
                // Extraer supervisor ID del filename (formato: afiliados_SUPERVISORID_timestamp.xlsx)
                const match = filename.match(/afiliados_([a-f0-9]+)_\d+\.xlsx/);
                const supervisorId = match ? match[1] : null;
                
                // Obtener nombre del supervisor
                let supervisorName = "Desconocido";
                if (supervisorId) {
                    try {
                        const supervisor = await User.findById(supervisorId).select('nombre').lean();
                        if (supervisor) {
                            supervisorName = supervisor.nombre;
                        }
                    } catch (err) {
                        logger.warn(`No se pudo obtener nombre del supervisor ${supervisorId}`);
                    }
                }
                
                // Contar afiliados en el archivo
                let affiliateCount = 0;
                try {
                    const workbook = new ExcelJS.Workbook();
                    await workbook.xlsx.readFile(filePath);
                    const worksheet = workbook.getWorksheet('Afiliados');
                    if (worksheet) {
                        affiliateCount = worksheet.rowCount - 1; // -1 para excluir header
                    }
                } catch (err) {
                    logger.warn(`No se pudo contar afiliados en ${filename}`);
                }
                
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    downloadUrl: `/affiliates/download-export/${filename}`,
                    supervisorId,
                    supervisorName,
                    affiliateCount
                };
            })
        );

        // ✅ Filtrar por supervisor si es necesario
        let filtered = filesInfo;
        if (user && user.role === 'supervisor') {
            filtered = filesInfo.filter(f => f.supervisorId === user._id.toString());
        }

        return filtered.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
        logger.error("Error obteniendo exportaciones disponibles:", error);
        return [];
    }
}

module.exports = {
    generateAndSendAffiliateCSVs,
    getAvailableExports
};
