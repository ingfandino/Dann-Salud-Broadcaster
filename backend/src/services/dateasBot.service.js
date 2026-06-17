/**
 * ============================================================
 * BOT DE ADQUISICIÓN DE DATOS — DATEAS / ARCA / CODEM
 * ============================================================
 * Bot Playwright standalone que:
 *   TASK 1 — Genera códigos DNI únicos de 8 dígitos (35xx-48xx)
 *   TASK 2 — Scrapa Dateas y valida contra MongoDB
 *   TASK 3 — Enriquece con ARCA (aportes) y CODEM (obra social)
 *   TASK 4 — Inserta registros en NativeAffiliate
 *
 * REGLA CRÍTICA: NO modifica contributionScraper.service.js
 */

"use strict";

const { chromium } = require("playwright");
const os = require("os");
const path = require("path");

const ScrapedCode          = require("../models/ScrapedCode");
const NativeAffiliate      = require("../models/NativeAffiliate");
const Affiliate            = require("../models/Affiliate");
const AffiliateContribution = require("../models/AffiliateContribution");
const User                 = require("../models/User");
const BotControl           = require("../models/BotControl");
const { evaluateNeedsPadronCheck, syncPadronBatch } = require("./padronSync.service");
const logger = require("../utils/logger").getLogger("dateas");
const { addLog } = require("./logService");


/* ─── Constantes ──────────────────────────────────────────── */
const HEADLESS        = process.env.PLAYWRIGHT_HEADLESS !== "false";
const USER_DATA_DIR   = process.env.DATEAS_USER_DATA_DIR || path.join(os.homedir(), ".dateas-browser-profile");

const DATEAS_URL        = "https://www.dateas.com/es/consulta_cuit_cuil";
const ARCA_BASE_URL     = process.env.ARCA_BASE_URL || "https://serviciosweb.afip.gob.ar";
const ARCA_APORTES_URL  = "https://www.afip.gob.ar/aportesenlinea/";
const ARCA_BASICA_URL   = `${ARCA_BASE_URL}/TRAMITES_CON_CLAVE_FISCAL/MISAPORTES/app/basica.aspx`;
const ARCA_INGRESO_URL  = `${ARCA_BASE_URL}/TRAMITES_CON_CLAVE_FISCAL/MISAPORTES/app/basica/ingresoDatos.aspx`;
const CODEM_URL         = "https://servicioswww.anses.gob.ar/ooss2/";

const NAV_TIMEOUT     = 30_000;
const ACTION_TIMEOUT  = 15_000;
const HUMAN_DELAY_MIN = 100;
const HUMAN_DELAY_MAX = 250;

/* ID de usuario gerencia/admin para uploads a la colección Affiliate (cacheado) */
let _botUploadUserId = null;

/* Estado en memoria del bot (singleton) */
let _currentTaskId = null; // MongoDB _id of the currently running DateasTask

let _botState = {
    running:   false,
    paused:    false,
    processed: 0,
    saved:     0,
    discarded: 0,
    lastCode:  null,
    lastError: null,
    startedAt: null,
};

/* ─── Control-signal helper ──────────────────────────────── */

/**
 * Reads the current control signal from MongoDB for the "dateas" bot.
 * Never throws — returns "none" on any DB error so the bot is never
 * interrupted by a transient read failure.
 * @returns {Promise<"none"|"pause"|"stop">}
 */
async function readControlSignal() {
    try {
        const doc = await BotControl.findById("dateas").lean();
        return doc?.signal || "none";
    } catch (_) {
        return "none";
    }
}

/* ─── Utilidades ──────────────────────────────────────────── */

/** Emite log al logger de Winston Y al visor de logs en tiempo real vía Socket.IO */
function logBot(msg, tipo = 'info') {
    logger[tipo](msg);
    addLog({ tipo, mensaje: msg, metadata: { bot: 'dateas' } }).catch(() => {});
}

/** Retardo aleatorio tipo humano */
function humanDelay(min = HUMAN_DELAY_MIN, max = HUMAN_DELAY_MAX) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(r => setTimeout(r, ms));
}

/** Genera un DNI de 8 dígitos cuya primera parte (2 dígitos) está
 *  entre 35 y 48 (inclusive). */
function generateDni() {
    const prefix = Math.floor(Math.random() * (48 - 35 + 1)) + 35;   // 35..48
    const suffix = Math.floor(Math.random() * 1_000_000);             // 0..999999
    return `${prefix}${String(suffix).padStart(6, "0")}`;
}

/** Verifica si el código ya fue probado en sesiones anteriores */
async function isCodeAlreadyTested(code) {
    const existing = await ScrapedCode.findOne({ code });
    return !!existing;
}

/** Persiste el código en la colección de tracking */
async function persistCode(code, status, reason = null) {
    try {
        await ScrapedCode.findOneAndUpdate(
            { code },
            { code, status, reason },
            { upsert: true, new: true }
        );
    } catch (err) {
        logger.warn(`[DATEAS-BOT] No pudo persistir código ${code}: ${err.message}`);
    }
}

/* ─── TASK 2 — Dateas scraping ────────────────────────────── */

/**
 * Abre la página de Dateas, teclea el código y extrae los datos.
 * @returns {{ cuil, nombre, edad, provincia, localidad }|null}
 */
