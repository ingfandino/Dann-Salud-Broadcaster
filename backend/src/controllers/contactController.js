// src/controllers/contactController.js

const Contact = require("../models/Contact");
const XLSX = require("xlsx");
const ImportLog = require("../models/ImportLog");
const fs = require("fs");
const logger = require("../utils/logger");

// 🔹 Validador de teléfono argentino más flexible (8–13 dígitos)
const isValidPhone = (v) => {
    const digits = String(v || "").replace(/\D/g, "");
    return /^\d{8,13}$/.test(digits);
};

// 🔹 Normalizar headers
const normalizeHeader = (header) => {
    return header
        .toString()
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
        const rawSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        const headers = rawSheet[0].map(h => normalizeHeader(h));
        const rows = rawSheet.slice(1);

        // Caps de seguridad
        const MAX_ROWS = Number(process.env.CONTACTS_IMPORT_MAX_ROWS || 5000);
        if (rows.length > MAX_ROWS) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: `Demasiadas filas (${rows.length}). Límite: ${MAX_ROWS}` });
        }

        // Guardamos los headers para el endpoint dinámico
        lastImportHeaders = headers;

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

        for (let row of rows) {
            if (!row || row.every(cell => !cell || cell.toString().trim() === "")) continue;

            const rowData = {};
            headers.forEach((h, i) => { rowData[h] = row[i]; });

            const { telefono, nombre, cuil, ...extraData } = rowData;
            let normalizedPhone = telefono ? String(telefono).replace(/\D/g, "") : null;

            if (!telefono || !nombre || !cuil) {
                warnings.push({
                    telefono: normalizedPhone || "N/A",
                    tipo: "faltan_campos",
                    detalle: `Fila incompleta (nombre/telefono/cuil faltante)`
                });
                invalid++;
                missingFields++;
                continue;
            }

            if (!isValidPhone(telefono)) {
                warnings.push({
                    telefono: normalizedPhone,
                    tipo: "telefono_invalido",
                    detalle: `Teléfono inválido (${telefono})`
                });
                invalid++;
                invalidPhones++;
                continue;
            }

            const existing = await Contact.findOne({ telefono: normalizedPhone }).populate("createdBy", "nombre");

            if (existing) {
                if (existing.createdBy && existing.createdBy._id.equals(req.user._id)) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "mismo_asesor",
                        detalle: `Ya contactado previamente por este asesor`
                    });
                    sameAdvisor++;
                } else if (existing.createdBy) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "otro_asesor",
                        detalle: `Ya fue cargado por otro asesor (${existing.createdBy.nombre})`
                    });
                    otherAdvisor++;
                } else {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "sin_asesor",
                        detalle: `Existe en la BD pero sin asesor asignado`
                    });
                    noAdvisor++;
                }
                invalid++;
                continue;
            }

            // acumular para inserción masiva
            newContacts.push({
                nombre,
                telefono: normalizedPhone,
                cuil,
                createdBy: req.user._id,
                extraData
            });
        }

        // Inserción masiva optimizada
        if (newContacts.length > 0) {
            const insertedRes = await Contact.insertMany(newContacts);
            inserted = insertedRes.length;
            insertedContacts = insertedRes.map(c => ({ _id: c._id, nombre: c.nombre, telefono: c.telefono }));
        }

        fs.unlinkSync(req.file.path);

        logger.info(`📊 Importación completada: Insertados=${inserted}, Inválidos=${invalid}, Warnings=${warnings.length}`);

        res.json({
            message: "Importación completada",
            resumen: { inserted, invalid },
            warnings,
            insertedContacts
        });
    } catch (error) {
        logger.error("❌ Error en importContacts:", error.message);
        res.status(500).json({ error: error.message });
    }

    if (warnings.length > 0) {
        await ImportLog.create({
            filename: `import_warnings_${Date.now()}`,
            type: "json",
            content: warnings
        });
    }
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

// Obtener contacto por ID (stub)
exports.getContactById = async (req, res) => {
    return res.status(200).json({
        message: `Endpoint GET /contacts/${req.params.id} aún no implementado`
    });
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
        res.json({ logs });
    } catch (error) {
        logger.error("❌ Error listImportLogs:", error);
        res.status(500).json({ error: "No se pudo listar logs" });
    }
};

// 📥 Descargar archivo específico
exports.downloadImportLog = async (req, res) => {
    try {
        const log = await ImportLog.findById(req.params.id);
        if (!log) return res.status(404).json({ error: "Log no encontrado" });

        res.json(log);
    } catch (error) {
        logger.error("❌ Error downloadImportLog:", error);
        res.status(500).json({ error: "No se pudo descargar el log" });
    }
};

// 🔹 Devolver headers detectados en la última importación
exports.getLastImportHeaders = (req, res) => {
    if (!lastImportHeaders || lastImportHeaders.length === 0) {
        // 🔹 En lugar de 404 → devolver fallback
        return res.json({
            headers: ["nombre", "telefono", "cuil"],
            note: "Aún no se ha importado ningún archivo, se devuelven headers de ejemplo."
        });
    }
    res.json({ headers: lastImportHeaders });
};