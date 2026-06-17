"use strict";

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs").promises;
const XLSX = require("xlsx");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const Affiliate = require("../models/Affiliate");
const AffiliateImportJob = require("../models/AffiliateImportJob");
const AffiliateImportRow = require("../models/AffiliateImportRow");
const {
    rebuildOperationalStateForAffiliateIds
} = require("./affiliateOperationalState.service");
const logger = require("../utils/logger");
const {
    extractField,
    normalizePhone,
    normalizeCuil: normalizeImportCuil,
    rotateCanonicalPhones,
    extractAdditionalFields
} = require("../utils/excelHelpers");
const {
    getAffiliateImportReportRoot,
    buildAffiliateImportReportPath,
    affiliateImportReportExists
} = require("../utils/affiliateImportReportStorage");

const IMPORT_UPLOAD_DIR = path.join(__dirname, "../../uploads/affiliates");
const STALE_PROCESSING_MS = 2 * 60 * 60 * 1000;
const IMPORT_BATCH_SIZE = Number(process.env.AFFILIATE_IMPORT_BATCH_SIZE || 1000);
const REPORT_BATCH_SIZE = Number(process.env.AFFILIATE_IMPORT_REPORT_BATCH_SIZE || 1000);

const AFFILIATE_IMPORT_ALIASES = {
    nombre: [
        "nombre", "name", "apellido y nombre", "nombres y apellidos", "apellidos y nombres",
        "nombres", "nombres y apellidos", "nombreyapellido", "apellidoynombre", "fullname"
    ],
    cuil: ["cuil", "cuit", "dni", "documento"],
    obraSocial: [
        "obra social", "obra_social", "obrasocial", "os", "cobertura", "descripcion", "descripción"
    ],
    localidad: ["localidad", "ubicacion", "ubicación", "ciudad", "location", "city"],
    telefono1: [
        "teléfono", "telefono", "phone", "phone 1", "phone_1", "phone1", "teléfono_1",
        "teléfono1", "celular", "celular_1", "celular1", "telefono1", "telefono_1", "tel_1", "tel1"
    ],
    telefono2: [
        "teléfono_2", "teléfono2", "telefono_2", "telefono2", "tel_2", "tel2",
        "phone_2", "phone2", "phone 2", "celular_2", "celular2"
    ],
    telefono3: [
        "teléfono_3", "teléfono3", "telefono_3", "telefono3", "tel_3", "tel3",
        "phone_3", "phone3", "phone 3", "celular_3", "celular3"
    ],
    edad: ["edad", "age", "años"],
    codigoObraSocial: [
        "codigoobrasocial", "codigo_obra_social", "codigo obra social", "codigo_os", "codigoos",
        "codigodeobrasocial", "codigo de obra social"
    ],
    codigoPostal: ["codigo postal", "código postal", "codigo_postal", "codigopostal", "cp"]
};

const REJECTION_CATEGORIES = {
    REQUIRED_FIELDS: "Campos obligatorios faltantes",
    INVALID_CUIL: "CUIL inválido",
    DUPLICATE_CUIL_FILE: "CUIL duplicado en archivo",
    DUPLICATE_PHONE_FILE: "Teléfono duplicado en archivo",
    EXISTING_SAME_PHONES: "CUIL ya existente con mismos teléfonos",
    PHONE_OTHER_AFFILIATE: "Teléfono ya existente en otro afiliado",
    DB_WRITE_ERROR: "Error de escritura en base de datos",
    UNEXPECTED_ERROR: "Error inesperado"
};

// Subir y procesar archivo .xlsx
function cuilStorageVariants(cuil) {
    if (!cuil) return [];
    const prefix = cuil.slice(0, 2);
    const body = cuil.slice(2, 10);
    const checkDigit = cuil.slice(10);
    return [
        cuil,
        `${prefix}-${body}-${checkDigit}`,
        `${prefix}.${body}.${checkDigit}`,
        `${prefix} ${body} ${checkDigit}`
    ];
}


function uniquePhones(values) {
    return Array.from(new Set(values.map(normalizePhone).filter(Boolean)));
}

function normalizeAge(value) {
    if (value === null || value === undefined || value === "") return undefined;
    const age = Number.parseInt(String(value), 10);
    return Number.isInteger(age) && age >= 0 && age <= 150 ? age : undefined;
}

function prepareAffiliateImportRow(row, index) {
    return prepareAffiliateImportRowAtNumber(row, index + 2);
}

function prepareAffiliateImportRowAtNumber(row, rowNumber) {
    const nombre = extractField(row, AFFILIATE_IMPORT_ALIASES.nombre);
    const cuilRaw = extractField(row, AFFILIATE_IMPORT_ALIASES.cuil);
    const obraSocial = extractField(row, AFFILIATE_IMPORT_ALIASES.obraSocial);
    const localidad = extractField(row, AFFILIATE_IMPORT_ALIASES.localidad);
    const rawPhones = [
        extractField(row, AFFILIATE_IMPORT_ALIASES.telefono1),
        extractField(row, AFFILIATE_IMPORT_ALIASES.telefono2),
        extractField(row, AFFILIATE_IMPORT_ALIASES.telefono3)
    ];
    const normalizedRawPhones = rawPhones.map(normalizePhone);
    const phones = uniquePhones(rawPhones);
    const codigoPostal = extractField(row, AFFILIATE_IMPORT_ALIASES.codigoPostal);
    const additionalData = { ...(extractAdditionalFields(row) || {}) };
    if (codigoPostal) additionalData.CP = codigoPostal;

    return {
        rowNumber,
        raw: row,
        traceRaw: {
            cells: Object.entries(row).map(([header, value]) => ({ header, value }))
        },
        normalized: {
            nombre,
            cuil: normalizeImportCuil(cuilRaw),
            cuilRaw,
            obraSocial,
            localidad,
            telefono1: normalizedRawPhones[0] || null,
            telefono2: normalizedRawPhones[1] || null,
            telefono3: normalizedRawPhones[2] || null,
            phones,
            edad: normalizeAge(extractField(row, AFFILIATE_IMPORT_ALIASES.edad)),
            codigoObraSocial: extractField(row, AFFILIATE_IMPORT_ALIASES.codigoObraSocial),
            additionalData
        }
    };
}

