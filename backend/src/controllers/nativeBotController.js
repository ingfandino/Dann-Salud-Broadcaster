/**
 * ============================================================
 * CONTROLADOR — BOT NATIVO (nativeBotController.js)
 * ============================================================
 * Expone endpoints para:
 *   - Iniciar / detener / pausar el bot de adquisición
 *   - Consultar estado del bot
 *   - Listar registros NativeAffiliate (sin teléfono)
 */

"use strict";

const NativeAffiliate       = require("../models/NativeAffiliate");
const ScrapedCode           = require("../models/ScrapedCode");
const AffiliateContribution = require("../models/AffiliateContribution");
const DateasTask            = require("../models/DateasTask");
const logger                = require("../utils/logger");

// NOTA: El bot DATEAS ahora corre en un worker separado (dateas-worker)
// Usamos la base de datos (DateasTask) como fuente de verdad para el estado
const { enqueueTask, stopBot, togglePause, getBotState, getActiveTask } = require("../services/dateasBot.service");

/* ─── Bot control ─────────────────────────────────────────── */

/**
 * POST /api/native-bot/start
 * Body: { maxIterations?: number }
 * Encola una nueva tarea; la inicia de inmediato si el bot está libre.
 */
async function startBot(req, res) {
    const maxIterations = parseInt(req.body?.maxIterations, 10) || 50;
    try {
        const task = await enqueueTask({ maxIterations });
        const state = getBotState();
        const message = state.running
            ? `Tarea encolada — ${maxIterations} iteraciones`
            : `Bot iniciado — ${maxIterations} iteraciones`;
        return res.json({ ok: true, message, taskId: task._id, maxIterations });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] enqueueTask error: ${err.message}`);
        return res.status(500).json({ ok: false, message: err.message });
    }
}

/**
 * POST /api/native-bot/stop
 * NOTA: Detiene la tarea en ejecución actual actualizando la base de datos.
 * El worker detectará el cambio y detendrá el procesamiento.
 */
async function stopBotHandler(req, res) {
    try {
        // Marcar tarea en ejecución como detenida en la base de datos
        const running = await DateasTask.findOne({ status: "running" });
        if (running) {
            await DateasTask.findByIdAndUpdate(running._id, {
                status: "stopped",
                completedAt: new Date(),
                "progress.lastError": "Detenido por usuario"
            });
            // También intentar detener si estamos en el mismo proceso (fallback)
            stopBot();
        }
        return res.json({ ok: true, message: "Bot detenido" });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] stopBot error: ${err.message}`);
        // Fallback: intentar detener en memoria de todos modos
        stopBot();
        return res.json({ ok: true, message: "Bot detenido (modo fallback)" });
    }
}

/**
 * POST /api/native-bot/pause
 * NOTA: Pausa/reanuda la tarea actual actualizando la base de datos.
 */
async function pauseBotHandler(req, res) {
    try {
        const running = await DateasTask.findOne({ status: "running" });
        if (!running) {
            return res.status(409).json({ ok: false, message: "El bot no está en ejecución" });
        }
        
        // Toggle pause en la base de datos
        const newPaused = !(running.progress?.paused || false);
        await DateasTask.findByIdAndUpdate(running._id, {
            "progress.paused": newPaused
        });
        
        // También intentar toggle en memoria si estamos en el mismo proceso (fallback)
        togglePause();
        
        return res.json({ ok: true, paused: newPaused });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] pauseBot error: ${err.message}`);
        // Fallback: intentar toggle en memoria
        togglePause();
        const after = getBotState();
        return res.json({ ok: true, paused: after.paused });
    }
}

/**
 * GET /api/native-bot/status
 * NOTA: Usa la base de datos como fuente de verdad (no in-memory state)
 * porque el bot corre en un worker separado.
 */
async function getBotStatus(req, res) {
    try {
        // Consultar estado desde la base de datos (fuente de verdad)
        const [runningTask, pendingCount, totalCodes, totalSaved] = await Promise.all([
            DateasTask.findOne({ status: "running" }).lean(),
            DateasTask.countDocuments({ status: "pending" }),
            ScrapedCode.countDocuments(),
            NativeAffiliate.countDocuments(),
        ]);

        // Construir estado desde la base de datos
        const state = {
            running: !!runningTask,
            paused: runningTask ? (runningTask.progress?.paused || false) : false,
            processed: runningTask ? (runningTask.progress?.processed || 0) : 0,
            saved: runningTask ? (runningTask.progress?.saved || 0) : 0,
            discarded: runningTask ? (runningTask.progress?.discarded || 0) : 0,
            lastCode: runningTask ? (runningTask.progress?.lastCode || null) : null,
        };

        return res.json({ ok: true, ...state, totalCodes, totalSaved, queuedCount: pendingCount });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] getBotStatus error: ${err.message}`);
        // Responder con estado vacío válido en caso de error
        return res.json({ 
            ok: true, 
            running: false, 
            paused: false, 
            processed: 0, 
            saved: 0, 
            discarded: 0, 
            lastCode: null,
            totalCodes: 0, 
            totalSaved: 0,
            queuedCount: 0 
        });
    }
}

