/**
 * ============================================================
 * RUTAS DE PALABRAS PROHIBIDAS (bannedWords.js)
 * ============================================================
 * Gestión del filtro de contenido.
 * Solo Gerencia puede administrar, todos pueden consultar.
 */

const express = require("express");
const router = express.Router();
const bannedWordController = require("../controllers/bannedWordController");
const { requireAuth } = require("../middlewares/authMiddleware");

/* ========== RUTAS PROTEGIDAS ========== */
router.use(requireAuth);

// 📋 Listar palabras prohibidas (todos los roles autenticados pueden ver)
router.get("/", bannedWordController.getBannedWords);

// 📊 Estadísticas (todos los roles autenticados)
router.get("/stats", bannedWordController.getStats);

// 🔐 Solo Gerencia puede gestionar palabras
router.use(bannedWordController.requireGerencia);

// ➕ Agregar palabra prohibida
router.post("/", bannedWordController.addBannedWord);

// ✏️ Actualizar palabra prohibida
router.put("/:id", bannedWordController.updateBannedWord);

// 🗑️ Eliminar palabra prohibida
router.delete("/:id", bannedWordController.deleteBannedWord);

// 📊 Historial de detecciones
router.get("/detections", bannedWordController.getDetections);

// ✅ Marcar detección como resuelta
router.put("/detections/:id/resolve", bannedWordController.resolveDetection);

module.exports = router;
