/**
 * ============================================================
 * CONTROLADOR DE CONTACTOS (contactController)
 * ============================================================
 * Gestiona la importación masiva de contactos desde archivos
 * CSV/XLSX para campañas de mensajería por WhatsApp.
 * 
 * Funcionalidades principales:
 * - Importación masiva con validación de datos
 * - Detección de duplicados y contactos ya contactados
 * - Generación de reportes de rechazados
 * - Normalización automática de números de teléfono
 */

const Contact = require("../models/Contact");
const Message = require("../models/Message");
const XLSX = require("xlsx");
const ImportLog = require("../models/ImportLog");
const fs = require("fs");
const logger = require("../utils/logger");

/** Valida teléfono (8-15 dígitos) para formatos internacionales */
const isValidPhone = (v) => {
    const digits = String(v || "").replace(/\D/g, "");
    return /^\d{8,15}$/.test(digits);
};

/** Normaliza headers removiendo acentos, espacios y BOM */
const normalizeHeader = (header) => {
    return header
        .toString()
        .replace(/\uFEFF/g, "") // BOM
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "");
};

// 🔹 Variable global para almacenar headers de última importación
let lastImportHeaders = [];

// 🔹 Importar contactos desde CSV/XLSX
exports.importContacts = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Debes subir un archivo CSV/XLSX" });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, blankrows: false, defval: "" });

        const headers = rawSheet[0].map(h => normalizeHeader(h));
        const phoneHeaderKeys = [
            "telefono", "phone", "celular", "telefono1", "telefonocelular", "numerodetelefono", "tel", "movil", "mobile", "whatsapp"
        ];
        const nameHeaderKeys = [
            "nombre", "name", "fullname", "nombreyapellido"
        ];
        const cuilHeaderKeys = [
            "cuil", "cuit", "dni", "documento"
        ];
        const findIndex = (keys) => {
            for (const k of keys) {
                const idx = headers.indexOf(k);
                if (idx !== -1) return idx;
            }
            return -1;
        };
        const phoneIdx = findIndex(phoneHeaderKeys);
        const nameIdx = findIndex(nameHeaderKeys);
        const cuilIdx = findIndex(cuilHeaderKeys);

        // Filtrar directamente por filas con teléfono válido (sin pasos intermedios)
        const allRows = rawSheet.slice(1);
        const seenPhonesForLimit = new Set();
        const effectiveRows = [];

        for (const row of allRows) {
            if (!row || !Array.isArray(row)) continue;
            const phoneRaw = phoneIdx >= 0 ? row[phoneIdx] : null;
            if (!phoneRaw) continue;
            const digits = String(phoneRaw).replace(/\D/g, "");
            if (!/^\d{8,15}$/.test(digits)) continue;
            if (seenPhonesForLimit.has(digits)) continue;
            seenPhonesForLimit.add(digits);
            effectiveRows.push(row);
        }

        const MAX_ROWS = Number(process.env.CONTACTS_IMPORT_MAX_ROWS || 5000);
        const MAX_PER_CAMPAIGN = 50;
        let truncated = 0;
        let exceededCampaignLimit = 0;
        
        if (effectiveRows.length > MAX_ROWS) {
            truncated = effectiveRows.length - MAX_ROWS;
            effectiveRows.splice(MAX_ROWS);
        }
        
        if (effectiveRows.length > MAX_PER_CAMPAIGN) {
            exceededCampaignLimit = effectiveRows.length - MAX_PER_CAMPAIGN;
            effectiveRows.splice(MAX_PER_CAMPAIGN);
        }

        // Guardamos los headers para el endpoint dinámico
        lastImportHeaders = headers;

        // Pre-cargar contactos existentes por teléfono para acelerar
        const numbers = effectiveRows
            .map(r => {
                const phoneRaw = phoneIdx >= 0 ? r[phoneIdx] : null;
                return phoneRaw ? String(phoneRaw).replace(/\D/g, "") : null;
            })
            .filter(d => d && /^\d{8,15}$/.test(d));
        const existingList = numbers.length
            ? await Contact.find({ telefono: { $in: numbers } })
            : [];
        const existingByPhone = new Map(existingList.map(c => [String(c.telefono), c]));

        let inserted = 0;
        let invalid = 0;
        let warnings = [];
        let newContacts = [];
        let insertedContacts = [];

        // contadores por categoría
        let sameAdvisor = 0;
        let otherAdvisor = 0;
        let noAdvisor = 0;
        let missingFields = 0;
        let invalidPhones = 0;

        // Detección de duplicados dentro del mismo archivo
        const seenPhonesInFile = new Set();

        for (let row of effectiveRows) {

            if (!row || row.every(cell => !cell || cell.toString().trim() === "")) continue;

            const rowData = {};
            headers.forEach((h, i) => { rowData[h] = row[i]; });

            // Soportar alias de encabezados comunes
            const phoneKeys = [
                "telefono", "phone", "celular", "telefono1", "telefonocelular", "numerodetelefono", "tel", "movil", "mobile", "whatsapp"
            ];
            const nameKeys = [
                "nombre", "name", "fullname", "nombreyapellido"
            ];
            const cuilKeys = [
                "cuil", "cuit", "dni", "documento"
            ];

            const pickFirst = (keys) => {
                for (const k of keys) {
                    if (Object.prototype.hasOwnProperty.call(rowData, k) && rowData[k] !== undefined && rowData[k] !== null && String(rowData[k]).toString().trim() !== "") {
                        return { key: k, value: rowData[k] };
                    }
                }
                return { key: null, value: null };
            };

            const { key: phoneKey, value: phoneVal } = pickFirst(phoneKeys);
            const { key: nameKey, value: nameVal } = pickFirst(nameKeys);
            const { key: cuilKey, value: cuilVal } = pickFirst(cuilKeys);

            let normalizedPhone = phoneVal ? String(phoneVal).replace(/\D/g, "") : null;

            // Duplicado dentro del archivo
            if (normalizedPhone) {
                if (seenPhonesInFile.has(normalizedPhone)) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "duplicado_en_archivo",
                        detalle: "El mismo número aparece múltiples veces en el archivo"
                    });
                    invalid++;
                    continue;
                }
                seenPhonesInFile.add(normalizedPhone);
            }

            if (!phoneVal || !nameVal || !cuilVal) {
                warnings.push({
                    telefono: normalizedPhone || "N/A",
                    tipo: "faltan_campos",
                    detalle: `Fila incompleta (nombre/telefono/cuil faltante)`
                });
                invalid++;
                missingFields++;
                continue;
            }

            if (!isValidPhone(phoneVal)) {
                warnings.push({
                    telefono: normalizedPhone,
                    tipo: "telefono_invalido",
                    detalle: `Teléfono inválido (${phoneVal})`
                });
                invalid++;
                invalidPhones++;
                continue;
            }

            const existing = existingByPhone.get(String(normalizedPhone)) || null;

            if (existing) {
                if (existing.noWhatsApp === true) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "sin_whatsapp",
                        detalle: `El contacto fue marcado como SIN WhatsApp en una campaña anterior`
                    });
                    invalid++;
                    continue;
                }
                
                if (existing.massMessagedAt) {
                    const fechaEnvio = new Date(existing.massMessagedAt).toLocaleDateString('es-AR');
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "ya_contactado_campaña",
                        detalle: `El contacto ya recibió mensaje de campaña masiva el ${fechaEnvio}`
                    });
                    invalid++;
                    continue;
                }
                
                const hasSuccessfulMessages = await Message.countDocuments({
                    contact: existing._id,
                    status: "enviado"
                });

                if (hasSuccessfulMessages > 0) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "duplicado_con_mensajes",
                        detalle: `El contacto ya recibió ${hasSuccessfulMessages} mensaje(s) exitoso(s)`
                    });
                    invalid++;
                    continue;
                } else {
                    logger.info(`🔄 Eliminando contacto sin mensajes exitosos: ${normalizedPhone} (ID: ${existing._id})`);
                    await Contact.findByIdAndDelete(existing._id);

                    const deletedMessages = await Message.deleteMany({ contact: existing._id });
                    if (deletedMessages.deletedCount > 0) {
                        logger.info(`🗑️ Eliminados ${deletedMessages.deletedCount} mensaje(s) fallido(s) asociado(s)`);
                    }

                    existingByPhone.delete(String(normalizedPhone));

                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "reemplazado",
                        detalle: `Contacto anterior sin mensajes exitosos fue eliminado y será reemplazado`
                    });
                }
            }

            // acumular para inserción masiva
            // Construir extraData excluyendo claves usadas para nombre/telefono/cuil
            const excludeKeys = new Set([phoneKey, nameKey, cuilKey]);
            const extraData = {};
            for (const [k, v] of Object.entries(rowData)) {
                if (!excludeKeys.has(k) && v !== undefined && v !== null && String(v).trim() !== "") {
                    extraData[k] = String(v);
                }
            }

            newContacts.push({
                nombre: String(nameVal),
                telefono: normalizedPhone,
                cuil: String(cuilVal),
                createdBy: req.user._id,
                extraData
            });
        }

        // Inserción masiva optimizada
        if (newContacts.length > 0) {
            const insertedRes = await Contact.insertMany(newContacts);
            inserted += insertedRes.length;
            insertedContacts.push(...insertedRes.map(c => ({
                _id: c._id,
                nombre: c.nombre,
                telefono: c.telefono,
                cuil: c.cuil,
                extraData: c.extraData
            })));
        }

        fs.unlinkSync(req.file.path);

        if (exceededCampaignLimit > 0) {
            warnings.push({
                telefono: "N/A",
                tipo: "limite_campaña_excedido",
                detalle: `Se excluyeron ${exceededCampaignLimit} contacto(s) por superar el límite de ${MAX_PER_CAMPAIGN} contactos por campaña`
            });
            invalid += exceededCampaignLimit;
        }

        logger.info(`📊 Importación completada: Insertados=${inserted}, Inválidos=${invalid}, Warnings=${warnings.length}`);

        // Generar archivo .txt con rechazados y persistir log
        let logId = null;
        let rejectedTxtContent = "";

        if (warnings.length > 0) {
            try {
                // Generar contenido del archivo .txt
                rejectedTxtContent = "AFILIADOS RECHAZADOS\n";
                rejectedTxtContent += "===================\n\n";
                rejectedTxtContent += `Total rechazados: ${warnings.length}\n`;
                rejectedTxtContent += `Fecha: ${new Date().toLocaleString('es-AR')}\n\n`;
                rejectedTxtContent += "DETALLE DE RECHAZOS:\n";
                rejectedTxtContent += "--------------------\n\n";

                warnings.forEach((w, idx) => {
                    rejectedTxtContent += `${idx + 1}. Teléfono: ${w.telefono}\n`;
                    rejectedTxtContent += `   Tipo: ${w.tipo}\n`;
                    rejectedTxtContent += `   Razón: ${w.detalle}\n\n`;
                });

                // Guardar en ImportLog con el contenido .txt
                const log = await ImportLog.create({
                    filename: `rechazados_${Date.now()}.txt`,
                    type: "txt",
                    content: rejectedTxtContent
                });
                logId = log._id;
                logger.info(`✅ Archivo de rechazados guardado con ID: ${logId}`);
            } catch (e) {
                logger.error("❌ Error guardando ImportLog:", e);
            }
        }

        res.json({
            message: "Importación completada",
            resumen: {
                accepted: inserted,  // Aceptados
                rejected: invalid,   // Rechazados
                total: inserted + invalid,
                truncated
            },
            warnings,
            contacts: insertedContacts,  // Cambiar nombre para mayor claridad
            headers: lastImportHeaders,
            rejectedFileId: logId  // ID del archivo de rechazados para descarga
        });
    } catch (error) {
        logger.error("❌ Error en importContacts:", { message: error?.message, stack: error?.stack });
        res.status(500).json({ error: error?.message || "Error en importación" });
    }

    // (mantenido vacío: log ya se guarda antes de responder)
};