function collectDuplicateRows(preparedRows, selector) {
    const occurrences = new Map();
    for (const row of preparedRows) {
        const value = selector(row);
        if (!value) continue;
        if (!occurrences.has(value)) occurrences.set(value, []);
        occurrences.get(value).push(row.rowNumber);
    }
    return new Map(Array.from(occurrences.entries()).filter(([, rows]) => rows.length > 1));
}

function buildRejection(prepared, code, category, reason, status = "rejected") {
    return {
        row: prepared.rowNumber,
        data: prepared.raw,
        normalized: prepared.normalized,
        code,
        category,
        reason,
        type: status === "error" ? "error" : (code === "REQUIRED_FIELDS" || code === "INVALID_CUIL" ? "invalid" : "duplicate"),
        trace: {
            rowNumber: prepared.rowNumber,
            raw: prepared.traceRaw,
            normalized: prepared.normalized,
            action: "rejected",
            status,
            cuilNormalized: prepared.normalized.cuil || undefined,
            phonesNormalized: prepared.normalized.phones,
            rejectionCode: code,
            rejectionReason: reason
        }
    };
}

function incrementRejectionSummary(summary, category) {
    summary[category] = (summary[category] || 0) + 1;
}

function formatOriginalImport(existingAff) {
    const uploadDate = existingAff.uploadDate
        ? new Date(existingAff.uploadDate).toISOString().slice(0, 10)
        : "fecha desconocida";
    const sourceFile = existingAff.sourceFile || "archivo desconocido";
    return `Registro original cargado el ${uploadDate} desde archivo ${sourceFile}.`;
}

function snapshotAffiliate(affiliate) {
    return {
        nombre: affiliate.nombre,
        cuil: affiliate.cuil,
        obraSocial: affiliate.obraSocial,
        localidad: affiliate.localidad,
        telefono1: affiliate.telefono1,
        telefono2: affiliate.telefono2,
        telefono3: affiliate.telefono3,
        edad: affiliate.edad,
        codigoObraSocial: affiliate.codigoObraSocial,
        additionalData: affiliate.additionalData,
        uploadedBy: affiliate.uploadedBy,
        uploadDate: affiliate.uploadDate,
        sourceFile: affiliate.sourceFile,
        batchId: affiliate.batchId
    };
}

function buildEnrichmentUpdate(prepared) {
    const { normalized } = prepared;
    const set = {};

    if (normalized.obraSocial) set.obraSocial = normalized.obraSocial;
    if (normalized.localidad) set.localidad = normalized.localidad;
    if (normalized.edad !== undefined) set.edad = normalized.edad;
    if (normalized.codigoObraSocial) set.codigoObraSocial = normalized.codigoObraSocial;

    for (const [key, value] of Object.entries(normalized.additionalData || {})) {
        set[`additionalData.${key}`] = value;
    }

    return set;
}

function findConflictingPhone(incomingPhones, phoneOwners, allowedAffiliateId = null) {
    for (const phone of incomingPhones) {
        const owner = phoneOwners.get(phone);
        if (owner && String(owner._id) !== String(allowedAffiliateId || "")) {
            return { phone, owner };
        }
    }
    return null;
}

async function persistImportRows(jobId, rows) {
    if (rows.length === 0) return;
    await AffiliateImportRow.insertMany(
        rows.map(row => ({ ...row, jobId })),
        { ordered: false }
    );
}

function memorySnapshot() {
    const usage = process.memoryUsage();
    return {
        rss: usage.rss,
        heapUsed: usage.heapUsed,
        external: usage.external
    };
}

function logImportMemory(jobId, message, extra = {}) {
    const memory = memorySnapshot();
    logger.info(
        `[AFFILIATE-IMPORT][job:${jobId}] ${message} | ` +
        `rss=${memory.rss} heapUsed=${memory.heapUsed} external=${memory.external} ` +
        Object.entries(extra).map(([key, value]) => `${key}=${value}`).join(" ")
    );
}

function normalizeCellValue(value) {
    if (value === null || value === undefined) return "";
    if (value instanceof Date) return value;
    if (typeof value === "object") {
        if (value.text !== undefined) return value.text;
        if (value.result !== undefined) return value.result;
        if (value.richText) return value.richText.map(part => part.text || "").join("");
        if (value.hyperlink && value.text) return value.text;
    }
    return value;
}

function rowHasValues(rowObject) {
    return Object.values(rowObject).some(value => value !== null && value !== undefined && String(value).trim() !== "");
}

async function* iterateWorkbookRows(inputPath) {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(inputPath, {
        entries: "emit",
        sharedStrings: "cache",
        styles: "ignore",
        hyperlinks: "ignore",
        worksheets: "emit"
    });

    let worksheetSeen = false;
    for await (const worksheetReader of workbookReader) {
        if (worksheetSeen) break;
        worksheetSeen = true;
        let headers = null;
        for await (const row of worksheetReader) {
            const values = row.values || [];
            if (!headers) {
                headers = values.slice(1).map(value => String(normalizeCellValue(value) || "").trim());
                continue;
            }

            const rowObject = {};
            headers.forEach((header, index) => {
                if (!header) return;
                rowObject[header] = normalizeCellValue(values[index + 1]);
            });
            if (!rowHasValues(rowObject)) continue;
            yield { rowObject, rowNumber: row.number };
        }
    }
}

