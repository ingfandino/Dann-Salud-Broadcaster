/**
 * ============================================================
 * DATEAS BOT CONTROLLER (dateasBotController.js)
 * ============================================================
 * Handles UI control commands for the dateas-worker.
 * Pause / Stop / Resume are written to the BotControl singleton
 * document in MongoDB. The dateas-worker reads this signal at
 * each iteration boundary via readControlSignal().
 */

"use strict";

const BotControl = require("../models/BotControl");
const DateasTask = require("../models/DateasTask");
const { enqueueTask, getActiveTask } = require("../services/dateasBot.service");

const BOT_ID = "dateas";

/** Upsert BotControl signal and return the updated doc */
async function setSignal(signal) {
    return BotControl.findByIdAndUpdate(
        BOT_ID,
        { $set: { signal } },
        { upsert: true, new: true }
    );
}

/** POST /api/dateas-bot/start */
async function startBotHandler(req, res) {
    try {
        const { maxIterations = 50 } = req.body;
        const task = await enqueueTask({ maxIterations });
        res.json({ ok: true, taskId: task._id, message: "Tarea encolada correctamente" });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}

/** POST /api/dateas-bot/pause — signals the worker to pause at next iteration boundary */
async function pauseBotHandler(req, res) {
    try {
        // Write the signal unconditionally — the worker reads it at the next
        // iteration boundary. If the bot is not running, the signal is a no-op
        // and will be cleared by startup cleanup on next worker restart.
        await setSignal("pause");
        res.json({ ok: true, message: "Señal PAUSE enviada — el bot se suspenderá al final de la iteración actual" });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}

/** POST /api/dateas-bot/resume — clears any pause/stop signal so the worker continues */
async function resumeBotHandler(req, res) {
    try {
        await setSignal("none");
        res.json({ ok: true, message: "Señal RESUME enviada — el bot reanudará en la próxima iteración" });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}

/** POST /api/dateas-bot/stop — signals the worker to stop and clears the queue */
async function stopBotHandler(req, res) {
    try {
        // Write the signal first; the worker will also call stopBot() locally
        // which cancels the DateasTask DB records and resets the signal.
        // For robustness we also cancel pending tasks here in case the worker
        // is not currently running (i.e. no iteration loop to read the signal).
        await setSignal("stop");
        await DateasTask.updateMany(
            { status: "pending" },
            { $set: { status: "stopped", completedAt: new Date() } }
        );
        res.json({ ok: true, message: "Señal STOP enviada — el bot se detendrá al final de la iteración actual" });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}

/** GET /api/dateas-bot/status */
async function getBotStatusHandler(req, res) {
    try {
        // Use getActiveTask() (MongoDB-backed) as the shared truth about worker state.
        // getBotState() from the service is backend-process-local and never reflects
        // the real dateas-worker execution.
        const { active, queuedCount } = await getActiveTask();
        const ctrl   = await BotControl.findById(BOT_ID).lean();
        const signal = ctrl?.signal || "none";
        res.json({ ok: true, active, queuedCount, signal });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}

/** GET /api/dateas-bot/active-task */
async function getActiveTaskHandler(req, res) {
    try {
        const { active, queuedCount } = await getActiveTask();
        res.json({ ok: true, active, queuedCount });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
}

module.exports = {
    startBotHandler,
    pauseBotHandler,
    resumeBotHandler,
    stopBotHandler,
    getBotStatusHandler,
    getActiveTaskHandler,
};
