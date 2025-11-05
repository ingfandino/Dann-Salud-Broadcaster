// backend/src/controllers/affiliateController.js

const Affiliate = require("../models/Affiliate");
const AffiliateExportConfig = require("../models/AffiliateExportConfig");
const User = require("../models/User");
const logger = require("../utils/logger");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

// 🔐 Middleware de seguridad: solo gerencia
exports.requireGerencia = (req, res, next) => {
    if (req.user.role !== "gerencia") {
        logger.warn(`⚠️ Acceso denegado a base de afiliados: ${req.user.email} (rol: ${req.user.role})`);
        return res.status(403).json({ 
            error: "Acceso denegado",
            message: "Solo usuarios de rol Gerencia pueden acceder a esta funcionalidad" 
        });
    }
    next();
};

// 📤 Subir y procesar archivo .xlsx
exports.uploadAffiliates = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se proporcionó archivo" });
        }

        const userId = req.user._id;
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        
        logger.info(`📄 Procesando archivo de afiliados: ${originalName} (usuario: ${req.user.email})`);

        // Leer archivo Excel
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
            await fs.unlink(filePath); // Limpiar archivo
            return res.status(400).json({ error: "El archivo está vacío" });
        }

        logger.info(`📊 Filas encontradas: ${rawData.length}`);

        // Normalizar encabezados y validar datos
        const result = await processAffiliatesData(rawData, userId, originalName);

        // Limpiar archivo temporal
        await fs.unlink(filePath);

        // Si hay duplicados, generar reporte
        let duplicatesReportPath = null;
        if (result.duplicates.length > 0) {
            duplicatesReportPath = await generateDuplicatesReport(result.duplicates, originalName);
        }

        logger.info(`✅ Procesamiento completo: ${result.valid.length} válidos, ${result.duplicates.length} duplicados`);

        res.json({
            success: true,
            imported: result.valid.length,
            duplicates: result.duplicates.length,
            total: rawData.length,
            batchId: result.batchId,
            duplicatesReport: duplicatesReportPath ? `/affiliates/download-report/${path.basename(duplicatesReportPath)}` : null
        });

    } catch (error) {
        logger.error("❌ Error procesando archivo de afiliados:", error);
        
        // Limpiar archivo en caso de error
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch {}
        }
        
        res.status(500).json({ 
            error: "Error procesando archivo",
            message: error.message 
        });
    }
};

