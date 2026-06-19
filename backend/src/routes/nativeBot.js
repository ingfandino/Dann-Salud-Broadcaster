/**
 * ============================================================
 * RUTAS — BOT NATIVO (nativeBot.js)
 * ============================================================
 * Prefijo: /api/native-bot
 * Acceso: solo roles 'gerencia' y 'desarrollador'
 */

"use strict";

const express = require("express");
const router  = express.Router();
const { permit } = require("../middlewares/roleMiddleware");

const {
    startBot,
    stopBotHandler,
    pauseBotHandler,
    getBotStatus,
    getActiveTaskHandler,
    listNativeAffiliates,
    getNativeStats,
} = require("../controllers/nativeBotController");

const ALLOWED = permit("gerencia", "desarrollador");

/* Bot control */
router.post("/start",        ALLOWED, startBot);
router.post("/stop",         ALLOWED, stopBotHandler);
router.post("/pause",        ALLOWED, pauseBotHandler);
router.get("/status",        ALLOWED, getBotStatus);
router.get("/active-task",   ALLOWED, getActiveTaskHandler);

/* Registros obtenidos */
router.get("/affiliates",       ALLOWED, listNativeAffiliates);
router.get("/affiliates/stats", ALLOWED, getNativeStats);

module.exports = router;
