/**
 * ============================================================
 * SSSALUD PADRÓN DE OPCIONES SCRAPER SERVICE — Playwright edition
 * ============================================================
 * Consulta el portal SSSalud "Padrón de Opciones de Beneficiarios
 * en Relación de Dependencia" para verificar si un CUIL está registrado
 * y obtener su obra social.
 *
 * Estrategia CAPTCHA:
 *   - El input NO es case-sensitive → siempre se envía en MAYÚSCULAS.
 *   - ddddocr (Python) resuelve la imagen via microservicio en localhost:5001.
 *   - Hasta MAX_CAPTCHA_RETRIES intentos por CUIL antes de marcar como error.
 *
 * Env vars:
 *   CAPTCHA_SOLVER_URL     → URL del microservicio Python (default: http://localhost:5001)
 *   PLAYWRIGHT_HEADLESS    → "true" para headless (default: false)
 *   SSSALUD_USER_DATA_DIR  → directorio de perfil Playwright persistente
 *
 * Requiere:
 *   - playwright (npm install playwright && npx playwright install chromium)
 *   - Microservicio Python corriendo: cd backend/captcha_solver && python server.py
 */

const path          = require("path");
const os            = require("os");
const { chromium }  = require("playwright");
const logger        = require("../utils/logger").getLogger("padron");

const SSSALUD_URL       = "https://www.sssalud.gob.ar/index.php?cat=consultas&page=busopc";
const CAPTCHA_SOLVER_URL = process.env.CAPTCHA_SOLVER_URL || "http://localhost:5050";
const USER_DATA_DIR     = process.env.SSSALUD_USER_DATA_DIR || path.join(os.homedir(), ".sssalud-browser-profile");
const HEADLESS          = process.env.PLAYWRIGHT_HEADLESS !== "false";

const NAV_TIMEOUT_MS    = 30000;
const ACTION_TIMEOUT_MS = 10000;
const MAX_CAPTCHA_RETRIES = 10;

// ─────────────────────────────────────────────────────────────
// Selectores (múltiples fallbacks por robustez)
// ─────────────────────────────────────────────────────────────
const CUIL_SELECTORS = [
    'input[name="nro_cuil"]',
    'input[id*="cuil" i]',
    'input[name*="cuil" i]',
    'input[placeholder*="CUIL" i]',
];

const CAPTCHA_IMG_SELECTORS = [
    'img[src*="captcha" i]',
    'img[src*="image.php" i]',
    'img[src*="gerar" i]',
    'img[src*="cod" i]',
    "form img",
];

const CAPTCHA_INPUT_SELECTORS = [
    'input[name="codigo"]',
    'input[name="captcha"]',
    'input[name="cod_captcha"]',
    'input[name*="cod" i]',
    'input[id*="codigo" i]',
    'input[id*="captcha" i]',
];

