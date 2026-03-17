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

const logger        = require("../utils/logger");
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
const HEADLESS       = process.env.PLAYWRIGHT_HEADLESS === "true";

const NAV_TIMEOUT_MS    = 30000;
const ACTION_TIMEOUT_MS = 15000;

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
 * Detecta si el HTML contiene un desafío de reCAPTCHA.
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
async function parseLastContributionPeriod(page) {
    const TABLE_SEL = "#ctl00_ContentPlaceHolder2_tbInfoBasica";

    const tableExists = await page.locator(TABLE_SEL).count();
    if (!tableExists) {
        logger.warn("⚠️ [ARCA-PARSER] Tabla #ctl00_ContentPlaceHolder2_tbInfoBasica no encontrada");
        return null;
    }

    const rows = page.locator(`${TABLE_SEL} tr`);
    const rowCount = await rows.count();
    logger.info(`🔎 [ARCA-PARSER] Filas encontradas en la tabla: ${rowCount}`);

    let lastPeriod = null;

    for (let i = 0; i < rowCount; i++) {
        const cells = rows.nth(i).locator("td");
        const cellCount = await cells.count();
        if (cellCount < 5) continue;

        const norm = async (idx) =>
            ((await cells.nth(idx).textContent()) || "").replace(/\s+/g, " ").trim().toUpperCase();

        const periodo  = ((await cells.nth(0).textContent()) || "").replace(/\s+/g, " ").trim();
        const aporteOS = await norm(3);
        const patronal = await norm(4);

        if (aporteOS === "PAGO" && patronal === "PAGO" && periodo) {
            logger.info(`✅ [ARCA-PARSER] Fila ${i} válida | periodo=${periodo} | aporteOS=${aporteOS} | patronal=${patronal}`);
            lastPeriod = periodo;
        }
    }

    logger.info(`🏁 [ARCA-PARSER] Último período extraído: ${lastPeriod ?? "ninguno"}`);
    return lastPeriod;
}

/**
 * Construye el resultado estructurado de un scrape exitoso.
 */
function buildSuccess(lastContributionPeriod, cuil) {
    return {
        ok: true,
        status: "success",
        lastContributionPeriod,
        checkedAt: new Date(),
        errorMessage: null,
    };
}

function buildNoData() {
    return {
        ok: true,
        status: "no_data",
        lastContributionPeriod: null,
        checkedAt: new Date(),
        errorMessage: null,
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
        
        const html = await page.content();
        if (!hasCaptcha(html) && !url.includes("recaptcha")) {
            logger.info(`✅ [ARCA-SCRAPER] CAPTCHA resuelto: Desapareció de la página actual.`);
            return "solved_current";
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }
    
    logger.warn(`⏰ [ARCA-SCRAPER] Timeout: El CAPTCHA no fue resuelto a tiempo.`);
    return "timeout";
}

async function parseResult(page, cuilClean) {
    const lastPeriod = await parseLastContributionPeriod(page);
    if (lastPeriod) {
        logger.info(`✅ [ARCA-SCRAPER] CUIL ${cuilClean} → último período: ${lastPeriod}`);
        return buildSuccess(lastPeriod, cuilClean);
    }
    logger.info(`ℹ️ [ARCA-SCRAPER] CUIL ${cuilClean} → sin datos válidos`);
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
            await page.goto(INGRESO_URL, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
            if (!page.url().includes("ingresoDatos.aspx")) {
                await page.waitForURL(/ingresoDatos\.aspx/i, { timeout: NAV_TIMEOUT_MS });
            }
        }
        logger.info(`✅ [ARCA-SCRAPER] En ingresoDatos.aspx | url=${page.url()}`);

        const formHtml = await page.content();
        if (hasCaptcha(formHtml)) {
            if (assistedMode) {
                const res = await waitForCaptchaResolution(page, 120000);
                if (res === "timeout") return buildCaptcha();
                if (res === "solved_advanced") return await parseResult(page, cuilClean);
            } else {
                logger.warn(`⚠️ [ARCA-SCRAPER] CAPTCHA detectado en ingresoDatos.aspx | cuil=${cuilClean}`);
                return buildCaptcha();
            }
        }

        // Limpiar campo y rellenar CUIL
        await page.fill(CUIL_SEL, "", { timeout: ACTION_TIMEOUT_MS });
        await page.fill(CUIL_SEL, cuilClean, { timeout: ACTION_TIMEOUT_MS });
        logger.info(`📝 [ARCA-SCRAPER] CUIL ingresado: ${cuilClean}`);

        // Enviar formulario
        try {
            await Promise.all([
                page.waitForURL(/MuestraBasica\.aspx/i, { timeout: NAV_TIMEOUT_MS }),
                page.click(SUBMIT_SEL, { timeout: ACTION_TIMEOUT_MS }),
            ]);
        } catch (err) {
            const currentHtml = await page.content();
            if (hasCaptcha(currentHtml)) {
                if (assistedMode) {
                    const res = await waitForCaptchaResolution(page, 120000);
                    if (res === "timeout") return buildCaptcha();
                    if (res === "solved_advanced") return await parseResult(page, cuilClean);
                    
                    if (!page.url().includes("MuestraBasica.aspx")) {
                        await Promise.all([
                            page.waitForURL(/MuestraBasica\.aspx/i, { timeout: NAV_TIMEOUT_MS }),
                            page.click(SUBMIT_SEL, { timeout: ACTION_TIMEOUT_MS }),
                        ]);
                    }
                } else {
                    logger.warn(`⚠️ [ARCA-SCRAPER] CAPTCHA detectado al enviar | cuil=${cuilClean}`);
                    return buildCaptcha();
                }
            } else {
                throw err;
            }
        }
        
        logger.info(`✅ [ARCA-SCRAPER] Página de resultados | url=${page.url()}`);

        const resultHtml = await page.content();
        if (hasCaptcha(resultHtml)) {
            if (assistedMode) {
                const res = await waitForCaptchaResolution(page, 120000);
                if (res === "timeout") return buildCaptcha();
                if (res === "solved_advanced") return await parseResult(page, cuilClean);
            } else {
                logger.warn(`⚠️ [ARCA-SCRAPER] CAPTCHA detectado en resultado | cuil=${cuilClean}`);
                return buildCaptcha();
            }
        }

        return await parseResult(page, cuilClean);

    } catch (err) {
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

module.exports = { scrapeCuil, scrapeCuilWithSession, BrowserSession, randomDelay };
