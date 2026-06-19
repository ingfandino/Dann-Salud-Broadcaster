/**
 * ============================================================
 * DATA CHECK EXCEL GENERATOR (dataCheckExcelGenerator.js)
 * ============================================================
 * Genera un archivo Excel con dos hojas a partir de los
 * resultados de una sesión de chequeo de datos:
 *
 * Hoja 1: "Datos actualizados" — Datos originales + enriquecidos
 * Hoja 2: "Resumen" — Métricas agregadas del procesamiento
 *
 * El archivo se guarda en backend/uploads/data-check/ y la ruta
 * se persiste en TemporaryDataCheckSession.resultFilePath.
 */

"use strict";

const XLSX   = require("xlsx");
const path   = require("path");
const fs     = require("fs");

const TemporaryDataCheckSession = require("../models/TemporaryDataCheckSession");
const TemporaryDataCheckRow     = require("../models/TemporaryDataCheckRow");
const User                      = require("../models/User"); // Required for populate
const logger = require("../utils/logger").getLogger("data-check-excel");

const RESULTS_DIR = path.join(__dirname, "../../uploads/data-check");

// Asegurar directorio
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

/**
 * Genera el Excel de resultados para una sesión de chequeo.
 *
 * @param {string} sessionId — ID de la sesión
 * @returns {Promise<string>} — Ruta absoluta al archivo generado
 */
async function generateDataCheckExcel(sessionId) {
    logger.info(`📊 [DC-EXCEL] Generando Excel para sesión ${sessionId}`);

    const session = await TemporaryDataCheckSession.findById(sessionId)
        .populate("uploadedByUserId", "nombre email")
        .lean();

    if (!session) {
        throw new Error(`Sesión ${sessionId} no encontrada`);
    }

    const rows = await TemporaryDataCheckRow.find({ sessionId })
        .sort({ rowIndex: 1 })
        .lean();

    /* ═══════════════════════════════════════════════════════
     * HOJA 1: DATOS ACTUALIZADOS
     * ═══════════════════════════════════════════════════════ */

    const dataRows = rows.map(row => {
        const orig   = row.original || {};
        const arca   = row.arca || {};
        const dateas = row.dateas || {};
        const padron = row.padron || {};

        // Lógica Obra Social "actualizada":
        // Si el Padrón detectó una OS diferente a la original → usar la detectada
        // Si no → mantener la original
        const osOriginal  = orig.obraSocial || "";
        const osDetectada = padron.obraSocialDetectada || "";
        const osActualizada = osDetectada && osDetectada !== osOriginal
            ? osDetectada
            : osOriginal;

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
            padronFormatted = padron.status; // Fallback
        }

        const baseData = {
            "Nombre":              orig.nombre || "",
            "CUIL":                orig.cuil || "",
            "Obra Social":         osActualizada,
            "Localidad":           dateas.localidad || orig.localidad || "",
            "Teléfono":            orig.telefono1 || "",
            "Edad":                dateas.edad ?? "",
            "Provincia":           dateas.provincia || "",
            "Inicio laboral":      arca.inicioLaboral || "",
            "Último Aporte":       arca.ultimoAporte || "",
            "Trim. Pagos":         arca.trimPagos ?? "",
            "Puede Cambiar OS":    padron.canSell === true ? "SÍ"
                                     : padron.canSell === false ? "NO"
                                     : "",
            "Padrón":              padronFormatted,
            "¿Trabaja?":           arca.trabaja === true ? "Sí" : arca.trabaja === false ? "No" : "",
        };

        return baseData;
    });

    /* ═══════════════════════════════════════════════════════
     * HOJA 2: RESUMEN
     * ═══════════════════════════════════════════════════════ */

    // Métricas ARCA
    const arcaSuccess = rows.filter(r => r.arca?.status === "success").length;
    const arcaError   = rows.filter(r => r.arca?.status === "error").length;
    const arcaSkipped = rows.filter(r => r.arca?.status === "skipped").length;
    const arcaWithContrib = rows.filter(r => r.arca?.trimPagos > 0).length;

    // Métricas DATEAS
    const dateasSuccess = rows.filter(r => r.dateas?.status === "success").length;
    const dateasError   = rows.filter(r => r.dateas?.status === "error").length;
    const dateasSkipped = rows.filter(r => r.dateas?.status === "skipped").length;

    // Métricas Padrón
    const padronFound    = rows.filter(r => ["success", "found_active", "found_expired"].includes(r.padron?.status)).length;
    const padronNotFound = rows.filter(r => r.padron?.status === "not_found").length;
    const padronError    = rows.filter(r => r.padron?.status === "error").length;
    const padronCaptcha  = rows.filter(r => r.padron?.status === "captcha_failed").length;
    const padronSkipped  = rows.filter(r => r.padron?.status === "skipped").length;
    const padronCanSell  = rows.filter(r => r.padron?.canSell === true).length;

    // Distribución por Obra Social detectada
    const osByCount = {};
    for (const row of rows) {
        const os = row.padron?.obraSocialDetectada || "(Sin datos)";
        osByCount[os] = (osByCount[os] || 0) + 1;
    }
    const osSorted = Object.entries(osByCount)
        .sort((a, b) => b[1] - a[1])
        .map(([os, count]) => ({ "Obra Social": os, "Cantidad": count }));

    const summaryData = [
        { "Métrica": "═══ GENERAL ═══", "Valor": "" },
        { "Métrica": "Total de filas procesadas", "Valor": rows.length },
        { "Métrica": "Archivo original", "Valor": session.originalFileName || "" },
        { "Métrica": "Fecha de procesamiento", "Valor": new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) },
        { "Métrica": "Usuario", "Valor": session.uploadedByUserId?.nombre || session.uploadedByUserId?.email || "" },
        { "Métrica": "", "Valor": "" },
        { "Métrica": "═══ ARCA (Aportes) ═══", "Valor": "" },
        { "Métrica": "Exitosos", "Valor": arcaSuccess },
        { "Métrica": "Errores", "Valor": arcaError },
        { "Métrica": "Omitidos (CUIL inválido)", "Valor": arcaSkipped },
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
        { "Métrica": "", "Valor": "" },
        { "Métrica": "═══ DISTRIBUCIÓN OBRA SOCIAL DETECTADA ═══", "Valor": "" },
        ...osSorted.map(item => ({ "Métrica": item["Obra Social"], "Valor": item["Cantidad"] })),
    ];

    /* ═══════════════════════════════════════════════════════
     * GENERAR WORKBOOK
     * ═══════════════════════════════════════════════════════ */

    const wb = XLSX.utils.book_new();

    // Hoja 1: Datos actualizados
    const ws1 = XLSX.utils.json_to_sheet(dataRows);
    // Ajustar ancho de columnas
    const colWidths = Object.keys(dataRows[0] || {}).map(key => ({
        wch: Math.max(key.length + 2, 15),
    }));
    ws1["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws1, "Datos actualizados");

    // Hoja 2: Resumen
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2["!cols"] = [{ wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

    /* Guardar archivo */
    const timestamp = Date.now();
    const safeName  = (session.originalFileName || "resultado")
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName  = `resultado_${safeName}_${timestamp}.xlsx`;
    const filePath  = path.join(RESULTS_DIR, fileName);

    XLSX.writeFile(wb, filePath);
    logger.info(`✅ [DC-EXCEL] Archivo generado: ${filePath} (${rows.length} filas)`);

    return filePath;
}

module.exports = { generateDataCheckExcel };