async function scrapeDataeas(page, dni) {
    logger.info(`[DATEAS-BOT] [TASK 2] Navegando a Dateas — DNI: ${dni}`);
    try {
        await page.goto(DATEAS_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
        logger.info(`[DATEAS-BOT] [TASK 2] Página Dateas cargada — tipeando DNI en formulario`);
    } catch (err) {
        logger.warn(`[DATEAS-BOT] [TASK 2] Timeout cargando Dateas: ${err.message}`);
        return null;
    }

    await humanDelay(600, 1200);

    const inputSel = "#cuit-cuil-dni";
    try {
        await page.waitForSelector(inputSel, { state: "visible", timeout: ACTION_TIMEOUT });
    } catch {
        logger.warn(`[DATEAS-BOT] [TASK 2] Input del formulario Dateas no visible para DNI ${dni}`);
        return null;
    }

    const input = page.locator(inputSel).first();
    await input.click();
    await input.fill("");
    await input.pressSequentially(dni, { delay: 150 });
    await humanDelay(300, 600);

    const btnSel = ".button-red-large";
    try {
        await page.waitForSelector(btnSel, { state: "visible", timeout: ACTION_TIMEOUT });
        await page.locator(btnSel).first().click();
    } catch {
        logger.warn(`[DATEAS-BOT] [TASK 2] Botón de búsqueda no visible en Dateas para DNI ${dni}`);
        return null;
    }

    await humanDelay(1500, 2500);

    try {
        await page.waitForLoadState("networkidle", { timeout: NAV_TIMEOUT });
    } catch {
        /* Continuar igual */
    }

    logger.info(`[DATEAS-BOT] [TASK 2] Extrayendo datos del resultado de Dateas...`);
    /* Extraer tabla de resultados.
     * Dateas usa una tabla HORIZONTAL: cada <td> tiene data-label con el nombre
     * del campo y el contenido de la celda es el valor.
     * Ejemplo: <td data-label="CUIT / CUIL / CDI"><a>27-37057128-2</a></td>
     * Se toma la PRIMERA fila de datos (class "odd" o "even"), ignorando la
     * fila de cabecera <th>. */
    const result = await page.evaluate(() => {
        const data = {};

        /* Seleccionar todas las celdas con data-label de la primera fila de datos */
        const firstDataRow = document.querySelector("table tr.odd, table tr.even");
        const cells = firstDataRow
            ? Array.from(firstDataRow.querySelectorAll("td[data-label]"))
            : Array.from(document.querySelectorAll("td[data-label]"));

        for (const cell of cells) {
            const label = (cell.getAttribute("data-label") || "").trim().toLowerCase();
            /* Obtener texto ignorando botones "Ver Más" */
            const anchors = cell.querySelectorAll("a:not(.button)");
            const value = anchors.length
                ? anchors[0].textContent.trim()
                : cell.textContent.trim();

            if (!value || label === "") continue;

            if (label.includes("nombre") || label.includes("razón") || label.includes("razon")) {
                if (!data.nombre) data.nombre = value;
            } else if (label.includes("cuit") || label.includes("cuil") || label.includes("cdi")) {
                if (!data.cuil) data.cuil = value;
            } else if (label.includes("edad")) {
                if (!data.edad) data.edad = value;
            } else if (label.includes("provincia")) {
                if (!data.provincia) data.provincia = value;
            } else if (label.includes("localidad") || label.includes("ciudad")) {
                if (!data.localidad) data.localidad = value;
            }
        }

        return data;
    });

    if (!result.cuil && !result.nombre) {
        /* Capture DOM snapshot to diagnose selector regressions (table structure changes etc.) */
        const tableSnippet = await page.evaluate(() => {
            const t = document.querySelector("table");
            if (!t) return "(no <table> en página)";
            /* Also capture CSS classes of first few rows for selector diagnosis */
            const rows = Array.from(t.querySelectorAll("tr")).slice(0, 4);
            const rowInfo = rows.map(r => `<tr class="${r.className}">${Array.from(r.querySelectorAll("td")).slice(0, 2).map(td => `<td data-label="${td.getAttribute("data-label")||""}">...</td>`).join("")}</tr>`).join("");
            return rowInfo || t.outerHTML.substring(0, 500);
        }).catch(e => `(error extrayendo tabla: ${e.message})`);
        logger.warn(`[DATEAS-BOT] [TASK 2] DOM diagnóstico (sin resultados) — DNI ${dni} — tabla: ${tableSnippet}`);
        logger.info(`[DATEAS-BOT] [TASK 2] Sin resultados en Dateas para DNI ${dni} — DNI inexistente o página sin datos`);
        return null;
    }

    logger.info(`[DATEAS-BOT] [TASK 2] Datos extraídos — cuil="${result.cuil || "-"}" nombre="${result.nombre || "-"}" edad="${result.edad || "-"}" provincia="${result.provincia || "-"}" localidad="${result.localidad || "-"}"`);

    /* Sanitización */
    const cleanCuil   = (result.cuil   || "").replace(/-/g, "").replace(/\s/g, "");
    const rawAge      = result.edad || "";
    const cleanAge    = parseInt(rawAge.replace(/\D/g, ""), 10);

    return {
        cuil:      cleanCuil || null,
        nombre:    (result.nombre   || "").trim() || null,
        edad:      isNaN(cleanAge) ? null : cleanAge,
        provincia: (result.provincia || "").replace(/\s*\(pcia\.?\)/i, "").trim() || null,
        localidad: (result.localidad || "").trim() || null,
    };
}

/* ─── TASK 2 — Validación MongoDB ─────────────────────────── */

async function existsInDb(cuil) {
    /* Verificar en NativeAffiliate (colección propia del bot) */
    const native = await NativeAffiliate.findOne({ cuil }).lean();
    if (native) return "native_affiliates";

    /* Verificar en Affiliate (base existente de la empresa) */
    const Affiliate = require("../models/Affiliate");
    const aff = await Affiliate.findOne({ cuil }).lean();
    if (aff) return "affiliates";

    return null;
}

/* ─── TASK 3 — ARCA: errores y helpers de sesión ─────────── */

class ArcaSessionExpiredError extends Error {
    constructor(msg = "ARCA session expired") {
        super(msg);
        this.name = "ArcaSessionExpiredError";
    }
}

function isArcaSessionClosedError(err) {
    if (!err) return false;
    const msg = (err.message || String(err)).toLowerCase();
    return (
        msg.includes("target page, context or browser has been closed") ||
        msg.includes("target closed") ||
        msg.includes("browser has been closed") ||
        msg.includes("context closed") ||
        msg.includes("page has been closed") ||
        msg.includes("page closed") ||
        msg.includes("has been closed") ||
        msg.includes("connection closed") ||
        msg.includes("execution context was destroyed") ||
        (msg.includes("protocol error") && msg.includes("session closed"))
    );
}

async function isArcaWebSessionExpired(page) {
    try {
        const url = page.url();
        if (
            url.includes("sessionExpired") ||
            url.includes("SessionTimeout") ||
            url.includes("aspSessionExpired")
        ) return true;
        const content = await page.content().catch(() => "");
        const lower   = content.toLowerCase();
        return (
            lower.includes("sesión expirada") ||
            lower.includes("sesion expirada") ||
            lower.includes("vuelva a ingresar al sistema") ||
            lower.includes("su sesión ha caducado")
        );
    } catch { return false; }
}

/* Selectores ARCA correctos (idénticos a contributionScraper) */
const ARCA_CUIL_SEL = [
    'input[name="ctl00$ContentPlaceHolder2$txtCuil$txtSufijo"]',
    "#ctl00_ContentPlaceHolder2_txtCuil_txtSufijo",
    "input[id*='txtCuil']",
    "input[name*='txtCuil']",
].join(", ");

const ARCA_SUBMIT_SEL = [
    'input[name="ctl00$ContentPlaceHolder2$btnBuscar"]',
    "#ctl00_ContentPlaceHolder2_btnBuscar",
    "input[type='submit']",
    "button[type='submit']",
].join(", ");

const ARCA_CONTINUAR_SEL =
    "#ctl00_ContentPlaceHolder2_btnContinuar, " +
    'input[name="ctl00$ContentPlaceHolder2$btnContinuar"], ' +
    "input[value='CONTINUAR']";

const ARCA_TABLE_SEL = "#ctl00_ContentPlaceHolder2_tbInfoBasica";

/** Navega por el portal público de AFIP hasta llegar a ingresoDatos.aspx */
async function bootstrapArcaSession(page) {
    logger.info(`[DATEAS-BOT] [ARCA-SESSION] Iniciando bootstrap vía portal AFIP público`);
    logger.info(`[DATEAS-BOT] [ARCA-SESSION] → ${ARCA_APORTES_URL}`);
    try {
        await page.goto(ARCA_APORTES_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
        logger.info(`[DATEAS-BOT] [ARCA-SESSION] Portal aportesenlinea cargado | url=${page.url()}`);
    } catch (e) {
        logger.warn(`[DATEAS-BOT] [ARCA-SESSION] Timeout en portal aportesenlinea: ${e.message}`);
    }
    logger.info(`[DATEAS-BOT] [ARCA-SESSION] → ${ARCA_BASICA_URL}`);
    try {
        await page.goto(ARCA_BASICA_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
        logger.info(`[DATEAS-BOT] [ARCA-SESSION] basica.aspx cargada | url=${page.url()}`);
    } catch (e) {
        logger.warn(`[DATEAS-BOT] [ARCA-SESSION] Timeout en basica.aspx: ${e.message}`);
    }
    if (!page.url().includes("ingresoDatos.aspx")) {
        logger.info(`[DATEAS-BOT] [ARCA-SESSION] Esperando redirección a ingresoDatos.aspx...`);
        await page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT }).catch(() => {});
    }
    logger.info(`[DATEAS-BOT] [ARCA-SESSION] ✅ Bootstrap ARCA completo | url=${page.url()}`);
}

/**
 * Parsea la tabla #ctl00_ContentPlaceHolder2_tbInfoBasica.
 * Columnas: td[0]=periodo (MM/YYYY), td[3]=aporteOS, td[4]=patronal.
 * Imprime CADA fila de la tabla para diagnóstico completo.
 * @returns {{ lastPeriod: string|null, last3PaidCount: number }}
 */
async function parseArcaTable(page, cuilClean) {
    const tableCount = await page.locator(ARCA_TABLE_SEL).count().catch(() => 0);
    if (!tableCount) {
        logger.warn(`[DATEAS-BOT] [ARCA-PARSER] Tabla ${ARCA_TABLE_SEL} no encontrada en la página`);
        return { lastPeriod: null, last3PaidCount: 0 };
    }

    const rows     = page.locator(`${ARCA_TABLE_SEL} tr`);
    const rowCount = await rows.count();
    logger.info(`[DATEAS-BOT] [ARCA-PARSER] 🔎 Filas encontradas en la tabla: ${rowCount}`);

    let lastPeriod   = null;
    const validPeriods = [];

    for (let i = 0; i < rowCount; i++) {
        const cells     = rows.nth(i).locator("td");
        const cellCount = await cells.count();
        if (cellCount < 5) continue;

        const getText = async (idx) =>
            ((await cells.nth(idx).textContent()) || "").replace(/\s+/g, " ").trim();

        const periodo  = await getText(0);
        const aporteOS = (await getText(3)).toUpperCase();
        const patronal = (await getText(4)).toUpperCase();

        logger.info(`[DATEAS-BOT] [ARCA-PARSER]   Fila ${i}: periodo="${periodo}" | aporteOS="${aporteOS}" | patronal="${patronal}"`);

        if (aporteOS === "PAGO" && patronal === "PAGO" && /\d{2}\/\d{4}/.test(periodo)) {
            logger.info(`[DATEAS-BOT] [ARCA-PARSER]   ✅ Fila ${i} VÁLIDA | periodo=${periodo} | aporteOS=${aporteOS} | patronal=${patronal}`);
            lastPeriod = periodo;
            validPeriods.push(periodo);
        }
    }

    /* Ventana: 3 meses cerrados en formato MM/YYYY (igual que contributionScraper) */
    const now     = new Date();
    const targets = [];
    for (let i = 1; i <= 3; i++) {
        let m = now.getMonth() + 1 - i;
        let y = now.getFullYear();
        if (m <= 0) { m += 12; y -= 1; }
        targets.push(`${String(m).padStart(2, "0")}/${y}`);
    }

    logger.info(`[DATEAS-BOT] [ARCA-PARSER] 📅 last3 targets: ${targets.join(", ")} | valid paid: ${validPeriods.join(", ")} | count=${validPeriods.length}`);

    const last3PaidCount = targets.filter(t => validPeriods.includes(t)).length;

    logger.info(`[DATEAS-BOT] [ARCA-PARSER] 🏁 Último período: ${lastPeriod ?? "ninguno"} | Trim. pagos: ${last3PaidCount}`);

    return { lastPeriod, last3PaidCount };
}

/* ─── TASK 3 — ARCA scraping ──────────────────────────────── */

/**
 * Verifica aportes ARCA para un CUIL.
 * Porta fielmente la lógica de contributionScraper.service.js.
 * Lanza ArcaSessionExpiredError si la sesión web expiró.
 * @returns {{ ok: boolean, ultimoAporte: string|null, trimPagos: number }}
 */
async function checkArcaContributions(page, cuil) {
    const cuilClean = String(cuil).replace(/[-\s]/g, "");
    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 🔍 Consultando CUIL: ${cuilClean}`);

    /* ── Asegurar que estamos en ingresoDatos.aspx ── */
    if (!page.url().includes("ingresoDatos.aspx")) {
        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 🌐 Navegando a ingresoDatos.aspx | url actual: ${page.url()}`);
        try {
            await page.goto(ARCA_INGRESO_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
        } catch (navErr) {
            if (isArcaSessionClosedError(navErr)) throw navErr;
            if (/timeout/i.test(navErr.message)) {
                logger.warn(`[DATEAS-BOT] [TASK 3/ARCA] ⚠️ Timeout navegando a ingresoDatos — sesión expirada`);
                throw new ArcaSessionExpiredError(`Navigation timeout to ingresoDatos.aspx: ${navErr.message}`);
            }
            throw navErr;
        }
        if (!page.url().includes("ingresoDatos.aspx")) {
            if (await isArcaWebSessionExpired(page)) {
                throw new ArcaSessionExpiredError(`ARCA web session expired: got ${page.url()} instead of ingresoDatos`);
            }
            await page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT }).catch(err => {
                throw new ArcaSessionExpiredError(`waitForURL timeout: ${err.message}`);
            });
        }
    }

    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ✅ En ingresoDatos.aspx | url=${page.url()}`);
    
    // Etiqueta HEADLESS DIAGNOSTIC para DATEAS
    const DIAG_TAG = "[DATEAS-HEADLESS-DIAG]";
    logger.info(`${DIAG_TAG} Fase entrada CUIL iniciando | headless=${HEADLESS} | cuil=${cuilClean}`);
    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 📝 Preparando para ingresar CUIL: ${cuilClean} usando selector "${ARCA_CUIL_SEL}"`);

    /* ── FASE DE ENTRADA CUIL REFORZADA ── */
    // PASO 1: Esperar que input esté adjunto al DOM
    logger.info(`${DIAG_TAG} Paso 1: Esperando input CUIL adjunto... | selector="${ARCA_CUIL_SEL}"`);
    try {
        await page.waitForSelector(ARCA_CUIL_SEL, { state: "attached", timeout: ACTION_TIMEOUT });
        logger.info(`${DIAG_TAG} Paso 1 OK: Input CUIL adjunto`);
    } catch (attachErr) {
        logger.error(`${DIAG_TAG} Paso 1 FALLÓ: Input CUIL no adjunto | error=${attachErr.message}`);
        logger.error(`${DIAG_TAG} Página actual: ${page.url()}`);
        throw attachErr;
    }
    
    // PASO 2: Esperar que input sea visible
    logger.info(`${DIAG_TAG} Paso 2: Esperando input CUIL visible...`);
    try {
        await page.waitForSelector(ARCA_CUIL_SEL, { state: "visible", timeout: ACTION_TIMEOUT });
        logger.info(`${DIAG_TAG} Paso 2 OK: Input CUIL visible`);
    } catch (visibleErr) {
        logger.error(`${DIAG_TAG} Paso 2 FALLÓ: Input CUIL no visible | error=${visibleErr.message}`);
        throw visibleErr;
    }
    
    const cuilInput = page.locator(ARCA_CUIL_SEL).first();
    
    // PASO 3: Verificar que input está habilitado
    logger.info(`${DIAG_TAG} Paso 3: Verificando input CUIL habilitado...`);
    const isEnabled = await cuilInput.isEnabled().catch(() => false);
    if (!isEnabled) {
        logger.error(`${DIAG_TAG} Paso 3 FALLÓ: Input CUIL está deshabilitado!`);
        throw new Error(`Input CUIL deshabilitado`);
    }
    logger.info(`${DIAG_TAG} Paso 3 OK: Input CUIL habilitado`);
    
    // PASO 4: Completar el input
    logger.info(`${DIAG_TAG} Paso 4: Completando input CUIL...`);
    try {
        await cuilInput.click({ timeout: 5000 });
        await cuilInput.fill("");
        await cuilInput.pressSequentially(cuilClean, { delay: 100 });
        await cuilInput.evaluate(el => el.blur());
        logger.info(`${DIAG_TAG} Paso 4 OK: CUIL completado`);
    } catch (fillErr) {
        logger.error(`${DIAG_TAG} Paso 4 FALLÓ: No se pudo completar CUIL | error=${fillErr.message}`);
        throw fillErr;
    }

    // PASO 5: Verificar el valor
    logger.info(`${DIAG_TAG} Paso 5: Verificando valor CUIL...`);
    let typed = ((await cuilInput.inputValue()) || "").replace(/\D/g, "");
    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 📝 Valor ingresado en DOM: '${typed}'`);
    if (typed !== cuilClean) {
        logger.warn(`[DATEAS-BOT] [TASK 3/ARCA] ⚠️ Valor '${typed}' ≠ esperado '${cuilClean}' — reintentando escritura`);
        logger.warn(`${DIAG_TAG} Valor no coincide, reintentando completar...`);
        await cuilInput.click();
        await cuilInput.fill("");
        await cuilInput.pressSequentially(cuilClean, { delay: 150 });
        await cuilInput.evaluate(el => el.blur());
        typed = ((await cuilInput.inputValue()) || "").replace(/\D/g, "");
        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 📝 Valor ingresado tras reintento: '${typed}'`);
    }
    
    if (typed !== cuilClean) {
        logger.error(`${DIAG_TAG} Paso 5 FALLÓ: Valor aún incorrecto tras reintento | esperado=${cuilClean} | actual=${typed}`);
        throw new Error(`Verificación de valor CUIL falló`);
    }
    logger.info(`${DIAG_TAG} Paso 5 OK: CUIL verificado | value='${typed}'`);
    logger.info(`${DIAG_TAG} FASE ENTRADA CUIL COMPLETADA`);

    /* ── Botón CONTINUAR intermedio (si existe) ── */
    const continuarCount = await page.locator(ARCA_CONTINUAR_SEL).count().catch(() => 0);
    if (continuarCount > 0) {
        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 🔵 Botón CONTINUAR detectado en la página — ejecutando paso intermedio...`);
        try {
            await Promise.all([
                page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT }).catch(() => {}),
                page.locator(ARCA_CONTINUAR_SEL).first().click({ timeout: ACTION_TIMEOUT }),
            ]);
            logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 🔵 CONTINUAR ejecutado | url=${page.url()}`);
            if (page.url().includes("MuestraBasica.aspx")) {
                logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ✅ CONTINUAR navegó directo a MuestraBasica.aspx`);
                await page.waitForLoadState("domcontentloaded").catch(() => {});
                const { lastPeriod, last3PaidCount } = await parseArcaTable(page, cuilClean);
                const ok = last3PaidCount > 0;
                logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ✅ CUIL ${cuilClean} → último período: ${lastPeriod} | Trim. pagos: ${last3PaidCount}`);
                return { ok, ultimoAporte: lastPeriod, trimPagos: last3PaidCount };
            }
        } catch (e) {
            if (isArcaSessionClosedError(e)) throw e;
            logger.warn(`[DATEAS-BOT] [TASK 3/ARCA] ⚠️ Clic CONTINUAR falló (${e.message}). Continuando con flujo estándar...`);
        }
    }

    /* ── Enviar formulario (btnBuscar) ── */
    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] 🖱️ Intentando enviar formulario (clic en btnBuscar)...`);
    try {
        await Promise.all([
            page.waitForURL(/MuestraBasica\.aspx/i, { timeout: NAV_TIMEOUT }),
            page.click(ARCA_SUBMIT_SEL, { timeout: ACTION_TIMEOUT }),
        ]);
        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ✅ Formulario enviado exitosamente | url=${page.url()}`);
    } catch (err) {
        if (isArcaSessionClosedError(err)) throw err;

        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ⚠️ El envío no avanzó a MuestraBasica.aspx en el tiempo esperado. Revisando estado...`);
        await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});

        if (await isArcaWebSessionExpired(page)) {
            throw new ArcaSessionExpiredError(`ARCA session expired after form submission for ${cuilClean}`);
        }

        /* Detector específico: CUIL no activo en ARCA */
        if (page.url().includes("ingresoDatos.aspx")) {
            const validatorText = await page
                .locator("#ctl00_ContentPlaceHolder2_vldSumaryCuil")
                .textContent()
                .catch(() => null);
            if (validatorText && validatorText.toLowerCase().includes("no se encuentra activo")) {
                logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ℹ️ CUIL ${cuilClean} no activo en ARCA (vldSumaryCuil). Clasificando como sin aportes.`);
                return { ok: false, ultimoAporte: null, trimPagos: 0 };
            }

            const html   = await page.content().catch(() => "");
            const lower  = html.toLowerCase();
            const noDataPatterns = [
                "no se encuentra", "no esta activo", "no está activo",
                "cuil incorrecto", "cuil no registrado", "no registrado",
                "no existe", "no encontrado", "cuil inv",
            ];
            const matched = noDataPatterns.find(p => lower.includes(p));
            if (matched) {
                logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ℹ️ CUIL ${cuilClean} — mensaje ARCA detectado ("${matched}"). Sin aportes.`);
                return { ok: false, ultimoAporte: null, trimPagos: 0 };
            }
        }

        logger.warn(`[DATEAS-BOT] [TASK 3/ARCA] ⚠️ No avanzó a resultados: ${err.message}`);
        return { ok: false, ultimoAporte: null, trimPagos: 0 };
    }

    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ✅ Página de resultados | url=${page.url()}`);
    await page.waitForLoadState("domcontentloaded").catch(() => {});

    const { lastPeriod, last3PaidCount } = await parseArcaTable(page, cuilClean);
    const ok = last3PaidCount > 0;

    if (lastPeriod) {
        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ✅ CUIL ${cuilClean} → último período: ${lastPeriod} | Trim. pagos: ${last3PaidCount}`);
    } else {
        logger.info(`[DATEAS-BOT] [TASK 3/ARCA] ℹ️ CUIL ${cuilClean} → sin datos válidos`);
    }

    logger.info(`[DATEAS-BOT] [TASK 3/ARCA] Resultado final — CUIL: ${cuilClean} | Pagos en ventana: ${last3PaidCount}/3 | Último: ${lastPeriod || "ninguno"} | ${ok ? "✓ APROBADO" : "✗ INSUFICIENTE (mínimo 1)"}`);
    return { ok, ultimoAporte: lastPeriod, trimPagos: last3PaidCount };
}

/* ─── TASK 3 — CODEM scraping ─────────────────────────────── */

/**
 * Consulta CODEM para obtener Obra Social y su código.
 * @returns {{ obraSocial: string|null, codigoObraSocial: string|null }}
 */
async function checkCodem(page, cuil) {
    const cuilClean = String(cuil).replace(/[-\s]/g, "");
    logger.info(`[DATEAS-BOT] [TASK 3/CODEM] Consultando obra social — CUIL: ${cuilClean}`);

    try {
        await page.goto(CODEM_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT });
    } catch (err) {
        logger.warn(`[DATEAS-BOT] [TASK 3/CODEM] No pudo navegar a CODEM: ${err.message}`);
        return { obraSocial: null, codigoObraSocial: null };
    }

    await humanDelay(600, 1200);

    const inputSel = "#ContentPlaceHolder1_txtDoc";
    try {
        await page.waitForSelector(inputSel, { state: "visible", timeout: ACTION_TIMEOUT });
    } catch {
        logger.warn(`[DATEAS-BOT] [TASK 3/CODEM] Input de documento no encontrado en la página de CODEM`);
        return { obraSocial: null, codigoObraSocial: null };
    }

    const input = page.locator(inputSel).first();
    await input.click();
    await input.fill("");
    await input.pressSequentially(cuilClean, { delay: 150 });
    await humanDelay(300, 600);

    /* Primer Continuar */
    const btn1Sel = "input[value='Continuar'], button:has-text('Continuar'), #ContentPlaceHolder1_btnContinuar";
    try {
        await page.locator(btn1Sel).first().click({ timeout: ACTION_TIMEOUT });
        await humanDelay(800, 1500);
        await page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT }).catch(() => {});
    } catch {
        logger.warn(`[DATEAS-BOT] [TASK 3/CODEM] No pudo hacer clic en "Continuar" para CUIL ${cuilClean}`);
        return { obraSocial: null, codigoObraSocial: null };
    }

    /* Segundo Continuar (si existe — ASP.NET postback) */
    const btn2 = page.locator(btn1Sel).first();
    if (await btn2.count().catch(() => 0)) {
        try {
            await btn2.click({ timeout: ACTION_TIMEOUT });
            await humanDelay(800, 1500);
            await page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT }).catch(() => {});
        } catch {
            /* Continuar igual */
        }
    }

    /* Extraer tabla de obra social — solo Código (cells[0]) y Descripción (cells[1]) */
    const result = await page.evaluate(() => {
        const table = document.querySelector("#ContentPlaceHolder1_DGOOSS");
        if (!table) return null;

        const rows = Array.from(table.querySelectorAll("tr"));
        for (const row of rows) {
            /* Saltear fila de encabezado (class="title") */
            if (row.classList.contains("title")) continue;

            const cells = row.querySelectorAll("td");
            if (cells.length < 2) continue;

            const codigo      = (cells[0].textContent || "").replace(/\s+/g, " ").trim();
            const descripcion = (cells[1].textContent || "").replace(/\s+/g, " ").trim();

            /* La fila de datos tiene código numérico en cells[0] y descripción en cells[1] */
            if (/^\d+$/.test(codigo) && descripcion) {
                return { codigoObraSocial: codigo, obraSocial: descripcion };
            }
        }
        return null;
    });

    if (!result || !result.obraSocial) {
        logger.info(`[DATEAS-BOT] [TASK 3/CODEM] Sin obra social para CUIL ${cuilClean} — tabla vacía o CUIL sin cobertura activa`);
        return { obraSocial: null, codigoObraSocial: null };
    }

    logger.info(`[DATEAS-BOT] [TASK 3/CODEM] Resultado — Obra Social: "${result.obraSocial}" | Código: "${result.codigoObraSocial || "-"}"`);
    return result;
}

/* ─── TASK 4 — Inserción en BD ────────────────────────────── */

async function getBotUploadUser() {
    if (_botUploadUserId) return _botUploadUserId;
    const user = await User.findOne({ role: { $in: ["gerencia", "admin"] }, active: true }).lean();
    if (user) _botUploadUserId = user._id;
    return _botUploadUserId;
}

async function saveNativeAffiliate(data) {
    const doc = new NativeAffiliate({
        nombre:           data.nombre,
        cuil:             data.cuil,
        obraSocial:       data.obraSocial,
        codigoObraSocial: data.codigoObraSocial || null,
        provincia:        data.provincia || null,
        localidad:        data.localidad || null,
        edad:             data.edad || null,
        telefono:         null,
        ultimoAporte:     data.ultimoAporte || null,
        trimPagos:        data.trimPagos || 0,
        dniOrigen:        data.dniOrigen || null,
    });
    await doc.save();

    /* También guardar en la colección principal Affiliate para que
     * aparezca en /dashboard/affiliates/list, y crear/actualizar
     * AffiliateContribution con estado de verificación 'success' */
    try {
        const uploadedBy = await getBotUploadUser();
        if (uploadedBy) {
            const affiliateDoc = await Affiliate.findOneAndUpdate(
                { cuil: data.cuil },
                {
                    $setOnInsert: {
                        nombre:           data.nombre,
                        cuil:             data.cuil,
                        obraSocial:       data.obraSocial,
                        codigoObraSocial: data.codigoObraSocial || null,
                        localidad:        data.localidad || "N/A",
                        telefono1:        "N/A",
                        uploadedBy,
                        sourceFile:       "native-bot",
                        batchId:          "native-bot",
                        dataSource:       "fresh",
                        active:           true,
                        leadStatus:       "Pendiente",
                        edad:             data.edad || null,
                    }
                },
                { upsert: true, new: true }
            );

            /* Crear/actualizar AffiliateContribution con los datos de ARCA ya verificados */
            if (affiliateDoc) {
                await AffiliateContribution.findOneAndUpdate(
                    { affiliateId: affiliateDoc._id },
                    {
                        $set: {
                            cuil:                      data.cuil,
                            lastContributionPeriod:    data.ultimoAporte || null,
                            last3ClosedMonthsPaidCount: typeof data.trimPagos === "number" ? data.trimPagos : null,
                            "verification.status":     "success",
                            "verification.checkedAt":  new Date(),
                            "verification.source":     "native-bot",
                            "verification.checkedBy":  "native-bot",
                        }
                    },
                    { upsert: true }
                );
            }
        }
    } catch (affErr) {
        logger.warn(`[DATEAS-BOT] No pudo guardar en Affiliate/Contribution para ${data.cuil}: ${affErr.message}`);
    }

    return doc;
}

/* ─── Diagnóstico: desglose de descartes en ScrapedCode ───────── */

/**
 * Queries ScrapedCode and logs a breakdown of discard reasons.
 * Used at session start (last 24h) and session end (current session).
 * Normalises compound reasons like "arca_insuficiente:pagos=0" to their prefix.
 * @param {Date|null} since  — only consider docs after this date (null = all)
 * @param {string}    label  — label for the log line
 */
async function logDiscardBreakdown(since, label) {
    try {
        const query = { status: "discarded" };
        if (since) query.createdAt = { $gte: since };
        const docs = await ScrapedCode.find(query, { reason: 1 }).lean();
        if (!docs.length) {
            logger.info(`[DATEAS-BOT] [DIAGNÓSTICO] Sin descartes registrados en ScrapedCode (${label})`);
            return;
        }
        const breakdown = {};
        for (const d of docs) {
            // Normalize "arca_insuficiente:pagos=0" → "arca_insuficiente" for grouping
            const key = (d.reason || "sin_motivo").split(":")[0];
            breakdown[key] = (breakdown[key] || 0) + 1;
        }
        const lines = Object.entries(breakdown)
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ");
        logger.info(`[DATEAS-BOT] [DIAGNÓSTICO] Descartes (${label}, ${docs.length} total): ${lines}`);
    } catch (e) {
        logger.warn(`[DATEAS-BOT] [DIAGNÓSTICO] No pudo consultar ScrapedCode: ${e.message}`);
    }
}

/* ─── Runner principal ──────────────────────────────────────────── */

/**
 * Ejecuta el bot para un número determinado de iteraciones.
 * @param {{ maxIterations?: number, onProgress?: Function }} opts
 */
async function runBot({ maxIterations = 100, onProgress = null, taskId = null } = {}) {
    if (_botState.running) {
        throw new Error("El bot ya está en ejecución");
    }

    _botState = {
        running:   true,
        paused:    false,
        processed: 0,
        saved:     0,
        discarded: 0,
        lastCode:  null,
        lastError: null,
        startedAt: new Date(),
    };

    const [alreadyTestedCount, nativeCount] = await Promise.all([
        ScrapedCode.countDocuments(),
        NativeAffiliate.countDocuments(),
    ]);

    logger.info(`[DATEAS-BOT] ══════════════════════════════════════════════`);
    logBot(`[DATEAS-BOT] BOT DE ADQUISICIÓN — SESIÓN INICIADA`);
    logBot(`[DATEAS-BOT]   Iteraciones planificadas : ${maxIterations}`);
    logBot(`[DATEAS-BOT]   Códigos ya registrados   : ${alreadyTestedCount}  ← nunca se repetirán`);
    logBot(`[DATEAS-BOT]   Afiliados nativos en BD  : ${nativeCount}`);
    logger.info(`[DATEAS-BOT]   Modo headless            : ${HEADLESS}`);
    logger.info(`[DATEAS-BOT]   Perfil de navegador      : ${USER_DATA_DIR}`);
    logger.info(`[DATEAS-BOT] ══════════════════════════════════════════════`);
    await logDiscardBreakdown(new Date(Date.now() - 24 * 60 * 60 * 1000), "últimas 24h (pre-sesión)");

    let context = null;
    let page    = null;

    async function openBrowserContext() {
        if (context) { try { await context.close(); } catch (_) {} }
        logger.info(`[DATEAS-BOT] Abriendo browser | headless=${HEADLESS} | profile=${USER_DATA_DIR}`);
        context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless  : HEADLESS,
            args      : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            userAgent : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale    : "es-AR",
        });
        /* Bloquear popups de ayuda de ingresoDatos.aspx */
        context.on('page', async (newPage) => {
            const url = newPage.url();
            if (url.includes('/ayuda/') || url.includes('ayuda.htm')) {
                logger.info(`[DATEAS-BOT] 🚫 Popup de ayuda bloqueado: ${url}`);
                await newPage.close().catch(() => {});
            } else {
                newPage.on('framenavigated', async (frame) => {
                    if (frame === newPage.mainFrame()) {
                        const frameUrl = frame.url();
                        if (frameUrl.includes('/ayuda/') || frameUrl.includes('ayuda.htm')) {
                            logger.info(`[DATEAS-BOT] 🚫 Popup de ayuda bloqueado (nav): ${frameUrl}`);
                            await newPage.close().catch(() => {});
                        }
                    }
                });
            }
        });
        page = context.pages()[0] || await context.newPage();
        page.setDefaultTimeout(ACTION_TIMEOUT);
        page.setDefaultNavigationTimeout(NAV_TIMEOUT);
        await bootstrapArcaSession(page);
    }

    try {
        const pendingPadronList = [];
        await openBrowserContext();

        for (let i = 0; i < maxIterations; i++) {
            if (!_botState.running) break;

            // ── Control-channel check (iteration boundary) ──────────────
            const signal = await readControlSignal();
            if (signal === "stop") {
                logBot(`[DATEAS-BOT] ⛔ Señal STOP recibida — deteniendo bot en límite de iteración`);
                _botState.running = false;
                _botState.stoppedByUser = true;
                const BotControl = require("../models/BotControl");
                await BotControl.updateOne({ _id: "dateas" }, { $set: { signal: "none" } }).catch(() => {});
                break;
            }
            if (signal === "pause") {
                logBot(`[DATEAS-BOT] ⏸️ Señal PAUSE recibida — suspendido en límite de iteración`);
                // Wait until signal changes to "none" or "stop"
                while (true) {
                    await new Promise(r => setTimeout(r, 1000));
                    const fresh = await readControlSignal();
                    if (fresh === "stop") {
                        logBot(`[DATEAS-BOT] ⛔ Señal STOP recibida durante pausa — deteniendo bot`);
                        _botState.running = false;
                        _botState.stoppedByUser = true;
                        const BotControl = require("../models/BotControl");
                        await BotControl.updateOne({ _id: "dateas" }, { $set: { signal: "none" } }).catch(() => {});
                        break;
                    }
                    if (fresh !== "pause") {
                        logBot(`[DATEAS-BOT] ▶️ Señal RESUME recibida — reanudando`);
                        break;
                    }
                }
                if (!_botState.running) break;
            }
            // ────────────────────────────────────────────────────────────

            /* ── TASK 1: Generar código único ─ */
            logger.info(`[DATEAS-BOT] ──────────────────────────────────────────────`);
            logBot(`[DATEAS-BOT] [TASK 1] Iteración ${i + 1}/${maxIterations} — buscando código DNI no utilizado...`);
            let dni;
            let attempts = 0;
            do {
                dni = generateDni();
                attempts++;
                if (attempts > 1) {
                    logger.info(`[DATEAS-BOT] [TASK 1] Código ${dni} ya registrado en ScrapedCode — generando otro (intento ${attempts})`);
                }
                if (attempts > 200) {
                    logger.warn(`[DATEAS-BOT] [TASK 1] No se encontró código nuevo tras 200 intentos — deteniendo bot`);
                    _botState.running = false;
                    break;
                }
            } while (await isCodeAlreadyTested(dni));

            if (!_botState.running) break;

            _botState.lastCode = dni;
            _botState.processed++;
            logBot(`[DATEAS-BOT] [TASK 1] ✓ Código seleccionado: ${dni} (encontrado en ${attempts} intento${attempts > 1 ? "s" : ""})`); 

            /* Registrar el código INMEDIATAMENTE antes de cualquier operación.
             * Si el bot se detiene de forma abrupta a mitad de la iteración,
             * el código ya estará en ScrapedCode y no será reutilizado jamás. */
            await persistCode(dni, "tested");
            logger.info(`[DATEAS-BOT] [TASK 1] Código ${dni} persistido en ScrapedCode — no se repetirá en sesiones futuras`);

            /* ── TASK 2: Scraping Dateas ─ */
            const dateasData = await scrapeDataeas(page, dni);

            if (!dateasData || !dateasData.cuil || !dateasData.nombre || !dateasData.provincia || !dateasData.localidad || dateasData.edad === null) {
                let reason;
                if (!dateasData) {
                    reason = "sin_resultados";
                    logBot(`[DATEAS-BOT] [TASK 2] ✗ RECHAZADO [${dni}] — Dateas no devolvió ningún resultado (DNI inexistente o sin datos)`);
                } else {
                    const missing = [];
                    if (!dateasData.cuil)         missing.push("cuil");
                    if (!dateasData.nombre)       missing.push("nombre");
                    if (!dateasData.provincia)    missing.push("provincia");
                    if (!dateasData.localidad)    missing.push("localidad");
                    if (dateasData.edad === null) missing.push("edad");
                    reason = "campos_incompletos";
                    logBot(`[DATEAS-BOT] [TASK 2] ✗ RECHAZADO [${dni}] — Campos faltantes: [${missing.join(", ")}] | raw → cuil="${dateasData.cuil||"-"}" nombre="${dateasData.nombre||"-"}" edad=${dateasData.edad} prov="${dateasData.provincia||"-"}" local="${dateasData.localidad||"-"}"`, 'warn');
                }
                await persistCode(dni, "discarded", reason);
                _botState.discarded++;
                if (onProgress) onProgress({ ..._botState });
                await humanDelay(1000, 2000);
                continue;
            }

            /* Validar CUIL contra ambas colecciones MongoDB */
            logger.info(`[DATEAS-BOT] [TASK 2] Verificando CUIL ${dateasData.cuil} contra colecciones en base de datos...`);
            const collisionSource = await existsInDb(dateasData.cuil);
            if (collisionSource) {
                logBot(`[DATEAS-BOT] [TASK 2] ✗ RECHAZADO [${dni}] — CUIL ${dateasData.cuil} ya existe en colección "${collisionSource}"`);
                await persistCode(dni, "discarded", `cuil_existente:${collisionSource}`);
                _botState.discarded++;
                if (onProgress) onProgress({ ..._botState });
                await humanDelay(800, 1500);
                continue;
            }

            /* ── TASK 3: ARCA ─ */
            let arca;
            try {
                arca = await checkArcaContributions(page, dateasData.cuil);
            } catch (arcaErr) {
                if (arcaErr instanceof ArcaSessionExpiredError || isArcaSessionClosedError(arcaErr)) {
                    logger.warn(`[DATEAS-BOT] [TASK 3/ARCA] ⚠️ Sesión expirada o cerrada — reconstruyendo browser y reintentando CUIL ${dateasData.cuil}...`);
                    await openBrowserContext();
                    arca = await checkArcaContributions(page, dateasData.cuil);
                } else {
                    throw arcaErr;
                }
            }
            if (!arca.ok) {
                logBot(`[DATEAS-BOT] [TASK 3] ✗ RECHAZADO [${dni}] — ARCA insuficiente: ${arca.trimPagos}/3 pagos en ventana (mínimo: 1) | último aporte: ${arca.ultimoAporte || "ninguno"}`);
                await persistCode(dni, "discarded", `arca_insuficiente:pagos=${arca.trimPagos}`);
                _botState.discarded++;
                if (onProgress) onProgress({ ..._botState });
                await humanDelay(800, 1500);
                continue;
            }

            /* ── TASK 3: CODEM ─ */
            const codem = await checkCodem(page, dateasData.cuil);
            if (!codem.obraSocial) {
                logBot(`[DATEAS-BOT] [TASK 3] ✗ RECHAZADO [${dni}] — CODEM no encontró obra social para CUIL ${dateasData.cuil}`);
                await persistCode(dni, "discarded", "sin_obra_social");
                _botState.discarded++;
                if (onProgress) onProgress({ ..._botState });
                await humanDelay(800, 1500);
                continue;
            }

            /* ── TASK 4: Guardar ─ */
            try {
                await saveNativeAffiliate({
                    ...dateasData,
                    obraSocial:       codem.obraSocial,
                    codigoObraSocial: codem.codigoObraSocial,
                    ultimoAporte:     arca.ultimoAporte,
                    trimPagos:        arca.trimPagos,
                    dniOrigen:        dni,
                });
                await persistCode(dni, "saved");
                _botState.saved++;
                const savedAffiliate = await Affiliate.findOne({ cuil: dateasData.cuil }, { _id: 1 }).lean();
                if (savedAffiliate && evaluateNeedsPadronCheck(arca.trimPagos, arca.ultimoAporte, null)) {
                    pendingPadronList.push({ _id: savedAffiliate._id, cuil: dateasData.cuil });
                }
                logger.info(`[DATEAS-BOT] ══════════════════════════════════════════════`);
                logBot(`[DATEAS-BOT] [TASK 4] ✅ GUARDADO EXITOSAMENTE`);
                logBot(`[DATEAS-BOT]   Nombre      : ${dateasData.nombre}`);
                logBot(`[DATEAS-BOT]   CUIL        : ${dateasData.cuil}`);
                logBot(`[DATEAS-BOT]   Obra Social : ${codem.obraSocial} (cód: ${codem.codigoObraSocial || "-"})`);
                logBot(`[DATEAS-BOT]   Provincia   : ${dateasData.provincia} / ${dateasData.localidad}`);
                logBot(`[DATEAS-BOT]   Últ. Aporte : ${arca.ultimoAporte} (${arca.trimPagos} pago(s) en trim.)`);
                logBot(`[DATEAS-BOT]   DNI origen  : ${dni}`);
                logger.info(`[DATEAS-BOT] ══════════════════════════════════════════════`);
            } catch (saveErr) {
                logger.error(`[DATEAS-BOT] Error guardando ${dateasData.cuil}: ${saveErr.message}`);
                await persistCode(dni, "discarded", `save_error: ${saveErr.message}`);
                _botState.discarded++;
            }

            if (onProgress) onProgress({ ..._botState });
            await humanDelay(1500, 3000);
        }

        if (pendingPadronList.length > 0) {
            logBot(`[DATEAS-BOT] 🔍 Iniciando check de padrón para ${pendingPadronList.length} afiliado(s)...`);
            try {
                await syncPadronBatch(pendingPadronList);
            } catch (padronErr) {
                logger.error(`[DATEAS-BOT] ❌ Error en syncPadronBatch: ${padronErr.message}`);
            }
        }

    } catch (fatalErr) {
        _botState.lastError = fatalErr.message;
        logBot(`[DATEAS-BOT] Error fatal: ${fatalErr.message}`, 'error');
    } finally {
        _botState.running = false;
        if (context) {
            try { await context.close(); } catch (_) {}
        }
        const durSecs = _botState.startedAt
            ? Math.round((Date.now() - new Date(_botState.startedAt).getTime()) / 1000)
            : 0;
        logger.info(`[DATEAS-BOT] ══════════════════════════════════════════════`);
        logBot(`[DATEAS-BOT] SESIÓN FINALIZADA`);
        logBot(`[DATEAS-BOT]   Procesados  : ${_botState.processed}`);
        logBot(`[DATEAS-BOT]   Guardados   : ${_botState.saved}`);
        logBot(`[DATEAS-BOT]   Descartados : ${_botState.discarded}`);
        logBot(`[DATEAS-BOT]   Duración    : ${durSecs}s`);
        if (_botState.lastError) {
            logBot(`[DATEAS-BOT]   Último error: ${_botState.lastError}`, 'error');
        }
        logger.info(`[DATEAS-BOT] ══════════════════════════════════════════════`);

        if (_botState.startedAt) {
            await logDiscardBreakdown(_botState.startedAt, "esta sesión");
        }

        /* Persist final state and chain next queued task */
        if (taskId) {
            const DateasTask = require("../models/DateasTask");
            const finalStatus = _botState.lastError ? "error" : (_botState.stoppedByUser ? "stopped" : "completed");
            DateasTask.findByIdAndUpdate(taskId, { $set: {
                status:            finalStatus,
                completedAt:       new Date(),
                "progress.total":     maxIterations,
                "progress.processed": _botState.processed,
                "progress.saved":     _botState.saved,
                "progress.discarded": _botState.discarded,
                "progress.lastCode":  _botState.lastCode  || null,
                "progress.lastError": _botState.lastError || null,
            }}).catch(e => logger.error(`[DATEAS-BOT] DB finalize error: ${e.message}`));
            _currentTaskId = null;
            /* Dequeue next task after a short pause */
            setTimeout(() => {
                const DT = require("../models/DateasTask");
                DT.countDocuments({ status: "pending" }).then(n => {
                    if (n > 0) _runNextFromQueue().catch(e => logger.error(`[DATEAS-BOT] Dequeue error: ${e.message}`));
                }).catch(() => {});
            }, 1000);
        }
    }

    return { ..._botState };
}

/** Detiene el bot en la próxima iteración y cancela la cola pendiente */
function stopBot() {
    _botState.running = false;
    _botState.paused  = false;
    const DateasTask = require("../models/DateasTask");
    DateasTask.updateMany(
        { status: "pending" },
        { $set: { status: "stopped", completedAt: new Date() } }
    ).catch(() => {});
    if (_currentTaskId) {
        DateasTask.findByIdAndUpdate(_currentTaskId, {
            $set: { status: "stopped", completedAt: new Date() }
        }).catch(() => {});
    }
    // Reset control signal so a future start begins cleanly
    BotControl.findByIdAndUpdate(
        "dateas",
        { $set: { signal: "none" } },
        { upsert: true }
    ).catch(() => {});
}

/** Pausa / reanuda el bot */
function togglePause() {
    if (!_botState.running) return;
    _botState.paused = !_botState.paused;
}

/** Estado actual (snapshot) */
function getBotState() {
    return { ..._botState };
}

/**
 * Encola una nueva tarea DATEAS.
 * NOTA: El auto-inicio solo debe ocurrir en el worker (dateas-worker), no en backend.
 * El worker revisa periódicamente la cola y ejecuta las tareas pendientes.
 * 
 * @param {{ maxIterations?: number }} opts
 * @returns {Promise<object>} documento DateasTask creado
 */
async function enqueueTask({ maxIterations = 50 } = {}) {
    const DateasTask = require("../models/DateasTask");
    const task = await DateasTask.create({ status: "pending", maxIterations });
    
    // Solo auto-iniciar si estamos en el worker process (detectado por PM2 name o flag)
    // Esto evita que el backend ejecute el bot directamente y centralice logs
    const isWorkerProcess = process.env.PM2_PROCESS_NAME === 'dateas-worker' || 
                           process.env.IS_DATEAS_WORKER === 'true';
    
    if (isWorkerProcess && !_botState.running) {
        logger.info(`[DATEAS-BOT] Tarea encolada ${task._id}, iniciando ejecución desde worker...`);
        _runNextFromQueue().catch(e => logger.error(`[DATEAS-BOT] enqueueTask error: ${e.message}`));
    } else {
        logger.info(`[DATEAS-BOT] Tarea encolada ${task._id}, esperando worker para ejecución`);
    }
    
    return task;
}

/** @private — dequeues and runs the oldest pending DateasTask */
async function _runNextFromQueue() {
    const DateasTask = require("../models/DateasTask");
    const next = await DateasTask.findOneAndUpdate(
        { status: "pending" },
        { $set: { status: "running", startedAt: new Date() } },
        { sort: { requestedAt: 1 }, new: true }
    ).lean();
    if (!next) return;
    _currentTaskId = String(next._id);

    /* Throttled DB progress updates (every 4 s) */
    let lastDbTick = 0;
    const onProgress = (state) => {
        const now = Date.now();
        if (now - lastDbTick < 4000) return;
        lastDbTick = now;
        DateasTask.findByIdAndUpdate(_currentTaskId, { $set: {
            "progress.total":     next.maxIterations,
            "progress.processed": state.processed,
            "progress.saved":     state.saved,
            "progress.discarded": state.discarded,
            "progress.lastCode":  state.lastCode  || null,
            "progress.lastError": state.lastError || null,
        }}).catch(() => {});
    };

    await runBot({ maxIterations: next.maxIterations, onProgress, taskId: _currentTaskId });
}

/**
 * Returns the currently running (or recently finished) DateasTask + queued count.
 * Never throws — returns { active: null, queuedCount: 0 } on error.
 */
async function getActiveTask() {
    try {
        const DateasTask = require("../models/DateasTask");
        const [running, queuedCount] = await Promise.all([
            DateasTask.findOne({ status: "running" }).lean(),
            DateasTask.countDocuments({ status: "pending" }),
        ]);
        if (running) return { active: running, queuedCount };

        const cutoff = new Date(Date.now() - 90_000);
        const recent = await DateasTask.findOne(
            { status: { $in: ["completed", "error", "stopped"] }, completedAt: { $gte: cutoff } }
        ).sort({ completedAt: -1 }).lean();

        return { active: recent ? { ...recent, finished: true } : null, queuedCount: 0 };
    } catch {
        return { active: null, queuedCount: 0 };
    }
}

/* ─── Pipeline enrichment: DATEAS age batch ──────────────────────────── */

/**
 * For each affiliate in the list, opens Dateas, searches by CUIL, and if a
 * valid age is returned it persists it on the Affiliate document.
 *
 * Rules:
 *  - Uses chromium.launch (not persistent context) to avoid profile conflicts
 *    with the acquisition bot running separately.
 *  - If Dateas returns no result or no age: existing age is preserved (no-op).
 *  - If any per-affiliate error occurs: it is logged and the loop continues.
 *  - Caller (runArcaAssisted) must treat any thrown error as non-blocking for Padrón.
 *
 * @param {Array<{ _id: string|ObjectId, cuil: string }>} affiliates
 * @returns {Promise<{ enriched: number, skipped: number, errors: number }>}
 */
async function enrichAgeBatch(affiliates) {
    const stats = { enriched: 0, skipped: 0, errors: 0 };

    if (!affiliates || affiliates.length === 0) {
        logger.info(`[DATEAS-ENRICH] Batch vacío — nada que enriquecer`);
        return stats;
    }

    logger.info(`[DATEAS-ENRICH] ══════════════════════════════════════════════`);
    logger.info(`[DATEAS-ENRICH] Iniciando enriquecimiento de edad | total=${affiliates.length}`);
    logger.info(`[DATEAS-ENRICH] ══════════════════════════════════════════════`);

    let browser = null;
    let context = null;
    let page    = null;

    try {
        browser = await chromium.launch({
            headless : HEADLESS,
            args     : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        });
        context = await browser.newContext({
            userAgent : "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale    : "es-AR",
        });
        page = await context.newPage();
        page.setDefaultTimeout(ACTION_TIMEOUT);
        page.setDefaultNavigationTimeout(NAV_TIMEOUT);

        for (let i = 0; i < affiliates.length; i++) {
            const affiliate = affiliates[i];
            logger.info(`[DATEAS-ENRICH] [${i + 1}/${affiliates.length}] CUIL ${affiliate.cuil}`);

            try {
                /* scrapeDataeas accepts CUIL in the same input field as DNI */
                const result = await scrapeDataeas(page, affiliate.cuil);

                const edad = (result && typeof result.edad === "number" && result.edad > 0)
                    ? result.edad
                    : null;

                if (edad !== null && affiliate._id) {
                    await Affiliate.findByIdAndUpdate(affiliate._id, { $set: { edad } });
                    stats.enriched++;
                    logger.info(`[DATEAS-ENRICH] ✅ CUIL ${affiliate.cuil} → edad=${edad} guardada`);
                } else {
                    stats.skipped++;
                    logger.info(`[DATEAS-ENRICH] ⏭️ CUIL ${affiliate.cuil} → sin edad válida — valor existente preservado`);
                }
            } catch (perErr) {
                stats.errors++;
                logger.warn(`[DATEAS-ENRICH] ⚠️ CUIL ${affiliate.cuil} → error (Padrón continuará): ${perErr.message}`);
            }

            if (i < affiliates.length - 1) {
                await humanDelay(800, 1500);
            }
        }
    } finally {
        if (context) { try { await context.close(); } catch (_) {} }
        if (browser) { try { await browser.close(); } catch (_) {} }
        logger.info(`[DATEAS-ENRICH] ══════════════════════════════════════════════`);
        logger.info(`[DATEAS-ENRICH] Batch finalizado | enriquecidos=${stats.enriched} omitidos=${stats.skipped} errores=${stats.errors}`);
        logger.info(`[DATEAS-ENRICH] ══════════════════════════════════════════════`);
    }

    return stats;
}

/* ─── Startup cleanup ────────────────────────────────────────────────────
 * If the process was killed mid-run (e.g. PM2 restart), any task that was
 * left with status "running" would stay orphaned forever.  On module load
 * we schedule a one-time sweep to mark those tasks as "error" so the UI
 * recovers automatically without needing a manual DB fix.
 */
setTimeout(async () => {
    try {
        const DateasTask = require("../models/DateasTask");
        const result = await DateasTask.updateMany(
            { status: "running" },
            { $set: { status: "error", completedAt: new Date(), "progress.lastError": "Bot interrumpido (reinicio del servidor)" } }
        );
        if (result.modifiedCount > 0) {
            logger.warn(`[DATEAS-BOT] ⚠️ ${result.modifiedCount} tarea(s) huérfana(s) encontrada(s) al iniciar — marcadas como "error"`);
        }
        // Clear any stale pause/stop signal left from a previous crash/kill
        const ctrl = await BotControl.findById("dateas").lean();
        if (ctrl && ctrl.signal !== "none") {
            await BotControl.findByIdAndUpdate("dateas", { $set: { signal: "none" } }, { upsert: true });
            logger.info(`[DATEAS-BOT] 🧹 Señal de control obsoleta limpiada al iniciar (era: "${ctrl.signal}")`);
        }
    } catch (_) {}
}, 8000);

module.exports = {
    runBot,
    enqueueTask,
    stopBot,
    togglePause,
    getBotState,
    getActiveTask,
    enrichAgeBatch,
    scrapeDataeas,
    _runNextFromQueue
};
