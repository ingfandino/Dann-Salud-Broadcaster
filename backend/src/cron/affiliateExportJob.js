const cron = require('node-cron');
const AffiliateExportConfig = require('../models/AffiliateExportConfig');
const Affiliate = require('../models/Affiliate');
const InternalMessage = require('../models/InternalMessage');
const User = require('../models/User');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

// Ejecutar cada minuto para verificar si hay envíos programados
cron.schedule('* * * * *', async () => {
    try {
        const now = new Date();
        const currentHour = now.getHours().toString().padStart(2, '0');
        const currentMinute = now.getMinutes().toString().padStart(2, '0');
        const currentTime = `${currentHour}:${currentMinute}`;

        // Buscar configuración activa
        const config = await AffiliateExportConfig.findOne({ active: true });

        if (!config) return;

        // Verificar si es la hora programada
        if (config.scheduledTime !== currentTime) return;

        // Verificar si ya se ejecutó hoy
        if (config.lastExecutedAt) {
            const lastExecution = new Date(config.lastExecutedAt);
            if (
                lastExecution.getDate() === now.getDate() &&
                lastExecution.getMonth() === now.getMonth() &&
                lastExecution.getFullYear() === now.getFullYear()
            ) {
                return; // Ya se ejecutó hoy
            }
        }

        logger.info(`🚀 Iniciando exportación programada: ${config.sendType}`);

        // Ejecutar exportación
        await executeExport(config);

        // Actualizar fecha de última ejecución
        config.lastExecutedAt = new Date();
        await config.save();

    } catch (error) {
        logger.error("❌ Error en cron de exportación:", error);
    }
});

async function executeExport(config) {
    const supervisors = [];

    if (config.sendType === 'masivo') {
        // Obtener todos los supervisores
        const allSupervisors = await User.find({ role: 'supervisor', active: true });
        supervisors.push(...allSupervisors.map(s => ({
            supervisorId: s._id,
            affiliatesPerFile: config.affiliatesPerFile,
            obraSocialDistribution: config.obraSocialDistribution
        })));
    } else {
        // Usar configuración específica
        supervisors.push(...config.supervisorConfigs);
    }

    for (const supConfig of supervisors) {
        try {
            await processSupervisorExport(supConfig, config);
        } catch (error) {
            logger.error(`Error procesando exportación para supervisor ${supConfig.supervisorId}:`, error);
        }
    }
}

async function processSupervisorExport(supConfig, globalConfig) {
    const { supervisorId, affiliatesPerFile, obraSocialDistribution } = supConfig;
    const supervisor = await User.findById(supervisorId);

    if (!supervisor) {
        logger.warn(`Supervisor no encontrado: ${supervisorId}`);
        return;
    }

    let affiliates = [];
    const batchId = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Estrategia de selección de afiliados
    // 1. Si hay distribución por obra social, intentar cumplirla
    if (obraSocialDistribution && obraSocialDistribution.length > 0) {
        for (const dist of obraSocialDistribution) {
            const found = await findAffiliates(
                dist.cantidad,
                dist.obraSocial,
                globalConfig.filters,
                globalConfig.dataSourceMix
            );
            affiliates.push(...found);
        }
    } else {
        // 2. Si no, tomar genéricos
        const found = await findAffiliates(
            affiliatesPerFile,
            null,
            globalConfig.filters,
            globalConfig.dataSourceMix
        );
        affiliates.push(...found);
    }

    if (affiliates.length === 0) {
        logger.info(`No hay afiliados disponibles para ${supervisor.nombre}`);
        return;
    }

    // Generar Excel
    const filePath = await generateExcel(affiliates, supervisor);

    // Enviar Mensaje Interno
    await sendInternalMessage(supervisor, filePath, affiliates.length);

    // Actualizar Afiliados (Marcar como exportados y asignados al supervisor)
    // Actualizar Afiliados (Marcar como exportados y asignados al supervisor)
    // Separar en dos grupos: Frescos (isUsed: false) y Reutilizables
    // Los objetos en 'affiliates' vienen de findAffiliates y tienen la propiedad '_source'
    const freshAffiliates = affiliates.filter(a => a._source === 'fresh');
    const reusableAffiliates = affiliates.filter(a => a._source === 'reusable');

    // 1. Actualizar FRESCOS -> leadStatus: 'Asignado'
    if (freshAffiliates.length > 0) {
        await Affiliate.updateMany(
            { _id: { $in: freshAffiliates.map(a => a._id) } },
            {
                $set: {
                    exported: true,
                    exportedAt: new Date(),
                    exportedTo: supervisor._id,
                    exportBatchId: batchId,
                    assignedTo: supervisor._id,
                    leadStatus: 'Asignado', // ✅ Frescos pasan a asignado
                    assignedAt: new Date()
                }
            }
        );
    }

    // 2. Actualizar REUTILIZABLES -> Mantener leadStatus original (para que aparezcan en tab Reutilizables)
    if (reusableAffiliates.length > 0) {
        await Affiliate.updateMany(
            { _id: { $in: reusableAffiliates.map(a => a._id) } },
            {
                $set: {
                    exported: true,
                    exportedAt: new Date(),
                    exportedTo: supervisor._id,
                    exportBatchId: batchId,
                    assignedTo: supervisor._id,
                    // ⛔ NO cambiar leadStatus
                    assignedAt: new Date()
                }
            }
        );
    }

    logger.info(`✅ Exportación completada para ${supervisor.nombre}: ${affiliates.length} afiliados`);
}

