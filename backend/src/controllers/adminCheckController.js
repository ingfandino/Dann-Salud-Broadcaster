/**
 * ============================================================
 * ADMIN CHECK CONTROLLER (adminCheckController.js)
 * ============================================================
 * Endpoints para "Chequeado Administrativo".
 * Pipeline: CODEM → DATEAS → ARCA → Padrón → Excel → Persistencia
 *
 * Acceso: administrativo, encargado, gerencia, desarrollador
 * Visibilidad: owner-only (gerencia/desarrollador ven todas)
 * Eliminación: solo gerencia/desarrollador
 */

"use strict";

const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");
const { extractField, normalizeString, normalizePhone, extractAdditionalFields } = require("../utils/excelHelpers");
const logger = require("../utils/logger");
const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs").promises;

const MAX_ROWS = 1000;

/* ─── Helpers ──────────────────────────────────────────── */

function ownershipFilter(user) {
    const role = user.role?.toLowerCase();
    if (role === "gerencia" || role === "desarrollador") return {};
    return { uploadedByUserId: user._id };
}

function canAccessSession(session, user) {
    const role = user.role?.toLowerCase();
    if (role === "gerencia" || role === "desarrollador") return true;
    return String(session.uploadedByUserId) === String(user._id);
}

function canDeleteSession(user) {
    const role = user.role?.toLowerCase();
    return role === "gerencia" || role === "desarrollador";
}

/**
 * Detect mode from parsed rows:
 *   - If any row has a valid 11-digit CUIL → "cuil" mode
 *   - Otherwise → "dni" mode
 */
function detectMode(rawData) {
    for (const row of rawData) {
        const cuil = extractField(row, ["cuil", "cuit"]);
        if (cuil) {
            const normalized = String(cuil).replace(/\D/g, "");
            if (normalized.length === 11) return "cuil";
        }
    }
    return "dni";
}

/* ─── Endpoints ────────────────────────────────────────── */

