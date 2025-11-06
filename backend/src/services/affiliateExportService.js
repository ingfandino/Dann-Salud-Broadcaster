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
 * Generar y enviar archivos XLSX de afiliados a supervisores
 * ✅ CORRECCIÓN BUG 3: Solo genera N archivos según supervisores activos
 * ✅ CORRECCIÓN BUG 4: Usa formato XLSX en lugar de CSV
 */
async function generateAndSendAffiliateCSVs() {
    try {
        logger.info("🔄 Iniciando generación programada de archivos XLSX de afiliados...");

        // Obtener configuración activa
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
        
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Ejecutar solo si la hora actual coincide con la hora programada
        if (currentHour !== scheduledHour || currentMinute !== scheduledMinute) {
            return; // No es la hora todavía
        }

        // Verificar si ya se ejecutó hoy
        const lastExecuted = config.lastExecuted;
        if (lastExecuted) {
            const lastExecDate = new Date(lastExecuted);
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

        // ✅ BUG 3: Obtener supervisores activos primero
        const supervisors = await User.find({ role: "supervisor", active: true }).lean();
        
        if (supervisors.length === 0) {
            logger.warn("⚠️ No hay supervisores activos para enviar archivos");
            config.lastExecuted = new Date();
            await config.save();
            return;
        }
        
        logger.info(`👥 Supervisores activos: ${supervisors.length}`);
        
        // ✅ BUG 3: Calcular total de afiliados necesarios
        const affiliatesPerFile = config.affiliatesPerFile;
        const totalNeeded = supervisors.length * affiliatesPerFile;
        
        logger.info(`📋 Afiliados necesarios: ${totalNeeded} (${affiliatesPerFile} por supervisor)`);

        // Obtener afiliados NO EXPORTADOS según filtros
        const query = { active: true, exported: false };
        if (config.filters) {
            if (config.filters.obraSocial) query.obraSocial = config.filters.obraSocial;
            if (config.filters.localidad) query.localidad = config.filters.localidad;
            if (config.filters.minAge || config.filters.maxAge) {
                query.edad = {};
                if (config.filters.minAge) query.edad.$gte = config.filters.minAge;
                if (config.filters.maxAge) query.edad.$lte = config.filters.maxAge;
            }
        }

        const availableAffiliates = await Affiliate.find(query)
            .limit(totalNeeded)
            .sort({ uploadDate: 1 })
            .lean();

        if (availableAffiliates.length === 0) {
            logger.info("⚠️ No hay afiliados disponibles (sin exportar) para generar archivos");
            config.lastExecuted = new Date();
            await config.save();
            return;
        }

        logger.info(`📊 Afiliados disponibles: ${availableAffiliates.length}`);

        // ✅ BUG 3: Dividir SOLO en archivos por supervisor (no usar todos)
        const filesData = [];
        const totalFiles = supervisors.length;

        const batchId = `batch_${Date.now()}`;
        const affiliateIds = []; // Para marcar como exportados
        
        for (let i = 0; i < totalFiles; i++) {
            const supervisor = supervisors[i];
            const start = i * affiliatesPerFile;
            const end = Math.min(start + affiliatesPerFile, availableAffiliates.length);
            const chunk = availableAffiliates.slice(start, end);
            
            if (chunk.length === 0) {
                logger.warn(`⚠️ No hay suficientes afiliados para supervisor ${supervisor.nombre}`);
                continue;
            }

            // Formatear para mensajería masiva
            const formattedData = chunk.map(aff => ({
                nombre: aff.nombre,
                telefono: aff.telefono1,
                obra_social: aff.obraSocial,
                localidad: aff.localidad,
                edad: aff.edad || "",
                cuil: aff.cuil
            }));

            // ✅ BUG 4: Generar XLSX en lugar de CSV
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Afiliados');
            
            // Definir columnas
            worksheet.columns = [
                { header: 'nombre', key: 'nombre', width: 30 },
                { header: 'telefono', key: 'telefono', width: 15 },
                { header: 'obra_social', key: 'obra_social', width: 25 },
                { header: 'localidad', key: 'localidad', width: 20 },
                { header: 'edad', key: 'edad', width: 10 },
                { header: 'cuil', key: 'cuil', width: 15 }
            ];
            
            // Agregar datos
            formattedData.forEach(row => worksheet.addRow(row));
            
            // Estilo del header
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF4472C4' }
            };
            
            const filename = `afiliados_${supervisor._id}_${Date.now()}.xlsx`;
            
            filesData.push({
                filename,
                workbook,
                count: chunk.length,
                supervisor
            });
            
            // Recopilar IDs para marcar como exportados
            chunk.forEach(aff => affiliateIds.push(aff._id));
        }

        // Guardar archivos XLSX
        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");
        await fs.mkdir(uploadDir, { recursive: true });

        const savedFiles = [];
        for (const fileData of filesData) {
            const filePath = path.join(uploadDir, fileData.filename);
            await fileData.workbook.xlsx.writeFile(filePath);
            savedFiles.push({
                path: filePath,
                filename: fileData.filename,
                count: fileData.count,
                supervisor: fileData.supervisor
            });
        }

        logger.info(`✅ ${savedFiles.length} archivos XLSX generados`);
        
        // ✅ BUG 3: Marcar afiliados como exportados
        if (affiliateIds.length > 0) {
            const updateResult = await Affiliate.updateMany(
                { _id: { $in: affiliateIds } },
                { 
                    $set: { 
                        exported: true,
                        exportedAt: new Date(),
                        exportBatchId: batchId
                    }
                }
            );
            logger.info(`✅ ${updateResult.modifiedCount} afiliados marcados como exportados`);
        }

        // Verificar que hay archivos para enviar
        if (savedFiles.length === 0) {
            logger.warn("⚠️ No se generaron archivos para enviar");
            config.lastExecuted = new Date();
            await config.save();
            return;
        }

        // Obtener usuario del sistema para enviar mensajes
        let systemUser = await User.findOne({ email: "system@dann-salud.com" });
        if (!systemUser) {
            const admins = await User.find({ role: "admin", active: true }).limit(1);
            systemUser = admins[0];
        }

        if (!systemUser) {
            logger.error("❌ No se encontró usuario del sistema para enviar mensajes");
            return;
        }

        // ✅ Enviar mensaje INDIVIDUAL a cada supervisor con SU archivo
        const subject = `📊 Tu Listado de Afiliados - ${new Date().toLocaleDateString("es-AR")}`;

        // Enviar mensaje INDIVIDUAL a cada supervisor con SU archivo específico
        const io = global.io;
        
        for (const fileInfo of savedFiles) {
            try {
                const supervisor = fileInfo.supervisor;
                
                // Marcar afiliados de este archivo como asignados a este supervisor
                const fileAffiliateIds = availableAffiliates
                    .slice(
                        savedFiles.indexOf(fileInfo) * affiliatesPerFile,
                        (savedFiles.indexOf(fileInfo) + 1) * affiliatesPerFile
                    )
                    .map(aff => aff._id);
                
                await Affiliate.updateMany(
                    { _id: { $in: fileAffiliateIds } },
                    { $set: { exportedTo: supervisor._id } }
                );
                
                const content = `¡Hola ${supervisor.nombre}!

Se ha generado tu listado de afiliados programado para hoy.

📋 Tu archivo: ${fileInfo.filename}
👥 Afiliados en tu archivo: ${fileInfo.count}
📅 Fecha: ${new Date().toLocaleDateString("es-AR")}

El archivo está listo para usar en campañas de mensajería masiva. Contiene los datos en formato XLSX con las columnas: nombre, teléfono, obra social, localidad, edad, cuil.

🔹 Para usar:
1. Ve a: Base de Afiliados → Exportaciones
2. Descarga tu archivo
3. Ve a Mensajería Masiva
4. Carga el archivo XLSX y crea tu campaña

⚠️ Este archivo es exclusivo para ti. Cada supervisor recibe su propio listado.

Este mensaje fue generado automáticamente por el sistema.

Att. Sistema Dann Salud`;
                
                // Crear mensaje individual
                const message = new InternalMessage({
                    from: systemUser._id,
                    to: supervisor._id,
                    subject,
                    content,
                    read: false
                });

                await message.save();

                // Emitir notificación Socket.io
                if (io) {
                    io.to(`user_${supervisor._id}`).emit("new_message", {
                        _id: message._id,
                        from: { nombre: systemUser.nombre, email: systemUser.email },
                        subject: message.subject,
                        content: message.content.substring(0, 100) + "...",
                        createdAt: message.createdAt,
                        hasAttachments: false
                    });
                }

                logger.info(`📨 Mensaje enviado a supervisor: ${supervisor.nombre} (${fileInfo.filename})`);

            } catch (error) {
                logger.error(`Error enviando mensaje a supervisor:`, error);
            }
        }

        // Marcar configuración como ejecutada
        config.lastExecuted = new Date();
        await config.save();

        logger.info(`✅ Exportación completada y enviada a ${savedFiles.length} supervisor(es)`);

    } catch (error) {
        logger.error("❌ Error en generación programada de CSVs:", error);
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
                
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    downloadUrl: `/affiliates/download-export/${filename}`,
                    supervisorId
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
