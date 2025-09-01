// src/server.js

const cors = require("cors");
const connectDB = require("./config/db");
const express = require("express");
const dotenv = require("dotenv");
const { initSocket } = require("./config/socket");

const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const messageRoutes = require("./routes/messageRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const templateRoutes = require("./routes/templateRoutes");
const autoresponseRoutes = require("./routes/autoresponseRoutes");
const sendConfigRoutes = require("./routes/sendConfigRoutes");
const sendJobRoutes = require("./routes/sendJobRoutes");
const jobRoutes = require("./routes/jobRoutes");
const logRoutes = require("./routes/logRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ping
app.get("/ping", (_req, res) => res.json({ message: "pong" }));

// rutas
app.use("/users", userRoutes);
app.use("/contacts", contactRoutes);
app.use("/messages", messageRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/templates", templateRoutes);
app.use("/autoresponses", autoresponseRoutes);
app.use("/send-config", sendConfigRoutes);
app.use("/send", sendJobRoutes);
app.use("/jobs", jobRoutes);
app.use("/logs", logRoutes);

// Inicializa WhatsApp (QR sigue igual)
require("./controllers/whatsappController");

// 🟢 Iniciar Scheduler
const { startScheduler } = require("./services/jobScheduler");
startScheduler();

// 🟢 Socket.IO + métricas automáticas
const httpServer = require("http").createServer(app);
const io = initSocket(httpServer);

const { pushMetrics } = require("./services/metricsService");
// cada 15s enviamos snapshot de métricas
setInterval(pushMetrics, 15000);

// error handler
app.use((err, _req, res, _next) => {
  console.error("🔥 Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});