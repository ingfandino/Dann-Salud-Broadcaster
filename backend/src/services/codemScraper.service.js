/**
 * ============================================================
 * CODEM SCRAPER SERVICE (codemScraper.service.js)
 * ============================================================
 * Scraper Playwright para consultar CODEM (ANSES Obra Social).
 * Extrae CUIL normalizado y obra social activa.
 *
 * URL: https://servicioswww.anses.gob.ar/ooss2/
 * Input: CUIL (11 dígitos) o DNI (7-8 dígitos)
 * Output: { status, cuil, codem: { codigo, descripcion, situacion } }
 *
 * Reglas:
 *   - Solo se aceptan filas con Situación === "ACTIVO"
 *   - Si múltiples filas activas → manual_review
 *   - No click en ícono de impresión
 *   - CUIL normalizado: rawCuil.replace(/\D/g, '') — 11 dígitos
 */

"use strict";

const { chromium } = require("playwright");
const logger       = require("../utils/logger").getLogger("codem-scraper");

const CODEM_URL       = "https://servicioswww.anses.gob.ar/ooss2/";
const HEADLESS        = process.env.PLAYWRIGHT_HEADLESS !== "false";
const NAV_TIMEOUT     = 30_000;
const ACTION_TIMEOUT  = 15_000;

/**
 * Creates a new isolated browser + page for CODEM scraping.
 */
async function createCodemSession() {
    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        locale: "es-AR",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(ACTION_TIMEOUT);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT);

    return { browser, context, page };
}

/**
 * Closes a CODEM session safely.
 */
async function closeCodemSession(session) {
    if (session.context) { try { await session.context.close(); } catch (_) {} }
    if (session.browser) { try { await session.browser.close(); } catch (_) {} }
}

/**
 * Scrapes CODEM for a single identifier (CUIL or DNI).
 *
 * @param {object} page — Playwright page
 * @param {string} identifier — CUIL (11 digits) or DNI (7-8 digits)
 * @param {"cuil"|"dni"} identifierType — Type of identifier
 * @returns {Promise<object>} — CODEM result object
 */
