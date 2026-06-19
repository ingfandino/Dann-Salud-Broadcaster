/**
 * ============================================================
 * ADMIN CHECK PERSISTENCE (adminCheckPersistence.js)
 * ============================================================
 * Persiste o actualiza registros Affiliate a partir de los
 * resultados del "Chequeado Administrativo".
 *
 * Reglas de duplicados:
 *   1. Buscar por CUIL (Affiliate.cuil === row.cuilNormalized)
 *   2. Si no existe por CUIL → crear nuevo
 *   3. Si existe → actualizar campos enriquecidos
 *
 * Prioridad Obra Social: Padrón > CODEM > Excel
 * No crea registros sin CUIL válido.
 */

"use strict";

const Affiliate         = require("../models/Affiliate");
const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");
const logger            = require("../utils/logger").getLogger("admin-check-persist");

/**
 * Persiste las filas de una sesión de admin check.
 *
 * @param {string} sessionId
 * @returns {Promise<{created: number, updated: number, skipped: number, errors: number}>}
 */
async function persistAdminCheckRows(sessionId) {
    logger.info(`💾 [AC-PERSIST] Iniciando persistencia para sesión ${sessionId}`);

    const session = await AdminCheckSession.findById(sessionId).lean();
    if (!session) {
        throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    const rows = await AdminCheckRow.find({ sessionId })
        .sort({ rowIndex: 1 })
        .lean();

    const stats = { created: 0, updated: 0, skipped: 0, errors: 0 };

    for (const row of rows) {
        try {
            const cuil = row.cuilNormalized;

            // Skip rows without valid CUIL
            if (!cuil || cuil.length !== 11) {
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status": "skipped",
                        "persistence.errorMessage": "CUIL inválido o ausente",
                    },
                });
                stats.skipped++;
                continue;
            }

            const orig   = row.original || {};
            const codem  = row.codem || {};
            const arca   = row.arca || {};
            const dateas = row.dateas || {};
            const padron = row.padron || {};

            // Determine best values
            const nombre = dateas.nombre || orig.nombre || "";
            if (!nombre) {
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status": "skipped",
                        "persistence.errorMessage": "Nombre ausente",
                    },
                });
                stats.skipped++;
                continue;
            }

            // Obra Social priority: Padrón > CODEM > Excel
            const obraSocial = padron.obraSocialDetectada || codem.descripcionObraSocial || orig.obraSocial || "";
            if (!obraSocial) {
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status": "skipped",
                        "persistence.errorMessage": "Obra social no determinada",
                    },
                });
                stats.skipped++;
                continue;
            }

            const localidad = dateas.localidad || orig.localidad || "-";
            const telefono1 = orig.telefono1 || "-";

            // Check for existing affiliate by CUIL
            const existing = await Affiliate.findOne({ cuil });

            if (existing) {
                // Update existing record with enriched data
                const updateFields = {};

                if (dateas.nombre && dateas.nombre !== existing.nombre) {
                    updateFields.nombre = dateas.nombre;
                }
                if (obraSocial && obraSocial !== existing.obraSocial) {
                    updateFields.obraSocial = obraSocial;
                }
                if (codem.codigoObraSocial) {
                    updateFields.codigoObraSocial = codem.codigoObraSocial;
                }
                if (dateas.localidad && dateas.localidad !== existing.localidad) {
                    updateFields.localidad = dateas.localidad;
                }
                if (dateas.edad && dateas.edad !== existing.edad) {
                    updateFields.edad = dateas.edad;
                }

                if (Object.keys(updateFields).length > 0) {
                    await Affiliate.findByIdAndUpdate(existing._id, { $set: updateFields });
                }

                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status":      "updated",
                        "persistence.affiliateId": existing._id,
                    },
                });
                stats.updated++;

            } else {
                // Create new affiliate
                const newAffiliate = new Affiliate({
                    nombre,
                    cuil,
                    obraSocial,
                    codigoObraSocial: codem.codigoObraSocial || undefined,
                    localidad,
                    telefono1,
                    edad: dateas.edad || undefined,
                    uploadedBy:  session.uploadedByUserId,
                    sourceFile:  session.originalFileName || "admin-check",
                    batchId:     `admin-check-${sessionId}`,
                    dataSource:  "fresh",
                    active:      true,
                });

                await newAffiliate.save();

                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status":      "created",
                        "persistence.affiliateId": newAffiliate._id,
                    },
                });
                stats.created++;
            }

        } catch (err) {
            logger.error(`[AC-PERSIST] Error fila ${row.rowIndex}: ${err.message}`);

            // Handle duplicate key errors gracefully
            if (err.code === 11000) {
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status": "skipped",
                        "persistence.errorMessage": "Duplicado detectado por índice único",
                    },
                });
                stats.skipped++;
            } else {
                await AdminCheckRow.findByIdAndUpdate(row._id, {
                    $set: {
                        "persistence.status":       "error",
                        "persistence.errorMessage": err.message,
                    },
                });
                stats.errors++;
            }
        }
    }

    logger.info(`✅ [AC-PERSIST] Sesión ${sessionId}: created=${stats.created}, updated=${stats.updated}, skipped=${stats.skipped}, errors=${stats.errors}`);

    return stats;
}

module.exports = { persistAdminCheckRows };
