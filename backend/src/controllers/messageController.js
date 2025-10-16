// src/controllers/messageController.js

const Contact = require("../models/Contact");
const Message = require("../models/Message");
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

// =========================================================
// CRUD de Mensajes (histórico de contactaciones)
// =========================================================

// Crear un mensaje
exports.createMessage = async (req, res) => {
    try {
        const { contact, job, contenido, status, to, from, body, direction } = req.body;

        const message = new Message({
            contact: contact || null,
            createdBy: req.user?._id || null,
            job: job || null,
            contenido,
            status: status || "pendiente",
            to,
            from,
            body,
            direction: direction || "outbound",
            timestamp: new Date(),
        });

        await message.save();
        res.status(201).json(message);
    } catch (err) {
        logger.error("❌ Error creando mensaje:", err);
        res.status(500).json({ error: err.message });
    }
};

// Listar mensajes (paginados opcionalmente)
exports.getMessages = async (req, res) => {
    try {
        const { page = 1, limit = 20, status, contactId, jobId } = req.query;
        const query = {};
        if (status) query.status = status;
        if (contactId) query.contact = contactId;
        if (jobId) query.job = jobId;

        const total = await Message.countDocuments(query);
        const messages = await Message.find(query)
            .populate("contact", "nombre telefono")
            .populate("createdBy", "nombre email")
            .populate("job", "name status")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.json({ total, page: parseInt(page), pages: Math.ceil(total / limit), messages });
    } catch (err) {
        logger.error("❌ Error listando mensajes:", err);
        res.status(500).json({ error: err.message });
    }
};

