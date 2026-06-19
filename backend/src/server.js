/**
 * ============================================================
 * SERVIDOR PRINCIPAL (server.js)
 * ============================================================
 * Punto de entrada de la aplicación Express.
 * Configura middleware, rutas, Socket.IO y tareas programadas.
 */

require("dotenv").config();
require("express-async-errors");

const cors = require("cors");
const express = require("express");
const http = require("http");
const path = require("path");
const connectDB = require("./config/db");
const { initSocket, getIO } = require("./config/socket");
const logger = require("./utils/logger");

// DIAGNOSTIC: Startup tracking for root cause analysis
const STARTUP_TIME = Date.now();
let requestCount = 0;
let firstErrorTime = null;
let firstErrorDetails = null;

function logStartupCheckpoint(label, data = {}) {
    const elapsed = Date.now() - STARTUP_TIME;
    console.log(`[STARTUP-DIAGNOSTIC] [${elapsed}ms] ${label}`, data);
    logger.info(`[STARTUP-DIAGNOSTIC] [${elapsed}ms] ${label}`, data);
}

// ============================================================
// NOTA: Workers separados en procesos PM2 independientes
// ============================================================
// Los siguientes módulos ahora corren en workers dedicados:
// - whatsapp-worker: WhatsApp + jobScheduler + recovery + crons
// - arca-worker: Verificación ARCA (ArcaAssistedTask)
// - padron-worker: Verificación Padrón
// - dateas-worker: Bot DATEAS (Base Nativa)
//
// Ver: ecosystem.config.js para la configuración de procesos



const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middlewares/errorHandler");
const User = require("./models/User");
const Autoresponse = require("./models/Autoresponse");
const AutoResponseLog = require("./models/AutoResponseLog");
const Message = require("./models/Message");
const SendJob = require("./models/SendJob");
const Affiliate = require("./models/Affiliate");
const AffiliateExportConfig = require("./models/AffiliateExportConfig");
const Evidencia = require("./models/Evidencia");
const routes = require("./routes");
const { requireAuth } = require("./middlewares/authMiddleware");
const { validateEnv, ENV } = require("./config");
const { pushMetrics } = require("./services/metricsService");

validateEnv();

if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(async () => {
      // Sincronizar índices solo si se especifica explícitamente o en desarrollo
      if (process.env.SYNC_INDEXES === 'true' || process.env.NODE_ENV === 'development') {
        try {
          await User.syncIndexes();
          logger.info("✅ Índices de User sincronizados");

          try {
            await Autoresponse.syncIndexes();
            logger.info("✅ Índices de Autoresponse sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de Autoresponse", { error: e?.message });
          }

          try {
            await AutoResponseLog.syncIndexes();
            logger.info("✅ Índices de AutoResponseLog sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de AutoResponseLog", { error: e?.message });
          }

          try {
            await Message.syncIndexes();
            logger.info("✅ Índices de Message sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de Message", { error: e?.message });
          }

          try {
            await SendJob.syncIndexes();
            logger.info("✅ Índices de SendJob sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de SendJob", { error: e?.message });
          }

          try {
            await Affiliate.syncIndexes();
            logger.info("✅ Índices de Affiliate sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de Affiliate", { error: e?.message });
          }

          try {
            await AffiliateExportConfig.syncIndexes();
            logger.info("✅ Índices de AffiliateExportConfig sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de AffiliateExportConfig", { error: e?.message });
          }

          try {
            await Evidencia.syncIndexes();
            logger.info("✅ Índices de Evidencia sincronizados");
          } catch (e) {
            logger.warn("⚠️  No se pudieron sincronizar índices de Evidencia", { error: e?.message });
          }

          // 🌱 Semilla opcional para crear auditor
          await seedAuditorRole();
        } catch (err) {
          logger.error("❌ Error al sincronizar índices de User", { error: err.message });
        }
      }
    })
    .catch(err => {
      const sanitizedError = err?.message
        ? err.message.replace(/[\r\n]/g, "")
        : "Unknown database error";
      logger.error("❌ Fallo en la conexión con la base de datos", { error: sanitizedError });
      process.exit(1);
    });
}

const app = express();
// ✅ Confiar en proxies (Nginx/Cloudflare) para obtener la IP real del cliente
app.set('trust proxy', 1);

