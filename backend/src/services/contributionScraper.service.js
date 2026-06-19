/**
 * ============================================================
 * ARCA / MIS APORTES SCRAPER SERVICE  —  Playwright edition
 * ============================================================
 * Consulta el portal ARCA/AFIP "Mis Aportes" para obtener el
 * último período de aporte válido para un CUIL dado.
 *
 * Flujo (browser real, sesión persistente):
 * 1. BrowserSession.create() abre Chromium (headful por defecto)
 *    con userDataDir persistente y navega a aportesenlinea → basica.aspx
 * 2. Por cada CUIL: navega a ingresoDatos.aspx, completa CUIL, envía
 * 3. Parsea MuestraBasica.aspx y navega de vuelta para el siguiente CUIL
 * 4. Si detecta CAPTCHA → devuelve status="captcha" y detiene el batch
 *
 * Env vars:
 *   PLAYWRIGHT_HEADLESS=true   → headless (default: headful)
 *   ARCA_USER_DATA_DIR         → directorio de perfil persistente
 *   ARCA_BASE_URL              → base URL del portal ARCA
 *
 * Requiere: playwright  (npm install playwright)
 *           npx playwright install chromium
 */

const logger        = require("../utils/logger").getLogger("arca");
const path          = require("path");
const os            = require("os");
const { chromium }  = require("playwright");

const APORTES_URL    = "https://www.afip.gob.ar/aportesenlinea/";
const ARCA_BASE_URL  = process.env.ARCA_BASE_URL || "https://serviciosweb.afip.gob.ar";
const INGRESO_PATH   = "/TRAMITES_CON_CLAVE_FISCAL/MISAPORTES/app/basica/ingresoDatos.aspx";
const BASICA_PATH    = "/TRAMITES_CON_CLAVE_FISCAL/MISAPORTES/app/basica.aspx";
const INGRESO_URL    = `${ARCA_BASE_URL}${INGRESO_PATH}`;
const BASICA_URL     = `${ARCA_BASE_URL}${BASICA_PATH}`;

const USER_DATA_DIR  = process.env.ARCA_USER_DATA_DIR || path.join(os.homedir(), ".arca-browser-profile");
const HEADLESS       = process.env.PLAYWRIGHT_HEADLESS !== "false";

const NAV_TIMEOUT_MS    = 30000;
const ACTION_TIMEOUT_MS = 15000;

// ────────────────────────────────────────────────────────────
// Session-closed detection
// ────────────────────────────────────────────────────────────

/**
 * Returns true when the Playwright error indicates the browser, context,
 * or page has been closed — making the entire session unusable.
 * @param {Error|unknown} err
 * @returns {boolean}
 */
function isSessionClosedError(err) {
    if (!err) return false;
    const msg = (err.message || String(err)).toLowerCase();
    return (
        msg.includes("target page, context or browser has been closed") ||
        msg.includes("target closed") ||
        msg.includes("browser has been closed") ||
        msg.includes("context has been closed") ||
        msg.includes("context closed") ||
        msg.includes("page has been closed") ||
        msg.includes("page closed") ||
        msg.includes("has been closed") ||
        msg.includes("connection closed") ||
        msg.includes("execution context was destroyed") ||
        (msg.includes("protocol error") && msg.includes("session closed"))
    );
}

/**
 * If err is a session-closed Playwright error, logs a warning and rethrows it
 * so the runner can intercept, rebuild the session, and retry.
 * Otherwise does nothing.
 * @param {Error|unknown} err
 * @param {string} [context]  Short description of where the error occurred.
 */
function rethrowIfSessionClosed(err, context = "") {
    if (isSessionClosedError(err)) {
        logger.warn(
            `⚠️ [ARCA-SCRAPER] Session-level Playwright failure detected${
                context ? ` (${context})` : ""
            }, bubbling to runner for rebuild`
        );
        throw err;
    }
}

/**
 * Returns true when the error is a navigation timeout that occurred while trying
 * to reach ingresoDatos.aspx — the known production pattern after ~5000 queries
 * where the ARCA session silently dies and the page never loads.
 * Used exclusively in the ingresoDatos.aspx navigation section to avoid
 * classifying unrelated timeouts (form submission, etc.) as session failures.
 * @param {Error|unknown} err
 * @returns {boolean}
 */
function isIngresoDatosTimeout(err) {
    if (!err) return false;
    const msg = String(err.message || err);
    return (
        msg.includes("page.waitForURL: Timeout") ||
        msg.includes("page.goto: Timeout") ||
        msg.includes("Timeout 30000ms exceeded")
    );
}

/**
 * Espera un tiempo aleatorio entre minMs y maxMs.
 * @param {number} minMs
 * @param {number} maxMs
 */
function randomDelay(minMs = 1500, maxMs = 3500) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    logger.info(`⏱️ [ARCA-SCRAPER] Delay aplicado: ${ms}ms`);
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Detecta si el HTML contiene strings relacionados con CAPTCHA (diagnóstico débil).
 * NO usar como clasificador decisivo — solo para logging secundario.
 * @param {string} html
 * @returns {boolean}
 */
function hasCaptcha(html) {
    return (
        html.includes("recaptcha") ||
        html.includes("g-recaptcha") ||
        html.includes("grecaptcha") ||
        html.includes("captcha")
    );
}

/**
 * Detector fuerte de CAPTCHA activo y bloqueante.
 * Usa Playwright para verificar que hay un elemento de desafío VISIBLE y renderizado
 * en la página — no un script estático ni un div oculto.
 *
 * Se considera CAPTCHA activo si al menos uno de los siguientes elementos está visible:
 *   - Un iframe de reCAPTCHA con src que contiene "recaptcha"
 *   - Un contenedor .g-recaptcha con dimensiones reales (width/height > 0)
 *   - Un div#captcha o div.captcha visible
 *
 * Nunca lanza — siempre retorna boolean.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function hasActiveCaptchaChallenge(page) {
    try {
        // Señal 1: iframe de reCAPTCHA visible y con dimensiones reales
        const captchaFrames = page.locator('iframe[src*="recaptcha"], iframe[src*="captcha"]');
        const frameCount = await captchaFrames.count().catch(() => 0);
        for (let i = 0; i < frameCount; i++) {
            try {
                const frame = captchaFrames.nth(i);
                const visible = await frame.isVisible().catch(() => false);
                if (visible) {
                    const box = await frame.boundingBox().catch(() => null);
                    if (box && box.width > 10 && box.height > 10) {
                        logger.info(`🔒 [ARCA-CAPTCHA] Señal fuerte: iframe reCAPTCHA visible con dimensiones ${box.width}x${box.height}`);
                        return true;
                    }
                }
            } catch (_) { /* ignorar errores individuales */ }
        }

        // Señal 2: contenedor .g-recaptcha visible con dimensiones reales
        const gRecaptcha = page.locator('.g-recaptcha');
        const grCount = await gRecaptcha.count().catch(() => 0);
        for (let i = 0; i < grCount; i++) {
            try {
                const el = gRecaptcha.nth(i);
                const visible = await el.isVisible().catch(() => false);
                if (visible) {
                    const box = await el.boundingBox().catch(() => null);
                    if (box && box.width > 10 && box.height > 10) {
                        logger.info(`🔒 [ARCA-CAPTCHA] Señal fuerte: .g-recaptcha visible con dimensiones ${box.width}x${box.height}`);
                        return true;
                    }
                }
            } catch (_) { /* ignorar */ }
        }

        // Señal 3: div#captcha o div.captcha visible con dimensiones reales
        const captchaDiv = page.locator('div#captcha, div.captcha');
        const divCount = await captchaDiv.count().catch(() => 0);
        for (let i = 0; i < divCount; i++) {
            try {
                const el = captchaDiv.nth(i);
                const visible = await el.isVisible().catch(() => false);
                if (visible) {
                    const box = await el.boundingBox().catch(() => null);
                    if (box && box.width > 10 && box.height > 10) {
                        logger.info(`🔒 [ARCA-CAPTCHA] Señal fuerte: div#captcha/.captcha visible con dimensiones ${box.width}x${box.height}`);
                        return true;
                    }
                }
            } catch (_) { /* ignorar */ }
        }

        return false;
    } catch (e) {
        rethrowIfSessionClosed(e, "hasActiveCaptchaChallenge");
        logger.warn(`⚠️ [ARCA-CAPTCHA] Error en detección fuerte de CAPTCHA: ${e.message}. Asumiendo ausencia de CAPTCHA activo.`);
        return false;
    }
}

