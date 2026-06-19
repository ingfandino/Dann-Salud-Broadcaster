/**
 * ============================================================
 * RUTAS — DATEAS BOT (dateasBot.js)
 * ============================================================
 * Prefijo: /api/dateas-bot
 * Acceso: solo roles 'gerencia' y 'desarrollador'
 */

"use strict";

const express = require("express");
const router  = express.Router();
const { permit } = require("../middlewares/roleMiddleware");

const {
    startBotHandler,
    stopBotHandler,
    pauseBotHandler,
    resumeBotHandler,
    getBotStatusHandler,
    getActiveTaskHandler,
} = require("../controllers/dateasBotController");

const ALLOWED = permit("gerencia", "desarrollador");

/* Bot control */
router.post("/start",       ALLOWED, startBotHandler);
router.post("/stop",        ALLOWED, stopBotHandler);
router.post("/pause",       ALLOWED, pauseBotHandler);
router.post("/resume",      ALLOWED, resumeBotHandler);
router.get("/status",       ALLOWED, getBotStatusHandler);
router.get("/active-task",  ALLOWED, getActiveTaskHandler);

module.exports = router;
