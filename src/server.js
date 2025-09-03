// src/server.js

const dotenv = require('dotenv');
dotenv.config(); // cargar variables de entorno lo primero

const cors = require('cors');
const express = require('express');
const http = require('http');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { startScheduler } = require('./services/jobScheduler');
const { pushMetrics } = require("./services/metricsService");
const { requireAuth } = require("./middlewares/authMiddleware");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');

// Lazy load route modules
const getRoute = (path) => require(path);

// Lazy load WhatsApp controller when needed
let whatsappController;
const getWhatsappController = () => {
  if (!whatsappController) {
    whatsappController = require('./controllers/whatsappController');
  }
  return whatsappController;
};

connectDB().catch(err => {
  const sanitizedError = err && err.message ? err.message.replace(/[\r\n]/g, '') : 'Unknown database error';
  console.error("❌ Database connection failed:", sanitizedError);
  process.exit(1);
});

const app = express();

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000']
}));
app.use(express.json());
app.use(helmet());
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 60
}));

// 🔹 Health checks
app.get("/ping", (_req, res) => res.json({ message: "pong" }));
app.get("/ping-auth", requireAuth, (_req, res) => res.json({ message: "pong" }));

// 🔹 Rutas protegidas
app.use("/users", requireAuth, getRoute('./routes/userRoutes'));
app.use("/contacts", requireAuth, getRoute('./routes/contactRoutes'));
app.use("/messages", requireAuth, getRoute('./routes/messageRoutes'));
app.use("/whatsapp", requireAuth, getRoute('./routes/whatsappRoutes'));
app.use("/templates", requireAuth, getRoute('./routes/templateRoutes'));
app.use("/autoresponses", requireAuth, getRoute('./routes/autoresponseRoutes'));
app.use("/send-config", requireAuth, getRoute('./routes/sendConfigRoutes'));
app.use("/send", requireAuth, getRoute('./routes/sendJobRoutes'));
app.use("/jobs", requireAuth, getRoute('./routes/jobRoutes'));
app.use("/logs", requireAuth, getRoute('./routes/logRoutes'));

// 🟢 Iniciar Scheduler
try {
  startScheduler();
} catch (err) {
  console.error("❌ Scheduler initialization failed:", err);
  process.exit(1);
}

// 🟢 Socket.IO + métricas automáticas
const httpServer = http.createServer(app);
try {
  const io = initSocket(httpServer);
} catch (err) {
  console.error("❌ Socket initialization failed:", err);
  process.exit(1);
}
// cada 15s enviamos snapshot de métricas
const metricsInterval = setInterval(() => {
  try {
    pushMetrics();
  } catch (err) {
    console.error('Error pushing metrics:', err);
  }
}, 15000);

// 🟢 Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(metricsInterval);
  httpServer.close((err) => {
    if (err) {
      const sanitizedError = err && err.message ? err.message.replace(/[\r\n]/g, '') : 'Unknown server error';
      console.error('Error closing server:', sanitizedError);
    }
    process.exit(0);
  });
});
process.on('SIGINT', () => {
  clearInterval(metricsInterval);
  httpServer.close((err) => {
    if (err) {
      const sanitizedError = err && err.message ? err.message.replace(/[\r\n]/g, '') : 'Unknown server error';
      console.error('Error closing server:', sanitizedError);
    }
    process.exit(0);
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});