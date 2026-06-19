"use strict";

const Affiliate = require("../models/Affiliate");
const AffiliateContribution = require("../models/AffiliateContribution");
const TemporaryDataCheckRow = require("../models/TemporaryDataCheckRow");
const Audit = require("../models/Audit");
const { computeAndUpdateCanSell, isValidPhone } = require("../utils/canSellUtils");
const logger = require("../utils/logger").getLogger("data-check-persistence");

function normalizeCuil(cuil) {
    return String(cuil || "").replace(/\D/g, "");
}

function getArgentinaMonthStart() {
    const now = new Date();
    const argNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    return new Date(Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), 1, 3, 0, 0));
}

function mapArcaStatus(status) {
    if (status === "success") return "success";
    if (status === "pending") return "pending";
    return "error";
}

function mapPadronStatus(rowPadron) {
    const status = rowPadron?.status;
    if (["not_found", "found_expired", "found_active", "captcha_failed", "error"].includes(status)) return status;
    if (status === "success" && rowPadron?.canSell === true) return "not_found";
    if (status === "success" && rowPadron?.canSell === false) return "found_active";
    return status === "pending" || status === "skipped" ? null : "error";
}

function buildContributionUpdate(row, affiliateId, cuil) {
    const set = { affiliateId, cuil };

    if (row.arca?.status && row.arca.status !== "pending") {
        set.lastContributionPeriod = row.arca.ultimoAporte || null;
        set.last3ClosedMonthsPaidCount = typeof row.arca.trimPagos === "number" ? row.arca.trimPagos : null;
        set.verification = {
            status: mapArcaStatus(row.arca.status),
            checkedAt: row.arca.checkedAt || new Date(),
            checkedBy: "data-check",
            executionType: "manual",
            executionId: `data-check:${row.sessionId}`,
            source: "data_check_arca",
            errorMessage: row.arca.errorMessage || null,
        };
    }

    const mappedPadronStatus = mapPadronStatus(row.padron);
    if (mappedPadronStatus) {
        set.padron = {
            status: mappedPadronStatus,
            checkedAt: row.padron.checkedAt || new Date(),
            canSell: row.padron.canSell ?? null,
            periodoDesde: row.padron.periodoDesde || null,
            nextChangeDate: row.padron.nextChangeDate || null,
            monthsElapsed: row.padron.monthsElapsed ?? null,
            obraSocial: row.padron.obraSocialDetectada || null,
            estado: row.padron.estado || null,
        };
    }

    return set;
}

function buildAffiliateSet(row) {
    const set = {};
    const edad = row.dateas?.edad;
    const localidad = row.dateas?.localidad || row.original?.localidad;
    const obraSocial = row.padron?.obraSocialDetectada || row.original?.obraSocial;

    if (typeof edad === "number" && edad > 0) set.edad = edad;
    if (localidad) set.localidad = localidad;
    if (obraSocial) set.obraSocial = obraSocial;

    return set;
}

async function getQrHechoCuils() {
    const audits = await Audit.find({ status: "QR hecho", cuil: { $exists: true, $nin: [null, ""] } }, { cuil: 1 }).lean();
    return audits.map(a => normalizeCuil(a.cuil)).filter(Boolean);
}

function buildDataCheckAvailabilityPipeline(obrasSociales = [], limit = null) {
    const monthStart = getArgentinaMonthStart();
    const pipeline = [
        {
            $match: {
                active: true,
                cuil: { $exists: true, $nin: [null, ""] },
                ...(obrasSociales.length > 0 ? { obraSocial: { $in: obrasSociales } } : {}),
                $or: [
                    { ultimoUso: { $exists: false } },
                    { ultimoUso: null },
                    { ultimoUso: { $lt: monthStart } }
                ]
            }
        },
        {
            $lookup: {
                from: "affiliatecontributions",
                localField: "_id",
                foreignField: "affiliateId",
                as: "contribution"
            }
        },
        { $unwind: { path: "$contribution", preserveNullAndEmptyArrays: true } },
        {
            $match: {
                $and: [
                    {
                        $or: [
                            { "contribution.verification.checkedAt": { $exists: false } },
                            { "contribution.verification.checkedAt": null },
                            { "contribution.verification.checkedAt": { $lt: monthStart } }
                        ]
                    },
                    {
                        $or: [
                            { "contribution.padron.checkedAt": { $exists: false } },
                            { "contribution.padron.checkedAt": null },
                            { "contribution.padron.checkedAt": { $lt: monthStart } }
                        ]
                    }
                ]
            }
        },
        {
            $addFields: {
                cuilDigits: {
                    $reduce: {
                        input: { $regexFindAll: { input: "$cuil", regex: /[0-9]/ } },
                        initialValue: "",
                        in: { $concat: ["$$value", "$$this.match"] }
                    }
                },
                neverCheckedRank: {
                    $cond: [
                        {
                            $and: [
                                { $eq: ["$contribution.verification.checkedAt", null] },
                                { $eq: ["$contribution.padron.checkedAt", null] }
                            ]
                        },
                        0,
                        1
                    ]
                },
                verificationSort: { $ifNull: ["$contribution.verification.checkedAt", new Date(0)] },
                padronSort: { $ifNull: ["$contribution.padron.checkedAt", new Date(0)] }
            }
        }
    ];

    if (limit) {
        pipeline.push({ $sort: { neverCheckedRank: 1, verificationSort: 1, padronSort: 1, uploadDate: 1 } });
        pipeline.push({ $limit: limit });
    }

    return pipeline;
}