function addOccurrence(map, value, rowNumber) {
    if (!value) return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(rowNumber);
}

function filterDuplicateMap(map) {
    return new Map(Array.from(map.entries()).filter(([, rows]) => rows.length > 1));
}

async function inspectWorkbookForImport(inputPath) {
    const cuilOccurrences = new Map();
    const phoneOccurrences = new Map();
    let totalRows = 0;

    for await (const { rowObject, rowNumber } of iterateWorkbookRows(inputPath)) {
        totalRows += 1;
        const prepared = prepareAffiliateImportRowAtNumber(rowObject, rowNumber);
        addOccurrence(cuilOccurrences, prepared.normalized.cuil, rowNumber);
        addOccurrence(phoneOccurrences, prepared.normalized.telefono1, rowNumber);
    }

    return {
        totalRows,
        duplicateCuilRows: filterDuplicateMap(cuilOccurrences),
        duplicateMainPhoneRows: filterDuplicateMap(phoneOccurrences)
    };
}

async function* streamPreparedBatches(inputPath, batchSize = IMPORT_BATCH_SIZE) {
    let batch = [];
    for await (const { rowObject, rowNumber } of iterateWorkbookRows(inputPath)) {
        batch.push(prepareAffiliateImportRowAtNumber(rowObject, rowNumber));
        if (batch.length >= batchSize) {
            yield batch;
            batch = [];
        }
    }
    if (batch.length > 0) yield batch;
}

