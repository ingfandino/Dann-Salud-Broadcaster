const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
    {
        tipo: {
            type: String,
            enum: ["info", "warning", "error"],
            default: "info",
        },
        mensaje: {
            type: String,
            required: true,
        },
        metadata: {
            type: Object,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);