async function getDataCheckStock(obrasSociales = []) {
    const qrCuils = await getQrHechoCuils();
    const pipeline = buildDataCheckAvailabilityPipeline(obrasSociales);
    if (qrCuils.length > 0) pipeline.push({ $match: { cuilDigits: { $nin: qrCuils } } });
    pipeline.push({ $group: { _id: "$obraSocial", count: { $sum: 1 } } });
    pipeline.push({ $sort: { count: -1, _id: 1 } });

    const rows = await Affiliate.aggregate(pipeline);
    const stock = rows.filter(r => r._id).map(r => ({ nombre: r._id, count: r.count }));
    return {
        stock,
        total: stock.reduce((sum, row) => sum + row.count, 0),
    };
}

async function selectAffiliatesForDataCheck(obrasSociales, quantity) {
    const qrCuils = await getQrHechoCuils();
    const pipeline = buildDataCheckAvailabilityPipeline(obrasSociales, quantity);
    if (qrCuils.length > 0) pipeline.splice(pipeline.length - 2, 0, { $match: { cuilDigits: { $nin: qrCuils } } });
    return Affiliate.aggregate(pipeline);
}

async function syncDataCheckSessionToDatabase(sessionId, options = {}) {
    const rows = await TemporaryDataCheckRow.find({ sessionId }).sort({ rowIndex: 1 }).lean();
    const summary = {
        inserted: 0,
        updated: 0,
        omittedMissingPhone: 0,
        omittedMissingName: 0,
        omittedMissingCuil: 0,
        omittedMissingRequired: 0,
        canSellErrors: 0,
        errors: 0,
        totalProcessed: rows.length,
    };

    for (const row of rows) {
        try {
            const cuil = normalizeCuil(row.cuilNormalized || row.original?.cuil || row.dateas?.cuil);
            if (!cuil) {
                summary.omittedMissingCuil++;
                continue;
            }

            let affiliate = await Affiliate.findOne({ cuil });
            const affiliateSet = buildAffiliateSet(row);

            if (affiliate) {
                if (Object.keys(affiliateSet).length > 0) {
                    await Affiliate.updateOne({ _id: affiliate._id }, { $set: affiliateSet });
                }
                summary.updated++;
            } else {
                const phone = row.original?.telefono1;
                const nombre = row.original?.nombre || row.dateas?.nombre;
                const obraSocial = affiliateSet.obraSocial;
                const localidad = affiliateSet.localidad;

                if (!phone || !isValidPhone(phone)) {
                    summary.omittedMissingPhone++;
                    continue;
                }
                if (!nombre) {
                    summary.omittedMissingName++;
                    continue;
                }
                if (!obraSocial || !localidad) {
                    summary.omittedMissingRequired++;
                    continue;
                }

                affiliate = await Affiliate.create({
                    nombre,
                    cuil,
                    obraSocial,
                    localidad,
                    telefono1: phone,
                    edad: affiliateSet.edad || undefined,
                    uploadedBy: options.uploadedByUserId,
                    sourceFile: options.originalFileName || "data-check",
                    batchId: `data-check-${sessionId}`,
                    dataSource: "fresh",
                    active: true,
                    leadStatus: "Pendiente",
                });
                summary.inserted++;
            }

            const contributionUpdate = buildContributionUpdate(row, affiliate._id, cuil);
            await AffiliateContribution.findOneAndUpdate(
                { affiliateId: affiliate._id },
                { $set: contributionUpdate },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const canSellResult = await computeAndUpdateCanSell(affiliate._id);
            if (!canSellResult.success) summary.canSellErrors++;
        } catch (err) {
            summary.errors++;
            logger.error(`[DATA-CHECK-SYNC] Error fila ${row.rowIndex}: ${err.message}`);
        }
    }

    return summary;
}

module.exports = {
    getArgentinaMonthStart,
    getDataCheckStock,
    selectAffiliatesForDataCheck,
    syncDataCheckSessionToDatabase,
};