// Procesa por lotes y mantiene las lecturas/escrituras masivas del flujo existente.
async function processPreparedBatches(batchIterator, context) {
    const {
        userId,
        sourceFile,
        jobId,
        source,
        duplicateCuilRows,
        duplicateMainPhoneRows,
        retainRejectedRows = true,
        batchId = uuidv4()
    } = context;
    const isExternalCheck = source === "external_check";
    const duplicates = [];
    const updatedRecords = [];
    const rejectionSummary = {};
    let validCount = 0;
    let updatedCount = 0;
    let existingLinkedCount = 0;
    let rejectedCount = 0;
    let processedRows = 0;
    let batchNumber = 0;

    for await (const chunk of batchIterator) {
        batchNumber += 1;
        const chunkCuils = new Set();
        const chunkRawCuils = new Set();
        const chunkPhones = new Set();

        for (const prepared of chunk) {
            if (prepared.normalized.cuil) chunkCuils.add(prepared.normalized.cuil);
            if (prepared.normalized.cuilRaw) chunkRawCuils.add(String(prepared.normalized.cuilRaw).trim());
            prepared.normalized.phones.forEach(phone => chunkPhones.add(phone));
        }

        const queryParts = [];
        const cuilCandidates = Array.from(new Set([
            ...Array.from(chunkCuils).flatMap(cuilStorageVariants),
            ...chunkRawCuils
        ])).filter(Boolean);
        if (cuilCandidates.length) queryParts.push({ cuil: { $in: cuilCandidates } });
        if (chunkPhones.size) {
            const phones = Array.from(chunkPhones);
            queryParts.push(
                { telefono1: { $in: phones } },
                { telefono2: { $in: phones } },
                { telefono3: { $in: phones } }
            );
        }

        const existingAffiliates = queryParts.length
            ? await Affiliate.find(
                { $or: queryParts },
                {
                    nombre: 1,
                    cuil: 1,
                    obraSocial: 1,
                    localidad: 1,
                    telefono1: 1,
                    telefono2: 1,
                    telefono3: 1,
                    edad: 1,
                    codigoObraSocial: 1,
                    additionalData: 1,
                    uploadedBy: 1,
                    uploadDate: 1,
                    sourceFile: 1,
                    batchId: 1
                }
            ).lean()
            : [];

        const cuilOwners = new Map();
        const phoneOwners = new Map();
        for (const affiliate of existingAffiliates) {
            const canonicalCuil = normalizeImportCuil(affiliate.cuil);
            if (canonicalCuil) cuilOwners.set(canonicalCuil, affiliate);
            uniquePhones([affiliate.telefono1, affiliate.telefono2, affiliate.telefono3])
                .forEach(phone => phoneOwners.set(phone, affiliate));
        }

        const insertPlans = [];
        const updatePlans = [];
        const traceRows = [];
        const affectedAffiliateIds = new Set();

        const reject = (prepared, code, category, reason, status) => {
            const rejection = buildRejection(prepared, code, category, reason, status);
            rejectedCount += 1;
            if (retainRejectedRows) duplicates.push(rejection);
            traceRows.push(rejection.trace);
            incrementRejectionSummary(rejectionSummary, category);
        };

        for (const prepared of chunk) {
            try {
                const { normalized } = prepared;
                const missingFields = [];
                if (!normalized.nombre) missingFields.push("Nombre");
                if (!normalized.cuilRaw) missingFields.push("CUIL");
                if (!normalized.obraSocial) missingFields.push("Obra Social");
                if (!normalized.localidad) missingFields.push("Localidad");
                if (!normalized.telefono1) missingFields.push("Teléfono_1");

                if (missingFields.length > 0) {
                    reject(
                        prepared,
                        "REQUIRED_FIELDS",
                        REJECTION_CATEGORIES.REQUIRED_FIELDS,
                        `Campos obligatorios faltantes: ${missingFields.join(", ")}.`
                    );
                    continue;
                }

                if (!normalized.cuil) {
                    reject(
                        prepared,
                        "INVALID_CUIL",
                        REJECTION_CATEGORIES.INVALID_CUIL,
                        `CUIL inválido: "${normalized.cuilRaw}". Debe contener exactamente 11 dígitos.`
                    );
                    continue;
                }

                const cuilRows = duplicateCuilRows.get(normalized.cuil);
                if (cuilRows) {
                    reject(
                        prepared,
                        "DUPLICATE_CUIL_FILE",
                        REJECTION_CATEGORIES.DUPLICATE_CUIL_FILE,
                        `CUIL duplicado dentro del archivo. Aparece en las filas ${cuilRows.join(", ")}.`
                    );
                    continue;
                }

                const phoneRows = duplicateMainPhoneRows.get(normalized.telefono1);
                if (phoneRows) {
                    reject(
                        prepared,
                        "DUPLICATE_PHONE_FILE",
                        REJECTION_CATEGORIES.DUPLICATE_PHONE_FILE,
                        `Teléfono principal duplicado dentro del archivo. Aparece en las filas ${phoneRows.join(", ")}.`
                    );
                    continue;
                }

                const existingAff = cuilOwners.get(normalized.cuil);
                if (existingAff) {
                    const conflictingPhone = findConflictingPhone(normalized.phones, phoneOwners, existingAff._id);
                    if (conflictingPhone) {
                        reject(
                            prepared,
                            "PHONE_OTHER_AFFILIATE",
                            REJECTION_CATEGORIES.PHONE_OTHER_AFFILIATE,
                            `El teléfono ${conflictingPhone.phone} ya pertenece a otro afiliado con CUIL ${conflictingPhone.owner.cuil}.`
                        );
                        continue;
                    }

                    const finalPhones = rotateCanonicalPhones(
                        [existingAff.telefono1, existingAff.telefono2, existingAff.telefono3],
                        normalized.phones
                    );
                    if (!finalPhones) {
                        if (isExternalCheck) {
                            existingLinkedCount += 1;
                            traceRows.push({
                                rowNumber: prepared.rowNumber,
                                raw: prepared.traceRaw,
                                normalized: prepared.normalized,
                                affiliateId: existingAff._id,
                                action: "linked",
                                status: "success",
                                cuilNormalized: prepared.normalized.cuil,
                                phonesNormalized: prepared.normalized.phones
                            });
                            continue;
                        }
                        reject(
                            prepared,
                            "EXISTING_CUIL_SAME_PHONES",
                            REJECTION_CATEGORIES.EXISTING_SAME_PHONES,
                            `Registro rechazado: el CUIL ${normalized.cuil} ya existe en la base con los mismos teléfonos principales. ${formatOriginalImport(existingAff)}`
                        );
                        continue;
                    }

                    const set = isExternalCheck ? {} : buildEnrichmentUpdate(prepared);
                    set.telefono1 = finalPhones[0];
                    if (finalPhones[1]) set.telefono2 = finalPhones[1];
                    if (finalPhones[2]) set.telefono3 = finalPhones[2];
                    const unset = {};
                    if (!finalPhones[1]) unset.telefono2 = "";
                    if (!finalPhones[2]) unset.telefono3 = "";

                    const update = { $set: set };
                    if (Object.keys(unset).length) update.$unset = unset;

                    updatePlans.push({
                        prepared,
                        affiliateId: existingAff._id,
                        operation: { updateOne: { filter: { _id: existingAff._id }, update } },
                        previousSnapshot: snapshotAffiliate(existingAff),
                        appliedChanges: { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) }
                    });
                    continue;
                }

                const conflictingPhone = findConflictingPhone(normalized.phones, phoneOwners);
                if (conflictingPhone) {
                    reject(
                        prepared,
                        "PHONE_OTHER_AFFILIATE",
                        REJECTION_CATEGORIES.PHONE_OTHER_AFFILIATE,
                        `El teléfono ${conflictingPhone.phone} ya pertenece a otro afiliado con CUIL ${conflictingPhone.owner.cuil}.`
                    );
                    continue;
                }

                const affiliateId = new mongoose.Types.ObjectId();
                const affiliate = {
                    _id: affiliateId,
                    nombre: normalized.nombre,
                    cuil: normalized.cuil,
                    obraSocial: normalized.obraSocial,
                    localidad: normalized.localidad,
                    telefono1: normalized.phones[0],
                    telefono2: normalized.phones[1] || undefined,
                    telefono3: normalized.phones[2] || undefined,
                    edad: normalized.edad,
                    codigoObraSocial: normalized.codigoObraSocial || undefined,
                    uploadedBy: userId,
                    sourceFile,
                    batchId,
                    dataSource: "fresh",
                    additionalData: Object.keys(normalized.additionalData || {}).length
                        ? normalized.additionalData
                        : undefined
                };
                insertPlans.push({ prepared, affiliateId, affiliate });
            } catch (error) {
                logger.error(`Error procesando fila ${prepared.rowNumber}:`, error);
                reject(
                    prepared,
                    "UNEXPECTED_ERROR",
                    REJECTION_CATEGORIES.UNEXPECTED_ERROR,
                    `Error inesperado procesando la fila: ${error.message}`,
                    "error"
                );
            }
        }

        if (insertPlans.length > 0) {
            try {
                await Affiliate.insertMany(insertPlans.map(plan => plan.affiliate), { ordered: false });
            } catch (error) {
                logger.error(`Error en insertMany del lote ${batchNumber}:`, error);
            }

            const persistedIds = new Set(
                (await Affiliate.find(
                    { _id: { $in: insertPlans.map(plan => plan.affiliateId) } },
                    { _id: 1 }
                ).lean()).map(item => String(item._id))
            );

            for (const plan of insertPlans) {
                if (persistedIds.has(String(plan.affiliateId))) {
                    validCount += 1;
                    affectedAffiliateIds.add(String(plan.affiliateId));
                    traceRows.push({
                        rowNumber: plan.prepared.rowNumber,
                        raw: plan.prepared.traceRaw,
                        normalized: plan.prepared.normalized,
                        affiliateId: plan.affiliateId,
                        action: "created",
                        status: "success",
                        cuilNormalized: plan.prepared.normalized.cuil,
                        phonesNormalized: plan.prepared.normalized.phones,
                        appliedChanges: plan.affiliate
                    });
                } else {
                    reject(
                        plan.prepared,
                        "DB_WRITE_ERROR",
                        REJECTION_CATEGORIES.DB_WRITE_ERROR,
                        "No se pudo crear el afiliado durante la escritura masiva.",
                        "error"
                    );
                }
            }
        }

        if (updatePlans.length > 0) {
            try {
                await Affiliate.bulkWrite(updatePlans.map(plan => plan.operation), { ordered: false });
            } catch (error) {
                logger.error(`Error en bulkWrite del lote ${batchNumber}:`, error);
            }

            const updatedById = new Map(
                (await Affiliate.find(
                    { _id: { $in: updatePlans.map(plan => plan.affiliateId) } },
                    { _id: 1, telefono1: 1, telefono2: 1, telefono3: 1 }
                ).lean()).map(item => [String(item._id), item])
            );

            for (const plan of updatePlans) {
                const persisted = updatedById.get(String(plan.affiliateId));
                const expectedPhone = plan.appliedChanges.$set.telefono1;
                const wasApplied = persisted && persisted.telefono1 === expectedPhone;

                if (wasApplied) {
                    updatedCount += 1;
                    if (!isExternalCheck) affectedAffiliateIds.add(String(plan.affiliateId));
                    const message = isExternalCheck
                        ? "Registro actualizado: CUIL existente con teléfono nuevo. Se aplicó el enriquecimiento canónico de teléfonos."
                        : "Registro actualizado: CUIL existente con teléfono nuevo. Se rotó el teléfono nuevo a Teléfono_1 y se actualizaron datos enriquecibles.";
                    updatedRecords.push({
                        row: plan.prepared.rowNumber,
                        data: plan.prepared.raw,
                        reason: message
                    });
                    traceRows.push({
                        rowNumber: plan.prepared.rowNumber,
                        raw: plan.prepared.traceRaw,
                        normalized: plan.prepared.normalized,
                        affiliateId: plan.affiliateId,
                        action: "updated",
                        status: "success",
                        cuilNormalized: plan.prepared.normalized.cuil,
                        phonesNormalized: plan.prepared.normalized.phones,
                        previousSnapshot: plan.previousSnapshot,
                        appliedChanges: plan.appliedChanges
                    });
                } else {
                    reject(
                        plan.prepared,
                        "DB_WRITE_ERROR",
                        REJECTION_CATEGORIES.DB_WRITE_ERROR,
                        "No se pudo actualizar el afiliado durante la escritura masiva.",
                        "error"
                    );
                }
            }
        }

        await persistImportRows(jobId, traceRows);
        if (affectedAffiliateIds.size > 0) {
            try {
                await rebuildOperationalStateForAffiliateIds(Array.from(affectedAffiliateIds));
            } catch (error) {
                logger.error(
                    `[AFFILIATE-IMPORT][job:${jobId}] No se pudo reconstruir ` +
                    `AffiliateOperationalState para el lote: ${error.message}`
                );
            }
        }
        processedRows += chunk.length;
        await AffiliateImportJob.updateOne(
            { _id: jobId },
            {
                $set: {
                    processedRows,
                    createdCount: validCount,
                    updatedCount,
                    existingLinkedCount,
                    rejectedCount,
                    rejectionSummary,
                    batchId
                }
            }
        );

        logImportMemory(jobId, "batch processed", { processedRows, batchNumber, batchSize: chunk.length });
    }

    return {
        validCount,
        updatedCount,
        existingLinkedCount,
        duplicates,
        updatedRecords,
        batchId,
        rejectionSummary,
        rejectedCount,
        processedRows
    };
}

