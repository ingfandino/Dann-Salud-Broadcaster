/**
 * ============================================================
 * DATA CHECK CONTROLLER (dataCheckController.js)
 * ============================================================
 * Endpoints para la herramienta "Chequeo de datos".
 * Permite subir archivos Excel temporales, lanzar el pipeline
 * de verificación ARCA→DATEAS→Padrón, y descargar resultados.
 *
 * AISLAMIENTO TOTAL:
 *   - NO interactúa con Affiliate, AffiliateContribution, CanSell
 *   - Datos en modelos temporales con TTL (24h filas, 72h sesión)
 *
 * Acceso: supervisor, gerencia, desarrollador, encargado
 * Visibilidad: owner-only (gerencia ve todas)
 */

"use strict";

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const TemporaryDataCheckRow     = require("../models/TemporaryDataCheckRow");
const Affiliate                 = require("../models/Affiliate");
const {
    getDataCheckStock,
    selectAffiliatesForDataCheck,
} = require("../services/dataCheckPersistence.service");
const { extractField, normalizeString, normalizePhone, extractAdditionalFields } = require("../utils/excelHelpers");
const logger = require("../utils/logger");
const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs").promises;

const MAX_ROWS = 1000;

/* ─── Helpers ──────────────────────────────────────────── */

/**
 * Construye el filtro de ownership para queries.
 * - Gerencia y desarrollador ven todas las sesiones.
 * - El resto solo ve las propias.
 */
function ownershipFilter(user) {
    const role = user.role?.toLowerCase();
    if (role === "gerencia" || role === "desarrollador") return {};
    return { uploadedByUserId: user._id };
}

/**
 * Valida que la sesión pertenezca al usuario (o sea gerencia/dev).
 */
function canAccessSession(session, user) {
    const role = user.role?.toLowerCase();
    if (role === "gerencia" || role === "desarrollador") return true;
    return String(session.uploadedByUserId) === String(user._id);
}

function canCreateFromDatabase(user) {
    const role = user.role?.toLowerCase();
    return role === "gerencia" || role === "desarrollador";
}

/* ─── Endpoints ────────────────────────────────────────── */