async function findAffiliates(limit, obraSocial, filters, mix) {
    const query = {
        active: true,
        exported: { $ne: true } // No exportados previamente
    };

    if (obraSocial) {
        query.obraSocial = obraSocial;
    }

    // Aplicar filtros adicionales si existen
    if (filters) {
        if (filters.minAge) query.edad = { $gte: filters.minAge };
        if (filters.maxAge) query.edad = { $lte: filters.maxAge };
        // ... otros filtros
    }

    // Declarar affiliates fuera del bloque if para evitar undefined
    const affiliates = [];

    // Lógica de Mix (Frescos vs Reutilizables)
    if (mix && mix.enabled) {
        const freshLimit = Math.round(limit * (mix.freshPercentage / 100));
        const reusableLimit = limit - freshLimit;

        // 1. Buscar Frescos (No usados, No exportados)
        if (freshLimit > 0) {
            const freshQuery = { ...query, isUsed: false };
            const freshAffiliates = await Affiliate.find(freshQuery)
                .sort({ uploadDate: -1 })
                .limit(freshLimit)
                .lean(); // ✅ Convertir a POJO
            affiliates.push(...freshAffiliates.map(a => ({ ...a, _source: 'fresh' }))); // ✅ Tag explícito
        }

        // 2. Buscar Reutilizables
        if (reusableLimit > 0) {
            const reusableQuery = {
                active: true,
                $or: [
                    { leadStatus: 'Reutilizable' },
                    { leadStatus: { $in: ['No contesta', 'Llamado'] }, lastInteraction: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
                ]
            };

            if (obraSocial) reusableQuery.obraSocial = obraSocial;
            if (filters) {
                if (filters.minAge) reusableQuery.edad = { $gte: filters.minAge };
                if (filters.maxAge) reusableQuery.edad = { $lte: filters.maxAge };
            }

            const reusableAffiliates = await Affiliate.find(reusableQuery)
                .sort({ lastInteraction: 1 })
                .limit(reusableLimit)
                .lean();

            affiliates.push(...reusableAffiliates.map(a => ({ ...a, _source: 'reusable' })));
        }
    } else {
        // Fallback: Si no hay mix habilitado, traer solo datos frescos
        const freshQuery = { ...query, isUsed: false };
        const freshAffiliates = await Affiliate.find(freshQuery)
            .sort({ uploadDate: -1 })
            .limit(Number(limit))
            .lean();
        affiliates.push(...freshAffiliates.map(a => ({ ...a, _source: 'fresh' })));
    }

    return affiliates;
}

async function generateExcel(affiliates, supervisor) {
    const workbook = XLSX.utils.book_new();

    // Mapear datos para el Excel
    const data = affiliates.map(aff => ({
        Nombre: aff.nombre,
        CUIL: aff.cuil,
        Telefono: aff.telefono1,
        "Obra Social": aff.obraSocial,
        Localidad: aff.localidad,
        Edad: aff.edad || '',
        "Fecha Carga": aff.uploadDate ? new Date(aff.uploadDate).toLocaleDateString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Afiliados");

    const fileName = `Asignacion_${supervisor.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    const uploadDir = path.join(__dirname, '../../uploads/affiliate-exports');
    await fs.mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, fileName);

    XLSX.writeFile(workbook, filePath);
    return { path: filePath, filename: fileName };
}

async function sendInternalMessage(supervisor, fileInfo, count) {
    // Buscar usuario sistema o usar null (si el modelo lo permite) o usar el primer admin
    // Para simplificar, usaremos el primer admin encontrado o un usuario "Sistema" si existe
    const admin = await User.findOne({ role: 'admin' });
    const senderId = admin ? admin._id : supervisor._id; // Fallback al mismo usuario si no hay admin

    const message = await InternalMessage.create({
        from: senderId,
        to: supervisor._id,
        subject: `Nueva Disponibilidad de Datos - ${new Date().toLocaleDateString()}`,
        content: `Hola ${supervisor.nombre},\n\nSe han habilitado ${count} nuevos registros de afiliados en tu panel de Administración de Datos.\n\nYa puedes proceder a distribuirlos entre tus asesores desde la sección "Contactar Afiliados > Administración de datos".`,
        read: false
    });

    // Emitir evento socket
    const io = getIO();
    if (io) {
        const populatedMsg = await InternalMessage.findById(message._id).populate('from', 'nombre email');
        io.to(supervisor._id.toString()).emit('new_message', populatedMsg);
    }
}

module.exports = cron;
