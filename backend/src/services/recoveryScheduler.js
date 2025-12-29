/**
 * ============================================================
 * SCHEDULER DE RECOVERY (recoveryScheduler.js)
 * ============================================================
 * Mueve auditorías elegibles al estado "Recuperación".
 * Estados elegibles: Falta clave, Falta documentación, Pendiente.
 */

const Audit = require('../models/Audit');
const logger = require('../utils/logger');
const { notifyAuditRecovery } = require('./notificationService');

/* ========== CONFIGURACIÓN ========== */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

async function moveEligibleToRecovery() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // ✅ CORRECCIÓN: SOLO estos 4 estados van a Recuperación después de 24h
  const filter1 = {
    status: { 
      $in: [
        "Falta clave",
        "Falta clave (por ARCA)",
        "Falta documentación",
        "Falta clave y documentación",
        "Pendiente"
      ] 
    },
    recoveryEligibleAt: { $ne: null, $lte: now },
    isRecovery: { $ne: true }
  };
  
  // ✅ CORRECCIÓN: Se eliminó FILTRO 2 (auditorías sin estado)
  // Solo se mueven a Recuperación los 4 estados específicos después de 24h
  
  // Obtener auditorías del filtro 1
  const auditsToMove = await Audit.find(filter1)
    .populate('createdBy', 'nombre email numeroEquipo')
    .lean();
  
  // ✅ CORRECCIÓN: Agregar recoveryMonth para que aparezca en la ventana de Recuperación
  const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM
  
  const update = {
    $set: {
      isRecovery: true,
      recoveryMovedAt: now,
      recoveryMonth: currentMonth  // ✅ CRUCIAL: Sin esto no aparece en Recuperación
    }
  };

  // Actualizar solo las auditorías con los 4 estados específicos
  const result = await Audit.updateMany(filter1, update);
  
  if (result.modifiedCount) {
    logger.info(`RecoveryScheduler: marcadas ${result.modifiedCount} auditorías como isRecovery (solo estados: Falta clave, Falta documentación, Falta clave y documentación, Pendiente)`);
    
    // 🔔 Enviar notificaciones a auditores
    for (const audit of auditsToMove) {
      try {
        await notifyAuditRecovery({
          audit: {
            ...audit,
            fechaTurno: audit.scheduledAt,
            obraSocial: audit.obraSocialVendida
          }
        });
      } catch (err) {
        logger.error(`Error enviando notificación de recovery para ${audit.cuil}:`, err);
      }
    }
  }
}

function startRecoveryScheduler(intervalMs = DEFAULT_INTERVAL_MS) {
  if (process.env.NODE_ENV === 'test') return; // no correr en test

  logger.info(`⏰ RecoveryScheduler iniciado (intervalo: ${intervalMs / 1000}s)`);

  // ejecución inicial
  moveEligibleToRecovery().catch(err => logger.error("RecoveryScheduler error (run)", err));

  // intervalo
  setInterval(() => {
    moveEligibleToRecovery().catch(err => logger.error("RecoveryScheduler error (interval)", err));
  }, intervalMs);
}

module.exports = { startRecoveryScheduler, moveEligibleToRecovery };
