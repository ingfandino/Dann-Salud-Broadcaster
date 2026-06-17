const mongoose = require("mongoose");

const dateasTaskSchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: ["pending", "running", "completed", "error", "stopped"],
            default: "pending",
            index: true,
        },
        maxIterations: {
            type: Number,
            default: 50,
        },
        requestedAt: {
            type: Date,
            default: Date.now,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        progress: {
            total:     { type: Number, default: 0 },
            processed: { type: Number, default: 0 },
            saved:     { type: Number, default: 0 },
            discarded: { type: Number, default: 0 },
            lastCode:  { type: String, default: null },
            lastError: { type: String, default: null },
        },
    },
    { timestamps: false }
);

module.exports = mongoose.model("DateasTask", dateasTaskSchema);