// Crear contacto individual (deshabilitado)
exports.createContact = async (req, res) => {
    return res.status(405).json({
        message: "La creación individual de contactos está deshabilitada. Use la importación masiva."
    });
};

// Obtener todos los contactos (stub)
exports.getContacts = async (req, res) => {
    return res.status(200).json({
        message: "Endpoint GET /contacts (listado) aún no implementado"
    });
};

// Obtener contacto por ID (incluye extraData)
exports.getContactById = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id).lean();
        if (!contact) return res.status(404).json({ error: "Contacto no encontrado" });
        return res.json(contact);
    } catch (error) {
        logger.error("❌ Error getContactById:", error);
        return res.status(500).json({ error: "Error obteniendo contacto" });
    }
};

// Actualizar contacto (stub)
exports.updateContact = async (req, res) => {
    return res.status(405).json({
        message: "La actualización individual está deshabilitada. Use importación masiva."
    });
};

// Eliminar contacto (stub)
exports.deleteContact = async (req, res) => {
    return res.status(405).json({
        message: "La eliminación individual está deshabilitada. Use importación masiva."
    });
};

// 📂 Listar logs disponibles
exports.listImportLogs = async (req, res) => {
    try {
        const logs = await ImportLog.find().sort({ createdAt: -1 }).limit(50);
        return res.json({ logs });
    } catch (error) {
        logger.error("❌ Error listImportLogs:", error);
        return res.status(500).json({ error: "Error listando logs" });
    }
};

