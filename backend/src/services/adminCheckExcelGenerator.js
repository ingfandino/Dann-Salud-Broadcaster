/**
 * ============================================================
 * ADMIN CHECK EXCEL GENERATOR (adminCheckExcelGenerator.js)
 * ============================================================
 * Genera un archivo Excel con dos hojas a partir de los
 * resultados de una sesión de Chequeado Administrativo:
 *
 * Hoja 1: "Datos actualizados" — Datos originales + enriquecidos
 * Hoja 2: "Resumen" — Métricas agregadas del procesamiento
 *
 * Columna "Trabaja" basada en ARCA (trabaja).
 * Prioridad Obra Social: Padrón > CODEM > Excel.
 */

"use strict";

const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs");

const AdminCheckSession = require("../models/AdminCheckSession");
const AdminCheckRow     = require("../models/AdminCheckRow");
const logger = require("../utils/logger").getLogger("admin-check-excel");

const RESULTS_DIR = path.join(__dirname, "../../uploads/admin-check");

if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Genera el Excel de resultados para una sesión de admin check.
 *
 * @param {string} sessionId
 * @returns {Promise<string>} — Ruta absoluta al archivo generado
 */
async function generateAdminCheckExcel(sessionId) {
    logger.info(`📊 [AC-EXCEL] Generando Excel para sesión ${sessionId}`);

    const session = await AdminCheckSession.findById(sessionId)
        .populate("uploadedByUserId", "nombre email")
        .lean();

    if (!session) {
        throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    const rows = await AdminCheckRow.find({ sessionId })
        .sort({ rowIndex: 1 })
        .lean();

    /* ═══════════ HOJA 1: DATOS ACTUALIZADOS ═══════════ */

    const dataRows = rows.map(row => {
        const orig   = row.original || {};
        const codem  = row.codem || {};
        const arca   = row.arca || {};
        const dateas = row.dateas || {};
        const padron = row.padron || {};

        // Obra Social priority: Padrón > CODEM > Excel
        const osPadron = padron.obraSocialDetectada || "";
        const osCodem  = codem.descripcionObraSocial || "";
        const osExcel  = orig.obraSocial || "";
        const osActualizada = osPadron || osCodem || osExcel;

        // Padrón formatted
        let padronFormatted = "";
        if (padron.status === "not_found") {
            padronFormatted = "No tiene";
        } else if (padron.status === "error" || padron.status === "captcha_failed") {
            padronFormatted = "Error al consultar";
        } else if (padron.canSell === false) {
            padronFormatted = `Con padrón hasta ${padron.nextChangeDate || ""}`;
        } else if (padron.canSell === true) {
            padronFormatted = "Puede cambiar";
        } else if (padron.status === "skipped") {
            padronFormatted = "";
        } else if (padron.status) {
            padronFormatted = padron.status;
        }

        // CODEM status formatted
        let codemFormatted = "";
        if (codem.status === "success") {
            codemFormatted = codem.descripcionObraSocial || "Activo";
        } else if (codem.status === "no_active_os") {
            codemFormatted = "Sin OS activa";
        } else if (codem.status === "manual_review") {
            codemFormatted = "Revisión manual";
        } else if (codem.status === "table_not_found") {
            codemFormatted = "Sin tabla";
        } else if (codem.status === "error" || codem.status === "portal_unavailable") {
            codemFormatted = "Error";
        } else if (codem.status === "skipped") {
            codemFormatted = "";
        } else if (codem.status === "input_missing" || codem.status === "invalid_identifier") {
            codemFormatted = "ID inválido";
        } else if (codem.status) {
            codemFormatted = codem.status;
        }

        return {
            "Nombre":              orig.nombre || dateas.nombre || "",
            "CUIL":                row.cuilNormalized || orig.cuil || "",
            "DNI":                 row.dniNormalized || orig.dni || "",
            "Obra Social":         osActualizada,
            "Código OS (CODEM)":   codem.codigoObraSocial || "",
            "CODEM":               codemFormatted,
            "Localidad":           dateas.localidad || orig.localidad || "",
            "Teléfono":            orig.telefono1 || "",
            "Edad":                dateas.edad ?? orig.edad ?? "",
            "Provincia":           dateas.provincia || "",
            "Último Aporte":       arca.ultimoAporte || "",
            "Inicio laboral":      arca.inicioLaboral || "",
            "Trim. Pagos":         arca.trimPagos ?? "",
            "Puede Cambiar OS":    padron.canSell === true ? "SÍ"
                                     : padron.canSell === false ? "NO"
                                     : "",
            "Padrón":              padronFormatted,
            "Trabaja":             arca.trabaja === true ? "Sí" : arca.trabaja === false ? "No" : "",
        };
    });

    /* ═══════════ HOJA 2: RESUMEN ═══════════ */

    const codemSuccess     = rows.filter(r => r.codem?.status === "success").length;
    const codemNoActive    = rows.filter(r => r.codem?.status === "no_active_os").length;
    const codemManual      = rows.filter(r => r.codem?.status === "manual_review").length;
    const codemError       = rows.filter(r => ["error", "portal_unavailable", "parse_error"].includes(r.codem?.status)).length;
    const codemSkipped     = rows.filter(r => ["skipped", "input_missing", "invalid_identifier"].includes(r.codem?.status)).length;

    const arcaSuccess      = rows.filter(r => r.arca?.status === "success").length;
    const arcaError        = rows.filter(r => r.arca?.status === "error").length;
    const arcaSkipped      = rows.filter(r => r.arca?.status === "skipped").length;
    const arcaWithContrib  = rows.filter(r => r.arca?.trimPagos > 0).length;

    const dateasSuccess    = rows.filter(r => r.dateas?.status === "success").length;
    const dateasError      = rows.filter(r => r.dateas?.status === "error").length;
    const dateasSkipped    = rows.filter(r => r.dateas?.status === "skipped").length;

    const padronFound      = rows.filter(r => ["success", "found_active", "found_expired"].includes(r.padron?.status)).length;
    const padronNotFound   = rows.filter(r => r.padron?.status === "not_found").length;
    const padronError      = rows.filter(r => r.padron?.status === "error").length;
    const padronCaptcha    = rows.filter(r => r.padron?.status === "captcha_failed").length;
    const padronSkipped    = rows.filter(r => r.padron?.status === "skipped").length;
    const padronCanSell    = rows.filter(r => r.padron?.canSell === true).length;

    const summaryData = [
        { "Métrica": "═══ GENERAL ═══", "Valor": "" },
        { "Métrica": "Total de filas procesadas", "Valor": rows.length },
        { "Métrica": "Modo", "Valor": session.mode === "cuil" ? "CUIL" : "DNI" },
        { "Métrica": "Archivo original", "Valor": session.originalFileName || "" },
        { "Métrica": "Fecha de procesamiento", "Valor": new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) },
        { "Métrica": "Usuario", "Valor": session.uploadedByUserId?.nombre || session.uploadedByUserId?.email || "" },
        { "Métrica": "", "Valor": "" },
        { "Métrica": "═══ CODEM ═══", "Valor": "" },
        { "Métrica": "Exitosos", "Valor": codemSuccess },
        { "Métrica": "Sin OS activa", "Valor": codemNoActive },
        { "Métrica": "Revisión manual", "Valor": codemManual },
        { "Métrica": "Errores", "Valor": codemError },
        { "Métrica": "Omitidos", "Valor": codemSkipped },
        { "Métrica": "", "Valor": "" },
        { "Métrica": "═══ ARCA (Aportes) ═══", "Valor": "" },
        { "Métrica": "Exitosos", "Valor": arcaSuccess },
        { "Métrica": "Errores", "Valor": arcaError },
        { "Métrica": "Omitidos", "Valor": arcaSkipped },
        { "Métrica": "Con aportes (Trim. > 0)", "Valor": arcaWithContrib },
        { "Métrica": "% con aportes", "Valor": rows.length > 0 ? `${Math.round((arcaWithContrib / rows.length) * 100)}%` : "0%" },
        { "Métrica": "", "Valor": "" },
        { "Métrica": "═══ DATEAS (Edad/Localidad) ═══", "Valor": "" },
        { "Métrica": "Enriquecidos", "Valor": dateasSuccess },
        { "Métrica": "Errores", "Valor": dateasError },
        { "Métrica": "Omitidos", "Valor": dateasSkipped },
        { "Métrica": "", "Valor": "" },
        { "Métrica": "═══ PADRÓN (Obra Social) ═══", "Valor": "" },
        { "Métrica": "Encontrados", "Valor": padronFound },
        { "Métrica": "No encontrados", "Valor": padronNotFound },
        { "Métrica": "Errores", "Valor": padronError },
        { "Métrica": "CAPTCHA fallido", "Valor": padronCaptcha },
        { "Métrica": "Omitidos", "Valor": padronSkipped },
        { "Métrica": "Pueden cambiar OS", "Valor": padronCanSell },
    ];

    /* ═══════════ GENERAR WORKBOOK ═══════════ */

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(dataRows);
    const colWidths = Object.keys(dataRows[0] || {}).map(key => ({
        wch: Math.max(key.length + 2, 15),
    }));
    ws1["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws1, "Datos actualizados");

    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2["!cols"] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

    const timestamp = Date.now();
    const safeName  = (session.originalFileName || "resultado")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName  = `admin_check_${safeName}_${timestamp}.xlsx`;
    const filePath  = path.join(RESULTS_DIR, fileName);

    XLSX.writeFile(wb, filePath);
    logger.info(`✅ [AC-EXCEL] Archivo generado: ${filePath} (${rows.length} filas)`);

    return filePath;
}

module.exports = { generateAdminCheckExcel };