// 🔍 Función auxiliar: procesar datos de afiliados
async function processAffiliatesData(rawData, userId, sourceFile) {
    const batchId = uuidv4();
    const valid = [];
    const duplicates = [];
    
    // Obtener todos los teléfonos existentes en la BD
    const existingPhones = new Set();
    const existingCUILs = new Set();
    
    const existingAffiliates = await Affiliate.find({}, { cuil: 1, telefono1: 1, telefono2: 1, telefono3: 1, telefono4: 1, telefono5: 1, uploadDate: 1 }).lean();
    
    for (const aff of existingAffiliates) {
        if (aff.cuil) existingCUILs.add(normalizeString(aff.cuil));
        if (aff.telefono1) existingPhones.add(normalizePhone(aff.telefono1));
        if (aff.telefono2) existingPhones.add(normalizePhone(aff.telefono2));
        if (aff.telefono3) existingPhones.add(normalizePhone(aff.telefono3));
        if (aff.telefono4) existingPhones.add(normalizePhone(aff.telefono4));
        if (aff.telefono5) existingPhones.add(normalizePhone(aff.telefono5));
    }
    
    // Mapear afiliados existentes por CUIL para obtener fecha de carga
    const cuilToDate = {};
    for (const aff of existingAffiliates) {
        if (aff.cuil) {
            cuilToDate[normalizeString(aff.cuil)] = aff.uploadDate;
        }
    }
    
    // Teléfonos del archivo actual (para detectar duplicados dentro del mismo archivo)
    const currentBatchPhones = new Set();
    const currentBatchCUILs = new Set();

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        try {
            // 🔍 DEBUG: Mostrar headers de la primera fila
            if (i === 0) {
                logger.info("📋 Headers encontrados en Excel:", Object.keys(row));
            }
            
            // Normalizar campos obligatorios con headers tolerantes
            const normalized = {
                nombre: extractField(row, ["nombre", "name", "nombreyapellido", "apellidoynombre", "fullname"]),
                cuil: extractField(row, ["cuil", "cuit", "dni", "documento"]),
                obraSocial: extractField(row, ["obrasocial", "obra social", "obra_social", "os", "cobertura"]),
                localidad: extractField(row, ["localidad", "ciudad", "location", "city"]),
                telefono1: extractField(row, ["telefono_1", "telefono1", "tel_1", "tel1", "phone_1", "phone1", "telefono", "celular"])
            };
            
            // 🔍 DEBUG: Mostrar datos normalizados de la primera fila
            if (i === 0) {
                logger.info("📊 Primera fila normalizada:", normalized);
            }

            // Validar campos obligatorios
            const missingFields = [];
            if (!normalized.nombre) missingFields.push("Nombre");
            if (!normalized.cuil) missingFields.push("CUIL");
            if (!normalized.obraSocial) missingFields.push("Obra Social");
            if (!normalized.localidad) missingFields.push("Localidad");
            if (!normalized.telefono1) missingFields.push("Teléfono");

            if (missingFields.length > 0) {
                duplicates.push({
                    row: i + 2, // +2 porque Excel empieza en 1 y hay header
                    data: row,
                    reason: `Campos obligatorios faltantes: ${missingFields.join(", ")}`,
                    type: "invalid"
                });
                continue;
            }

            // Normalizar teléfono y CUIL
            const normalizedPhone1 = normalizePhone(normalized.telefono1);
            const normalizedCUIL = normalizeString(normalized.cuil);
            
            // 🔍 DEBUG: Mostrar normalización de primeras filas
            if (i < 3) {
                logger.info(`📱 Fila ${i + 1} - Tel original: "${normalized.telefono1}" → Normalizado: "${normalizedPhone1}"`);
                logger.info(`🆔 Fila ${i + 1} - CUIL original: "${normalized.cuil}" → Normalizado: "${normalizedCUIL}"`);
            }

            // Detectar duplicados
            let isDuplicate = false;
            let duplicateReason = "";

            // 1. Verificar si el CUIL ya existe en BD
            if (existingCUILs.has(normalizedCUIL)) {
                isDuplicate = true;
                const uploadDate = cuilToDate[normalizedCUIL];
                duplicateReason = `CUIL duplicado (ya cargado el ${uploadDate ? new Date(uploadDate).toLocaleDateString("es-AR") : "fecha desconocida"})`;
            }
            // 2. Verificar si el CUIL ya está en el archivo actual
            else if (currentBatchCUILs.has(normalizedCUIL)) {
                isDuplicate = true;
                duplicateReason = "CUIL duplicado dentro del mismo archivo";
                if (i < 5) {
                    logger.warn(`⚠️ Fila ${i + 2}: CUIL duplicado detectado: "${normalizedCUIL}"`);
                }
            }
            // 3. Verificar si el teléfono ya existe en BD
            else if (existingPhones.has(normalizedPhone1)) {
                isDuplicate = true;
                duplicateReason = "Teléfono duplicado (ya existe en la base de datos)";
            }
            // 4. Verificar si el teléfono ya está en el archivo actual
            else if (currentBatchPhones.has(normalizedPhone1)) {
                isDuplicate = true;
                duplicateReason = "Teléfono duplicado dentro del mismo archivo";
                if (i < 5) {
                    logger.warn(`⚠️ Fila ${i + 2}: Teléfono duplicado detectado: "${normalizedPhone1}"`);
                }
            }

            if (isDuplicate) {
                duplicates.push({
                    row: i + 2,
                    data: row,
                    reason: duplicateReason,
                    type: "duplicate"
                });
                continue;
            }

            // Agregar a sets de control
            currentBatchPhones.add(normalizedPhone1);
            currentBatchCUILs.add(normalizedCUIL);

            // Extraer campos opcionales
            const telefono2 = extractField(row, ["telefono_2", "telefono2", "tel_2", "tel2", "phone_2", "phone2"]);
            const telefono3 = extractField(row, ["telefono_3", "telefono3", "tel_3", "tel3", "phone_3", "phone3"]);
            const telefono4 = extractField(row, ["telefono_4", "telefono4", "tel_4", "tel4"]);
            const telefono5 = extractField(row, ["telefono_5", "telefono5", "tel_5", "tel5"]);
            const edad = extractField(row, ["edad", "age", "años"]);
            const codigoObraSocial = extractField(row, ["codigoobrasocial", "codigo_obra_social", "codigo_os", "codigoos"]);

            // Crear afiliado
            const affiliate = new Affiliate({
                nombre: normalized.nombre,
                cuil: normalizedCUIL,  // ✅ Ya normalizado
                obraSocial: normalized.obraSocial,
                localidad: normalized.localidad,
                telefono1: normalizedPhone1,  // ✅ Guardar normalizado
                telefono2: telefono2 ? normalizePhone(telefono2) : undefined,
                telefono3: telefono3 ? normalizePhone(telefono3) : undefined,
                telefono4: telefono4 ? normalizePhone(telefono4) : undefined,
                telefono5: telefono5 ? normalizePhone(telefono5) : undefined,
                edad: edad ? parseInt(edad) : undefined,
                codigoObraSocial: codigoObraSocial || undefined,
                uploadedBy: userId,
                sourceFile,
                batchId,
                additionalData: extractAdditionalFields(row)
            });

            await affiliate.save();
            valid.push(affiliate);

        } catch (error) {
            logger.error(`Error procesando fila ${i + 2}:`, error);
            duplicates.push({
                row: i + 2,
                data: row,
                reason: `Error de procesamiento: ${error.message}`,
                type: "error"
            });
        }
    }

    return { valid, duplicates, batchId };
}

