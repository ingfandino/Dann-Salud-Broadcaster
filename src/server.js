// src/server.js

const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const messageRoutes = require("./routes/messageRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

dotenv.config();
connectDB();

const app = express();

// Middleware para procesar JSON
app.use(express.json());

// Rutas
app.use("/users", userRoutes);
app.use("/contacts", contactRoutes);
app.use("/messages", messageRoutes);
app.use("/whatsapp", whatsappRoutes)

// Endpoint de prueba
app.get("/ping", (req, res) => {
  res.json({ message: "pong" });
});

// Levantar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});