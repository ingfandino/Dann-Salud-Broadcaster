// backend/src/services/affiliateExportService.js

const Affiliate = require("../models/Affiliate");
const AffiliateExportConfig = require("../models/AffiliateExportConfig");
const User = require("../models/User");
const InternalMessage = require("../models/InternalMessage");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs").promises;
const { Parser } = require("json2csv");

/**
 * Generar y enviar CSVs de afiliados a supervisores
 */
async function generateAndSendAffiliateCSVs() {
    try {
        logger.info("🔄 Iniciando generación programada de CSVs de afiliados...");

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

        // Obtener afiliados según filtros
        const query = { active: true };
        if (config.filters) {
            if (config.filters.obraSocial) query.obraSocial = config.filters.obraSocial;
            if (config.filters.localidad) query.localidad = config.filters.localidad;
            if (config.filters.minAge || config.filters.maxAge) {
                query.edad = {};
                if (config.filters.minAge) query.edad.$gte = config.filters.minAge;
                if (config.filters.maxAge) query.edad.$lte = config.filters.maxAge;
            }
        }

        const affiliates = await Affiliate.find(query)
            .sort({ uploadDate: -1 })
            .lean();

        if (affiliates.length === 0) {
            logger.info("⚠️ No hay afiliados para exportar");
            
            // Marcar como ejecutado
            config.lastExecuted = new Date();
            await config.save();
            
            return;
        }

        logger.info(`📊 Afiliados a exportar: ${affiliates.length}`);

        // Dividir en archivos según configuración
        const filesData = [];
        const affiliatesPerFile = config.affiliatesPerFile;
        const totalFiles = Math.ceil(affiliates.length / affiliatesPerFile);

        for (let i = 0; i < totalFiles; i++) {
            const start = i * affiliatesPerFile;
            const end = Math.min(start + affiliatesPerFile, affiliates.length);
            const chunk = affiliates.slice(start, end);

            // Formatear para mensajería masiva
            const formattedData = chunk.map(aff => ({
                nombre: aff.nombre,
                telefono: aff.telefono1,
                // Variables personalizables para plantillas de WhatsApp
                obra_social: aff.obraSocial,
                localidad: aff.localidad,
                edad: aff.edad || "",
                cuil: aff.cuil
            }));

            // Generar CSV
            const fields = ["nombre", "telefono", "obra_social", "localidad", "edad", "cuil"];
            const opts = { fields, header: true };
            const parser = new Parser(opts);
            const csv = parser.parse(formattedData);

            filesData.push({
                filename: `afiliados_${i + 1}_de_${totalFiles}_${Date.now()}.csv`,
                content: csv,
                count: chunk.length
            });
        }

        // Guardar archivos
        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");
        await fs.mkdir(uploadDir, { recursive: true });

        const savedFiles = [];
        for (const fileData of filesData) {
            const filePath = path.join(uploadDir, fileData.filename);
            await fs.writeFile(filePath, fileData.content, "utf-8");
            savedFiles.push({
                path: filePath,
                filename: fileData.filename,
                count: fileData.count
            });
        }

        logger.info(`✅ ${savedFiles.length} archivos CSV generados`);

        // Enviar a supervisores vía mensajería interna
        const supervisors = await User.find({ role: "supervisor", active: true }).lean();

        if (supervisors.length === 0) {
            logger.warn("⚠️ No hay supervisores activos para enviar los archivos");
            
            // Marcar como ejecutado
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

        // Preparar mensaje
        const subject = `📊 Listados de Afiliados - ${new Date().toLocaleDateString("es-AR")}`;
        const content = `¡Hola!

Se han generado los listados de afiliados programados para hoy.

📋 Archivos generados: ${savedFiles.length}
👥 Total de afiliados: ${affiliates.length}
📁 Afiliados por archivo: ${affiliatesPerFile}

Los archivos están listos para usar en campañas de mensajería masiva. Cada archivo contiene los datos en el formato correcto (nombre, teléfono, obra social, localidad, edad, cuil).

🔹 Para usar:
1. Descarga los archivos adjuntos
2. Ve a Mensajería Masiva
3. Carga el CSV y crea tu campaña

Este mensaje fue generado automáticamente por el sistema.

Att. Sistema Dann Salud`;

        // Enviar mensaje a cada supervisor con archivos como "adjuntos" (nota en el mensaje)
        const io = global.io;
        
        for (const supervisor of supervisors) {
            try {
                // Crear mensaje individual
                const message = new InternalMessage({
                    from: systemUser._id,
                    to: supervisor._id,
                    subject,
                    content: content + `\n\n📥 Descarga los archivos desde: Panel de Base de Afiliados → Exportaciones`,
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

                logger.info(`📨 Mensaje enviado a supervisor: ${supervisor.nombre} (${supervisor.email})`);

            } catch (error) {
                logger.error(`Error enviando mensaje a supervisor ${supervisor.email}:`, error);
            }
        }

        // Marcar configuración como ejecutada
        config.lastExecuted = new Date();
        await config.save();

        logger.info(`✅ Exportación completada y enviada a ${supervisors.length} supervisor(es)`);

    } catch (error) {
        logger.error("❌ Error en generación programada de CSVs:", error);
    }
}

/**
 * Obtener archivos CSV generados disponibles para descarga
 */
async function getAvailableExports() {
    try {
        const uploadDir = path.join(__dirname, "../../uploads/affiliate-exports");
        
        try {
            await fs.access(uploadDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(uploadDir);
        
        const filesInfo = await Promise.all(
            files.map(async (filename) => {
                const filePath = path.join(uploadDir, filename);
                const stats = await fs.stat(filePath);
                
                return {
                    filename,
                    size: stats.size,
                    createdAt: stats.birthtime,
                    downloadUrl: `/api/affiliates/download-export/${filename}`
                };
            })
        );

        return filesInfo.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
        logger.error("Error obteniendo exportaciones disponibles:", error);
        return [];
    }
}

module.exports = {
    generateAndSendAffiliateCSVs,
    getAvailableExports
};