/**
 * Parsea la tabla de resultados desde una página Playwright por posición de columna.
 *
 * Columnas (0-indexed):
 *   td[0] = periodo
 *   td[3] = aportes de obra social
 *   td[4] = contribución patronal de obra social
 *
 * Condición: td[3] === "PAGO" && td[4] === "PAGO"
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<string|null>}
 */
/**
 * Computes how many of the last 3 closed months (relative to now) appear in
 * validPeriods. Periods are expected in "MM/YYYY" format.
 * @param {string[]} validPeriods
 * @returns {number} 0-3
 */
function computeLast3ClosedMonthsPaidCount(validPeriods) {
    const now = new Date();
    let year  = now.getFullYear();
    let month = now.getMonth() + 1; // 1-indexed
    const targets = [];
    for (let i = 1; i <= 3; i++) {
        let m = month - i;
        let y = year;
        if (m <= 0) { m += 12; y -= 1; }
        targets.push(`${String(m).padStart(2, "0")}/${y}`);
    }
    const count = targets.filter(t => validPeriods.includes(t)).length;
    logger.info(`📅 [ARCA-PARSER] last3 targets: ${targets.join(", ")} | valid paid: ${validPeriods.join(", ")} | count=${count}`);
    return count;
}

/**
 * Checks if the current employer table has valid contributions.
 * Valid = at least one row with aporteOS === "PAGO" && patronal === "PAGO"
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{ isValid: boolean, hasData: boolean, summary: { validRows: number, totalRows: number } }>}
 */
async function checkEmployerValidity(page) {
    const TABLE_SEL = "#ctl00_ContentPlaceHolder2_tbInfoBasica";

    const tableExists = await page.locator(TABLE_SEL).count();
    if (!tableExists) {
        return { isValid: false, hasData: false, summary: { validRows: 0, totalRows: 0 } };
    }

    const rows = page.locator(`${TABLE_SEL} tr`);
    const rowCount = await rows.count();

    let validRows = 0;
    let totalDataRows = 0;

    for (let i = 0; i < rowCount; i++) {
        const cells = rows.nth(i).locator("td");
        const cellCount = await cells.count();
        if (cellCount < 5) continue;

        const norm = async (idx) =>
            ((await cells.nth(idx).textContent()) || "").replace(/\s+/g, " ").trim().toUpperCase();

        const periodoRaw = ((await cells.nth(0).textContent()) || "").trim();
        // Only count rows with valid period format as data rows
        if (!/^\d{2}\/\d{4}$/.test(periodoRaw)) continue;

        totalDataRows++;
        const aporteOS = await norm(3);
        const patronal = await norm(4);

        if (aporteOS === "PAGO" && patronal === "PAGO") {
            validRows++;
        }
    }

    return {
        isValid: validRows > 0,
        hasData: totalDataRows > 0,
        summary: { validRows, totalRows: totalDataRows }
    };
}

/**
 * Convierte "MM/YYYY" en entero YYYYMM para comparaciones cronológicas.
 * @param {string} p
 * @returns {number}
 */
function periodToInt(p) {
    if (!/^\d{2}\/\d{4}$/.test(String(p || ""))) return null;
    const [mm, yyyy] = p.split("/");
    return parseInt(yyyy, 10) * 100 + parseInt(mm, 10);
}

function mostRecentPeriod(a, b) {
    if (!a && !b) return null;
    if (!a) return b;
    if (!b) return a;
    const aInt = periodToInt(a);
    const bInt = periodToInt(b);
    if (aInt == null && bInt == null) return null;
    if (aInt == null) return b;
    if (bInt == null) return a;
    return aInt >= bInt ? a : b;
}

/**
 * Retorna el período más antiguo entre dos valores "MM/YYYY".
 * @param {string|null} a
 * @param {string|null} b
 * @returns {string|null}
 */
function oldestPeriod(a, b) {
    if (!a && !b) return null;
    if (!a) return b;
    if (!b) return a;
    const aInt = periodToInt(a);
    const bInt = periodToInt(b);
    if (aInt == null && bInt == null) return null;
    if (aInt == null) return b;
    if (bInt == null) return a;
    return aInt <= bInt ? a : b;
}

function isValidContributionPeriod(periodo) {
    return /^\d{2}\/\d{4}$/.test(String(periodo || "").trim());
}

function isFullyPaidContribution(aporteOS, patronal) {
    return aporteOS === "PAGO" && patronal === "PAGO";
}

