// src/controllers/contactController.js

const Contact = require("../models/Contact");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

// 🔹 Directorio de logs centralizado
const logsDir = path.join(__dirname, "../../logs");

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

        console.log("⚡ ownerUser recibido en controller:", req.body.ownerUser);

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
                    detalle: `Fila incompleta (nombre/telefono/cuil faltante)`,
                    fila: JSON.stringify(rowData)
                });
                invalid++;
                missingFields++;
                continue;
            }

            if (!isValidPhone(telefono)) {
                warnings.push({
                    telefono: normalizedPhone,
                    tipo: "telefono_invalido",
                    detalle: `Teléfono inválido (${telefono})`,
                    fila: JSON.stringify(rowData)
                });
                invalid++;
                invalidPhones++;
                continue;
            }

            const existing = await Contact.findOne({ telefono: normalizedPhone }).populate("ownerUser", "nombre");

            if (existing) {
                if (existing.ownerUser && existing.ownerUser._id.equals(req.body.ownerUser)) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "mismo_asesor",
                        detalle: `Ya contactaste con este usuario el día ${existing.createdAt.toLocaleDateString("es-AR")}`,
                        fila: JSON.stringify(rowData)
                    });
                    sameAdvisor++;
                } else if (existing.ownerUser) {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "otro_asesor",
                        detalle: `Ya fue cargado por el asesor ${existing.ownerUser.nombre}`,
                        fila: JSON.stringify(rowData)
                    });
                    otherAdvisor++;
                } else {
                    warnings.push({
                        telefono: normalizedPhone,
                        tipo: "sin_asesor",
                        detalle: `Existe en la BD pero sin asesor asignado`,
                        fila: JSON.stringify(rowData)
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
                ownerUser: req.body.ownerUser,
                extraData
            });
        }

        // Inserción masiva optimizada
        if (newContacts.length > 0) {
            await Contact.insertMany(newContacts);
            inserted = newContacts.length;
        }

        fs.unlinkSync(req.file.path);

        // Guardar warnings en archivos (JSON + CSV)
        if (warnings.length > 0) {
            if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

            const baseName = `import_warnings_${Date.now()}`;
            const logJsonPath = path.join(logsDir, `${baseName}.json`);
            const logCsvPath = path.join(logsDir, `${baseName}.csv`);

            fs.writeFileSync(logJsonPath, JSON.stringify(warnings, null, 2), "utf8");

            const csvHeader = "telefono,tipo,detalle,fila\n";
            const csvContent = warnings.map(w =>
                `"${w.telefono}","${w.tipo}","${w.detalle.replace(/"/g, '""')}","${w.fila.replace(/"/g, '""')}"`
            ).join("\n");
            fs.writeFileSync(logCsvPath, csvHeader + csvContent, "utf8");

            console.log(`📂 Warnings exportados en: 
                - ${logJsonPath}
                - ${logCsvPath}`);
        }

        console.log(`📊 Resumen importación:
        ✔️ Insertados: ${inserted}
        ❌ Inválidos: ${invalid}
        ⚠️ Warnings totales: ${warnings.length}
           - Mismo asesor: ${sameAdvisor}
           - Otro asesor: ${otherAdvisor}
           - Sin asesor: ${noAdvisor}
           - Campos faltantes: ${missingFields}
           - Teléfonos inválidos: ${invalidPhones}`);

        res.json({
            message: "Importación completada",
            resumen: { inserted, invalid },
            warnings
        });
    } catch (error) {
        console.error("❌ Error en importContacts:", error);
        res.status(500).json({ error: error.message });
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
exports.listImportLogs = (req, res) => {
    try {
        if (!fs.existsSync(logsDir)) {
            return res.json({ logs: [] });
        }

        const files = fs.readdirSync(logsDir).filter(f => f.endsWith(".json") || f.endsWith(".csv"));

        res.json({
            logs: files.map(f => ({
                filename: f,
                url: `/contacts/logs/${f}`
            }))
        });
    } catch (error) {
        console.error("❌ Error listImportLogs:", error);
        res.status(500).json({ error: "No se pudo listar logs" });
    }
};

// 📥 Descargar archivo específico
exports.downloadImportLog = (req, res) => {
    try {
        const filePath = path.join(logsDir, req.params.filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: "Archivo no encontrado" });
        }

        res.download(filePath);
    } catch (error) {
        console.error("❌ Error downloadImportLog:", error);
        res.status(500).json({ error: "No se pudo descargar el archivo" });
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