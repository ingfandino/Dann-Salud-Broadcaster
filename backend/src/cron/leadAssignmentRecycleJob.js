/**
 * ============================================================
 * CRON JOB: RECICLAJE DE DATOS DEL DÍA (leadAssignmentRecycleJob.js)
 * ============================================================
 * Se ejecuta diariamente a las 23:01 para reciclar todos los datos
 * de la interfaz "Datos del Día" (LeadAssignment).
 * 
 * Lógica de reciclaje:
 * - Status 'Pendiente' → Devuelve el Affiliate al pool de FRESCOS
 * - Cualquier otro status → Devuelve el Affiliate al pool de REUTILIZABLES
 * 
 * Esto asegura que los asesores/supervisores solo tengan acceso a los
 * datos que les envían cada día, sin acumulación entre envíos.
 */

const cron = require('node-cron');
const LeadAssignment = require('../models/LeadAssignment');
const Affiliate = require('../models/Affiliate');
const logger = require('../utils/logger');

/**
 * Recicla todos los LeadAssignments activos y devuelve los Affiliates al pool correspondiente
 */
async function recycleAllLeadAssignments() {
    try {
        const now = new Date();
        logger.info('🔄 [CRON-LEAD-RECYCLE] Iniciando reciclaje de Datos del Día (23:01 hrs)');

        // ========== PASO 1: Obtener todos los LeadAssignments activos ==========
        const allAssignments = await LeadAssignment.find({ active: true })
            .populate('affiliate', '_id dataSource')
            .lean();

        if (allAssignments.length === 0) {
            logger.info('ℹ️ [CRON-LEAD-RECYCLE] No hay asignaciones activas para reciclar');
            return { freshReturned: 0, reusableReturned: 0, deleted: 0 };
        }

        logger.info(`📊 [CRON-LEAD-RECYCLE] Procesando ${allAssignments.length} asignaciones`);

        // ========== PASO 2: Clasificar por estado ==========
        // 'Pendiente' → Frescos (no fueron tocados)
        // Cualquier otro estado → Reutilizables (fueron gestionados)
        const freshIds = [];
        const reusableIds = [];

        for (const assignment of allAssignments) {
            if (!assignment.affiliate?._id) continue;

            if (assignment.status === 'Pendiente') {
                freshIds.push(assignment.affiliate._id);
            } else {
                reusableIds.push(assignment.affiliate._id);
            }
        }

        logger.info(`📋 [CRON-LEAD-RECYCLE] Clasificación: ${freshIds.length} frescos, ${reusableIds.length} reutilizables`);

        // ========== PASO 3: Devolver FRESCOS al pool ==========
        if (freshIds.length > 0) {
            await Affiliate.updateMany(
                { _id: { $in: freshIds } },
                {
                    $set: {
                        dataSource: 'fresh',
                        exported: false,
                        isUsed: false,
                        leadStatus: 'Pendiente',
                        returnedToPollAt: now,
                        returnedReason: 'Reciclaje diario - No utilizado (Pendiente)'
                    },
                    $unset: {
                        exportedTo: "",
                        exportedAt: "",
                        exportBatchId: "",
                        assignedTo: "",
                        assignedAt: ""
                    }
                }
            );
            logger.info(`✨ [CRON-LEAD-RECYCLE] ${freshIds.length} datos devueltos al pool de FRESCOS`);
        }

        // ========== PASO 4: Devolver REUTILIZABLES al pool ==========
        if (reusableIds.length > 0) {
            await Affiliate.updateMany(
                { _id: { $in: reusableIds } },
                {
                    $set: {
                        dataSource: 'reusable',
                        exported: false,
                        isUsed: false,
                        leadStatus: 'Reutilizable',
                        returnedToPollAt: now,
                        returnedReason: 'Reciclaje diario - Gestionado (no venta)'
                    },
                    $unset: {
                        exportedTo: "",
                        exportedAt: "",
                        exportBatchId: "",
                        assignedTo: "",
                        assignedAt: ""
                    }
                }
            );
            logger.info(`♻️ [CRON-LEAD-RECYCLE] ${reusableIds.length} datos devueltos al pool de REUTILIZABLES`);
        }

        // ========== PASO 5: Eliminar TODOS los LeadAssignments activos ==========
        // Nota: Mantenemos el historial en el affiliate.interactionHistory si es necesario
        const deleteResult = await LeadAssignment.deleteMany({ active: true });
        
        logger.info(`🗑️ [CRON-LEAD-RECYCLE] ${deleteResult.deletedCount} asignaciones eliminadas`);

        // ========== RESUMEN ==========
        const summary = {
            freshReturned: freshIds.length,
            reusableReturned: reusableIds.length,
            deleted: deleteResult.deletedCount,
            timestamp: now
        };

        logger.info(`✅ [CRON-LEAD-RECYCLE] Reciclaje completado:`, summary);
        
        return summary;

    } catch (error) {
        logger.error('❌ [CRON-LEAD-RECYCLE] Error en reciclaje:', error);
        throw error;
    }
}

// ========== PROGRAMACIÓN DEL CRON ==========
// Ejecutar a las 23:01 todos los días (hora de Argentina)
cron.schedule('1 23 * * *', async () => {
    try {
        await recycleAllLeadAssignments();
    } catch (error) {
        logger.error('❌ [CRON-LEAD-RECYCLE] Error en proceso automático:', error);
    }
}, {
    timezone: "America/Argentina/Buenos_Aires"
});

logger.info('✅ Cron job de Reciclaje de Datos del Día registrado (se ejecutará diariamente a las 23:01 hrs)');

// Exportar función para uso manual si es necesario
module.exports = { recycleAllLeadAssignments };