/**
 * POST /data-check/upload
 * Sube un Excel, parsea headers con sinónimos tolerantes,
 * crea Session + Rows. Valida max 1000 filas.
 */
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: "No se proporcionó archivo" });
        }

        const userId       = req.user._id;
        const filePath     = req.file.path;
        const originalName = req.file.originalname;

        logger.info(`📋 [DATA-CHECK] Upload recibido: "${originalName}" por ${req.user.nombre || req.user.email}`);

        /* Leer archivo Excel */
        let workbook;
        try {
            workbook = XLSX.readFile(filePath);
        } catch (parseErr) {
            await fs.unlink(filePath).catch(() => {});
            return res.status(400).json({ ok: false, error: "El archivo no es un Excel válido" });
        }

        const sheetName = workbook.SheetNames[0];
        const sheet     = workbook.Sheets[sheetName];
        const rawData   = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) {
            await fs.unlink(filePath).catch(() => {});
            return res.status(400).json({ ok: false, error: "El archivo está vacío" });
        }

        if (rawData.length > MAX_ROWS) {
            await fs.unlink(filePath).catch(() => {});
            return res.status(400).json({
                ok: false,
                error: `El archivo tiene ${rawData.length} filas. El máximo permitido es ${MAX_ROWS}.`,
            });
        }

        /* Crear sesión */
        const session = new TemporaryDataCheckSession({
            uploadedByUserId: userId,
            originalFileName: originalName,
            originalFilePath: filePath,
            status:           "parsing",
            totalRows:        rawData.length,
        });
        await session.save();

        /* Parsear filas y crear rows */
        const rows = [];
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            const nombre    = extractField(row, ["nombre", "name", "nombreyapellido", "apellidoynombre", "fullname"]);
            const cuil      = extractField(row, ["cuil", "cuit", "dni", "documento"]);
            const obraSocial = extractField(row, ["obrasocial", "obra social", "obra_social", "os", "cobertura"]);
            const localidad = extractField(row, ["localidad", "ciudad", "location", "city"]);
            const telefono1 = extractField(row, [
                "telefono_1", "telefono1", "tel_1", "tel1",
                "phone_1", "phone1", "phone", "phones",
                "telefono", "telefonos",
                "teléfono", "teléfonos",
                "teléfono_1", "teléfono1",
                "celular", "celulares",
                "movil", "móvil",
            ]);

            const cuilNormalized = cuil ? normalizeString(cuil).replace(/\D/g, "") : null;
            const additional = extractAdditionalFields(row);

            rows.push({
                sessionId: session._id,
                rowIndex:  i + 1,
                original: {
                    nombre,
                    cuil,
                    obraSocial,
                    localidad,
                    telefono1,
                    additionalFields: additional || null,
                },
                cuilNormalized,
                expiresAt: session.rawDataExpiresAt,
            });
        }

        /* Inserción masiva */
        await TemporaryDataCheckRow.insertMany(rows, { ordered: false });

        /* Actualizar sesión a estado listo */
        session.status = "queued";
        session.progress.arca.total   = rawData.length;
        session.progress.dateas.total = rawData.length;
        session.progress.padron.total = rawData.length;
        await session.save();

        logger.info(`✅ [DATA-CHECK] Sesión ${session._id} creada con ${rawData.length} filas`);

        /* Preview: primeras 5 filas */
        const preview = rows.slice(0, 5).map(r => ({
            rowIndex: r.rowIndex,
            nombre:   r.original.nombre,
            cuil:     r.original.cuil,
            obraSocial: r.original.obraSocial,
            localidad:  r.original.localidad,
            telefono1:  r.original.telefono1,
        }));

        res.json({
            ok: true,
            sessionId:  session._id,
            totalRows:  rawData.length,
            fileName:   originalName,
            preview,
            headers:    rawData.length > 0 ? Object.keys(rawData[0]) : [],
        });

    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error en upload:", error);
        if (req.file?.path) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.createFromDatabase = async (req, res) => {
    try {
        if (!canCreateFromDatabase(req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para chequear datos desde base" });
        }

        const obrasSociales = Array.isArray(req.body.obrasSociales)
            ? req.body.obrasSociales.map(os => String(os).trim()).filter(Boolean)
            : [];
        const quantity = Number(req.body.quantity);

        if (obrasSociales.length === 0) {
            return res.status(400).json({ ok: false, error: "Seleccioná al menos una obra social" });
        }
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ROWS) {
            return res.status(400).json({ ok: false, error: `La cantidad debe ser un número entre 1 y ${MAX_ROWS}` });
        }

        const stock = await getDataCheckStock(obrasSociales);

        if (quantity > stock.total) {
            return res.status(422).json({
                ok: false,
                error: `La cantidad solicitada (${quantity}) supera el stock disponible (${stock.total}). Corregí la cantidad ingresada.`,
                available: stock.total,
                stock: stock.stock,
            });
        }

        const affiliates = await selectAffiliatesForDataCheck(obrasSociales, quantity);

        if (affiliates.length === 0) {
            return res.status(422).json({ ok: false, error: "No se encontraron afiliados con CUIL para las obras sociales seleccionadas" });
        }

        const session = new TemporaryDataCheckSession({
            uploadedByUserId: req.user._id,
            originalFileName: `desde_base_${new Date().toISOString().slice(0, 10)}.xlsx`,
            originalFilePath: null,
            status: "parsing",
            totalRows: affiliates.length,
        });
        await session.save();

        const rows = affiliates.map((affiliate, index) => ({
            sessionId: session._id,
            rowIndex: index + 1,
            original: {
                nombre: affiliate.nombre || null,
                cuil: affiliate.cuil || null,
                obraSocial: affiliate.obraSocial || null,
                localidad: affiliate.localidad || null,
                telefono1: affiliate.telefono1 || null,
                additionalFields: {
                    source: "database",
                    affiliateId: String(affiliate._id)
                },
            },
            cuilNormalized: affiliate.cuil ? normalizeString(affiliate.cuil).replace(/\D/g, "") : null,
            expiresAt: session.rawDataExpiresAt,
        }));

        await TemporaryDataCheckRow.insertMany(rows, { ordered: false });

        session.status = "queued";
        session.progress.arca.total = affiliates.length;
        session.progress.dateas.total = affiliates.length;
        session.progress.padron.total = affiliates.length;
        await session.save();

        res.json({
            ok: true,
            sessionId: session._id,
            totalRows: affiliates.length,
            requestedRows: quantity,
            fileName: session.originalFileName,
            preview: rows.slice(0, 5).map(r => ({
                rowIndex: r.rowIndex,
                nombre: r.original.nombre,
                cuil: r.original.cuil,
                obraSocial: r.original.obraSocial,
                localidad: r.original.localidad,
                telefono1: r.original.telefono1,
            })),
        });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error creando sesión desde base:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

exports.getDatabaseStock = async (req, res) => {
    try {
        if (!canCreateFromDatabase(req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para consultar stock desde base" });
        }

        const obrasSociales = req.query.obrasSociales
            ? (Array.isArray(req.query.obrasSociales) ? req.query.obrasSociales : [req.query.obrasSociales]).map(os => String(os).trim()).filter(Boolean)
            : [];

        const stock = await getDataCheckStock(obrasSociales);
        res.json({ ok: true, ...stock });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error consultando stock desde base:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * GET /data-check/sessions
 * Lista sesiones del usuario autenticado (gerencia ve todas).
 */
exports.listSessions = async (req, res) => {
    try {
        const filter = ownershipFilter(req.user);
        const sessions = await TemporaryDataCheckSession.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("uploadedByUserId", "nombre email role")
            .lean();

        res.json({ ok: true, sessions });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error listando sesiones:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * GET /data-check/sessions/:id
 * Detalle de sesión con progreso (owner-only, gerencia ve todas).
 */
exports.getSession = async (req, res) => {
    try {
        const session = await TemporaryDataCheckSession.findById(req.params.id)
            .populate("uploadedByUserId", "nombre email role")
            .lean();

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }

        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para ver esta sesión" });
        }

        res.json({ ok: true, session });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error obteniendo sesión:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * POST /data-check/sessions/:id/start
 * Arranca el pipeline de verificación ARCA→DATEAS→Padrón.
 */
exports.startProcessing = async (req, res) => {
    try {
        const session = await TemporaryDataCheckSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }

        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para esta sesión" });
        }

        if (session.status !== "queued") {
            return res.status(400).json({
                ok: false,
                error: `La sesión no puede iniciarse (estado actual: ${session.status})`,
            });
        }

        /* Marcar como processing y etapas pending */
        session.status = "processing";
        session.stageStatus = {
            arca: "pending",
            dateas: "pending",
            padron: "pending"
        };
        await session.save();

        logger.info(`🚀 [DATA-CHECK] Sesión ${session._id} iniciada por ${req.user.nombre || req.user.email}`);

        res.json({ ok: true, message: "Procesamiento iniciado", sessionId: session._id });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error iniciando procesamiento:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * GET /data-check/sessions/:id/download
 * Descarga el Excel resultado (owner-only, verifica expiración).
 */
exports.downloadResult = async (req, res) => {
    try {
        const session = await TemporaryDataCheckSession.findById(req.params.id).lean();

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }

        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para descargar este archivo" });
        }

        if (session.status !== "completed") {
            return res.status(400).json({ ok: false, error: "El procesamiento aún no ha finalizado" });
        }

        if (!session.resultFilePath) {
            return res.status(404).json({ ok: false, error: "Archivo de resultado no disponible" });
        }

        /* Verificar que el archivo existe en disco */
        try {
            await fs.access(session.resultFilePath);
        } catch {
            return res.status(404).json({ ok: false, error: "El archivo de resultado ha expirado" });
        }

        const downloadName = `Chequeo_${session.originalFileName || "resultado"}_${new Date(session.createdAt).toISOString().slice(0, 10)}.xlsx`;

        res.download(session.resultFilePath, downloadName);
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error descargando resultado:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * DELETE /data-check/sessions/:id
 * Borra sesión, filas y archivos asociados.
 */
exports.deleteSession = async (req, res) => {
    try {
        const session = await TemporaryDataCheckSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }

        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para eliminar esta sesión" });
        }

        /* Borrar filas asociadas */
        await TemporaryDataCheckRow.deleteMany({ sessionId: session._id });

        /* Borrar archivos de disco */
        if (session.originalFilePath) {
            await fs.unlink(session.originalFilePath).catch(() => {});
        }
        if (session.resultFilePath) {
            await fs.unlink(session.resultFilePath).catch(() => {});
        }

        /* Borrar sesión */
        await TemporaryDataCheckSession.findByIdAndDelete(session._id);

        logger.info(`🗑️ [DATA-CHECK] Sesión ${session._id} eliminada por ${req.user.nombre || req.user.email}`);

        res.json({ ok: true, message: "Sesión eliminada" });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error eliminando sesión:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * POST /data-check/sessions/:id/retry
 * Reanuda una sesión fallida, reseteando filas en error y enviándola al inicio del pipeline.
 */
exports.retrySession = async (req, res) => {
    try {
        const session = await TemporaryDataCheckSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }

        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para reanudar esta sesión" });
        }

        if (session.status !== "error") {
            return res.status(400).json({
                ok: false,
                error: `La sesión no está en estado de error (estado actual: ${session.status})`,
            });
        }

        /* Resetear estado "error" a "pending" en las filas */
        await TemporaryDataCheckRow.updateMany(
            { sessionId: session._id, "arca.status": "error" },
            { $set: { "arca.status": "pending", "arca.errorMessage": null } }
        );
        await TemporaryDataCheckRow.updateMany(
            { sessionId: session._id, "dateas.status": "error" },
            { $set: { "dateas.status": "pending", "dateas.errorMessage": null } }
        );
        await TemporaryDataCheckRow.updateMany(
            { sessionId: session._id, "padron.status": "error" },
            { $set: { "padron.status": "pending", "padron.errorMessage": null } }
        );

        /* Enviar al inicio del pipeline paralelo */
        session.status = "processing";
        session.stageStatus = {
            arca: "pending",
            dateas: "pending",
            padron: "pending"
        };
        session.errorMessage = null;
        await session.save();

        logger.info(`🔄 [DATA-CHECK] Sesión ${session._id} reanudada por ${req.user.nombre || req.user.email}`);

        res.json({ ok: true, message: "Procesamiento reanudado", sessionId: session._id });
    } catch (error) {
        logger.error("❌ [DATA-CHECK] Error reanudando sesión:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};
