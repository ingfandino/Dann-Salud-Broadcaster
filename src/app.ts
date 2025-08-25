import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Rutas de prueba
app.get("/", (req, res) => {
  res.send("🚀 API de mensajería WhatsApp funcionando!");
});

export default app;