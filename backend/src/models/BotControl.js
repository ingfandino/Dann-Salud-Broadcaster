/**
 * ============================================================
 * BOT CONTROL (BotControl.js)
 * ============================================================
 * Singleton document that holds the current control signal for
 * a named bot worker. Checked by the worker on every iteration.
 *
 * Document format:
 *   _id       : botId string (e.g. "dateas")
 *   signal    : "none" | "pause" | "stop"
 *   updatedAt : Date (for staleness detection on worker startup)
 */

"use strict";

const mongoose = require("mongoose");

const botControlSchema = new mongoose.Schema(
    {
        _id:    { type: String, required: true },
        signal: { type: String, enum: ["none", "pause", "stop"], default: "none" },
    },
    {
        _id:        false,
        timestamps: { createdAt: false, updatedAt: "updatedAt" },
        collection: "botcontrols",
    }
);

module.exports = mongoose.model("BotControl", botControlSchema);
