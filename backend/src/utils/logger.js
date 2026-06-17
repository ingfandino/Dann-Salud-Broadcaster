/**
 * ============================================================
 * LOGGER (logger.js)
 * ============================================================
 * Sistema de logging basado en Winston.
 * Logs a consola con colores y a archivos rotativos diarios.
 *
 * Separación física por categoría:
 *   getLogger('arca')     → logs/arca-YYYY-MM-DD.log
 *   getLogger('padron')   → logs/padron-YYYY-MM-DD.log
 *   getLogger('dateas')   → logs/dateas-YYYY-MM-DD.log
 *   getLogger('whatsapp') → logs/whatsapp-YYYY-MM-DD.log
 *   getLogger('session')  → logs/session-YYYY-MM-DD.log
 *   (default)             → logs/app-YYYY-MM-DD.log
 */

const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

/** Builds a fresh console format (must not be shared between logger instances). */
function buildConsoleFormat() {
    return format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ level, message, timestamp, stack }) => {
            return stack
                ? `${timestamp} [${level}]: ${message} - ${stack}`
                : `${timestamp} [${level}]: ${message}`;
        })
    );
}

/** Builds a DailyRotateFile transport for the given filename prefix. */
function buildFileTransport(prefix) {
    return new DailyRotateFile({
        dirname: process.env.LOG_DIR || 'logs',
        filename: `${prefix}-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '14d',
        format: format.combine(format.timestamp(), format.json())
    });
}

/** Default (catch-all) logger — unchanged behaviour. */
const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.Console({ format: buildConsoleFormat() }),
        buildFileTransport('app')
    ]
});

/**
 * Category-specific logger cache.
 * Returns a Winston logger whose file sink is isolated to `logs/<category>-*.log`.
 * The console transport is always included so PM2/terminal visibility is preserved.
 *
 * @param {string} category  One of: 'arca', 'padron', 'dateas', 'whatsapp', 'session'
 * @returns {import('winston').Logger}
 */
const _categoryLoggers = {};

function getLogger(category) {
    const key = (category || 'app').toLowerCase();
    if (_categoryLoggers[key]) return _categoryLoggers[key];

    const catLogger = createLogger({
        level: process.env.LOG_LEVEL || "info",
        format: format.combine(
            format.timestamp(),
            format.errors({ stack: true }),
            format.json()
        ),
        transports: [
            new transports.Console({ format: buildConsoleFormat() }),
            buildFileTransport(key)
        ]
    });

    _categoryLoggers[key] = catLogger;
    return catLogger;
}

logger.getLogger = getLogger;
module.exports = logger;