const uploadsPath = path.join(__dirname, '../uploads');
try { require("fs").mkdirSync(uploadsPath, { recursive: true }); } catch (e) { }

// 🔹 Configuración CORS
let allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(s => {
    let origin = s.trim();
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
      origin = 'http://' + origin;
    }
    if (origin.endsWith('/')) {
      origin = origin.slice(0, -1);
    }
    return origin;
  }).filter(Boolean)
  : [];

// Añadir origen del servidor actual para permitir peticiones desde el frontend servido por el mismo backend

// Detectar IP local para permitir acceso LAN
// Detectar TODAS las IPs locales para permitir acceso LAN/VPN
const interfaces = require("os").networkInterfaces();
if (interfaces) {
  Object.values(interfaces).flat().forEach((iface) => {
    if (iface.family === "IPv4" && !iface.internal) {
      allowedOrigins.push(`http://${iface.address}:5000`);
      allowedOrigins.push(`http://${iface.address}:3000`);
      allowedOrigins.push(`http://${iface.address}:5173`);
    }
  });
}
allowedOrigins.push("http://localhost:5000");
allowedOrigins.push("http://localhost:3000");

// Production frontend origins used by direct browser uploads to api.dannsalud.com.ar.
// Keep these explicit because VideoAudit recordings intentionally bypass the Next proxy.
allowedOrigins.push("https://dannsalud.com.ar");
allowedOrigins.push("https://www.dannsalud.com.ar");

if (process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:5173"); // Vite por defecto
}

allowedOrigins = [...new Set(allowedOrigins)];

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  logger.error("FATAL ERROR: La variable de entorno ALLOWED_ORIGINS no está definida para producción.");
  process.exit(1);
}

// Función para verificar si un origen coincide con los patrones permitidos (soporta comodines *)
const toRegex = (pattern) => {
  // Escapar caracteres regex especiales excepto '*'
  const escaped = pattern.replace(/[-/\\^$+?.()|[\]{}]/g, "\\$&");
  // Reemplazar '*' por '.*' para hacer de comodín
  const wildcarded = escaped.replace(/\*/g, ".*");
  return new RegExp(`^${wildcarded}$`);
};

logger.info(`CORS orígenes permitidos: ${allowedOrigins.join(" | ")}`);

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (como aplicaciones móviles o curl)
    if (!origin) return callback(null, true);

    // Verificar si el origen coincide con alguno de los patrones permitidos
    const isAllowed = allowedOrigins.some(pattern => toRegex(pattern).test(origin));

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido: ${origin}`));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware para establecer la cabecera Origin-Agent-Cluster
app.use((_req, res, next) => {
  res.setHeader("Origin-Agent-Cluster", "?1");
  next();
});

// Configuración de Helmet con CSP permisiva para evitar bloqueos en LAN/HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "http:", "https:", "data:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'", "http:", "https:"],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:", "*"], // Permitir conexiones a cualquier origen (necesario para socket/api en LAN)
      fontSrc: ["'self'", "data:", "http:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "http:", "https:"],
      frameSrc: ["'self'"],
      upgradeInsecureRequests: null, // ❌ Deshabilitar upgrade automático a HTTPS
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  strictTransportSecurity: false, // ❌ Deshabilitar HSTS para evitar forzar HTTPS en puerto HTTP
}));

// 🔹 Rate limit global (relajado en desarrollo)
if (process.env.NODE_ENV === "development") {
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 5000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
} else {
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => {
        const p = req.path || "";
        // Evitar 429 en endpoints de polling rápido y en Socket.IO
        return p.startsWith("/api/whatsapp/me/status") || p.startsWith("/api/whatsapp/me/qr") || p.startsWith("/socket.io/");
      },
    })
  );
}

// 🔹 Rate limit solo para login (relajado en desarrollo)
let authLimiter;
if (process.env.NODE_ENV === "development") {
  authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });
} else {
  authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 50, // ✅ Aumentado de 10 a 50 para evitar bloqueos en oficinas con IP compartida
    message: { error: "Demasiados intentos de login, intente más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
// app.use("/api/auth/login", authLimiter); // ❌ Deshabilitado temporalmente por problemas con proxy/IPs compartidas

// 🔹 Health checks
app.get("/api/ping", (_req, res) => res.json({ message: "pong" }));
app.get("/api/ping-auth", requireAuth, (_req, res) =>
  res.json({ message: "pong" })
);

// 🔹 Montar rutas
app.use("/api", routes);

// DIAGNOSTIC: Request tracking middleware to identify first failure in degradation window
app.use((req, res, next) => {
    requestCount++;
    const reqNum = requestCount;
    const elapsed = Date.now() - STARTUP_TIME;
    const isEarlyRequest = elapsed < 15000; // Track first 15 seconds
    
    if (isEarlyRequest) {
        logStartupCheckpoint(`REQUEST #${reqNum} ${req.method} ${req.originalUrl}`, {
            user: req.user?.id || req.user?._id || 'unauthenticated',
            ip: req.ip
        });
    }
    
    // Capture response status for early requests
    if (isEarlyRequest) {
        const originalSend = res.json;
        res.json = function(data) {
            if (res.statusCode >= 500 && !firstErrorTime) {
                firstErrorTime = Date.now() - STARTUP_TIME;
                firstErrorDetails = {
                    requestNum: reqNum,
                    method: req.method,
                    url: req.originalUrl,
                    status: res.statusCode,
                    elapsed: firstErrorTime
                };
                logStartupCheckpoint(`FIRST-500-ERROR`, firstErrorDetails);
            }
            return originalSend.call(this, data);
        };
    }
    
    next();
});