// 📥 Descargar archivo específico
exports.downloadImportLog = async (req, res) => {
    try {
        const log = await ImportLog.findById(req.params.id);
        if (!log) return res.status(404).json({ error: "Log no encontrado" });
        return res.json(log);
    } catch (error) {
        logger.error("❌ Error downloadImportLog:", error);
        return res.status(500).json({ error: "No se pudo descargar el log" });
    }
};

// 📋 Devolver headers detectados en la última importación
exports.getLastImportHeaders = async (_req, res) => {
    try {
        const headers = Array.isArray(lastImportHeaders) && lastImportHeaders.length > 0
            ? lastImportHeaders
            : ["nombre", "telefono", "cuil"];
        return res.json({ headers });
    } catch (error) {
        logger.error("❌ Error getLastImportHeaders:", error);
        return res.status(500).json({ error: "No se pudieron obtener los headers" });
    }
};

// 📥 Descargar archivo de rechazados en formato .txt
exports.downloadRejectedTxt = async (req, res) => {
    try {
        const log = await ImportLog.findById(req.params.id);
        if (!log) return res.status(404).json({ error: "Archivo no encontrado" });

        // Configurar headers para descarga de archivo .txt
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${log.filename}"`);

        // Enviar el contenido del archivo
        return res.send(log.content);
    } catch (error) {
        logger.error("❌ Error downloadRejectedTxt:", error);
        return res.status(500).json({ error: "No se pudo descargar el archivo" });
    }
};