// Obtener mensaje por ID
exports.getMessageById = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id)
            .populate("contact", "nombre telefono")
            .populate("createdBy", "nombre email")
            .populate("job", "name status");

        if (!message) return res.status(404).json({ error: "Mensaje no encontrado" });
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Actualizar (ej: estado del envío)
exports.updateMessage = async (req, res) => {
    try {
        const { status, contenido, body } = req.body;
        const message = await Message.findByIdAndUpdate(
            req.params.id,
            { status, contenido, body },
            { new: true, runValidators: true }
        );
        if (!message) return res.status(404).json({ error: "Mensaje no encontrado" });
        res.json(message);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Eliminar (en casos especiales)
exports.deleteMessage = async (req, res) => {
    try {
        const message = await Message.findByIdAndDelete(req.params.id);
        if (!message) return res.status(404).json({ error: "Mensaje no encontrado" });
        res.json({ message: "Mensaje eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// =========================================================
// Previsualizaciones (fix: funciones que faltaban)
// =========================================================

/**
 * POST /messages/preview
 * Body:
 *  - contenido: string (plantilla con placeholders {{campo}})
 *  - variables: object | array<object> (opcional) - datos para reemplazar
 *
 * Si variables es array -> devuelve un array de previsualizaciones.
 * Si es objeto o ausente -> devuelve una sola previsualización.
 */
exports.previewMessage = async (req, res) => {
    try {
        const { contenido, variables } = req.body;
        if (!contenido) {
            return res.status(400).json({ error: "Campo 'contenido' es requerido para previsualizar" });
        }

        const render = (template, data = {}) => {
            try {
                return template.replace(/{{\s*([^}]+)\s*}}/g, (match, key) => {
                    // intentamos con la key tal cual, y con su versión normalizada
                    const nk = normalizeHeader(key);
                    const rawVal = data[key] ?? data[nk];
                    return rawVal !== undefined && rawVal !== null ? String(rawVal) : "";
                });
            } catch (err) {
                // en caso de error de render fallback al template crudo
                return template;
            }
        };

        if (Array.isArray(variables)) {
            const previews = variables.map(v => ({
                variables: v,
                preview: render(contenido, v)
            }));
            return res.json({ previews });
        } else {
            const preview = render(contenido, variables || {});
            return res.json({ preview });
        }
    } catch (err) {
        logger.error("❌ Error en previewMessage:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * POST /messages/preview/import
 * - req.file: archivo CSV/XLSX (se espera que el middleware de upload venga del router o app)
 * - req.body.contenido: plantilla con placeholders {{campo}}
 *
 * Lee la primera hoja, normaliza headers y devuelve hasta 10 filas con previsualización
 * (telefono normalizado, si es válido según isValidPhone y el texto renderizado).
 */
exports.previewMessageFromImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Debes subir un archivo CSV/XLSX para previsualizar" });
        }

        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rawSheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        if (!rawSheet || rawSheet.length === 0) {
            // limpiar archivo temporal si existe
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            return res.status(400).json({ message: "El archivo está vacío o no tiene filas" });
        }

        const headersRow = rawSheet[0] || [];
        const headers = headersRow.map(h => normalizeHeader(h || ""));
        const rows = rawSheet.slice(1);

        // Guardamos los headers para posible uso posterior (como en importContacts)
        lastImportHeaders = headers;

        const { contenido } = req.body;
        if (!contenido) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            return res.status(400).json({ message: "Debes enviar 'contenido' (plantilla) en el body para generar la previsualización" });
        }

        const renderTemplate = (template, rowData = {}) => {
            try {
                return template.replace(/{{\s*([^}]+)\s*}}/g, (m, key) => {
                    const nk = normalizeHeader(key);
                    // intentamos la key tal cual y la normalizada
                    const val = rowData[key] ?? rowData[nk];
                    return val !== undefined && val !== null ? String(val) : "";
                });
            } catch (err) {
                return template;
            }
        };

        const previews = [];
        const maxPreview = Math.min(rows.length, 10);

        for (let i = 0; i < maxPreview; i++) {
            const row = rows[i] || [];
            const rowData = {};
            headers.forEach((h, idx) => {
                rowData[h] = row[idx];
            });

            // intentamos detectar teléfono en campos típicos
            const possiblePhoneKeys = ["telefono", "phone", "celular", "telefono1", "telefonocelular"];
            let telefonoRaw = null;
            for (const k of possiblePhoneKeys) {
                if (rowData[k]) {
                    telefonoRaw = rowData[k];
                    break;
                }
            }
            // si ninguno, también probamos tomar la primera columna llamada 'telefono' por índice 0
            if (!telefonoRaw && row[0]) telefonoRaw = row[0];

            const normalizedPhone = telefonoRaw ? String(telefonoRaw).replace(/\D/g, "") : null;
            const validPhone = normalizedPhone ? isValidPhone(normalizedPhone) : false;

            const previewText = renderTemplate(contenido, rowData);

            previews.push({
                index: i + 1,
                row: rowData,
                telefono: normalizedPhone || "N/A",
                validPhone,
                preview: previewText,
            });
        }

        // limpiar archivo temporal
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

        res.json({ previews, totalRows: rows.length, headers });
    } catch (error) {
        logger.error("❌ Error en previewMessageFromImport:", error);
        // intentamos limpiar archivo temporal si existe
        try { if (req.file && req.file.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        res.status(500).json({ error: error.message });
    }
};

// =========================================================
// 🔹 Importar contactos desde CSV/XLSX
// =========================================================

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

        // 🔹 Guardamos los headers para el endpoint dinámico
        lastImportHeaders = headers;

        let inserted = 0;
        let invalid = 0;
        let warnings = [];
        let newContacts = [];

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
                if (existing.createdBy && existing.createdBy._id.equals(req.body.createdBy)) {
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
                createdBy: req.body.createdBy,
                extraData
            });
        }

        // Inserción masiva optimizada
        if (newContacts.length > 0) {
            await Contact.insertMany(newContacts);
            inserted = newContacts.length;
        }

        fs.unlinkSync(req.file.path);

        logger.info(`📊 Importación completada: Insertados=${inserted}, Inválidos=${invalid}, Warnings=${warnings.length}`);

        res.json({
            message: "Importación completada",
            resumen: { inserted, invalid },
            warnings
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