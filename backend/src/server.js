// backend/src/server.js

require("dotenv").config();
require("express-async-errors");

const cors = require("cors");
const express = require("express");
const http = require("http");
const path = require("path");
const connectDB = require("./config/db");
const { initSocket, getIO } = require("./config/socket");
const { initWhatsappClient, whatsappEvents } = require("./config/whatsapp");
const { startScheduler } = require("./services/jobScheduler");
const { startRecoveryScheduler } = require("./services/recoveryScheduler");
const { pushMetrics } = require("./services/metricsService");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middlewares/errorHandler");
const User = require("./models/User");
const Autoresponse = require("./models/Autoresponse");
const AutoResponseLog = require("./models/AutoResponseLog");
const Message = require("./models/Message");
const SendJob = require("./models/SendJob");
const routes = require("./routes");
const { requireAuth } = require("./middlewares/authMiddleware");
const { validateEnv, ENV } = require("./config");
const logger = require("./utils/logger");

validateEnv();

// 🔹 Conectar DB (excepto en test)
if (process.env.NODE_ENV !== "test") {
  connectDB()
    .then(async () => {
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

        // 🌱 Semilla opcional para crear auditor
        await seedAuditorRole();
      } catch (err) {
        logger.error("❌ Error al sincronizar índices de User", { error: err.message });
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
const uploadsPath = path.join(__dirname, '../uploads');
try { require("fs").mkdirSync(uploadsPath, { recursive: true }); } catch (e) {}

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
 
if (process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://localhost:5173"); // Vite por defecto
}
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

// Configuración de Helmet modificada para evitar redirecciones HTTPS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false
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
        // Evitar 429 en endpoints de polling rápido
        return p.startsWith("/api/whatsapp/me/status") || p.startsWith("/api/whatsapp/me/qr");
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
    max: 10,
    message: { error: "Demasiados intentos de login, intente más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
app.use("/api/auth/login", authLimiter);

// 🔹 Health checks
app.get("/api/ping", (_req, res) => res.json({ message: "pong" }));
app.get("/api/ping-auth", requireAuth, (_req, res) =>
  res.json({ message: "pong" })
);

// 🔹 Montar rutas
app.use("/api", routes);
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
    path.resolve(process.cwd(), 'frontend/dist'),
    'C:/Users/Daniel/Downloads/frontend/dist',
    'C:/Users/Daniel/Downloads/Dann+Salud Online (DEV)/frontend/dist'
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

// 🔹 Inicialización de servicios (excepto en test)
let metricsInterval;
if (process.env.NODE_ENV !== "test") {
  startScheduler();
  startRecoveryScheduler();

  initSocket(appServer, app, allowedOrigins);

  const USE_MULTI = process.env.USE_MULTI_SESSION === 'true';
  if (!USE_MULTI) {
    whatsappEvents.on("qr", (qr) => {
      getIO().emit("qr", qr);
    });

    whatsappEvents.on("ready", () => {
      getIO().emit("ready");
    });

    whatsappEvents.on("authenticated", () => {
      getIO().emit("authenticated");
    });

    whatsappEvents.on("disconnected", (reason) => {
      getIO().emit("disconnected", { reason });
    });

    whatsappEvents.on("auth_failure", (msg) => {
      getIO().emit("auth_failure", { message: msg });
    });

    whatsappEvents.on("qr_expired", () => {
      getIO().emit("qr_expired");
    });

    whatsappEvents.on("qr_refresh", () => {
      getIO().emit("qr_refresh");
    });
  }

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
    logger.error("Uncaught Exception", { error: err });
    try {
      if (metricsInterval) clearInterval(metricsInterval);
      appServer.close(() => process.exit(1));
    } catch {
      process.exit(1);
    }
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled Rejection", { reason });
  });

  const PORT = process.env.PORT || 5000;
  const HOST = process.env.HOST || "0.0.0.0";

  appServer.listen(PORT, HOST, () => {
    const localIp = require("os")
      .networkInterfaces()
      ? Object.values(require("os").networkInterfaces())
        .flat()
        .find((iface) => iface.family === "IPv4" && !iface.internal)
        ?.address
      : "localhost";

    logger.info(`🚀 Servidor corriendo en:`);
    logger.info(`   🌐 Local:   http://localhost:${PORT}`);
    logger.info(`   🖥️  LAN:     http://${localIp || "192.168.x.x"}:${PORT}`);

    const USE_MULTI_START = process.env.USE_MULTI_SESSION === 'true';
    if (!USE_MULTI_START) {
      initWhatsappClient();
    }
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