async function scrapeCodem(page, identifier, identifierType) {
    const cleanId = String(identifier).replace(/\D/g, "");

    if (!cleanId) {
        return {
            status: "input_missing",
            source: "CODEM",
            cuil: null,
            codem: null,
            reason: "No identifier provided",
        };
    }

    if (identifierType === "cuil" && cleanId.length !== 11) {
        return {
            status: "invalid_identifier",
            source: "CODEM",
            cuil: null,
            codem: null,
            reason: `Invalid CUIL length: ${cleanId.length} (expected 11)`,
        };
    }

    if (identifierType === "dni" && (cleanId.length < 7 || cleanId.length > 8)) {
        return {
            status: "invalid_identifier",
            source: "CODEM",
            cuil: null,
            codem: null,
            reason: `Invalid DNI length: ${cleanId.length} (expected 7-8)`,
        };
    }

    try {
        // Navigate to CODEM — force fresh load
        if (page.url() !== "about:blank") {
            await page.goto("about:blank");
        }
        await page.goto(CODEM_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });

        await new Promise(r => setTimeout(r, 500 + Math.floor(Math.random() * 500)));

        // Fill the input field
        const inputSel = "#ContentPlaceHolder1_txtDoc";
        try {
            await page.waitForSelector(inputSel, { state: "visible", timeout: ACTION_TIMEOUT });
        } catch {
            return {
                status: "portal_unavailable",
                source: "CODEM",
                cuil: null,
                codem: null,
                reason: "CODEM input field not visible — portal may be down",
            };
        }

        const input = page.locator(inputSel).first();
        await input.click();
        await input.fill("");
        await input.pressSequentially(cleanId, { delay: 80 });

        await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 300)));

        // Click submit button
        const btnSel = "#ContentPlaceHolder1_Button1";
        try {
            await page.waitForSelector(btnSel, { state: "visible", timeout: ACTION_TIMEOUT });
            await page.locator(btnSel).first().click();
        } catch {
            return {
                status: "portal_unavailable",
                source: "CODEM",
                cuil: null,
                codem: null,
                reason: "CODEM submit button not visible",
            };
        }

        // Wait for results
        await new Promise(r => setTimeout(r, 2000 + Math.floor(Math.random() * 1000)));
        try {
            await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT });
        } catch { /* continue */ }

        // Extract CUIL from detail panel
        let extractedCuil = null;
        try {
            const cuilEl = page.locator("#ContentPlaceHolder1_lblCuil").first();
            const rawCuil = await cuilEl.textContent({ timeout: 5000 });
            if (rawCuil) {
                extractedCuil = rawCuil.replace(/\D/g, "");
            }
        } catch {
            // CUIL label might not be present
        }

        // Validate extracted CUIL
        if (extractedCuil && extractedCuil.length !== 11) {
            return {
                status: "invalid_cuil_format",
                source: "CODEM",
                cuil: null,
                codem: null,
                reason: `Extracted CUIL could not be normalized to 11 digits (got ${extractedCuil.length})`,
            };
        }

        // If query was by CUIL, validate consistency
        if (identifierType === "cuil" && extractedCuil && extractedCuil !== cleanId) {
            return {
                status: "cuil_mismatch",
                source: "CODEM",
                cuil: extractedCuil,
                codem: null,
                reason: `CUIL mismatch: input=${cleanId}, CODEM returned=${extractedCuil}`,
            };
        }

        // Extract obra social table
        const tableResult = await page.evaluate(() => {
            const table = document.querySelector("#ContentPlaceHolder1_DGOOSS");
            if (!table) return { found: false, rows: [] };

            const allRows = table.querySelectorAll("tr");
            if (allRows.length < 2) return { found: true, rows: [] };

            // Find header indices
            const headers = Array.from(allRows[0].querySelectorAll("th, td")).map(
                (th) => (th.textContent || "").trim().toLowerCase()
            );

            const codigoIdx      = headers.findIndex(h => h.includes("código") || h.includes("codigo"));
            const descripcionIdx = headers.findIndex(h => h.includes("descripción") || h.includes("descripcion"));
            const situacionIdx   = headers.findIndex(h => h.includes("situación") || h.includes("situacion"));

            const dataRows = [];
            for (let i = 1; i < allRows.length; i++) {
                const cells = allRows[i].querySelectorAll("td");
                if (cells.length === 0) continue;

                const getCellText = (idx) => idx >= 0 && idx < cells.length
                    ? (cells[idx].textContent || "").trim()
                    : "";

                const situacion = getCellText(situacionIdx);
                if (situacion.trim().toUpperCase() === "ACTIVO") {
                    dataRows.push({
                        codigo:      getCellText(codigoIdx),
                        descripcion: getCellText(descripcionIdx),
                        situacion:   "ACTIVO",
                    });
                }
            }

            return { found: true, rows: dataRows };
        });

        if (!tableResult.found) {
            return {
                status: "table_not_found",
                source: "CODEM",
                cuil: extractedCuil || null,
                codem: null,
                reason: "CODEM obra social table was not found after submitting query",
            };
        }

        if (tableResult.rows.length === 0) {
            return {
                status: "no_active_os",
                source: "CODEM",
                cuil: extractedCuil || null,
                codem: null,
                reason: "No active obra social row found in CODEM table",
            };
        }

        if (tableResult.rows.length === 1) {
            return {
                status: "success",
                source: "CODEM",
                cuil: extractedCuil || null,
                codem: {
                    codigo:      tableResult.rows[0].codigo,
                    descripcion: tableResult.rows[0].descripcion,
                    situacion:   "ACTIVO",
                },
            };
        }

        // Multiple active rows → manual_review
        return {
            status: "manual_review",
            source: "CODEM",
            cuil: extractedCuil || null,
            codem: null,
            activeRows: tableResult.rows,
            reason: "Multiple active obra social rows found",
        };

    } catch (err) {
        logger.error(`[CODEM] Error scraping identifier ${cleanId}: ${err.message}`);
        return {
            status: "error",
            source: "CODEM",
            cuil: null,
            codem: null,
            reason: err.message,
        };
    }
}

module.exports = {
    createCodemSession,
    closeCodemSession,
    scrapeCodem,
};
