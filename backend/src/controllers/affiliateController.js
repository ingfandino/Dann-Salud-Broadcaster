/**
 * ============================================================
 * CONTROLADOR DE AFILIADOS (affiliateController)
 * ============================================================
 * Gestiona la base de datos de afiliados (potenciales clientes).
 * 
 * Funcionalidades principales:
 * - Importación masiva desde archivos Excel
 * - Exportación a supervisores para distribución
 * - Gestión de datos frescos vs reutilizables
 * - Estadísticas de la base de datos
 * - Configuración de exportaciones automáticas
 * 
 * Permisos:
 * - Gerencia: acceso completo
 * - Supervisores: solo estadísticas y exportación de su equipo
 */

const Affiliate = require("../models/Affiliate");
const Audit = require("../models/Audit");
const AffiliateExportConfig = require("../models/AffiliateExportConfig");
const User = require("../models/User");
const LeadAssignment = require("../models/LeadAssignment");
const Report = require("../models/Report");
const logger = require("../utils/logger");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");

/** Middleware: Solo usuarios de rol Gerencia */
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

// 🔐 Middleware: Gerencia o Supervisor
exports.requireSupervisorOrGerencia = (req, res, next) => {
    const role = req.user.role?.toLowerCase();
    if (role !== "gerencia" && role !== "supervisor" && role !== "administrativo") {
        return res.status(403).json({
            error: "Acceso denegado",
            message: "Solo Supervisores o Gerencia pueden acceder"
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

        logger.info(`📄 Procesando archivo de afiliados: ${originalName} (usuario: ${req.user.nombre || req.user.name || req.user.email})`);

        /* Leer archivo Excel */
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
            await fs.unlink(filePath); /* Limpiar archivo */
            return res.status(400).json({ error: "El archivo está vacío" });
        }

        logger.info(`📊 Filas encontradas: ${rawData.length}`);

        /* Normalizar encabezados y validar datos */
        const result = await processAffiliatesData(rawData, userId, originalName);

        /* Limpiar archivo temporal */
        await fs.unlink(filePath);

        /* Si hay duplicados, generar reporte */
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

        /* Limpiar archivo en caso de error */
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
            } catch { }
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

    /* Obtener todos los teléfonos existentes en la BD */
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

    /* Mapear afiliados existentes por CUIL para obtener fecha de carga */
    const cuilToDate = {};
    for (const aff of existingAffiliates) {
        if (aff.cuil) {
            cuilToDate[normalizeString(aff.cuil)] = aff.uploadDate;
        }
    }

    /* Teléfonos del archivo actual (para detectar duplicados dentro del mismo archivo) */
    const currentBatchPhones = new Set();
    const currentBatchCUILs = new Set();

    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];

        try {
            // 🔍 DEBUG: Mostrar headers de la primera fila
            if (i === 0) {
                logger.info("📋 Headers encontrados en Excel:", Object.keys(row));
            }

            /* Normalizar campos obligatorios con headers tolerantes */
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

            /* Validar campos obligatorios */
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

            /* Normalizar teléfono y CUIL */
            const normalizedPhone1 = normalizePhone(normalized.telefono1);
            const normalizedCUIL = normalizeString(normalized.cuil);

            // 🔍 DEBUG: Mostrar normalización de primeras filas
            if (i < 3) {
                logger.info(`📱 Fila ${i + 1} - Tel original: "${normalized.telefono1}" → Normalizado: "${normalizedPhone1}"`);
                logger.info(`🆔 Fila ${i + 1} - CUIL original: "${normalized.cuil}" → Normalizado: "${normalizedCUIL}"`);
            }

            /* Detectar duplicados */
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

            if (isDuplicate) {
                duplicates.push({
                    row: i + 2,
                    data: row,
                    reason: duplicateReason,
                    type: "duplicate"
                });
                continue;
            }

            /* Agregar a sets de control */
            currentBatchPhones.add(normalizedPhone1);
            currentBatchCUILs.add(normalizedCUIL);

            /* Extraer campos opcionales */
            const telefono2 = extractField(row, ["telefono_2", "telefono2", "tel_2", "tel2", "phone_2", "phone2"]);
            const telefono3 = extractField(row, ["telefono_3", "telefono3", "tel_3", "tel3", "phone_3", "phone3"]);
            const telefono4 = extractField(row, ["telefono_4", "telefono4", "tel_4", "tel4"]);
            const telefono5 = extractField(row, ["telefono_5", "telefono5", "tel_5", "tel5"]);
            const edad = extractField(row, ["edad", "age", "años"]);
            const codigoObraSocial = extractField(row, ["codigoobrasocial", "codigo_obra_social", "codigo_os", "codigoos", "codigodeobrasocial", "codigo de obra social"]);

            /* Crear afiliado */
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
                dataSource: 'fresh',
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

        /* Seguridad: verificar que el archivo existe y está en el directorio correcto */
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
        const { query, search, obraSocial, page = 1, limit = 50, userId } = req.query;
        const searchTerm = search || query;

        const filter = { active: true };

        /* Búsqueda por texto (nombre, CUIL, teléfono) */
        if (searchTerm) {
            const normalizedQuery = searchTerm.trim();
            filter.$or = [
                { nombre: { $regex: normalizedQuery, $options: "i" } },
                { cuil: { $regex: normalizedQuery, $options: "i" } },
                { telefono1: { $regex: normalizedQuery, $options: "i" } },
                { telefono2: { $regex: normalizedQuery, $options: "i" } },
                { telefono3: { $regex: normalizedQuery, $options: "i" } }
            ];
        }

        /* Filtro por obra social */
        if (obraSocial && obraSocial !== "all") {
            filter.obraSocial = obraSocial;
        }

        /* Filtro por usuario (para estadísticas de RRHH) */
        if (userId) {
            filter.uploadedBy = userId;
        }

        const total = await Affiliate.countDocuments(filter);

        let queryBuilder = Affiliate.find(filter)
            .populate("uploadedBy", "nombre email")
            .sort({ uploadDate: -1 });

        /* Si limit es 0 o 'all', no paginar (traer todo) */
        if (limit !== "0" && limit !== 0 && limit !== "all") {
            queryBuilder = queryBuilder
                .limit(Number(limit))
                .skip((Number(page) - 1) * Number(limit));
        }

        const affiliates = await queryBuilder.lean();

        res.json({
            affiliates,
            pagination: {
                page: Number(page),
                limit: limit === "0" || limit === "all" ? total : Number(limit),
                total,
                pages: (limit === "0" || limit === "all") ? 1 : Math.ceil(total / Number(limit))
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

        // ✅ Estadísticas de exportación
        const exported = await Affiliate.countDocuments({ active: true, exported: true });
        // Disponibles = cualquier cosa que NO sea exported: true (incluye false, null, undefined)
        const available = await Affiliate.countDocuments({ active: true, exported: { $ne: true } });

        // Top 10 obras sociales (para estadísticas generales)
        const obrasSociales = await Affiliate.aggregate([
            { $match: { active: true } },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // ✅ TODAS las obras sociales con afiliados disponibles (para configuración)
        // Incluye: exported: false, null, undefined (cualquier cosa que NO sea true)
        const obrasSocialesDisponibles = await Affiliate.aggregate([
            { $match: { active: true, exported: { $ne: true } } },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { _id: 1 } } // Orden alfabético
        ]);

        const recentBatches = await Affiliate.aggregate([
            { $match: { active: true } },
            {
                $group: {
                    _id: "$batchId",
                    count: { $sum: 1 },
                    sourceFile: { $first: "$sourceFile" },
                    uploadDate: { $first: "$uploadDate" }
                }
            },
            { $sort: { uploadDate: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            total,
            exported,
            available,
            obrasSociales: obrasSociales.map(os => ({ name: os._id, count: os.count })),
            obrasSocialesDisponibles: obrasSocialesDisponibles.map(os => ({ name: os._id, count: os.count })),
            recentBatches
        });

    } catch (error) {
        logger.error("Error obteniendo estadísticas:", error);
        res.status(500).json({ error: error.message });
    }
};

// 📊 Obtener estadísticas para Supervisor (Datos disponibles para repartir)
exports.getSupervisorStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const role = req.user.role.toLowerCase();

        // Si es supervisor, solo ve lo asignado a él
        const baseFilter = { active: true };

        if (role === 'supervisor') {
            baseFilter.exportedTo = userId;
        }

        // Debug: Ver total de affiliates asignados a este supervisor
        const totalAssigned = await Affiliate.countDocuments(baseFilter);
        
        // ✅ FIX: Usar campo dataSource para clasificar
        // Datos Frescos: dataSource = 'fresh' o sin dataSource (legacy), y no usados
        const freshCount = await Affiliate.countDocuments({
            ...baseFilter,
            $or: [
                { dataSource: 'fresh' },
                { dataSource: { $exists: false } }
            ],
            isUsed: { $ne: true }
        });

        // Datos Reutilizables: dataSource = 'reusable' y no usados
        const reusableCount = await Affiliate.countDocuments({
            ...baseFilter,
            dataSource: 'reusable',
            isUsed: { $ne: true }
        });
        
        // Debug log
        logger.info(`📊 getSupervisorStats para ${req.user.nombre}: total=${totalAssigned}, fresh=${freshCount}, reusable=${reusableCount}`);

        // Desglose por Obra Social (de todos los disponibles: no usados)
        const byObraSocial = await Affiliate.aggregate([
            {
                $match: {
                    ...baseFilter,
                    isUsed: { $ne: true }
                }
            },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.json({
            freshCount,
            reusableCount,
            byObraSocial: byObraSocial.map(os => ({ obraSocial: os._id, count: os.count }))
        });

    } catch (error) {
        logger.error("Error obteniendo estadísticas de supervisor:", error);
        res.status(500).json({ error: error.message });
    }
};

// ⚙️ Configurar exportación programada
exports.configureExport = async (req, res) => {
    try {
        const {
            sendType,
            affiliatesPerFile,
            obraSocialDistribution,
            supervisorConfigs,
            scheduledTime,
            filters,
            dataSourceMix
        } = req.body;

        if (!scheduledTime) {
            return res.status(400).json({ error: "Falta la hora programada" });
        }

        // Validar hora
        if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(scheduledTime)) {
            return res.status(400).json({ error: "Formato de hora inválido (use HH:mm)" });
        }

        // Validar según tipo de envío
        if (sendType === "masivo") {
            if (!affiliatesPerFile) {
                return res.status(400).json({ error: "Falta cantidad de afiliados por archivo" });
            }

            // Validar distribución de obras sociales si existe
            if (obraSocialDistribution && obraSocialDistribution.length > 0) {
                const total = obraSocialDistribution.reduce((sum, d) => sum + d.cantidad, 0);
                if (total !== affiliatesPerFile) {
                    return res.status(400).json({
                        error: `La suma de la distribución (${total}) debe coincidir con el total (${affiliatesPerFile})`
                    });
                }
            }
        } else if (sendType === "avanzado") {
            if (!supervisorConfigs || supervisorConfigs.length === 0) {
                return res.status(400).json({ error: "Faltan configuraciones de supervisores" });
            }

            // Validar cada configuración de supervisor
            for (const supConfig of supervisorConfigs) {
                if (!supConfig.supervisorId || !supConfig.affiliatesPerFile) {
                    return res.status(400).json({
                        error: "Cada supervisor debe tener ID y cantidad de afiliados"
                    });
                }

                // Validar distribución si existe
                if (supConfig.obraSocialDistribution && supConfig.obraSocialDistribution.length > 0) {
                    const total = supConfig.obraSocialDistribution.reduce((sum, d) => sum + d.cantidad, 0);
                    if (total !== supConfig.affiliatesPerFile) {
                        return res.status(400).json({
                            error: `La distribución del supervisor ${supConfig.supervisorId} no coincide con su total`
                        });
                    }
                }
            }
        }

        // Desactivar configuración anterior
        await AffiliateExportConfig.updateMany({ active: true }, { active: false });

        // Crear nueva configuración
        const config = new AffiliateExportConfig({
            configuredBy: req.user._id,
            sendType: sendType || "masivo",
            affiliatesPerFile: sendType === "masivo" ? Number(affiliatesPerFile) : undefined,
            obraSocialDistribution: sendType === "masivo" ? (obraSocialDistribution || []) : undefined,
            supervisorConfigs: sendType === "avanzado" ? supervisorConfigs : undefined,
            scheduledTime,
            filters: filters || {},
            dataSourceMix: dataSourceMix || { enabled: true, freshPercentage: 100, reusablePercentage: 0 },
            active: true
        });

        await config.save();

        logger.info(`⚙️ Configuración guardada: ${sendType} - ${scheduledTime}`);

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
            .populate("supervisorConfigs.supervisorId", "nombre email numeroEquipo")
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

// 📋 Obtener obras sociales disponibles (de afiliados 'frescos' no exportados)
exports.getAvailableObrasSociales = async (req, res) => {
    try {
        // Obtener obras sociales distintas de afiliados no exportados
        // Incluye: exported: false, null, undefined (cualquier cosa que NO sea true)
        const obrasSociales = await Affiliate.distinct("obraSocial", {
            exported: { $ne: true },
            active: true
        });

        // Ordenar alfabéticamente
        obrasSociales.sort();

        logger.info(`📋 Obras sociales disponibles: ${obrasSociales.length}`);

        res.json({ obrasSociales });

    } catch (error) {
        logger.error("Error obteniendo obras sociales disponibles:", error);
        res.status(500).json({ error: error.message });
    }
};

// 🆕 GESTIÓN DE LEADS - Lógica completa de clasificación

const ESTADOS_USADO_AUDITORIAS = [
    "Falta clave y documentación", "No le llegan los mensajes", "Cortó", "Autovinculación",
    "Caída", "Rehacer vídeo", "Pendiente", "QR hecho", "AFIP", "Baja laboral con nueva alta",
    "Baja laboral sin nueva alta", "Padrón", "En revisión", "Remuneración no válida",
    "Cargada", "Aprobada", "Aprobada, pero no reconoce clave", "Completa", "Reprogramada",
    "Mensaje enviado", "En videollamada", "Rechazada", "Falta documentación", "Falta clave",
    "Falta clave (por ARCA)"
];

const ESTADOS_REUTILIZABLE_24H = [
    "Reprogramada (falta confirmar hora)", "No atendió", "Tiene dudas", "Mensaje enviado", "En videollamada"
];

async function calcularClasificacion() {
    const cuilsUsadosSet = new Set();
    
    const leadAssignmentsUsados = await LeadAssignment.find({
        status: { $in: ['Venta', 'No le interesa'] }
    }).populate('affiliate', 'cuil').lean();
    
    for (const la of leadAssignmentsUsados) {
        if (la.affiliate?.cuil) cuilsUsadosSet.add(la.affiliate.cuil);
    }
    
    const cuilsAuditUsados = await Audit.distinct('cuil', {
        cuil: { $exists: true, $ne: null },
        status: { $in: ESTADOS_USADO_AUDITORIAS }
    });
    cuilsAuditUsados.forEach(c => cuilsUsadosSet.add(c));

    const cuilsReutilizablesSet = new Set();
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const telefonosConMensajeExitoso = await Report.distinct('telefono', {
        messageStatus: { $in: ['enviado', 'recibido'] }
    });
    
    if (telefonosConMensajeExitoso.length > 0) {
        const affiliatesConMensaje = await Affiliate.find({
            active: true,
            telefono1: { $in: telefonosConMensajeExitoso }
        }, 'cuil').lean();
        
        for (const aff of affiliatesConMensaje) {
            if (aff.cuil && !cuilsUsadosSet.has(aff.cuil)) {
                cuilsReutilizablesSet.add(aff.cuil);
            }
        }
    }
    
    const leadAssignmentsReutilizables = await LeadAssignment.find({
        status: { $nin: ['Venta', 'Pendiente', 'No le interesa'] }
    }).populate('affiliate', 'cuil').lean();
    
    for (const la of leadAssignmentsReutilizables) {
        if (la.affiliate?.cuil && !cuilsUsadosSet.has(la.affiliate.cuil)) {
            cuilsReutilizablesSet.add(la.affiliate.cuil);
        }
    }
    
    const auditsReutilizables24h = await Audit.find({
        cuil: { $exists: true, $ne: null },
        status: { $in: ESTADOS_REUTILIZABLE_24H },
        updatedAt: { $lt: hace24h }
    }, 'cuil').lean();
    
    for (const audit of auditsReutilizables24h) {
        if (audit.cuil && !cuilsUsadosSet.has(audit.cuil)) {
            cuilsReutilizablesSet.add(audit.cuil);
        }
    }
    
    return { cuilsUsados: cuilsUsadosSet, cuilsReutilizables: cuilsReutilizablesSet };
}

exports.getFreshData = async (req, res) => {
    try {
        const { cuilsUsados, cuilsReutilizables } = await calcularClasificacion();
        const cuilsNoFrescos = new Set([...cuilsUsados, ...cuilsReutilizables]);

        const freshAffiliates = await Affiliate.find({ 
            active: true,
            cuil: { $nin: Array.from(cuilsNoFrescos), $exists: true, $ne: null }
        })
            .select('nombre cuil obraSocial telefono1 localidad')
            .sort({ uploadDate: -1 })
            .lean();

        const data = freshAffiliates.map(a => ({
            _id: a._id,
            nombre: a.nombre,
            cuil: a.cuil,
            obraSocial: a.obraSocial || '-',
            telefono: a.telefono1 || '-',
            localidad: a.localidad || '-'
        }));

        res.json({ data, total: data.length });
    } catch (error) {
        logger.error("Error getting fresh data:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getReusableData = async (req, res) => {
    try {
        const { cuilsUsados, cuilsReutilizables } = await calcularClasificacion();

        const reusableAffiliates = await Affiliate.find({
            active: true,
            cuil: { $in: Array.from(cuilsReutilizables) }
        })
            .select('nombre cuil obraSocial telefono1 localidad')
            .sort({ uploadDate: -1 })
            .lean();

        const cuilToAuditStatus = {};
        const audits = await Audit.find({ 
            cuil: { $in: Array.from(cuilsReutilizables) } 
        }).select('cuil status').sort({ updatedAt: -1 }).lean();
        
        for (const audit of audits) {
            if (audit.cuil && !cuilToAuditStatus[audit.cuil]) {
                cuilToAuditStatus[audit.cuil] = audit.status;
            }
        }

        const data = reusableAffiliates.map(a => ({
            _id: a._id,
            nombre: a.nombre,
            cuil: a.cuil,
            obraSocial: a.obraSocial || '-',
            telefono: a.telefono1 || '-',
            localidad: a.localidad || '-',
            estado: cuilToAuditStatus[a.cuil] || 'Sin estado',
            source: 'affiliate'
        }));

        res.json({ data, total: data.length });
    } catch (error) {
        logger.error("Error getting reusable data:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Distribuir Afiliados
exports.distributeAffiliates = async (req, res) => {
    try {
        const { distribution, source } = req.body; // distribution: [{ userId, quantity }], source: 'fresh' | 'reusable'

        if (!distribution || !Array.isArray(distribution)) {
            return res.status(400).json({ error: "Distribución inválida" });
        }

        const results = [];

        for (const item of distribution) {
            const { userId, quantity } = item;

            // Filtro base
            const filter = { active: true };
            if (source === 'fresh') {
                filter.isUsed = false;
            } else {
                filter.leadStatus = 'Reutilizable'; // Simplificación para reutilizables
            }

            // Buscar candidatos
            const candidates = await Affiliate.find(filter).limit(Number(quantity));
            const ids = candidates.map(c => c._id);

            if (ids.length > 0) {
                await Affiliate.updateMany(
                    { _id: { $in: ids } },
                    {
                        $set: {
                            assignedTo: userId,
                            leadStatus: 'Asignado',
                            assignedAt: new Date(),
                            isUsed: true // Marcar como usado
                        }
                    }
                );
                results.push({ userId, assigned: ids.length });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        logger.error("Error distributing affiliates:", error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Obtener Asignados (Para Asesor)
exports.getAssignedAffiliates = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status } = req.query;

        const filter = { assignedTo: userId, active: true };

        // Si status es 'pending', mostrar Asignado, Pendiente, No contesta (para reintentar)
        if (status === 'pending') {
            filter.leadStatus = { $in: ['Asignado', 'Pendiente', 'No contesta', 'Llamado'] };
        } else if (status) {
            filter.leadStatus = status;
        }

        const affiliates = await Affiliate.find(filter)
            .sort({ assignedAt: -1 })
            .lean();

        res.json({ affiliates });
    } catch (error) {
        logger.error("Error getting assigned affiliates:", error);
        res.status(500).json({ error: error.message });
    }
};

// 5. Actualizar Estado de Lead
exports.updateAffiliateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, note } = req.body;
        const userId = req.user._id;

        const affiliate = await Affiliate.findById(id);
        if (!affiliate) return res.status(404).json({ error: "Afiliado no encontrado" });

        // Validar que el usuario sea el asignado o gerencia
        if (affiliate.assignedTo?.toString() !== userId.toString() && req.user.role !== 'gerencia') {
            return res.status(403).json({ error: "No tienes permiso para gestionar este lead" });
        }

        affiliate.leadStatus = status;
        affiliate.lastInteraction = new Date();
        affiliate.interactionHistory.push({
            status,
            note,
            date: new Date(),
            by: userId
        });

        await affiliate.save();

        res.json({ success: true, affiliate });
    } catch (error) {
        logger.error("Error updating affiliate status:", error);
        res.status(500).json({ error: error.message });
    }
};

// 6. Obtener Afiliaciones Fallidas (Agregado de Audits y Affiliates)
exports.getFailedAffiliations = async (req, res) => {
    try {
        // 1. Fetch Failed Audits
        const auditStatuses = [
            'Cortó',
            'Rechazada',
            'Caída',
            'No le llegan los mensajes',
            'Baja laboral sin nueva alta'
        ];

        const failedAuditsPromise = Audit.find({
            status: { $in: auditStatuses }
        })
            .populate({
                path: 'asesor',
                select: 'nombre supervisor',
                populate: { path: 'supervisor', select: 'nombre' }
            })
            .populate('supervisorSnapshot', 'nombre')
            .sort({ scheduledAt: -1 })
            .lean();

        // 2. Fetch Failed Affiliates (Leads)
        const failedAffiliatesPromise = Affiliate.find({
            active: true,
            leadStatus: 'Fallido'
        })
            .populate({
                path: 'assignedTo',
                select: 'nombre supervisor',
                populate: { path: 'supervisor', select: 'nombre' }
            })
            .sort({ lastInteraction: -1 })
            .lean();

        const [audits, affiliates] = await Promise.all([failedAuditsPromise, failedAffiliatesPromise]);

        // 3. Normalize Data
        const normalizedAudits = audits.map(a => {
            let supervisorName = '-';
            if (a.supervisorSnapshot?.nombre) {
                supervisorName = a.supervisorSnapshot.nombre;
            } else if (a.asesor?.supervisor?.nombre) {
                supervisorName = a.asesor.supervisor.nombre;
            }

            return {
                _id: a._id,
                nombre: a.nombre,
                cuil: a.cuil || '-',
                telefono: a.telefono,
                obraSocial: a.obraSocialVendida || a.obraSocialAnterior || '-',
                leadStatus: a.status,
                lastInteraction: a.scheduledAt,
                assignedTo: a.asesor ? { nombre: a.asesor.nombre } : null,
                supervisor: supervisorName,
                source: 'audit',
                motivo: a.datosExtra || '-'
            };
        });

        const normalizedAffiliates = affiliates.map(a => {
            let supervisorName = '-';
            if (a.assignedTo?.supervisor?.nombre) {
                supervisorName = a.assignedTo.supervisor.nombre;
            }

            return {
                _id: a._id,
                nombre: a.nombre,
                cuil: a.cuil,
                telefono: a.telefono1,
                obraSocial: a.obraSocial,
                leadStatus: a.leadStatus,
                lastInteraction: a.lastInteraction || a.updatedAt,
                assignedTo: a.assignedTo ? { nombre: a.assignedTo.nombre } : null,
                supervisor: supervisorName,
                source: 'affiliate',
                motivo: '-'
            };
        });

        // 4. Merge and Sort
        const allFailed = [...normalizedAudits, ...normalizedAffiliates].sort((a, b) => {
            return new Date(b.lastInteraction) - new Date(a.lastInteraction);
        });

        // 5. Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const paginatedResults = allFailed.slice(startIndex, endIndex);

        // 6. Calculate Stats
        const stats = allFailed.reduce((acc, curr) => {
            const status = curr.leadStatus || 'Desconocido';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        res.json({
            affiliates: paginatedResults,
            total: allFailed.length,
            pages: Math.ceil(allFailed.length / limit),
            currentPage: page,
            stats // Return stats
        });

    } catch (error) {
        logger.error("Error getting failed affiliations:", error);
        res.status(500).json({ error: error.message });
    }
};

// 9. Cancelar envíos programados
exports.cancelExports = async (req, res) => {
    try {
        const { type } = req.body; // 'today' or 'indefinite'

        if (!['today', 'indefinite'].includes(type)) {
            return res.status(400).json({ error: 'Invalid cancellation type. Must be "today" or "indefinite"' });
        }

        const config = await AffiliateExportConfig.findOne({ active: true });

        if (!config) {
            return res.status(404).json({ error: 'No active export configuration found' });
        }

        config.cancellation = {
            type,
            cancelledAt: new Date(),
            cancelledBy: req.user._id,
            skipDate: type === 'today' ? new Date() : null
        };

        await config.save();

        logger.info(`📵 Exports cancelled (${type}) by ${req.user.email}`);

        res.json({
            message: type === 'today'
                ? 'Exports cancelled for today only. Will resume tomorrow automatically.'
                : 'Exports cancelled indefinitely. Save a new configuration to resume.',
            config
        });

    } catch (error) {
        logger.error("Error cancelling exports:", error);
        res.status(500).json({ error: error.message });
    }
};

// 10. Limpiar datos frescos anteriores (marcarlos como reutilizables)
exports.cleanupFreshData = async (req, res) => {
    try {
        const batchId = `cleanup_${Date.now()}`;
        
        // Obtener CUILs que YA están en auditorías
        const auditsWithCuil = await Audit.find({
            cuil: { $exists: true, $ne: null }
        }).distinct('cuil').lean();

        // Marcar como 'reusable' todos los Affiliates frescos no usados
        const cleanupResult = await Affiliate.updateMany(
            {
                active: true,
                exported: { $ne: true },
                cuil: { $nin: auditsWithCuil, $exists: true, $ne: null },
                dataSource: { $ne: 'reusable' }
            },
            {
                $set: {
                    dataSource: 'reusable',
                    isUsed: true,
                    obsoletedAt: new Date(),
                    obsoletedByBatchId: batchId
                }
            }
        );

        logger.info(`🧹 Limpieza manual: ${cleanupResult.modifiedCount} datos frescos marcados como reutilizables por ${req.user.email}`);

        res.json({
            success: true,
            message: `${cleanupResult.modifiedCount} datos frescos anteriores movidos a reutilizables`,
            cleanedCount: cleanupResult.modifiedCount,
            batchId
        });

    } catch (error) {
        logger.error("Error cleaning up fresh data:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = exports;
