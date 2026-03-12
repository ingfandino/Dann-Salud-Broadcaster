/**
 * ============================================================
 * CRON DE RECORDATORIOS (auditReminderCron.js)
 * ============================================================
 * Notifica auditorías que inician en 5 minutos sin auditor.
 */

const cron = require("node-cron");
const Audit = require("../models/Audit");
const { notifyAuditReminder } = require("./notificationService");
const logger = require("../utils/logger");

/** Inicia el cron de recordatorios */
function startAuditReminderCron() {
    // Ejecutar cada minuto
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();
            const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
            const sixMinutesLater = new Date(now.getTime() + 6 * 60 * 1000);

            // Buscar auditorías que inicien entre 5 y 6 minutos
            // y que estén sin asignar (estado "Seleccione" o null)
            const audits = await Audit.find({
                scheduledAt: {
                    $gte: fiveMinutesLater,
                    $lt: sixMinutesLater
                },
                $or: [
                    { status: "Seleccione" },
                    { status: { $in: [null, "", "seleccione"] } },
                    { status: { $exists: false } }
                ]
            })
                .populate("createdBy", "nombre email")
                .lean();

            if (audits.length > 0) {
                logger.info(`⏰ Encontradas ${audits.length} auditoría(s) próximas sin asignar`);

                for (const audit of audits) {
                    try {
                        await notifyAuditReminder({
                            audit: {
                                ...audit,
                                fechaTurno: audit.scheduledAt,
                                obraSocial: audit.obraSocialVendida
                            }
                        });
                    } catch (err) {
                        logger.error(`Error enviando recordatorio para auditoría ${audit.cuil}:`, err);
                    }
                }
            }
        } catch (error) {
            logger.error("❌ Error en cron de recordatorios de auditoría:", error);
        }
    });

    logger.info("✅ Cron de recordatorios de auditoría iniciado (cada minuto)");
}

module.exports = { startAuditReminderCron };