function normalizeArcaCell(value) {
    return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Verifica si un valor de estado de contribución indica actividad laboral.
 * Acepta: PAGO, IMPAGO, PAGO PARCIAL, EN PAGO (todos contienen "PAGO").
 * Rechaza: NO PRESENTADA, vacío, null.
 * @param {string} value
 * @returns {boolean}
 */
function isWorkActivity(value) {
    if (!value) return false;
    const upper = value.toUpperCase().trim();
    return upper.length > 0 && upper.includes("PAGO");
}

function buildContributionSummaryFromRows(rowsData = []) {
    let lastPeriod = null;
    let inicioLaboral = null;
    const validPeriods = [];

    for (const row of rowsData) {
        const periodo = String(row.periodo || "").replace(/\s+/g, " ").trim();
        const aporteOS = normalizeArcaCell(row.aporteOS);
        const patronal = normalizeArcaCell(row.patronal);

        if (isFullyPaidContribution(aporteOS, patronal) && isValidContributionPeriod(periodo)) {
            lastPeriod = mostRecentPeriod(lastPeriod, periodo);
            validPeriods.push(periodo);
        }

        if (isValidContributionPeriod(periodo)) {
            if (isWorkActivity(aporteOS) || isWorkActivity(patronal)) {
                inicioLaboral = oldestPeriod(inicioLaboral, periodo);
            }
        }
    }

    let trabaja = true;
    for (let i = rowsData.length - 1; i >= 0; i--) {
        const periodoRaw = String(rowsData[i].periodo || "").trim();
        if (isValidContributionPeriod(periodoRaw)) {
            const declaracion = normalizeArcaCell(rowsData[i].declaracion);
            if (declaracion.includes("NO PRESENTADA") || declaracion === "NO" || !declaracion) {
                trabaja = false;
            }
            break;
        }
    }

    return {
        lastPeriod,
        last3ClosedMonthsPaidCount: computeLast3ClosedMonthsPaidCount(validPeriods),
        trabaja,
        inicioLaboral
    };
}

function shouldReplaceSelectedEmployer(selectedValidEmployer, parsed) {
    if (!selectedValidEmployer) return true;
    const previousPeriod = selectedValidEmployer?.result?.lastPeriod || null;
    const lastPeriod = parsed?.lastPeriod || null;
    return (!previousPeriod && lastPeriod)
        || (previousPeriod && lastPeriod && periodToInt(lastPeriod) > periodToInt(previousPeriod));
}

/**
 * Finds the first valid employer by iterating through multiple employers using the "Siguiente" button.
 * An employer is valid for sale ONLY if trimPaidCount >= 1 OR trabaja === true
 * (i.e., it has at least one PAGO within the last closed trimester).
 * Old historical payments outside the last trimester do NOT make an employer valid.
 *
 * Also tracks the most recent historical contribution across ALL scanned employers
 * so that, when no valid employer is found, the caller can still report the latest
 * known contribution date.
 *
 * @param {import('playwright').Page} page
 * @param {string} cuilClean - The CUIL being processed (for logging)
 * @returns {Promise<{ found: boolean, selectedEmployerIndex: number|null, result: object|null, latestHistoricalContribution: string|null, scannedEmployers: Array }>}
 */
async function findFirstValidEmployerContribution(page, cuilClean) {
    const maxEmployersToScan = 20;
    let employerIndex = 1;
    const scannedEmployers = [];
    let latestHistoricalContribution = null;
    let globalInicioLaboral = null;
    let selectedValidEmployer = null;

    logger.info(`[ARCA-SCRAPER] Multiple employers flow detected for CUIL ${cuilClean}`);

    while (employerIndex <= maxEmployersToScan) {
        logger.info(`[ARCA-SCRAPER] Evaluating employer ${employerIndex}`);

        // Parse full contribution data for this employer (needed for trimPaidCount + trabaja)
        const parsed = await parseLastContributionPeriod(page);

        const trimPaidCount = parsed.last3ClosedMonthsPaidCount ?? 0;
        const trabaja       = parsed.trabaja ?? false;
        const lastPeriod    = parsed.lastPeriod || null;
        const empInicioLab  = parsed.inicioLaboral || null;

        // Track the most recent historical contribution across ALL employers
        latestHistoricalContribution = mostRecentPeriod(latestHistoricalContribution, lastPeriod);
        // Track the oldest inicio laboral across ALL employers
        globalInicioLaboral = oldestPeriod(globalInicioLaboral, empInicioLab);

        const validForSale = trimPaidCount >= 1 || trabaja === true;

        scannedEmployers.push({
            employerIndex,
            trimPaidCount,
            trabaja,
            lastContributionPeriod: lastPeriod,
            validForSale,
        });

        logger.info(
            `[ARCA-SCRAPER] Employer ${employerIndex} | trimPaidCount=${trimPaidCount} | trabaja=${trabaja}` +
            ` | lastContributionPeriod=${lastPeriod || "none"} | validForSale=${validForSale}`
        );

        if (validForSale) {
            if (shouldReplaceSelectedEmployer(selectedValidEmployer, parsed)) {
                selectedValidEmployer = {
                    selectedEmployerIndex: employerIndex,
                    result: parsed
                };
                logger.info(`[ARCA-SCRAPER] Employer ${employerIndex} seleccionado provisionalmente | lastContributionPeriod=${lastPeriod || "none"}`);
            }
        }

        if (!validForSale) {
            logger.info(`[ARCA-SCRAPER] Employer ${employerIndex} not valid for sale | trimPaidCount=${trimPaidCount} | trabaja=${trabaja} | lastContributionPeriod=${lastPeriod || "none"}`);
        }

        // Check for "Siguiente" button
        const nextButtonSelectors = [
            '#ctl00_ContentPlaceHolder2_btnEmpleSiguiente',
            'input[name="ctl00$ContentPlaceHolder2$btnEmpleSiguiente"][value="Siguiente"]'
        ];

        const nextButton = page.locator(nextButtonSelectors.join(', ')).first();
        const nextExists = await nextButton.count().catch(() => 0);

        if (!nextExists) {
            logger.info(`[ARCA-SCRAPER] No more employers available (Siguiente button not found)`);
            break;
        }

        const isEnabled = await nextButton.isEnabled().catch(() => false);
        const isVisible = await nextButton.isVisible().catch(() => false);

        if (!isVisible || !isEnabled) {
            logger.info(`[ARCA-SCRAPER] Siguiente button not visible or disabled, stopping`);
            break;
        }

        logger.info(`[ARCA-SCRAPER] Clicking next employer`);

        // Click and wait for postback
        try {
            await Promise.all([
                page.waitForLoadState('networkidle').catch(() => null),
                nextButton.click()
            ]);

            // Additional wait for ASP.NET postback to complete
            await page.waitForTimeout(800);

            // Wait for page stability
            await page.waitForLoadState('domcontentloaded').catch(() => null);

            employerIndex++;
        } catch (clickErr) {
            rethrowIfSessionClosed(clickErr, 'findFirstValidEmployerContribution › click Siguiente');
            logger.warn(`[ARCA-SCRAPER] Error clicking Siguiente button: ${clickErr.message}`);
            break;
        }
    }

    if (selectedValidEmployer) {
        logger.info(`[ARCA-SCRAPER] Selected employer ${selectedValidEmployer.selectedEmployerIndex} after full scan`);
        return {
            found: true,
            selectedEmployerIndex: selectedValidEmployer.selectedEmployerIndex,
            result: selectedValidEmployer.result,
            latestHistoricalContribution,
            globalInicioLaboral,
            scannedEmployers,
        };
    }

    logger.info(`[ARCA-SCRAPER] No valid employer found after scanning ${scannedEmployers.length} employers | latestHistoricalContribution=${latestHistoricalContribution || "none"}`);
    return {
        found: false,
        selectedEmployerIndex: null,
        result: null,
        latestHistoricalContribution,
        globalInicioLaboral,
        scannedEmployers,
    };
}

/**
 * Returns { lastPeriod, last3ClosedMonthsPaidCount } from the results table.
 */
async function parseLastContributionPeriod(page) {
    const TABLE_SEL = "#ctl00_ContentPlaceHolder2_tbInfoBasica";

    const tableExists = await page.locator(TABLE_SEL).count();
    if (!tableExists) {
        logger.warn("⚠️ [ARCA-PARSER] Tabla #ctl00_ContentPlaceHolder2_tbInfoBasica no encontrada");
        return { lastPeriod: null, last3ClosedMonthsPaidCount: 0 };
    }

    const rows = page.locator(`${TABLE_SEL} tr`);
    const rowCount = await rows.count();
    logger.info(`🔎 [ARCA-PARSER] Filas encontradas en la tabla: ${rowCount}`);

    const rowsData = [];

    for (let i = 0; i < rowCount; i++) {
        const cells = rows.nth(i).locator("td");
        const cellCount = await cells.count();
        if (cellCount < 5) continue;

        const norm = async (idx) =>
            ((await cells.nth(idx).textContent()) || "").replace(/\s+/g, " ").trim().toUpperCase();

        const periodo  = ((await cells.nth(0).textContent()) || "").replace(/\s+/g, " ").trim();
        const declaracion = await norm(1);
        const aporteOS = await norm(3);
        const patronal = await norm(4);

        rowsData.push({ periodo, declaracion, aporteOS, patronal });

        if (isFullyPaidContribution(aporteOS, patronal) && isValidContributionPeriod(periodo)) {
            logger.info(`✅ [ARCA-PARSER] Fila ${i} válida | periodo=${periodo} | aporteOS=${aporteOS} | patronal=${patronal}`);
        }
    }

    const { lastPeriod, last3ClosedMonthsPaidCount, trabaja, inicioLaboral } = buildContributionSummaryFromRows(rowsData);
    logger.info(`🏁 [ARCA-PARSER] Último período: ${lastPeriod ?? "ninguno"} | Trim. pagos: ${last3ClosedMonthsPaidCount} | Trabaja: ${trabaja} | Inicio laboral: ${inicioLaboral ?? "ninguno"}`);
    return { lastPeriod, last3ClosedMonthsPaidCount, trabaja, inicioLaboral };
}

/**
 * Construye el resultado estructurado de un scrape exitoso.
 */
function buildSuccess(lastContributionPeriod, cuil, last3ClosedMonthsPaidCount = null, trabaja = null, inicioLaboral = null) {
    return {
        ok: true,
        status: "success",
        lastContributionPeriod,
        last3ClosedMonthsPaidCount,
        trabaja,
        inicioLaboral,
        checkedAt: new Date(),
        errorMessage: null,
    };
}

function buildNoData(errorMessage = null) {
    return {
        ok: true,
        status: "no_data",
        lastContributionPeriod: null,
        checkedAt: new Date(),
        errorMessage,
    };
}

function buildCaptcha() {
    return {
        ok: false,
        status: "captcha",
        lastContributionPeriod: null,
        checkedAt: new Date(),
        errorMessage: "reCAPTCHA detectado",
    };
}

/**
 * Construye el resultado estructurado de un error.
 */
function buildError(message) {
    return {
        ok: false,
        status: "error",
        lastContributionPeriod: null,
        checkedAt: new Date(),
        errorMessage: message,
    };
}

/**
 * Construye el resultado para CUIL no activo en ARCA (distinto de generic error y de no_data).
 */
function buildNotFound() {
    return {
        ok: true,
        status: "not_found",
        lastContributionPeriod: null,
        last3ClosedMonthsPaidCount: null,
        checkedAt: new Date(),
        errorMessage: "CUIL no activo en ARCA",
    };
}

/**
 * Thrown when the ARCA *web application* session has expired (not a browser/Playwright crash).
 * Caught by the runner loop which restarts the browser via the public portal entry flow.
 */
class ArcaSessionExpiredError extends Error {
    constructor(msg = "ARCA session expired") {
        super(msg);
        this.name = "ArcaSessionExpiredError";
    }
}

/**
 * Returns true when the current page state indicates the ARCA web session has expired.
 * Checks URL and page text for known session-timeout signals.
 * Never throws — safe to call at any point.
 * @param {import('playwright').Page} page
 * @returns {Promise<boolean>}
 */
async function isArcaSessionExpired(page) {
    try {
        const url = page.url();
        if (
            url.includes("sessionExpired") ||
            url.includes("SessionTimeout") ||
            url.includes("session_expired") ||
            url.includes("aspSessionExpired")
        ) return true;
        const content = await page.content().catch(() => "");
        const lower = content.toLowerCase();
        return (
            lower.includes("sesi\u00f3n expirada") ||
            lower.includes("sesion expirada") ||
            lower.includes("session expirada") ||
            lower.includes("vuelva a ingresar al sistema") ||
            lower.includes("volv\u00e9 a ingresar") ||
            lower.includes("su sesi\u00f3n ha caducado") ||
            lower.includes("sesion caducada")
        );
    } catch (_) {
        return false;
    }
}

/**
 * Espera a que el usuario resuelva el CAPTCHA manualmente.
 */
async function waitForCaptchaResolution(page, timeoutMs = 120000) {
    logger.info(`⏳ [ARCA-SCRAPER] CAPTCHA detectado. Modo asistido: esperando resolución manual (hasta ${timeoutMs/1000}s)...`);
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
        const url = page.url();
        
        if (url.includes("MuestraBasica.aspx")) {
            logger.info(`✅ [ARCA-SCRAPER] CAPTCHA resuelto: El usuario avanzó a resultados.`);
            return "solved_advanced";
        }
        
    try {
        const html = await page.content();
        if (!hasCaptcha(html) && !url.includes("recaptcha")) {
            logger.info(`✅ [ARCA-SCRAPER] CAPTCHA resuelto: Desapareció de la página actual.`);
            return "solved_current";
        }
    } catch (e) {
        // A session-closed error must escape so the runner can rebuild.
        // Navigation-in-progress errors are safe to ignore here.
        rethrowIfSessionClosed(e, "waitForCaptchaResolution › page.content()");
        logger.info(`⏳ [ARCA-SCRAPER] Esperando a que termine la navegación...`);
    }
        
        await new Promise(r => setTimeout(r, 2000));
    }
    
    logger.warn(`⏰ [ARCA-SCRAPER] Timeout: El CAPTCHA no fue resuelto a tiempo.`);
    return "timeout";
}