// 🔧 Extraer campo con headers tolerantes
function extractField(row, possibleNames) {
    for (const name of possibleNames) {
        for (const key in row) {
            if (normalizeString(key) === normalizeString(name)) {
                const value = row[key];
                return value !== null && value !== undefined && value !== "" ? String(value).trim() : null;
            }
        }
    }
    return null;
}

// 🔧 Normalizar string (remover espacios, lowercase)
function normalizeString(str) {
    if (!str) return "";
    return String(str).toLowerCase().replace(/\s+/g, "").replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i").replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u");
}

// 🔧 Normalizar teléfono (solo números)
function normalizePhone(phone) {
    if (!phone) return "";
    return String(phone).replace(/\D/g, "");
}

// 🔧 Extraer campos adicionales no mapeados
function extractAdditionalFields(row) {
    const standardFields = [
        "nombre", "name", "nombreyapellido", "apellidoynombre", "fullname",
        "cuil", "cuit", "dni", "documento",
        "obrasocial", "obra social", "obra_social", "os", "cobertura",
        "localidad", "ciudad", "location", "city",
        "telefono_1", "telefono1", "tel_1", "tel1", "phone_1", "phone1", "telefono", "celular",
        "telefono_2", "telefono2", "tel_2", "tel2", "phone_2", "phone2",
        "telefono_3", "telefono3", "tel_3", "tel3", "phone_3", "phone3",
        "telefono_4", "telefono4", "tel_4", "tel4",
        "telefono_5", "telefono5", "tel_5", "tel5",
        "edad", "age", "años",
        "codigoobrasocial", "codigo_obra_social", "codigo_os", "codigoos"
    ];

    const additional = {};
    for (const key in row) {
        const normalizedKey = normalizeString(key);
        if (!standardFields.some(f => normalizeString(f) === normalizedKey)) {
            additional[key] = String(row[key]);
        }
    }
    return Object.keys(additional).length > 0 ? additional : undefined;
}

// 📊 Generar reporte de duplicados
async function generateDuplicatesReport(duplicates, originalFileName) {
    const reportData = duplicates.map((dup, index) => ({
        "N°": index + 1,
        "Fila Original": dup.row,
        "Motivo": dup.reason,
        "Tipo": dup.type === "duplicate" ? "Duplicado" : (dup.type === "invalid" ? "Inválido" : "Error"),
        ...dup.data
    }));

    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Duplicados");

    const reportsDir = path.join(__dirname, "../../uploads/affiliate-reports");
    await fs.mkdir(reportsDir, { recursive: true });

    const reportFileName = `duplicates_${Date.now()}_${path.parse(originalFileName).name}.xlsx`;
    const reportPath = path.join(reportsDir, reportFileName);

    XLSX.writeFile(wb, reportPath);
    logger.info(`📋 Reporte de duplicados generado: ${reportFileName}`);

    return reportPath;
}