// 🔹 Static files for uploads (with auth in production)
if (process.env.NODE_ENV === 'production' || process.env.PROTECT_UPLOADS === 'true') {
  app.use('/uploads', requireAuth, express.static(path.join(__dirname, '../uploads')));
} else {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// Servir archivos estáticos del frontend en producción
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');

  // Intentar diferentes rutas posibles para el frontend
  const possiblePaths = [
    path.resolve(process.cwd(), '../../frontend/dist'),
    path.resolve(__dirname, '../../../frontend/dist'),
    path.resolve(process.cwd(), '../frontend/dist'),
    path.resolve(process.cwd(), 'frontend/dist')
  ];

  let frontendBuildPath = null;

  // 1) Prioridad: ruta definida por variable de entorno
  const envFrontendPath = process.env.FRONTEND_BUILD_PATH
    ? path.resolve(process.env.FRONTEND_BUILD_PATH)
    : null;
  if (envFrontendPath && fs.existsSync(envFrontendPath)) {
    frontendBuildPath = envFrontendPath;
    logger.info(`✅ FRONTEND_BUILD_PATH usado: ${frontendBuildPath}`);
  }

  // Buscar la primera ruta que exista
  if (!frontendBuildPath) {
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        frontendBuildPath = testPath;
        logger.info(`✅ Frontend encontrado en: ${frontendBuildPath}`);
        break;
      }
    }
  }

  if (!frontendBuildPath) {
    logger.error('❌ No se pudo encontrar el directorio del frontend en ninguna ubicación');
  } else {
    // Verificar si existe la carpeta de assets
    const assetsPath = path.join(frontendBuildPath, 'assets');
    if (fs.existsSync(assetsPath)) {
      logger.info(`✅ Carpeta de assets encontrada en: ${assetsPath}`);

      // Listar archivos en la carpeta de assets para depuración
      const assetFiles = fs.readdirSync(assetsPath);
      logger.info(`📁 Archivos en assets: ${assetFiles.join(', ')}`);
    } else {
      logger.error(`❌ No se encontró la carpeta de assets en: ${assetsPath}`);
    }

    // Configuración simple para servir archivos estáticos
    app.use(express.static(frontendBuildPath));

    // Ruta específica para servir assets directamente
    app.use('/assets', express.static(path.join(frontendBuildPath, 'assets')));

    // Para cualquier otra ruta que no sea API, enviar index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        const indexPath = path.join(frontendBuildPath, 'index.html');
        logger.info(`🔍 Sirviendo index.html desde: ${indexPath}`);

        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          logger.error(`❌ No se encontró el archivo index.html en: ${indexPath}`);
          res.status(404).send('No se encontró el frontend compilado');
        }
      } else {
        res.status(404).json({ error: "API no encontrada" });
      }
    });
  }
} else {
  // 🔹 Middleware de rutas no encontradas (solo en desarrollo)
  app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
  });
}

