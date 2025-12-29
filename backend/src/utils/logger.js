/**
 * ============================================================
 * LOGGER (logger.js)
 * ============================================================
 * Sistema de logging basado en Winston.
 * Logs a consola con colores y a archivos rotativos diarios.
 */

const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.timestamp(),
                format.printf(({ level, message, timestamp, stack }) => {
                    return stack
                        ? `${timestamp} [${level}]: ${message} - ${stack}`
                        : `${timestamp} [${level}]: ${message}`;
                })
            )
        }),
        new DailyRotateFile({
            dirname: process.env.LOG_DIR || 'logs',
            filename: 'app-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            format: format.combine(format.timestamp(), format.json())
        })
    ]
});

module.exports = logger;