// 📥 Descargar reporte de duplicados
exports.downloadReport = async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(__dirname, "../../uploads/affiliate-reports", filename);

        // Seguridad: verificar que el archivo existe y está en el directorio correcto
        const exists = await fs.access(filePath).then(() => true).catch(() => false);
        if (!exists) {
            return res.status(404).json({ error: "Reporte no encontrado" });
        }

        res.download(filePath, filename, (err) => {
            if (err) {
                logger.error("Error descargando reporte:", err);
                res.status(500).json({ error: "Error descargando reporte" });
            }
        });

    } catch (error) {
        logger.error("Error en downloadReport:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🔍 Buscar/filtrar afiliados
exports.searchAffiliates = async (req, res) => {
    try {
        const { query, obraSocial, page = 1, limit = 50 } = req.query;

        const filter = { active: true };

        // Búsqueda por texto (nombre, CUIL, teléfono)
        if (query) {
            const normalizedQuery = query.trim();
            filter.$or = [
                { nombre: { $regex: normalizedQuery, $options: "i" } },
                { cuil: { $regex: normalizedQuery, $options: "i" } },
                { telefono1: { $regex: normalizedQuery, $options: "i" } },
                { telefono2: { $regex: normalizedQuery, $options: "i" } },
                { telefono3: { $regex: normalizedQuery, $options: "i" } }
            ];
        }

        // Filtro por obra social
        if (obraSocial && obraSocial !== "all") {
            filter.obraSocial = obraSocial;
        }

        const total = await Affiliate.countDocuments(filter);
        const affiliates = await Affiliate.find(filter)
            .populate("uploadedBy", "nombre email")
            .sort({ uploadDate: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        res.json({
            affiliates,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit))
            }
        });

    } catch (error) {
        logger.error("Error buscando afiliados:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📊 Obtener estadísticas
exports.getStats = async (req, res) => {
    try {
        const total = await Affiliate.countDocuments({ active: true });
        
        const obrasSociales = await Affiliate.aggregate([
            { $match: { active: true } },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        const recentBatches = await Affiliate.aggregate([
            { $match: { active: true } },
            { $group: { 
                _id: "$batchId", 
                count: { $sum: 1 },
                sourceFile: { $first: "$sourceFile" },
                uploadDate: { $first: "$uploadDate" }
            }},
            { $sort: { uploadDate: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            total,
            obrasSociales: obrasSociales.map(os => ({ name: os._id, count: os.count })),
            recentBatches
        });

    } catch (error) {
        logger.error("Error obteniendo estadísticas:", error);
        res.status(500).json({ error: error.message });
    }
};

// ⚙️ Configurar exportación programada
exports.configureExport = async (req, res) => {
    try {
        const { affiliatesPerFile, scheduledTime, filters } = req.body;

        if (!affiliatesPerFile || !scheduledTime) {
            return res.status(400).json({ error: "Faltan parámetros obligatorios" });
        }

        // Validar hora
        if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
            return res.status(400).json({ error: "Formato de hora inválido (use HH:mm)" });
        }

        // Desactivar configuración anterior
        await AffiliateExportConfig.updateMany({ active: true }, { active: false });

        // Crear nueva configuración
        const config = new AffiliateExportConfig({
            configuredBy: req.user._id,
            affiliatesPerFile: Number(affiliatesPerFile),
            scheduledTime,
            filters: filters || {},
            active: true
        });

        await config.save();

        logger.info(`⚙️ Configuración de exportación guardada: ${affiliatesPerFile} afiliados/archivo a las ${scheduledTime}`);

        res.json({
            success: true,
            config
        });

    } catch (error) {
        logger.error("Error configurando exportación:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📋 Obtener configuración actual
exports.getExportConfig = async (req, res) => {
    try {
        const config = await AffiliateExportConfig.findOne({ active: true })
            .populate("configuredBy", "nombre email")
            .lean();

        res.json({ config });

    } catch (error) {
        logger.error("Error obteniendo configuración:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🗑️ Eliminar afiliado (soft delete)
exports.deleteAffiliate = async (req, res) => {
    try {
        const { id } = req.params;

        const affiliate = await Affiliate.findByIdAndUpdate(
            id,
            { active: false },
            { new: true }
        );

        if (!affiliate) {
            return res.status(404).json({ error: "Afiliado no encontrado" });
        }

        logger.info(`🗑️ Afiliado eliminado: ${affiliate.nombre} (${affiliate.cuil})`);

        res.json({ success: true, message: "Afiliado eliminado" });

    } catch (error) {
        logger.error("Error eliminando afiliado:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = exports;