/* ─── NativeAffiliate list ────────────────────────────────── */

/**
 * GET /api/native-bot/affiliates
 * Query: page, limit, search, obraSocial, provincia
 */
async function listNativeAffiliates(req, res) {
    try {
        const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
        const limit = Math.min(200, parseInt(req.query.limit, 10) || 100);
        const skip  = (page - 1) * limit;

        const filter = { telefono: null };

        if (req.query.search) {
            const re = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            filter.$or = [{ nombre: re }, { cuil: re }];
        }
        if (req.query.obraSocial) {
            filter.obraSocial = new RegExp(req.query.obraSocial.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        }
        if (req.query.provincia) {
            filter.provincia = new RegExp(req.query.provincia.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        }

        const [records, total] = await Promise.all([
            NativeAffiliate.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            NativeAffiliate.countDocuments(filter),
        ]);

        if (records.length) {
            const cuils = records.map(r => r.cuil).filter(Boolean);
            const contribs = await AffiliateContribution.find(
                { cuil: { $in: cuils } },
                { cuil: 1, "padron.status": 1, "padron.checkedAt": 1, "padron.canSell": 1, "padron.periodoDesde": 1, "padron.obraSocial": 1 }
            ).lean();
            const padronMap = {};
            for (const c of contribs) if (c.cuil) padronMap[c.cuil] = c.padron ?? null;
            for (const rec of records) rec.padron = padronMap[rec.cuil] ?? null;
        }

        return res.json({
            ok: true,
            records,
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] listNativeAffiliates error: ${err.message}`);
        return res.status(500).json({ ok: false, message: err.message });
    }
}

/**
 * GET /api/native-bot/affiliates/stats
 */
async function getNativeStats(req, res) {
    try {
        const [total, byObraSocial, byProvincia] = await Promise.all([
            NativeAffiliate.countDocuments({ telefono: null }),
            NativeAffiliate.aggregate([
                { $match: { telefono: null } },
                { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            NativeAffiliate.aggregate([
                { $match: { telefono: null } },
                { $group: { _id: "$provincia", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);
        return res.json({ ok: true, total, byObraSocial, byProvincia });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] getNativeStats error: ${err.message}`);
        return res.status(500).json({ ok: false, message: err.message });
    }
}

/**
 * GET /api/native-bot/active-task
 * Devuelve la tarea activa (o reciente) y el conteo de tareas en cola.
 * NOTA: Usa la base de datos como fuente de verdad.
 */
async function getActiveTaskHandler(req, res) {
    try {
        // Consultar directamente desde la base de datos (fuente de verdad)
        const [running, queuedCount] = await Promise.all([
            DateasTask.findOne({ status: "running" }).lean(),
            DateasTask.countDocuments({ status: "pending" }),
        ]);

        let active = null;
        if (running) {
            active = {
                ...running,
                paused: running.progress?.paused || false,
            };
        } else {
            // Buscar tarea reciente completada/errore en últimos 90 segundos
            const cutoff = new Date(Date.now() - 90_000);
            const recent = await DateasTask.findOne(
                { status: { $in: ["completed", "error", "stopped"] }, completedAt: { $gte: cutoff } }
            ).sort({ completedAt: -1 }).lean();
            
            if (recent) {
                active = { ...recent, finished: true };
            }
        }

        return res.json({ ok: true, active, queuedCount });
    } catch (err) {
        logger.error(`[NATIVE-BOT-CTRL] getActiveTask error: ${err.message}`);
        // Siempre retornar una respuesta válida, nunca 500
        return res.json({ ok: true, active: null, queuedCount: 0 });
    }
}

module.exports = {
    startBot,
    stopBotHandler,
    pauseBotHandler,
    getBotStatus,
    getActiveTaskHandler,
    listNativeAffiliates,
    getNativeStats,
};
