// backend/src/services/recoveryScheduler.js

const Audit = require('../models/Audit');
const logger = require('../utils/logger');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000; // cada 5 minutos

async function moveEligibleToRecovery() {
  const now = new Date();
  const filter = {
    status: { $in: ["Falta clave", "Rechazada", "Falta documentación"] },
    recoveryEligibleAt: { $ne: null, $lte: now },
    isRecovery: { $ne: true }
  };
  const update = {
    $set: {
      isRecovery: true,
      recoveryMovedAt: now
    }
  };

  const res = await Audit.updateMany(filter, update);
  if (res.modifiedCount) {
    logger.info(`RecoveryScheduler: marcadas ${res.modifiedCount} auditorías como isRecovery`);
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