const SUBMIT_SELECTORS = [
    'input[value="Buscar"]',
    'input[name="buscar"]',
    'input[type="submit"]',
    'button[type="submit"]',
    "button:has-text('Buscar')",
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Formatea un CUIL crudo (solo dígitos o con guiones) al formato XX-XXXXXXXXX-X
 * que espera el formulario de SSSalud.
 */
function formatCuil(cuil) {
    const digits = String(cuil).replace(/\D/g, "");
    if (digits.length !== 11) return cuil;
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/**
 * Localiza el primer selector que tenga coincidencia en la página.
 */
async function findFirstLocator(page, selectors) {
    for (const sel of selectors) {
        try {
            const count = await page.locator(sel).count();
            if (count > 0) return { locator: page.locator(sel).first(), selector: sel };
        } catch (_) { /* ignorar */ }
    }
    return null;
}

/**
 * Llama al microservicio Python y devuelve el texto del CAPTCHA en mayúsculas.
 * @param {Buffer} imageBuffer
 * @returns {Promise<string|null>}
 */
async function solveCaptchaImage(imageBuffer) {
    const base64Image = imageBuffer.toString("base64");
    try {
        const response = await fetch(`${CAPTCHA_SOLVER_URL}/solve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64Image }),
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            logger.warn(`⚠️ [SSSALUD-CAPTCHA] Microservicio respondió HTTP ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (data.ok && data.text) {
            logger.info(`🔡 [SSSALUD-CAPTCHA] Resuelto: "${data.text}"`);
            return data.text; // siempre viene en MAYÚSCULAS del servidor
        }

        logger.warn(`⚠️ [SSSALUD-CAPTCHA] Respuesta inesperada: ${JSON.stringify(data)}`);
        return null;
    } catch (err) {
        logger.error(`❌ [SSSALUD-CAPTCHA] Error llamando al solver: ${err.message}`);
        return null;
    }
}

/**
 * Verifica que el microservicio Python esté disponible.
 * @returns {Promise<boolean>}
 */
async function isSolverAvailable() {
    try {
        const res = await fetch(`${CAPTCHA_SOLVER_URL}/health`, {
            signal: AbortSignal.timeout(3000),
        });
        return res.ok;
    } catch (_) {
        return false;
    }
}

// ─────────────────────────────────────────────────────────────
// Date helpers — regla de 12 meses
// ─────────────────────────────────────────────────────────────

/**
 * Parsea una cadena "MM/YYYY" a un objeto Date (día 1 del mes).
 * @param {string} str
 * @returns {Date|null}
 */
function parsePeriodoDate(str) {
    if (!str || /^-+$/.test(str.trim())) return null;
    const match = str.trim().match(/^(\d{2})\/(\d{4})$/);
    if (!match) return null;
    return new Date(parseInt(match[2]), parseInt(match[1]) - 1, 1);
}

/**
 * Dado el "Período desde" del padrón, determina si el afiliado ya cumplió
 * los 12 meses de vigencia necesarios para poder hacer un cambio.
 *
 * @param {Date} periodoDate
 * @returns {{ canSell: boolean, nextChangeDate: string, monthsElapsed: number }}
 */
function calcSellability(periodoDate) {
    const now = new Date();
    const twelveMonthsLater = new Date(
        periodoDate.getFullYear(),
        periodoDate.getMonth() + 12,
        1
    );
    const monthsElapsed =
        (now.getFullYear() - periodoDate.getFullYear()) * 12 +
        (now.getMonth() - periodoDate.getMonth());
    const mm = String(twelveMonthsLater.getMonth() + 1).padStart(2, "0");
    const yyyy = twelveMonthsLater.getFullYear();
    return {
        canSell: now >= twelveMonthsLater,
        nextChangeDate: `${mm}/${yyyy}`,
        monthsElapsed,
    };
}

// ─────────────────────────────────────────────────────────────
// Resultado builders
// ─────────────────────────────────────────────────────────────

function buildFound(data) {
    const status = data.canSell === false ? "found_active" : "found_expired";
    return {
        ok: true,
        status,
        found: true,
        canSell: data.canSell ?? null,
        data,
        checkedAt: new Date(),
        errorMessage: null,
    };
}

function buildNotFound() {
    return {
        ok: true,
        status: "not_found",
        found: false,
        data: null,
        checkedAt: new Date(),
        errorMessage: null,
    };
}

function buildCaptchaFailed() {
    return {
        ok: false,
        status: "captcha_failed",
        found: false,
        data: null,
        checkedAt: new Date(),
        errorMessage: `CAPTCHA no resuelto tras ${MAX_CAPTCHA_RETRIES} intentos`,
    };
}

function buildError(message) {
    return {
        ok: false,
        status: "error",
        found: false,
        data: null,
        checkedAt: new Date(),
        errorMessage: message,
    };
}

function buildSolverUnavailable() {
    return {
        ok: false,
        status: "solver_unavailable",
        found: false,
        data: null,
        checkedAt: new Date(),
        errorMessage: `Microservicio CAPTCHA no disponible en ${CAPTCHA_SOLVER_URL}. Inicialo con: cd backend/captcha_solver && python server.py`,
    };
}

// ─────────────────────────────────────────────────────────────
// Parser de resultado
// ─────────────────────────────────────────────────────────────

/**
 * Parsea el HTML de la página tras la búsqueda.
 * Distingue tres casos:
 *   1. "No existen datos" → not_found
 *   2. Tabla con cabecera "Período desde" + "Obra Social" → found (extrae filas)
 *   3. Sin resultado claro → retry (CAPTCHA incorrecto)
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<{ type: 'not_found'|'found'|'retry', tableData?: object }>}
 */
async function parseResult(page) {
    const html = await page.content();
    const lower = html.toLowerCase();

    // ── Caso 1: CUIL no encontrado ──────────────────────────
    if (lower.includes("no existen datos para el cuil")) {
        return { type: "not_found" };
    }

    // ── Caso 2: Tabla con cabecera dinámica ─────────────────
    // La página muestra: Código registro | Obra Social elegida | Período desde
    //                    | Período hasta | Código movimiento | Estado
    try {
        const tableData = await page.evaluate(() => {
            // Normaliza texto: minúsculas + quita tildes
            const norm = (s) =>
                s.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();

            const tables = document.querySelectorAll("table");
            for (const table of tables) {
                const rows = table.querySelectorAll("tr");
                if (rows.length < 2) continue;

                // Encabezados (primera fila — puede ser th o td)
                const headerCells = rows[0].querySelectorAll("th, td");
                const headers = Array.from(headerCells).map((c) => norm(c.textContent));

                // Verificar que sea la tabla de resultados del padrón
                const hasPeriodo   = headers.some((h) => h.includes("periodo desde"));
                const hasObraSocial = headers.some((h) => h.includes("obra social"));
                if (!hasPeriodo || !hasObraSocial) continue;

                // Parsear filas de datos
                const dataRows = [];
                for (let i = 1; i < rows.length; i++) {
                    const cells = rows[i].querySelectorAll("td");
                    if (cells.length === 0) continue;
                    const rowObj = {};
                    headers.forEach((h, idx) => {
                        if (idx < cells.length) rowObj[h] = cells[idx].textContent.trim();
                    });
                    // Incluir sólo filas con al menos un valor real
                    if (Object.values(rowObj).some((v) => v && !/^-+$/.test(v))) {
                        dataRows.push(rowObj);
                    }
                }

                if (dataRows.length > 0) return { headers, rows: dataRows };
            }
            return null;
        });

        if (tableData && tableData.rows.length > 0) {
            return { type: "found", tableData };
        }
    } catch (err) {
        logger.warn(`⚠️ [SSSALUD-PARSER] Error parseando resultado: ${err.message}`);
    }

    // ── Caso 3: Sin resultado claro → probablemente CAPTCHA incorrecto ──
    return { type: "retry" };
}

// ─────────────────────────────────────────────────────────────
// BrowserSession
// ─────────────────────────────────────────────────────────────

class SSSaludSession {
    constructor(context, page) {
        this.context = context;
        this.page    = page;
    }

    static async create() {
        logger.info(`🚀 [SSSALUD-SESSION] Lanzando Chromium | headless=${HEADLESS}`);
        const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
            headless : HEADLESS,
            args     : ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale   : "es-AR",
        });

        const pages = context.pages();
        const page  = pages.length > 0 ? pages[0] : await context.newPage();

        return new SSSaludSession(context, page);
    }

    async close() {
        await this.context.close().catch(() => {});
        logger.info("🔒 [SSSALUD-SESSION] Sesión cerrada");
    }
}

// ─────────────────────────────────────────────────────────────
// scrapeCuilWithSession — función principal
// ─────────────────────────────────────────────────────────────

/**
 * Consulta un CUIL en el Padrón de Opciones de SSSalud.
 *
 * @param {string} cuil  CUIL con o sin guiones (ej: "20123456789" o "20-12345678-9")
 * @param {SSSaludSession} session
 * @returns {Promise<{ok, status, found, data, checkedAt, errorMessage}>}
 */
async function scrapeCuilWithSession(cuil, session) {
    // DEFENSIVE: Validar CUIL antes de procesar
    if (!cuil || typeof cuil !== 'string') {
        logger.error(`❌ [SSSALUD] CUIL inválido recibido: ${cuil} (tipo: ${typeof cuil})`);
        return buildError(`CUIL inválido o faltante: ${cuil}`);
    }
    
    const cuilFormatted = formatCuil(cuil);
    const TAG = `[SSSALUD] CUIL ${cuilFormatted}`;
    logger.info(`🔍 ${TAG} Iniciando consulta`);

    for (let attempt = 1; attempt <= MAX_CAPTCHA_RETRIES; attempt++) {
        logger.info(`🔄 ${TAG} Intento ${attempt}/${MAX_CAPTCHA_RETRIES}`);

        try {
            // ── 1. Navegar a la página (obtiene nuevo CAPTCHA) ────────────
            // Forzar recarga limpiando la URL (evita el bug donde Playwright no recarga si es la misma URL)
            if (session.page.url() !== "about:blank") {
                await session.page.goto("about:blank");
            }
            await session.page.goto(SSSALUD_URL, {
                waitUntil: "domcontentloaded",
                timeout: NAV_TIMEOUT_MS,
            });

            await session.page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

            // ── 2. Llenar el CUIL ─────────────────────────────────────────
            const cuilField = await findFirstLocator(session.page, CUIL_SELECTORS);
            if (!cuilField) {
                logger.error(`❌ ${TAG} Campo CUIL no encontrado en la página`);
                return buildError("Campo CUIL no encontrado en la página");
            }

            await cuilField.locator.fill(cuilFormatted, { timeout: ACTION_TIMEOUT_MS });
            logger.info(`✏️ ${TAG} CUIL ingresado: ${cuilFormatted}`);

            // ── 3. Capturar imagen del CAPTCHA ────────────────────────────
            const captchaImg = await findFirstLocator(session.page, CAPTCHA_IMG_SELECTORS);
            if (!captchaImg) {
                logger.warn(`⚠️ ${TAG} Imagen del CAPTCHA no encontrada — selector fallido`);
                return buildError("Imagen CAPTCHA no encontrada en la página");
            }

            await captchaImg.locator.waitFor({ state: "visible", timeout: ACTION_TIMEOUT_MS });
            const imgBuffer = await captchaImg.locator.screenshot();
            logger.info(`📸 ${TAG} CAPTCHA capturado (${imgBuffer.length} bytes)`);

            // ── 4. Resolver CAPTCHA ───────────────────────────────────────
            const captchaText = await solveCaptchaImage(imgBuffer);
            if (!captchaText) {
                logger.warn(`⚠️ ${TAG} Solver no devolvió texto — reintentando`);
                continue;
            }

            // ── 5. Llenar código del CAPTCHA (siempre mayúsculas) ─────────
            const captchaInput = await findFirstLocator(session.page, CAPTCHA_INPUT_SELECTORS);
            if (!captchaInput) {
                logger.error(`❌ ${TAG} Campo de código CAPTCHA no encontrado`);
                return buildError("Campo de código CAPTCHA no encontrado");
            }

            await captchaInput.locator.fill(captchaText, { timeout: ACTION_TIMEOUT_MS });
            logger.info(`🔑 ${TAG} Código ingresado: "${captchaText}"`);

            // ── 6. Click en Buscar ────────────────────────────────────────
            const submitBtn = await findFirstLocator(session.page, SUBMIT_SELECTORS);
            if (!submitBtn) {
                logger.error(`❌ ${TAG} Botón Buscar no encontrado`);
                return buildError("Botón Buscar no encontrado");
            }

            await Promise.all([
                session.page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT_MS }),
                submitBtn.locator.click({ timeout: ACTION_TIMEOUT_MS }),
            ]);

            await session.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
            logger.info(`📄 ${TAG} Formulario enviado, parseando resultado...`);

            // ── 7. Parsear resultado ──────────────────────────────────────
            const result = await parseResult(session.page);

            if (result.type === "not_found") {
                logger.info(`📭 ${TAG} No encontrado en padrón`);
                return buildNotFound();
            }

            if (result.type === "found") {
                const { tableData } = result;

                // Identificar claves normalizadas en los headers parseados
                const periodoKey    = tableData.headers.find((h) => h.includes("periodo desde"));
                const obraSocialKey = tableData.headers.find((h) => h.includes("obra social"));
                const estadoKey     = tableData.headers.find((h) => h.includes("estado"));
                const codMovKey     = tableData.headers.find((h) => h.includes("codigo movimiento"));
                const codRegKey     = tableData.headers.find((h) => h.includes("codigo registro"));

                // Seleccionar la fila con el "Período desde" más reciente
                let bestRow = tableData.rows[0];
                let mostRecentDate = null;
                for (const row of tableData.rows) {
                    const raw  = periodoKey ? row[periodoKey] : null;
                    const date = parsePeriodoDate(raw);
                    if (date && (!mostRecentDate || date > mostRecentDate)) {
                        mostRecentDate = date;
                        bestRow = row;
                    }
                }

                const periodoDesde      = periodoKey    ? bestRow[periodoKey]    : null;
                const obraSocial        = obraSocialKey ? bestRow[obraSocialKey] : null;
                const estado            = estadoKey     ? bestRow[estadoKey]     : null;
                const codigoMovimiento  = codMovKey     ? bestRow[codMovKey]     : null;
                const codigoRegistro    = codRegKey     ? bestRow[codRegKey]     : null;

                // Aplicar regla de los 12 meses
                let canSell = null, nextChangeDate = null, monthsElapsed = null;
                if (mostRecentDate) {
                    const s    = calcSellability(mostRecentDate);
                    canSell        = s.canSell;
                    nextChangeDate = s.nextChangeDate;
                    monthsElapsed  = s.monthsElapsed;
                }

                const data = {
                    obraSocial,
                    periodoDesde,
                    estado,
                    codigoMovimiento,
                    codigoRegistro,
                    canSell,
                    nextChangeDate,
                    monthsElapsed,
                    allRows: tableData.rows,
                };

                logger.info(
                    `✅ ${TAG} CUIL con padrón | ObraSocial: ${obraSocial} | Período: ${periodoDesde} | canSell: ${canSell} | próximoCambio: ${nextChangeDate}`
                );
                return buildFound(data);
            }

            // type === "retry" → CAPTCHA incorrecto, reintenta
            logger.warn(`⚠️ ${TAG} CAPTCHA incorrecto (intento ${attempt}), recargando...`);

        } catch (err) {
            logger.warn(`⚠️ ${TAG} Error en intento ${attempt}: ${err.message}`);
            if (attempt === MAX_CAPTCHA_RETRIES) {
                return buildError(`Error tras ${MAX_CAPTCHA_RETRIES} intentos: ${err.message}`);
            }
        }
    }

    logger.error(`❌ ${TAG} CAPTCHA no resuelto tras ${MAX_CAPTCHA_RETRIES} intentos`);
    return buildCaptchaFailed();
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
    SSSaludSession,
    scrapeCuilWithSession,
    isSolverAvailable,
    formatCuil,
};