app.use(errorHandler);

const appServer = http.createServer(app);

// 🔹 Inicialización de Socket.IO (excepto en test)
let metricsInterval;
if (process.env.NODE_ENV !== "test") {
  // NOTA: Los workers (WhatsApp, ARCA, Padrón, DATEAS) ahora corren en procesos PM2 separados
  // Ver: src/workers/ y ecosystem.config.js
  
  logStartupCheckpoint("SOCKET-IO-INIT-START");
  initSocket(appServer, app, allowedOrigins);
  logStartupCheckpoint("SOCKET-IO-INIT-COMPLETE");

  // 🧹 Iniciar job de limpieza de chequeo de datos temporales (24h/72h)
  const { startCleanupJob } = require("./jobs/dataCheckCleanupJob");
  startCleanupJob();
  
  // NOTA: Los eventos de WhatsApp (QR, ready, etc.) se manejan en whatsapp-worker
  // El backend no tiene acceso directo a estas events porque el cliente WhatsApp
  // corre en un proceso separado. Para ver el estado de WhatsApp, usar la API
  // o conectar directamente al worker.

  metricsInterval = setInterval(() => {
    pushMetrics().catch(err =>
      logger.error("Error al emitir métricas", { error: err })
    );
  }, 60000);

  const shutdown = (signal) => {
    logger.info(`Cerrando servidor (signal: ${signal})...`);
    if (metricsInterval) clearInterval(metricsInterval);
    appServer.close(() => {
      logger.info("Servidor cerrado.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    const elapsed = Date.now() - STARTUP_TIME;
    console.error(`\n❌ [STARTUP-DIAGNOSTIC] [${elapsed}ms] ========== UNCAUGHT EXCEPTION ==========`);
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    logger.error(`[STARTUP-DIAGNOSTIC] [${elapsed}ms] Uncaught Exception - first fatal error`, {
      error: err.message,
      stack: err.stack,
      name: err.name,
      elapsed
    });
    try {
      if (metricsInterval) clearInterval(metricsInterval);
      appServer.close(() => process.exit(1));
    } catch {
      process.exit(1);
    }
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("❌ [SYSTEM] Unhandled Rejection - exiting to prevent broken state", { 
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise?.toString?.() || 'unknown promise'
    });
    // DIAGNOSTIC FIX: Exit after short delay to allow log flush
    setTimeout(() => process.exit(1), 1000);
  });

  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || "0.0.0.0";

  console.log(`Intentando iniciar servidor en ${HOST}:${PORT}...`);

  appServer.listen(PORT, HOST, () => {
    const localIp = require("os")
      .networkInterfaces()
      ? Object.values(require("os").networkInterfaces())
        .flat()
        .find((iface) => iface.family === "IPv4" && !iface.internal)
        ?.address
      : "localhost";

    logStartupCheckpoint("SERVER-LISTEN-ACTIVE", { port: PORT, host: HOST });
    
    logger.info(`🚀 Servidor corriendo en:`);
    logger.info(`   🌐 Local:   http://localhost:${PORT}`);
    logger.info(`   🖥️  LAN:     http://${localIp || "192.168.x.x"}:${PORT}`);
    logger.info(`   ⚡ Workers: Verificar estado con pm2 status`);
    
    // DIAGNOSTIC: Log warning if degradation hasn't been diagnosed after 15s
    setTimeout(() => {
        if (!firstErrorTime) {
            logStartupCheckpoint("NO-ERRORS-15S", { totalRequests: requestCount });
        } else {
            logStartupCheckpoint("DEGRADATION-DETECTED", firstErrorDetails);
        }
    }, 15000);
  });
}

async function seedAuditorRole() {
  // En producción, no creamos usuarios por defecto por seguridad
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  // Solo en desarrollo creamos un usuario auditor de prueba
  const existing = await User.findOne({ role: "auditor" });
  if (!existing) {
    await User.create({
      username: "auditor_test",
      nombre: "Auditor de Prueba",
      email: "auditor@test.com",
      password: "auditor123",
      role: "auditor",
      active: true
    });
    logger.info("👤 Usuario 'auditor' creado por defecto (auditor@test.com / auditor123)");
  }
}

module.exports = app;