async function* arrayPreparedBatches(preparedRows, chunkSize = IMPORT_BATCH_SIZE) {
    for (let i = 0; i < preparedRows.length; i += chunkSize) {
        yield preparedRows.slice(i, i + chunkSize);
    }
}

async function processAffiliatesData(rawData, userId, sourceFile, jobId, options = {}) {
    const batchId = uuidv4();
    const preparedRows = rawData.map(prepareAffiliateImportRow);
    const duplicateCuilRows = collectDuplicateRows(preparedRows, row => row.normalized.cuil);
    const duplicateMainPhoneRows = collectDuplicateRows(preparedRows, row => row.normalized.telefono1);
    return processPreparedBatches(
        arrayPreparedBatches(preparedRows, options.batchSize || IMPORT_BATCH_SIZE),
        {
            userId,
            sourceFile,
            jobId,
            source: options.source,
            duplicateCuilRows,
            duplicateMainPhoneRows,
            retainRejectedRows: options.retainRejectedRows !== false,
            batchId
        }
    );
}

async function processWorkbookFile(inputPath, userId, sourceFile, jobId, options = {}) {
    const extension = path.extname(inputPath).toLowerCase();
    if (extension === ".xls") {
        logger.warn(`[AFFILIATE-IMPORT][job:${jobId}] Archivo .xls detectado; se usa parser legacy no streaming.`);
        const workbook = XLSX.readFile(inputPath);
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("El archivo no contiene hojas de cálculo.");
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        return {
            totalRows: rawData.length,
            result: await processAffiliatesData(rawData, userId, sourceFile, jobId, options)
        };
    }

    const inspection = await inspectWorkbookForImport(inputPath);
    if (inspection.totalRows === 0) throw new Error("El archivo está vacío.");
    await AffiliateImportJob.updateOne(
        { _id: jobId, status: "processing" },
        { $set: { totalRows: inspection.totalRows } }
    );
    logImportMemory(jobId, "workbook inspected", { totalRows: inspection.totalRows });

    const result = await processPreparedBatches(
        streamPreparedBatches(inputPath, options.batchSize || IMPORT_BATCH_SIZE),
        {
            userId,
            sourceFile,
            jobId,
            source: options.source,
            duplicateCuilRows: inspection.duplicateCuilRows,
            duplicateMainPhoneRows: inspection.duplicateMainPhoneRows,
            retainRejectedRows: false
        }
    );

    return { totalRows: inspection.totalRows, result };
}