async function parseResult(page, cuilClean) {
    // Try multi-employer flow first: find the first valid employer
    const multiEmployerResult = await findFirstValidEmployerContribution(page, cuilClean);

    if (multiEmployerResult.found) {
        const { selectedEmployerIndex, result, globalInicioLaboral } = multiEmployerResult;
        logger.info(`✅ [ARCA-SCRAPER] CUIL ${cuilClean} → Employer ${selectedEmployerIndex} válido | último período: ${result.lastPeriod} | Trim. pagos: ${result.last3ClosedMonthsPaidCount} | Trabaja: ${result.trabaja} | Inicio laboral: ${globalInicioLaboral ?? "ninguno"}`);
        return buildSuccess(result.lastPeriod, cuilClean, result.last3ClosedMonthsPaidCount, result.trabaja, globalInicioLaboral);
    }

    // No valid employer found for sale (trimPaidCount=0 across all employers).
    // Still preserve the most recent historical contribution found across all employers.
    const { latestHistoricalContribution, scannedEmployers } = multiEmployerResult;

    if (scannedEmployers.length > 0) {
        logger.info(
            `ℹ️ [ARCA-SCRAPER] CUIL ${cuilClean} → ningún employer válido para venta tras escanear ${scannedEmployers.length}` +
            ` | último aporte histórico: ${latestHistoricalContribution || "ninguno"}`
        );
    } else {
        logger.info(`ℹ️ [ARCA-SCRAPER] CUIL ${cuilClean} → sin datos de aportes`);
    }

    // If we found historical data but outside the trimester, return it as a success with trabaja=false
    // so the caller knows the last known period (e.g. for displaying "Último aporte").
    if (latestHistoricalContribution) {
        return buildSuccess(latestHistoricalContribution, cuilClean, 0, false, multiEmployerResult.globalInicioLaboral);
    }

    return buildNoData();
}

// ────────────────────────────────────────────────────────────
// Selectores reutilizables
// ────────────────────────────────────────────────────────────
const CUIL_SEL = [
    'input[name="ctl00$ContentPlaceHolder2$txtCuil$txtSufijo"]',
    '#ctl00_ContentPlaceHolder2_txtCuil_txtSufijo',
    'input[id*="txtCuil"]',
    'input[name*="txtCuil"]',
].join(", ");

const SUBMIT_SEL = [
    'input[name="ctl00$ContentPlaceHolder2$btnBuscar"]',
    '#ctl00_ContentPlaceHolder2_btnBuscar',
    'input[type="submit"]',
    'button[type="submit"]',
].join(", ");

// Selectores para el botón CONTINUAR — orden de prioridad: id > name > value
const CONTINUAR_SELECTORS = [
    '#ctl00_ContentPlaceHolder2_btnContinuar',
    'input[name="ctl00$ContentPlaceHolder2$btnContinuar"]',
    'input[value="CONTINUAR"]',
];

// ────────────────────────────────────────────────────────────
// clickContinuarButton — helper robusto para el botón CONTINUAR
// ────────────────────────────────────────────────────────────

/**
 * Verifica señales de éxito tras hacer clic en CONTINUAR.
 * Comprueba (en orden): botón deshabilitado, value→"Procesando...", URL cambió.
 *
 * @param {import('playwright').Page} page
 * @param {string} selector  El selector CSS que se usó para ubicar el botón.
 * @param {string} tag       Prefijo de log (ej. "[ARCA-CONTINUAR]").
 * @returns {Promise<{ success: boolean, signal: string }>}
 */
async function detectPostClickSuccess(page, selector, tag) {
    // Señal 1: botón deshabilitado (onclick: this.disabled = true)
    try {
        const btnDisabled = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? el.disabled === true : null;
        }, selector);
        if (btnDisabled === true) {
            logger.info(`🔒 ${tag} Señal detectada: botón deshabilitado`);
            return { success: true, signal: "button disabled" };
        }
    } catch (e) {
        rethrowIfSessionClosed(e, "detectPostClickSuccess › page.evaluate signal-1");
        /* Ignorar: la página puede estar navegando */
    }

    // Señal 2: value del botón cambió a "Procesando..."
    try {
        const btnValue = await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            return el ? el.value : null;
        }, selector);
        if (btnValue === "Procesando...") {
            logger.info(`⏳ ${tag} Señal detectada: botón cambiado a "Procesando..."`);
            return { success: true, signal: 'button value → "Procesando..."' };
        }
    } catch (e) {
        rethrowIfSessionClosed(e, "detectPostClickSuccess › page.evaluate signal-2");
        /* Ignorar */
    }

    // Señal 3: URL cambió (postback navegó a otra página)
    try {
        const currentUrl = page.url();
        if (!currentUrl.includes("ingresoDatos.aspx")) {
            logger.info(`🌐 ${tag} Señal detectada: URL cambió → ${currentUrl}`);
            return { success: true, signal: `url changed: ${currentUrl}` };
        }
    } catch (e) {
        rethrowIfSessionClosed(e, "detectPostClickSuccess › page.url signal-3");
        /* Ignorar */
    }

    return { success: false, signal: "no success signal detected" };
}

/**
 * Hace clic en el botón CONTINUAR del portal ARCA/AFIP de forma segura y robusta.
 *
 * Estrategia:
 *   1. Localiza el botón por selector DOM en orden de prioridad:
 *        #ctl00_ContentPlaceHolder2_btnContinuar
 *        input[name="ctl00$ContentPlaceHolder2$btnContinuar"]
 *        input[value="CONTINUAR"]
 *   2. Verifica que el elemento sea visible y esté habilitado.
 *   3. Hace clic mediante Playwright locator (DOM-first).
 *   4. Detecta éxito: botón deshabilitado, value→"Procesando...", URL cambió
 *      o DOM cargado tras postback ASP.NET.
 *   5. Si el clic de locator falla (overlay / intercepción / UI inestable),
 *      obtiene el bounding box y hace un clic real vía page.mouse como fallback.
 *
 * @param {import('playwright').Page} page  Instancia de página Playwright activa.
 * @returns {Promise<{ success: boolean, method: "locator"|"mouse"|"failed", reason: string|null }>}
 */