/**
 * POST /admin-check/upload
 */
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ ok: false, error: "No se proporcionó archivo" });
        }

        const userId       = req.user._id;
        const filePath     = req.file.path;
        const originalName = req.file.originalname;

        logger.info(`📋 [ADMIN-CHECK] Upload recibido: "${originalName}" por ${req.user.nombre || req.user.email}`);

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

        // Detect mode
        const mode = detectMode(rawData);

        const session = new AdminCheckSession({
            uploadedByUserId: userId,
            originalFileName: originalName,
            originalFilePath: filePath,
            mode,
            status:    "parsing",
            totalRows: rawData.length,
        });
        await session.save();

        // Parse rows
        const rows = [];
        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];

            const nombre     = extractField(row, ["nombre", "name", "nombreyapellido", "apellidoynombre", "fullname"]);
            const cuilRaw    = extractField(row, ["cuil", "cuit"]);
            const dniRaw     = extractField(row, ["dni", "documento"]);
            const obraSocial = extractField(row, ["obrasocial", "obra social", "obra_social", "os", "cobertura"]);
            const localidad  = extractField(row, ["localidad", "ciudad", "location", "city"]);
            const edadRaw    = extractField(row, ["edad", "age", "años"]);
            const telefono1  = extractField(row, [
                "telefono_1", "telefono1", "tel_1", "tel1",
                "phone_1", "phone1", "phone", "phones",
                "telefono", "telefonos",
                "teléfono", "teléfonos",
                "teléfono_1", "teléfono1",
                "celular", "celulares",
                "movil", "móvil",
            ]);

            // Normalize identifiers
            const cuilNormalized = cuilRaw ? String(cuilRaw).replace(/\D/g, "") : null;
            const dniNormalized  = dniRaw  ? String(dniRaw).replace(/\D/g, "")  : null;

            // In CUIL mode, use CUIL; in DNI mode, CODEM will populate cuilNormalized later
            let finalCuil = null;
            let finalDni  = null;

            if (mode === "cuil") {
                finalCuil = cuilNormalized && cuilNormalized.length === 11 ? cuilNormalized : null;
                // Also extract DNI from CUIL if possible (middle 8 digits)
                if (finalCuil) {
                    finalDni = finalCuil.substring(2, 10);
                }
            } else {
                // DNI mode — try DNI field first, then CUIL field as fallback
                if (dniNormalized && (dniNormalized.length === 7 || dniNormalized.length === 8)) {
                    finalDni = dniNormalized;
                } else if (cuilNormalized && (cuilNormalized.length === 7 || cuilNormalized.length === 8)) {
                    finalDni = cuilNormalized;
                } else if (cuilNormalized && cuilNormalized.length === 11) {
                    // Has CUIL even though mode is DNI — use it
                    finalCuil = cuilNormalized;
                    finalDni  = cuilNormalized.substring(2, 10);
                }
            }

            const additional = extractAdditionalFields(row);

            rows.push({
                sessionId: session._id,
                rowIndex:  i + 1,
                original: {
                    nombre,
                    cuil: cuilRaw,
                    dni:  dniRaw,
                    obraSocial,
                    localidad,
                    telefono1,
                    edad: edadRaw,
                    additionalFields: additional || null,
                },
                cuilNormalized: finalCuil,
                dniNormalized:  finalDni,
                expiresAt: session.rawDataExpiresAt,
            });
        }

        await AdminCheckRow.insertMany(rows, { ordered: false });

        session.status = "queued";
        session.progress.codem.total  = rawData.length;
        session.progress.arca.total   = rawData.length;
        session.progress.dateas.total = rawData.length;
        session.progress.padron.total = rawData.length;
        await session.save();

        logger.info(`✅ [ADMIN-CHECK] Sesión ${session._id} creada: ${rawData.length} filas, modo: ${mode}`);

        const preview = rows.slice(0, 5).map(r => ({
            rowIndex:   r.rowIndex,
            nombre:     r.original.nombre,
            cuil:       r.original.cuil,
            dni:        r.original.dni,
            obraSocial: r.original.obraSocial,
            localidad:  r.original.localidad,
            telefono1:  r.original.telefono1,
        }));

        res.json({
            ok: true,
            sessionId:  session._id,
            totalRows:  rawData.length,
            mode,
            fileName:   originalName,
            preview,
            headers:    rawData.length > 0 ? Object.keys(rawData[0]) : [],
        });

    } catch (error) {
        logger.error("❌ [ADMIN-CHECK] Error en upload:", error);
        if (req.file?.path) {
            await fs.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * GET /admin-check/sessions
 */
exports.listSessions = async (req, res) => {
    try {
        const filter = ownershipFilter(req.user);
        const sessions = await AdminCheckSession.find(filter)
            .sort({ createdAt: -1 })
            .limit(50)
            .populate("uploadedByUserId", "nombre email role")
            .lean();

        res.json({ ok: true, sessions });
    } catch (error) {
        logger.error("❌ [ADMIN-CHECK] Error listando sesiones:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * GET /admin-check/sessions/:id
 */
exports.getSession = async (req, res) => {
    try {
        const session = await AdminCheckSession.findById(req.params.id)
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
        logger.error("❌ [ADMIN-CHECK] Error obteniendo sesión:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * POST /admin-check/sessions/:id/start
 */
exports.startProcessing = async (req, res) => {
    try {
        const session = await AdminCheckSession.findById(req.params.id);

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

        // Orquestación paralela según modo
        if (session.mode === "cuil") {
            // CUIL: las 4 etapas arrancan simultáneamente
            session.stageStatus = {
                codem:  "pending",
                dateas: "pending",
                arca:   "pending",
                padron: "pending",
            };
        } else {
            // DNI: Fase 1 = CODEM + DATEAS | Fase 2 = ARCA + Padrón (esperan CUIL de CODEM)
            session.stageStatus = {
                codem:  "pending",
                dateas: "pending",
                arca:   "waiting_cuil",
                padron: "waiting_cuil",
            };
        }
        session.status = "processing";
        session.errorMessage = null;
        await session.save();

        logger.info(
            `🚀 [ADMIN-CHECK] Sesión ${session._id} iniciada (modo=${session.mode}) por ${req.user.nombre || req.user.email}` +
            ` | stageStatus: CODEM=${session.stageStatus.codem}, DATEAS=${session.stageStatus.dateas}, ARCA=${session.stageStatus.arca}, Padrón=${session.stageStatus.padron}`
        );

        res.json({ ok: true, message: "Procesamiento iniciado", sessionId: session._id });
    } catch (error) {
        logger.error("❌ [ADMIN-CHECK] Error iniciando procesamiento:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * GET /admin-check/sessions/:id/download
 */
exports.downloadResult = async (req, res) => {
    try {
        const session = await AdminCheckSession.findById(req.params.id).lean();

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }
        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para descargar" });
        }
        if (session.status !== "completed") {
            return res.status(400).json({ ok: false, error: "El procesamiento aún no ha finalizado" });
        }
        if (!session.resultFilePath) {
            return res.status(404).json({ ok: false, error: "Archivo de resultado no disponible" });
        }

        try {
            await fs.access(session.resultFilePath);
        } catch {
            return res.status(404).json({ ok: false, error: "El archivo de resultado ha expirado" });
        }

        const downloadName = `AdminCheck_${session.originalFileName || "resultado"}_${new Date(session.createdAt).toISOString().slice(0, 10)}.xlsx`;
        res.download(session.resultFilePath, downloadName);
    } catch (error) {
        logger.error("❌ [ADMIN-CHECK] Error descargando resultado:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * DELETE /admin-check/sessions/:id
 * Solo gerencia y desarrollador pueden eliminar.
 */
exports.deleteSession = async (req, res) => {
    try {
        if (!canDeleteSession(req.user)) {
            return res.status(403).json({ ok: false, error: "Solo Gerencia y Desarrollador pueden eliminar sesiones" });
        }

        const session = await AdminCheckSession.findById(req.params.id);
        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }

        await AdminCheckRow.deleteMany({ sessionId: session._id });

        if (session.originalFilePath) {
            await fs.unlink(session.originalFilePath).catch(() => {});
        }
        if (session.resultFilePath) {
            await fs.unlink(session.resultFilePath).catch(() => {});
        }

        await AdminCheckSession.findByIdAndDelete(session._id);

        logger.info(`🗑️ [ADMIN-CHECK] Sesión ${session._id} eliminada por ${req.user.nombre || req.user.email}`);

        res.json({ ok: true, message: "Sesión eliminada" });
    } catch (error) {
        logger.error("❌ [ADMIN-CHECK] Error eliminando sesión:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};

/**
 * POST /admin-check/sessions/:id/retry
 */
exports.retrySession = async (req, res) => {
    try {
        const session = await AdminCheckSession.findById(req.params.id);

        if (!session) {
            return res.status(404).json({ ok: false, error: "Sesión no encontrada" });
        }
        if (!canAccessSession(session, req.user)) {
            return res.status(403).json({ ok: false, error: "No tienes permiso para esta sesión" });
        }
        if (session.status !== "error") {
            return res.status(400).json({
                ok: false,
                error: `La sesión no está en estado de error (estado actual: ${session.status})`,
            });
        }

        // Reset error statuses in all bots
        await AdminCheckRow.updateMany(
            { sessionId: session._id, "codem.status": { $in: ["error", "portal_unavailable"] } },
            { $set: { "codem.status": "pending", "codem.errorMessage": null } }
        );
        await AdminCheckRow.updateMany(
            { sessionId: session._id, "arca.status": "error" },
            { $set: { "arca.status": "pending", "arca.errorMessage": null } }
        );
        await AdminCheckRow.updateMany(
            { sessionId: session._id, "dateas.status": "error" },
            { $set: { "dateas.status": "pending", "dateas.errorMessage": null } }
        );
        await AdminCheckRow.updateMany(
            { sessionId: session._id, "padron.status": "error" },
            { $set: { "padron.status": "pending", "padron.errorMessage": null } }
        );

        // Re-orquestar con lógica paralela
        if (session.mode === "cuil") {
            session.stageStatus = {
                codem:  "pending",
                dateas: "pending",
                arca:   "pending",
                padron: "pending",
            };
        } else {
            session.stageStatus = {
                codem:  "pending",
                dateas: "pending",
                arca:   "waiting_cuil",
                padron: "waiting_cuil",
            };
        }
        session.status = "processing";
        session.errorMessage = null;
        await session.save();

        logger.info(`🔄 [ADMIN-CHECK] Sesión ${session._id} reanudada (modo=${session.mode}) por ${req.user.nombre || req.user.email}`);

        res.json({ ok: true, message: "Procesamiento reanudado", sessionId: session._id });
    } catch (error) {
        logger.error("❌ [ADMIN-CHECK] Error reanudando sesión:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};