// 📊 Generar reporte de duplicados
async function generateDuplicatesReport(duplicates, originalFileName, summary) {
    const rejectedRows = duplicates.map(dup => ({
        "Nombre": dup.normalized?.nombre || "",
        "CUIL": dup.normalized?.cuil || dup.normalized?.cuilRaw || "",
        "Obra Social": dup.normalized?.obraSocial || "",
        "Teléfono_1": dup.normalized?.telefono1 || "",
        "Teléfono_2": dup.normalized?.telefono2 || "",
        "Motivo del rechazo": dup.reason,
        "Fila original": dup.row,
        "Código de rechazo": dup.code,
        "Archivo origen": originalFileName
    }));

    const summaryRows = [
        ["Campo", "Valor"],
        ["Archivo original", originalFileName],
        ["Fecha de importación", new Date(summary.importDate).toISOString()],
        ["Total de filas procesadas", summary.totalRows],
        ["Registros creados", summary.createdCount],
        ["Registros actualizados", summary.updatedCount],
        ["Registros existentes vinculados", summary.existingLinkedCount || 0],
        ["Registros rechazados", summary.rejectedCount],
        [],
        ["Motivo / Categoría", "Cantidad"],
        ...Object.entries(summary.rejectionSummary || {})
            .sort(([left], [right]) => left.localeCompare(right, "es"))
            .map(([category, count]) => [category, count])
    ];

    const rejectedSheet = XLSX.utils.json_to_sheet(rejectedRows, {
        header: [
            "Nombre",
            "CUIL",
            "Obra Social",
            "Teléfono_1",
            "Teléfono_2",
            "Motivo del rechazo",
            "Fila original",
            "Código de rechazo",
            "Archivo origen"
        ]
    });
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, rejectedSheet, "Rechazados");
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumen");

    const reportFileName = `rejected_${Date.now()}_${path.parse(originalFileName).name}.xlsx`;
    const reportPath = await buildAffiliateImportReportPath(reportFileName);
    XLSX.writeFile(workbook, reportPath);
    logger.info(`Reporte de rechazos generado: ${reportFileName}`);

    return reportPath;
}