async function clickContinuarButton(page) {
    const TAG = "[ARCA-CONTINUAR]";
    logger.info(`🖱️ ${TAG} Buscando botón CONTINUAR en la página actual | url=${page.url()}`);

    // ── 1. Localizar el botón por selectores en orden de prioridad ───────────
    let buttonLocator = null;
    let usedSelector  = null;

    for (const sel of CONTINUAR_SELECTORS) {
        try {
            const count = await page.locator(sel).count();
            if (count > 0) {
                buttonLocator = page.locator(sel).first();
                usedSelector  = sel;
                logger.info(`✅ ${TAG} Botón encontrado | selector=${sel} | coincidencias=${count}`);
                break;
            }
            logger.info(`🔍 ${TAG} Selector no encontrado en DOM: ${sel}`);
        } catch (e) {
            rethrowIfSessionClosed(e, `clickContinuarButton › selector loop '${sel}'`);
            logger.warn(`⚠️ ${TAG} Error evaluando selector '${sel}': ${e.message}`);
        }
    }

    if (!buttonLocator) {
        logger.error(`❌ ${TAG} Botón CONTINUAR no encontrado con ningún selector`);
        return { success: false, method: "failed", reason: "Botón no encontrado en DOM" };
    }

    // ── 2. Verificar visibilidad y estado habilitado ──────────────────────────
    let isVisible = false;
    let isEnabled = false;
    try {
        isVisible = await buttonLocator.isVisible();
        isEnabled = await buttonLocator.isEnabled();
        logger.info(`🔎 ${TAG} Estado | visible=${isVisible} | enabled=${isEnabled} | selector=${usedSelector}`);
    } catch (e) {
        rethrowIfSessionClosed(e, "clickContinuarButton › isVisible/isEnabled check");
        logger.warn(`⚠️ ${TAG} No se pudo verificar estado del botón: ${e.message}`);
        return { success: false, method: "failed", reason: `Error verificando estado: ${e.message}` };
    }

    if (!isVisible) {
        logger.error(`❌ ${TAG} Botón CONTINUAR no está visible`);
        return { success: false, method: "failed", reason: "Botón no visible" };
    }
    if (!isEnabled) {
        logger.warn(`⚠️ ${TAG} Botón CONTINUAR está deshabilitado (ya fue clickeado o en proceso)`);
        return { success: false, method: "failed", reason: "Botón deshabilitado" };
    }

    // ── 3. Intento principal: clic por locator DOM ────────────────────────────
    try {
        logger.info(`🖱️ ${TAG} Haciendo clic mediante locator DOM | selector=${usedSelector}`);

        // Lanzar el clic y esperar cualquiera de las señales de éxito en paralelo.
        // El clic ASP.NET dispara __doPostBack que puede causar navegación full o partial.
        await Promise.all([
            buttonLocator.click({ timeout: ACTION_TIMEOUT_MS }),
            page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT_MS }).catch(() => {}),
        ]);

        logger.info(`⏳ ${TAG} Clic enviado, esperando estabilidad del DOM post-postback...`);
        // Dar tiempo al ASP.NET para procesar el postback
        await page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT_MS }).catch(() => {});

        // ── 4. Verificar señales de éxito post-clic ───────────────────────────
        const postState = await detectPostClickSuccess(page, usedSelector, TAG);
        logger.info(`📊 ${TAG} Estado post-clic (locator): ${JSON.stringify(postState)}`);

        if (postState.success) {
            logger.info(`✅ ${TAG} CONTINUAR exitoso | method=locator | señal=${postState.signal}`);
            return { success: true, method: "locator", reason: postState.signal };
        }

        logger.warn(`⚠️ ${TAG} No se detectó señal de éxito en el primer intento. Lanzando error para iniciar segundo click (fallback)...`);
        throw new Error("Sin señal explícita de éxito en el primer click (locator)");

    } catch (clickErr) {
        rethrowIfSessionClosed(clickErr, "clickContinuarButton › locator click");
        logger.warn(`⚠️ ${TAG} Clic locator falló o faltó señal de éxito: ${clickErr.message}`);
    }

    // ── 5. Fallback: clic real vía bounding box + page.mouse ─────────────────
    try {
        logger.info(`⏱️ ${TAG} Fallback: esperando brevemente (3s) antes del segundo intento...`);
        await new Promise(r => setTimeout(r, 3000));

        logger.info(`🖱️ ${TAG} Fallback (segundo intento): obteniendo bounding box del botón...`);

        const box = await buttonLocator.boundingBox({ timeout: ACTION_TIMEOUT_MS });
        if (!box) {
            logger.error(`❌ ${TAG} Fallback: boundingBox devolvió null — botón no renderizado`);
            return { success: false, method: "failed", reason: "boundingBox null — botón no renderizado" };
        }

        const centerX = box.x + box.width  / 2;
        const centerY = box.y + box.height / 2;
        logger.info(
            `🎯 ${TAG} Fallback bounding box | x=${box.x.toFixed(1)} y=${box.y.toFixed(1)} ` +
            `w=${box.width.toFixed(1)} h=${box.height.toFixed(1)} ` +
            `→ centro=(${centerX.toFixed(1)}, ${centerY.toFixed(1)})`
        );

        await page.mouse.move(centerX, centerY);
        await page.mouse.click(centerX, centerY);
        logger.info(`🖱️ ${TAG} Fallback: mouse click enviado a (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);

        await page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT_MS }).catch(() => {});

        const postState = await detectPostClickSuccess(page, usedSelector, TAG);
        logger.info(`📊 ${TAG} Estado post-clic (mouse): ${JSON.stringify(postState)}`);

        if (postState.success) {
            logger.info(`✅ ${TAG} CONTINUAR exitoso | method=mouse | señal=${postState.signal}`);
            return { success: true, method: "mouse", reason: postState.signal };
        }

        logger.error(`❌ ${TAG} Segundo intento (mouse) completado pero sin señal de éxito.`);
        return { success: false, method: "failed", reason: "no success signal after both attempts" };

    } catch (mouseErr) {
        rethrowIfSessionClosed(mouseErr, "clickContinuarButton › mouse fallback");
        logger.error(`❌ ${TAG} Fallback mouse también falló con error de ejecución: ${mouseErr.message}`);
        return { success: false, method: "failed", reason: `locator y mouse fallaron: ${mouseErr.message}` };
    }
}

// ────────────────────────────────────────────────────────────
// BrowserSession — sesión de browser reutilizable para batches
// ────────────────────────────────────────────────────────────

class BrowserSession {
    /**
     * @param {import('playwright').BrowserContext} context  Persistent context
     * @param {import('playwright').Page} page
     */
    constructor(context, page) {
        this.context = context;
        this.page    = page;
    }

    /**
     * Crea y bootstra una nueva sesión de browser persistente.
     * @returns {Promise<BrowserSession>}
     */
    static async create() {
        logger.info(`🚀 [ARCA-SESSION] Lanzando Chromium | headless=${HEADLESS} | userDataDir=${USER_DATA_DIR}`);

        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless : HEADLESS,
            args     : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale   : "es-AR",
            acceptDownloads: false,
        });

        // Suppress unwanted help/popup windows
        context.on('page', async (newPage) => {
            const url = newPage.url();
            if (url.includes('app/ayuda/ayuda.htm') || url.includes('/ayuda/')) {
                logger.info(`🚫 [ARCA-SESSION] Popup de ayuda detectado y bloqueado: ${url}`);
                await newPage.close().catch(() => {});
            } else {
                // Also listen for navigation on new pages in case they navigate after creation
                newPage.on('framenavigated', async (frame) => {
                    if (frame === newPage.mainFrame()) {
                        const frameUrl = frame.url();
                        if (frameUrl.includes('app/ayuda/ayuda.htm') || frameUrl.includes('/ayuda/')) {
                            logger.info(`🚫 [ARCA-SESSION] Popup navegando a ayuda detectado y bloqueado: ${frameUrl}`);
                            await newPage.close().catch(() => {});
                        }
                    }
                });
            }
        });

        const pages = context.pages();
        const page  = pages.length > 0 ? pages[0] : await context.newPage();

        const session = new BrowserSession(context, page);
        await session._bootstrap();
        return session;
    }

    /** Navega por aportesenlinea → basica.aspx → ingresoDatos.aspx */
    async _bootstrap() {
        logger.info(`🌐 [ARCA-SESSION] Navegando a ${APORTES_URL}`);
        await this.page.goto(APORTES_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        logger.info(`✅ [ARCA-SESSION] aportesenlinea cargada | url=${this.page.url()}`);

        logger.info(`🌐 [ARCA-SESSION] Navegando a basica.aspx | url=${BASICA_URL}`);
        await this.page.goto(BASICA_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        const finalUrl = this.page.url();
        logger.info(`🌐 [ARCA-SESSION] basica.aspx cargada | finalUrl=${finalUrl}`);

        if (!finalUrl.includes("ingresoDatos.aspx")) {
            await this.page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT_MS });
        }
        logger.info(`✅ [ARCA-SESSION] Session bootstrap completa | url=${this.page.url()}`);
    }

    /**
     * Navega por el flujo público real de AFIP:
     *   aportesenlinea → click "Consulta sin clave fiscal" → ingresoDatos.aspx
     *
     * HEADLESS-COMPATIBLE VERSION:
     * - Handles popup/new page that may open in headless mode
     * - Explicitly tracks which page context is active after click
     * - Strengthened waits and diagnostics
     *
     * Used only for session-expiry recovery.
     * Tries to click the public entry link first; falls back to direct navigation
     * if the link cannot be found (keeps recovery reliable across portal changes).
     */
    async _bootstrapViaPublicPortal() {
        const DIAG_TAG = "[ARCA-HEADLESS-DIAG]";
        logger.info(`🌐 [ARCA-SESSION] [PORTAL-RESTART] Navegando a ${APORTES_URL}`);
        logger.info(`${DIAG_TAG} Starting public portal bootstrap | headless=${HEADLESS}`);
        
        await this.page.goto(APORTES_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
        const initialUrl = this.page.url();
        logger.info(`✅ [ARCA-SESSION] [PORTAL-RESTART] aportesenlinea cargada | url=${initialUrl}`);
        logger.info(`${DIAG_TAG} Page loaded | url=${initialUrl}`);

        // Selectors for "Consulta sin clave fiscal" — ordered by specificity
        const SINCLV_SELECTORS = [
            'a:has-text("sin clave fiscal")',
            'a:has-text("Consultar sin")',
            'a:has-text("sin clave")',
            `a[href*="basica.aspx"]`,
            `a[href*="basica/"]`,
        ];

        let clicked = false;
        let activePage = this.page; // Track which page is being used
        
        for (const sel of SINCLV_SELECTORS) {
            try {
                const count = await this.page.locator(sel).count();
                logger.info(`${DIAG_TAG} Selector "${sel}" count: ${count}`);
                
                if (count > 0) {
                    logger.info(`🖱️ [ARCA-SESSION] [PORTAL-RESTART] Clickeando "${sel}" para entrar sin clave fiscal`);
                    logger.info(`${DIAG_TAG} A punto de clickear "${sel}" en página | url=${this.page.url()}`);
                    
                    // HEADLESS FIX: Set up popup detection BEFORE clicking
                    // In headless mode, "Consulta sin clave fiscal" may open a popup instead of navigating
                    const popupPromise = this.context.waitForEvent('page', { timeout: NAV_TIMEOUT_MS })
                        .catch(e => {
                            logger.info(`${DIAG_TAG} No se detectó popup (normal si navega en misma página)`);
                            return null;
                        });
                    
                    // Also set up navigation promise for same-page navigation case
                    const navigationPromise = this.page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT_MS })
                        .catch(e => {
                            logger.info(`${DIAG_TAG} Navegación misma-página no ocurrió: ${e.message}`);
                            return null;
                        });
                    
                    // Perform the click
                    await this.page.locator(sel).first().click({ timeout: ACTION_TIMEOUT_MS });
                    logger.info(`${DIAG_TAG} Click realizado, esperando popup o navegación...`);
                    
                    // Wait for either popup or navigation (whichever happens first)
                    const popupResult = await popupPromise;
                    const navResult = await navigationPromise;
                    
                    if (popupResult) {
                        // HEADLESS CASE: Popup opened - switch to it
                        logger.info(`🪟 ${DIAG_TAG} POPUP DETECTADO en modo headless | popup url=${popupResult.url()}`);
                        activePage = popupResult;
                        this.page = activePage; // Switch session to use the popup page
                        
                        // Wait for popup to reach ingresoDatos.aspx
                        if (!activePage.url().includes("ingresoDatos.aspx")) {
                            logger.info(`${DIAG_TAG} Esperando popup navegue a ingresoDatos.aspx...`);
                            await activePage.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT_MS });
                        }
                        logger.info(`✅ ${DIAG_TAG} Popup ahora en ingresoDatos.aspx | url=${activePage.url()}`);
                    } else if (navResult === undefined) {
                        // Same-page navigation succeeded
                        logger.info(`${DIAG_TAG} Navegación misma-página a ingresoDatos.aspx confirmada`);
                        activePage = this.page;
                    } else {
                        // Neither happened - check current state
                        logger.warn(`${DIAG_TAG} No se detectó popup ni navegación. Verificando estado de página...`);
                        await new Promise(r => setTimeout(r, 2000)); // Espera breve por navegación retardada
                    }
                    
                    clicked = true;
                    break;
                }
            } catch (e) {
                rethrowIfSessionClosed(e, `_bootstrapViaPublicPortal › selector '${sel}'`);
                logger.warn(`⚠️ [ARCA-SESSION] [PORTAL-RESTART] Selector '${sel}' falló: ${e.message}`);
                logger.warn(`${DIAG_TAG} Selector '${sel}' falló: ${e.message}`);
            }
        }

        if (!clicked) {
            logger.warn(`⚠️ [ARCA-SESSION] [PORTAL-RESTART] No se encontró link "sin clave fiscal". Fallback a navegación directa.`);
            logger.warn(`${DIAG_TAG} No se encontró link clickable, fallback a navegación directa`);
            await this.page.goto(BASICA_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
            if (!this.page.url().includes("ingresoDatos.aspx")) {
                await this.page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT_MS });
            }
        }

        // FINAL DIAGNOSTIC: Verify we're on the correct page
        const finalUrl = activePage.url();
        const isOnIngresoDatos = finalUrl.includes("ingresoDatos.aspx");
        logger.info(`✅ [ARCA-SESSION] [PORTAL-RESTART] Session restart completa | url=${finalUrl}`);
        logger.info(`${DIAG_TAG} BOOTSTRAP COMPLETADO | activePage url=${finalUrl} | isOnIngresoDatos=${isOnIngresoDatos} | headless=${HEADLESS}`);
        
        if (!isOnIngresoDatos) {
            logger.error(`${DIAG_TAG} CRÍTICO: No se llegó a ingresoDatos.aspx tras bootstrap! Actual: ${finalUrl}`);
            throw new ArcaSessionExpiredError(`No se pudo llegar a ingresoDatos.aspx tras portal bootstrap. Actual: ${finalUrl}`);
        }
    }

    /**
     * Creates a fresh BrowserSession and navigates through the real public AFIP portal flow.
     * Use this ONLY for session-expiry recovery — not for normal session creation.
     * 
     * HEADLESS-COMPATIBLE: Handles popup that may open from "Consulta sin clave fiscal" click.
     * @returns {Promise<BrowserSession>}
     */
    static async createViaPublicPortal() {
        const DIAG_TAG = "[ARCA-HEADLESS-DIAG]";
        logger.info(`🚀 [ARCA-SESSION] [PORTAL-RESTART] Lanzando nuevo Chromium para reinicio de portal`);
        logger.info(`${DIAG_TAG} createViaPublicPortal | headless=${HEADLESS}`);

        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless : HEADLESS,
            args     : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale   : "es-AR",
            acceptDownloads: false,
        });

        // Track all pages including popups for diagnostic purposes
        context.on('page', async (newPage) => {
            const url = newPage.url();
            logger.info(`${DIAG_TAG} Nueva página detectada | url=${url}`);
            
            if (url.includes('app/ayuda/ayuda.htm') || url.includes('/ayuda/')) {
                logger.info(`${DIAG_TAG} Cerrando popup de ayuda | url=${url}`);
                await newPage.close().catch(() => {});
            } else {
                // Log non-help pages for diagnostic
                logger.info(`${DIAG_TAG} Página no-ayuda abierta | url=${url}`);
                newPage.on('framenavigated', async (frame) => {
                    if (frame === newPage.mainFrame()) {
                        const frameUrl = frame.url();
                        if (frameUrl.includes('app/ayuda/ayuda.htm') || frameUrl.includes('/ayuda/')) {
                            logger.info(`${DIAG_TAG} Cerrando popup de ayuda (post-nav) | url=${frameUrl}`);
                            await newPage.close().catch(() => {});
                        }
                    }
                });
            }
        });

        const pages = context.pages();
        const page  = pages.length > 0 ? pages[0] : await context.newPage();

        const session = new BrowserSession(context, page);
        await session._bootstrapViaPublicPortal();
        
        // After bootstrap, session.page may have changed if popup was detected
        logger.info(`${DIAG_TAG} createViaPublicPortal completado | finalPage url=${session.page.url()}`);
        return session;
    }

    /** Cierra el contexto/browser */
    async close() {
        await this.context.close().catch(() => {});
        logger.info(`🔒 [ARCA-SESSION] Sesión cerrada`);
    }
}

// ────────────────────────────────────────────────────────────
// scrapeCuilWithSession — usa sesión compartida
// ────────────────────────────────────────────────────────────

/**
 * Consulta un CUIL reutilizando una BrowserSession existente.
 * Navega de vuelta a ingresoDatos.aspx si la página actual no lo es.
 *
 * @param {string} cuil
 * @param {BrowserSession} session
 * @param {{ executionId?: string, assistedMode?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, status: string, lastContributionPeriod: string|null, checkedAt: Date, errorMessage: string|null }>}
 */
async function scrapeCuilWithSession(cuil, session, { executionId = "manual", assistedMode = false } = {}) {
    const cuilClean = String(cuil).replace(/[-\s]/g, "");
    const page = session.page;
    logger.info(`🔍 [ARCA-SCRAPER] Consultando CUIL: ${cuilClean} | executionId=${executionId} | assistedMode=${assistedMode}`);

    try {
        // Asegurar que estamos en ingresoDatos.aspx
        if (!page.url().includes("ingresoDatos.aspx")) {
            logger.info(`🌐 [ARCA-SCRAPER] Navegando a ingresoDatos.aspx`);
            try {
                await page.goto(INGRESO_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
            } catch (navErr) {
                rethrowIfSessionClosed(navErr, "goto ingresoDatos.aspx");
                if (isIngresoDatosTimeout(navErr)) {
                    logger.warn(`⚠️ [ARCA-SESSION] Timeout while navigating to ingresoDatos.aspx detected`);
                    logger.warn(`⚠️ [ARCA-SESSION] Treating timeout as expired/invalid session`);
                    throw new ArcaSessionExpiredError(`Navigation timeout to ingresoDatos.aspx: ${navErr.message}`);
                }
                throw navErr;
            }
            if (!page.url().includes("ingresoDatos.aspx")) {
                // Before waiting for URL, check if ARCA web session has expired
                if (await isArcaSessionExpired(page)) {
                    throw new ArcaSessionExpiredError(`ARCA session expired: got ${page.url()} instead of ingresoDatos`);
                }
                try {
                    await page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT_MS });
                } catch (waitErr) {
                    rethrowIfSessionClosed(waitErr, "waitForURL ingresoDatos.aspx");
                    if (isIngresoDatosTimeout(waitErr)) {
                        logger.warn(`⚠️ [ARCA-SESSION] Timeout while navigating to ingresoDatos.aspx detected`);
                        logger.warn(`⚠️ [ARCA-SESSION] Treating timeout as expired/invalid session`);
                        throw new ArcaSessionExpiredError(`waitForURL timeout to ingresoDatos.aspx: ${waitErr.message}`);
                    }
                    throw waitErr;
                }
            }
        }
        logger.info(`✅ [ARCA-SCRAPER] En ingresoDatos.aspx | url=${page.url()}`);

        const DIAG_TAG = "[ARCA-HEADLESS-DIAG]";
        
        // HEADLESS DIAGNOSTIC: Verify page context before filling
        const pageBeforeFill = page.url();
        logger.info(`${DIAG_TAG} A punto de completar CUIL | pageUrl=${pageBeforeFill} | cuil=${cuilClean}`);

        const formHtml = await page.content();
        if (hasCaptcha(formHtml)) {
            logger.info(`👀 [ARCA-SCRAPER] CAPTCHA visible en la página, intentando continuar de todas formas...`);
            logger.info(`${DIAG_TAG} CAPTCHA detectado pero continuando`);
        }

        // ─── FASE DE ENTRADA CUIL REFORZADA ───────────────────────────────────
        logger.info(`📝 [ARCA-SCRAPER] Preparando para ingresar CUIL: ${cuilClean}`);
        logger.info(`${DIAG_TAG} Fase entrada CUIL iniciando | selector="${CUIL_SEL}" | timeout=${ACTION_TIMEOUT_MS}ms`);
        
        // PASO 1: Esperar que input esté presente en DOM
        logger.info(`${DIAG_TAG} Paso 1: Esperando input CUIL adjunto al DOM...`);
        try {
            await page.waitForSelector(CUIL_SEL, { state: 'attached', timeout: ACTION_TIMEOUT_MS });
            logger.info(`${DIAG_TAG} Paso 1 OK: Input CUIL adjunto al DOM`);
        } catch (attachErr) {
            logger.error(`${DIAG_TAG} Paso 1 FALLÓ: Input CUIL no adjunto | error=${attachErr.message}`);
            logger.error(`${DIAG_TAG} URL página actual: ${page.url()}`);
            throw attachErr;
        }
        
        // PASO 2: Esperar que input sea visible
        logger.info(`${DIAG_TAG} Paso 2: Esperando input CUIL visible...`);
        try {
            await page.waitForSelector(CUIL_SEL, { state: 'visible', timeout: ACTION_TIMEOUT_MS });
            logger.info(`${DIAG_TAG} Paso 2 OK: Input CUIL es visible`);
        } catch (visibleErr) {
            logger.error(`${DIAG_TAG} Paso 2 FALLÓ: Input CUIL no visible | error=${visibleErr.message}`);
            // Intentar diagnosticar por qué no es visible
            const inputCount = await page.locator(CUIL_SEL).count();
            const htmlSnippet = await page.evaluate(() => {
                const el = document.querySelector('input[name*="txtCuil"]') || document.querySelector('input[id*="txtCuil"]');
                return el ? `Encontrado: <input type="${el.type}" style="${el.style.cssText}" hidden=${el.hidden} display=${window.getComputedStyle(el).display}>` : 'No encontrado en DOM';
            }).catch(e => `Error verificando: ${e.message}`);
            logger.error(`${DIAG_TAG} Diagnóstico: inputCount=${inputCount}, elementState=${htmlSnippet}`);
            throw visibleErr;
        }
        
        const inputLocator = page.locator(CUIL_SEL).first();
        
        // PASO 3: Verificar que input está habilitado
        logger.info(`${DIAG_TAG} Paso 3: Verificando si input CUIL está habilitado...`);
        const isEnabled = await inputLocator.isEnabled().catch(() => false);
        if (!isEnabled) {
            logger.error(`${DIAG_TAG} Paso 3 FALLÓ: Input CUIL está deshabilitado!`);
            throw new Error(`Input CUIL deshabilitado - no se puede completar`);
        }
        logger.info(`${DIAG_TAG} Paso 3 OK: Input CUIL habilitado`);
        
        // PASO 4: Completar el input con lógica de reintento
        logger.info(`${DIAG_TAG} Paso 4: Completando input CUIL...`);
        try {
            // Click para foco, limpiar, y tipear secuencialmente
            await inputLocator.click({ timeout: 5000 });
            await inputLocator.fill(""); // Limpiar existente
            await inputLocator.pressSequentially(cuilClean, { delay: 100 });
            
            // Disparar eventos blur/change por si acaso
            await inputLocator.evaluate(el => el.blur());
            logger.info(`${DIAG_TAG} Paso 4 OK: CUIL completado exitosamente`);
        } catch (fillErr) {
            logger.error(`${DIAG_TAG} Paso 4 FALLÓ: No se pudo completar CUIL | error=${fillErr.message}`);
            throw fillErr;
        }
        
        // PASO 5: Verificar que el valor fue realmente ingresado
        logger.info(`${DIAG_TAG} Paso 5: Verificando que valor CUIL fue ingresado...`);
        const typedValue = await inputLocator.inputValue();
        const normalizedTyped = (typedValue || "").replace(/\D/g, "");
        if (normalizedTyped !== cuilClean) {
            logger.error(`${DIAG_TAG} Paso 5 FALLÓ: Valor no coincide | esperado=${cuilClean} | actual=${normalizedTyped} | raw='${typedValue}'`);
            throw new Error(`Verificación de valor CUIL falló tras completar`);
        }
        logger.info(`${DIAG_TAG} Paso 5 OK: Valor CUIL verificado | value='${typedValue}'`);
        logger.info(`${DIAG_TAG} FASE ENTRADA CUIL COMPLETADA | cuil=${cuilClean}`);

        // ── PASO CONTINUAR (condicional) ──────────────────────────────────────
        // Algunas páginas del portal presentan un botón CONTINUAR intermedio
        // antes del botón de búsqueda (btnBuscar). Si está presente y habilitado,
        // se hace clic sobre él y se comprueba si la navegación ya alcanzó
        // MuestraBasica.aspx. En caso contrario se continúa con el flujo normal.
        const continuarPresent = await page.locator(CONTINUAR_SELECTORS[0]).count()
            .then(n => n > 0).catch(() => false);
        if (continuarPresent) {
            logger.info(`🔵 [ARCA-SCRAPER] Botón CONTINUAR detectado en la página — ejecutando paso intermedio...`);
            const continuarResult = await clickContinuarButton(page);
            logger.info(`🔵 [ARCA-SCRAPER] Resultado CONTINUAR: ${JSON.stringify(continuarResult)}`);
            if (!continuarResult.success) {
                logger.warn(`⚠️ [ARCA-SCRAPER] El paso CONTINUAR falló tras 2 intentos (${continuarResult.reason}). Marcando como CAPTCHA y abortando este CUIL.`);
                return buildCaptcha();
            } else if (page.url().includes("MuestraBasica.aspx")) {
                // El postback ya navegó a resultados — parsear directamente
                logger.info(`✅ [ARCA-SCRAPER] CONTINUAR navegó directo a MuestraBasica.aspx | url=${page.url()}`);
                await page.waitForLoadState("domcontentloaded").catch(() => {});
                return await parseResult(page, cuilClean);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Enviar formulario
        try {
            logger.info(`🖱️ [ARCA-SCRAPER] Intentando enviar formulario (clic en Continuar)...`);
            await Promise.all([
                page.waitForURL(/MuestraBasica\.aspx/i, { timeout: NAV_TIMEOUT_MS }),
                page.click(SUBMIT_SEL, { timeout: ACTION_TIMEOUT_MS }),
            ]);
            logger.info(`✅ [ARCA-SCRAPER] Formulario enviado exitosamente, URL actual: ${page.url()}`);
        } catch (err) {
            logger.info(`⚠️ [ARCA-SCRAPER] El envío no avanzó a MuestraBasica.aspx en el tiempo esperado. Revisando estado...`);
            
            // Wait for page to be stable before reading content to avoid navigation race
            try {
                await page.waitForLoadState("domcontentloaded", { timeout: 5000 });
            } catch (e) {
                // Ignore timeout
            }

            // TASK 3 — Session expiry check must precede all content-based logic
            if (await isArcaSessionExpired(page)) {
                throw new ArcaSessionExpiredError(`ARCA session expired after form submission for ${cuilClean}`);
            }

            const currentHtml = await page.content();

            // TASK 2 — Detect "CUIL no activo en ARCA" via specific validator element.
            // Must happen before the CAPTCHA branch to avoid a wasteful 120s wait.
            if (page.url().includes("ingresoDatos.aspx")) {
                const notFoundMsg = await page
                    .locator("#ctl00_ContentPlaceHolder2_vldSumaryCuil")
                    .textContent()
                    .catch(() => null);
                if (notFoundMsg && notFoundMsg.toLowerCase().includes("no se encuentra activo")) {
                    logger.info(`ℹ️ [ARCA-SCRAPER] CUIL ${cuilClean} no activo en ARCA (vldSumaryCuil). Clasificando como not_found.`);
                    return buildNotFound();
                }
            }

            // Diagnóstico secundario: loggear si hay strings de captcha en HTML (no decisivo)
            if (hasCaptcha(currentHtml)) {
                logger.info(`🔍 [ARCA-SCRAPER] HTML contiene strings de captcha (diagnóstico débil, no decisivo) | url=${page.url()}`);
            }

            // Verificar CAPTCHA activo y bloqueante con detector fuerte (DOM visible)
            const activeCaptcha = page.url().includes("ingresoDatos.aspx")
                && await hasActiveCaptchaChallenge(page);

            if (activeCaptcha) {
                // Reintento: esperar y hacer un segundo clic antes de clasificar como CAPTCHA
                logger.info(`🔁 [ARCA-SCRAPER] CAPTCHA activo confirmado. Segundo intento de clic en ${SUBMIT_SEL}...`);
                try {
                    await new Promise(r => setTimeout(r, 3000));
                    await page.click(SUBMIT_SEL, { timeout: ACTION_TIMEOUT_MS });
                    try {
                        await page.waitForURL(/MuestraBasica\.aspx/i, { timeout: 5000 });
                        logger.info(`✅ [ARCA-SCRAPER] Segundo intento exitoso — avanzó a resultados.`);
                        return await parseResult(page, cuilClean);
                    } catch (_) {
                        logger.warn(`⚠️ [ARCA-SCRAPER] Segundo intento tampoco avanzó — clasificando como CAPTCHA y continuando.`);
                    }
                } catch (_) {
                    logger.warn(`⚠️ [ARCA-SCRAPER] Segundo clic falló — clasificando como CAPTCHA y continuando.`);
                }
                logger.warn(`⚠️ [ARCA-SCRAPER] CAPTCHA bloqueante confirmado tras 2 intentos | cuil=${cuilClean}`);
                return buildCaptcha();
            } else {
                // Check for inline ARCA validation message (CUIL no registrado / no activo).
                // These messages keep the page on ingresoDatos.aspx without CAPTCHA.
                // Classify as no_data so the batch can continue cleanly.
                if (page.url().includes("ingresoDatos.aspx")) {
                    const lowerHtml = currentHtml.toLowerCase();
                    const noDataPatterns = [
                        "no se encuentra",
                        "no esta activo",
                        "no está activo",
                        "cuil incorrecto",
                        "cuil no registrado",
                        "no registrado",
                        "no existe",
                        "no se encuentra registrado",
                        "no encontrado",
                        "cuil inv",
                    ];
                    const matched = noDataPatterns.find(p => lowerHtml.includes(p));
                    if (matched) {
                        logger.info(`ℹ️ [ARCA-SCRAPER] CUIL ${cuilClean} — mensaje de validación ARCA detectado ("${matched}"). Clasificando como no_data.`);
                        return buildNoData(`CUIL no registrado en ARCA: ${matched}`);
                    }
                }
                throw err;
            }
        }
        
        logger.info(`✅ [ARCA-SCRAPER] Página de resultados | url=${page.url()}`);
        
        // Wait for page to be stable before reading content to avoid navigation race
        await page.waitForLoadState("domcontentloaded");

        const resultHtml = await page.content();
        // Diagnóstico secundario: loggear strings de captcha en la página de resultado (no decisivo)
        if (hasCaptcha(resultHtml)) {
            logger.info(`🔍 [ARCA-SCRAPER] HTML resultado contiene strings de captcha (diagnóstico débil). Verificando con detector fuerte...`);
        }
        // Detector fuerte: solo actuar si hay un desafío visible y renderizado
        if (await hasActiveCaptchaChallenge(page)) {
            if (assistedMode) {
                const res = await waitForCaptchaResolution(page, 120000);
                if (res === "timeout") return buildCaptcha();
                if (res === "solved_advanced") return await parseResult(page, cuilClean);
            } else {
                logger.warn(`⚠️ [ARCA-SCRAPER] CAPTCHA activo confirmado en página de resultado | cuil=${cuilClean}`);
                return buildCaptcha();
            }
        }

        return await parseResult(page, cuilClean);

    } catch (err) {
        // Session-closed errors must escape to the runner for session rebuild + retry.
        // ArcaSessionExpiredError must also escape so the runner can restart via public portal.
        // Everything else stays as a normal per-record error result.
        if (isSessionClosedError(err)) {
            logger.warn(
                `⚠️ [ARCA-SCRAPER] Session-level Playwright failure detected, bubbling to runner for rebuild` +
                ` | cuil=${cuilClean} | error=${err.message}`
            );
            throw err;
        }
        if (err instanceof ArcaSessionExpiredError) {
            logger.warn(
                `⚠️ [ARCA-SCRAPER] ArcaSessionExpiredError bubbling to runner for portal restart` +
                ` | cuil=${cuilClean} | error=${err.message}`
            );
            throw err;
        }
        const message = err.message || "Error desconocido";
        logger.error(`❌ [ARCA-SCRAPER] Error | cuil=${cuilClean} | error=${message}`);
        return buildError(message);
    }
}

// ────────────────────────────────────────────────────────────
// scrapeCuil — compatibilidad con llamadas individuales (cron,
// verifyAffiliate, tests). Crea su propia sesión temporal.
// ────────────────────────────────────────────────────────────

/**
 * Consulta el portal ARCA para un CUIL dado (sesión propia).
 * Para batches usar BrowserSession + scrapeCuilWithSession.
 *
 * @param {string} cuil
 * @param {{ executionId?: string }} [opts]
 * @returns {Promise<{ ok: boolean, status: string, lastContributionPeriod: string|null, checkedAt: Date, errorMessage: string|null }>}
 */
async function scrapeCuil(cuil, { executionId = "manual" } = {}) {
    let session = null;
    try {
        session = await BrowserSession.create();
        return await scrapeCuilWithSession(cuil, session, { executionId });
    } finally {
        if (session) await session.close();
    }
}

module.exports = {
    scrapeCuil,
    scrapeCuilWithSession,
    BrowserSession,
    randomDelay,
    clickContinuarButton,
    ArcaSessionExpiredError,
    __testables: {
        buildContributionSummaryFromRows,
        shouldReplaceSelectedEmployer,
        periodToInt
    }
};