// 📊 Generar reporte de actualizados
async function generateUpdatedReport(updatedRecords, originalFileName) {
    const reportData = updatedRecords.map((upd, index) => ({
        "N°": index + 1,
        "Fila Original": upd.row,
        "Motivo": upd.reason,
        ...upd.data
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Actualizados");

    const reportFileName = `updated_${Date.now()}_${path.parse(originalFileName).name}.xlsx`;
    const reportPath = await buildAffiliateImportReportPath(reportFileName);

    XLSX.writeFile(wb, reportPath);
    logger.info(`📋 Reporte de actualizados generado: ${reportFileName}`);

    return reportPath;
}


function buildImportSummary(job, result, totalRows) {
    return {
        totalRows,
        createdCount: result.validCount ?? result.createdCount ?? 0,
        updatedCount: result.updatedCount ?? 0,
        existingLinkedCount: result.existingLinkedCount ?? 0,
        rejectedCount: result.rejectedCount ?? result.duplicates?.length ?? 0,
        rejectionSummary: result.rejectionSummary || {},
        batchId: result.batchId || job.batchId,
        importDate: job.startedAt || job.createdAt || new Date()
    };
}

function rejectedReportRowFromImportRow(row, originalFileName) {
    const normalized = row.normalized || {};
    return {
        "Nombre": normalized.nombre || "",
        "CUIL": normalized.cuil || normalized.cuilRaw || row.cuilNormalized || "",
        "Obra Social": normalized.obraSocial || "",
        "Teléfono_1": normalized.telefono1 || "",
        "Teléfono_2": normalized.telefono2 || "",
        "Motivo del rechazo": row.rejectionReason || "",
        "Fila original": row.rowNumber,
        "Código de rechazo": row.rejectionCode || "",
        "Archivo origen": originalFileName
    };
}

async function generateRejectedReportFromImportRows(jobId, originalFileName, summary) {
    const reportFileName = `rejected_${Date.now()}_${path.parse(originalFileName).name}.xlsx`;
    const reportPath = await buildAffiliateImportReportPath(reportFileName);
    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ filename: reportPath });
    const rejectedSheet = workbook.addWorksheet("Rechazados");
    rejectedSheet.columns = [
        { header: "Nombre", key: "Nombre" },
        { header: "CUIL", key: "CUIL" },
        { header: "Obra Social", key: "Obra Social" },
        { header: "Teléfono_1", key: "Teléfono_1" },
        { header: "Teléfono_2", key: "Teléfono_2" },
        { header: "Motivo del rechazo", key: "Motivo del rechazo" },
        { header: "Fila original", key: "Fila original" },
        { header: "Código de rechazo", key: "Código de rechazo" },
        { header: "Archivo origen", key: "Archivo origen" }
    ];

    const cursor = AffiliateImportRow.find({ jobId, action: "rejected" }).sort({ rowNumber: 1 }).cursor();
    for await (const row of cursor) {
        rejectedSheet.addRow(rejectedReportRowFromImportRow(row, originalFileName)).commit();
    }
    rejectedSheet.commit();

    const summarySheet = workbook.addWorksheet("Resumen");
    const summaryRows = [
        ["Campo", "Valor"],
        ["Archivo original", originalFileName],
        ["Fecha de importación", new Date(summary.importDate).toISOString()],
        ["Total de filas procesadas", summary.totalRows],
        ["Registros creados", summary.createdCount],
        ["Registros actualizados", summary.updatedCount],
        ["Registros existentes vinculados", summary.existingLinkedCount || 0],
        ["Registros rechazados", summary.rejectedCount],
        [],
        ["Motivo / Categoría", "Cantidad"],
        ...Object.entries(summary.rejectionSummary || {})
            .sort(([left], [right]) => left.localeCompare(right, "es"))
            .map(([category, count]) => [category, count])
    ];
    for (const row of summaryRows) summarySheet.addRow(row).commit();
    summarySheet.commit();
    await workbook.commit();
    logger.info(`[AFFILIATE-IMPORT][job:${jobId}] Reporte de rechazos generado desde filas persistidas: ${reportFileName}`);
    return reportPath;
}

function sumImportCounters(job) {
    return (job.createdCount || 0)
        + (job.updatedCount || 0)
        + (job.existingLinkedCount || 0)
        + (job.rejectedCount || 0);
}

function isRecoverableCompletedProcessingJob(job, staleBefore) {
    if (!job) return { ok: false, reason: "JOB_NOT_FOUND" };
    if (job.status !== "processing") return { ok: false, reason: "JOB_NOT_PROCESSING" };
    if (job.errorMessage) return { ok: false, reason: "JOB_HAS_ERROR" };
    if (!job.totalRows || job.totalRows <= 0) return { ok: false, reason: "TOTAL_ROWS_NOT_SET" };
    if (job.processedRows !== job.totalRows) return { ok: false, reason: "PROCESSED_ROWS_MISMATCH" };
    if (sumImportCounters(job) !== job.totalRows) return { ok: false, reason: "COUNTER_SUM_MISMATCH" };
    if (staleBefore && new Date(job.updatedAt) > staleBefore) return { ok: false, reason: "JOB_NOT_STALE" };
    return { ok: true };
}

async function ensureRejectedReportForJob(job, summary, { dryRun = false } = {}) {
    const existingPath = job.rejectedFilePath || job.duplicateFilePath;
    if ((job.rejectedCount || 0) === 0) {
        return { path: existingPath || null, required: false, generated: false };
    }
    if (await affiliateImportReportExists(existingPath)) {
        return { path: existingPath, required: true, generated: false };
    }

    const persistedRejectedCount = await AffiliateImportRow.countDocuments({
        jobId: job._id,
        action: "rejected"
    });
    if (persistedRejectedCount !== job.rejectedCount) {
        return {
            path: existingPath || null,
            required: true,
            generated: false,
            error: "PERSISTED_REJECTION_COUNT_MISMATCH",
            persistedRejectedCount
        };
    }

    if (dryRun) {
        return {
            path: existingPath || null,
            required: true,
            generated: false,
            wouldGenerate: true,
            persistedRejectedCount
        };
    }

    const generatedPath = await generateRejectedReportFromImportRows(job._id, job.originalFilename, summary);
    return { path: generatedPath, required: true, generated: true, persistedRejectedCount };
}

async function recoverOrphanedAffiliateImportJob(jobId, options = {}) {
    const now = options.now || new Date();
    const staleMs = Number(options.staleMs || STALE_PROCESSING_MS);
    const staleBefore = options.requireStale === false ? null : new Date(now.getTime() - staleMs);
    const dryRun = options.dryRun !== false;
    const job = await AffiliateImportJob.findById(jobId).lean();
    const validation = isRecoverableCompletedProcessingJob(job, staleBefore);
    if (!validation.ok) {
        return { ok: false, finalized: false, dryRun, reason: validation.reason, job };
    }

    const status = job.rejectedCount > 0 ? "completed_with_errors" : "completed";
    const summary = buildImportSummary(job, {
        validCount: job.createdCount,
        updatedCount: job.updatedCount,
        existingLinkedCount: job.existingLinkedCount,
        rejectedCount: job.rejectedCount,
        rejectionSummary: job.rejectionSummary,
        batchId: job.batchId
    }, job.totalRows);
    const report = await ensureRejectedReportForJob(job, summary, { dryRun });
    if (report.error) {
        return { ok: false, finalized: false, dryRun, reason: report.error, report, job };
    }

    if (dryRun) {
        return { ok: true, finalized: false, dryRun: true, status, report, job };
    }

    const set = {
        status,
        finishedAt: now,
        errorMessage: null
    };
    if (report.path) {
        set.rejectedFilePath = report.path;
        set.duplicateFilePath = report.path;
    }

    const finalized = await AffiliateImportJob.findOneAndUpdate(
        {
            _id: job._id,
            status: "processing",
            errorMessage: null,
            totalRows: job.totalRows,
            processedRows: job.totalRows,
            createdCount: job.createdCount,
            updatedCount: job.updatedCount,
            existingLinkedCount: job.existingLinkedCount,
            rejectedCount: job.rejectedCount,
            ...(staleBefore ? { updatedAt: { $lte: staleBefore } } : {})
        },
        { $set: set },
        { new: true }
    ).lean();

    if (!finalized) {
        return { ok: false, finalized: false, dryRun: false, reason: "ATOMIC_FINALIZE_NOT_CLAIMED", report, job };
    }

    logger.warn(
        `[AFFILIATE-IMPORT][job:${job._id}] Orphaned processing job finalized idempotently | ` +
        `status=${status} totalRows=${job.totalRows} reportGenerated=${!!report.generated}`
    );
    return { ok: true, finalized: true, dryRun: false, status, report, job: finalized };
}

async function recoverStaleCompletedProcessingJobs(options = {}) {
    const now = options.now || new Date();
    const staleMs = Number(options.staleMs || STALE_PROCESSING_MS);
    const staleBefore = new Date(now.getTime() - staleMs);
    const candidates = await AffiliateImportJob.find({
        status: "processing",
        errorMessage: null,
        updatedAt: { $lte: staleBefore }
    }).select("_id").lean();

    let recoveredCount = 0;
    for (const candidate of candidates) {
        const result = await recoverOrphanedAffiliateImportJob(candidate._id, {
            now,
            staleMs,
            dryRun: false
        });
        if (result.finalized) recoveredCount += 1;
    }
    return { recoveredCount };
}


async function processClaimedJob(job) {
    const jobId = job._id;
    const inputPath = path.join(IMPORT_UPLOAD_DIR, path.basename(job.storedFilename || ""));

    try {
        if (!job.storedFilename) {
            throw new Error("El trabajo de importación no tiene archivo almacenado asociado.");
        }

        await fs.access(inputPath);
        logImportMemory(jobId, "starting workbook processing");
        const { totalRows, result } = await processWorkbookFile(
            inputPath,
            job.uploadedBy,
            job.originalFilename,
            jobId,
            { source: job.source }
        );

        let rejectedFilePath = null;
        let updatedFilePath = null;
        if (result.rejectedCount > 0) {
            rejectedFilePath = await generateRejectedReportFromImportRows(
                jobId,
                job.originalFilename,
                buildImportSummary(job, result, totalRows)
            );
        }

        if (result.updatedRecords.length > 0) {
            updatedFilePath = await generateUpdatedReport(result.updatedRecords, job.originalFilename);
        }

        const status = result.rejectedCount > 0 ? "completed_with_errors" : "completed";
        await AffiliateImportJob.updateOne(
            { _id: jobId, status: "processing" },
            {
                $set: {
                    status,
                    totalRows,
                    processedRows: totalRows,
                    createdCount: result.validCount,
                    updatedCount: result.updatedCount,
                    existingLinkedCount: result.existingLinkedCount,
                    rejectedCount: result.rejectedCount,
                    rejectionSummary: result.rejectionSummary,
                    batchId: result.batchId,
                    rejectedFilePath: rejectedFilePath || undefined,
                    updatedFilePath: updatedFilePath || undefined,
                    duplicateFilePath: rejectedFilePath || undefined,
                    finishedAt: new Date(),
                    errorMessage: null
                }
            }
        );

        logImportMemory(jobId, "finalized", { processedRows: totalRows });
        logger.info(
            `[AFFILIATE-IMPORT][job:${jobId}] Finalizado | ` +
            "creados=" + result.validCount + " actualizados=" + result.updatedCount + " " +
            "existentesVinculados=" + result.existingLinkedCount + " rechazados=" + result.rejectedCount
        );
        return result;
    } catch (error) {
        logger.error(`[AFFILIATE-IMPORT][job:${jobId}] Error: ${error.message}`);
        await AffiliateImportJob.updateOne(
            { _id: jobId },
            {
                $set: {
                    status: "failed",
                    errorMessage: error.message,
                    finishedAt: new Date()
                }
            }
        );
        throw error;
    }
}


async function processAffiliateImportJob(jobId) {
    const job = await AffiliateImportJob.findOneAndUpdate(
        { _id: jobId, status: "pending" },
        {
            $set: {
                status: "processing",
                startedAt: new Date(),
                finishedAt: null,
                errorMessage: null
            }
        },
        { new: true }
    );

    if (!job) return null;
    return processClaimedJob(job);
}

async function claimAndProcessNextJob() {
    const job = await AffiliateImportJob.findOneAndUpdate(
        { status: "pending" },
        {
            $set: {
                status: "processing",
                startedAt: new Date(),
                finishedAt: null,
                errorMessage: null
            }
        },
        { sort: { createdAt: 1 }, new: true }
    );

    if (!job) return null;
    await processClaimedJob(job);
    return job;
}

async function failStaleProcessingJobs() {
    const staleBefore = new Date(Date.now() - STALE_PROCESSING_MS);
    const recovered = await recoverStaleCompletedProcessingJobs({ now: new Date(), staleMs: STALE_PROCESSING_MS });
    const failed = await AffiliateImportJob.updateMany(
        {
            status: "processing",
            startedAt: { $lt: staleBefore },
            $expr: {
                $not: {
                    $and: [
                        { $eq: ["$processedRows", "$totalRows"] },
                        {
                            $eq: [
                                { $add: ["$createdCount", "$updatedCount", "$existingLinkedCount", "$rejectedCount"] },
                                "$totalRows"
                            ]
                        }
                    ]
                }
            }
        },
        {
            $set: {
                status: "failed",
                errorMessage: "Importación interrumpida: el trabajo excedió el tiempo máximo de procesamiento.",
                finishedAt: new Date()
            }
        }
    );
    return {
        modifiedCount: (failed.modifiedCount || 0) + recovered.recoveredCount,
        failedCount: failed.modifiedCount || 0,
        recoveredCount: recovered.recoveredCount
    };
}


let inProcessRunnerActive = false;

function kickAffiliateImportProcessor() {
    if (inProcessRunnerActive) return;
    inProcessRunnerActive = true;

    setImmediate(async () => {
        try {
            await failStaleProcessingJobs();
            while (true) {
                try {
                    const job = await claimAndProcessNextJob();
                    if (!job) break;
                } catch (error) {
                    logger.error(`[AFFILIATE-IMPORT] In-process job error: ${error.message}`);
                }
            }
        } finally {
            inProcessRunnerActive = false;
        }
    });
}

module.exports = {
    IMPORT_UPLOAD_DIR,
    IMPORT_REPORT_DIR: getAffiliateImportReportRoot(),
    processAffiliatesData,
    processAffiliateImportJob,
    claimAndProcessNextJob,
    failStaleProcessingJobs,
    recoverOrphanedAffiliateImportJob,
    recoverStaleCompletedProcessingJobs,
    generateRejectedReportFromImportRows,
    processWorkbookFile,
    kickAffiliateImportProcessor
};
