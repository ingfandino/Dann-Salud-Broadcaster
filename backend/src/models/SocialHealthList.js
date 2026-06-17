/**
 * ============================================================
 * MODEL: SocialHealthList
 * ============================================================
 * Catálogo oficial de Obras Sociales según AFIP T05
 * (Tabla de Códigos de Obras Sociales - RG 2143/2006)
 */

const mongoose = require("mongoose");

const SocialHealthListSchema = new mongoose.Schema(
    {
        code: {
            type: Number,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "socialhealthlists",
    }
);

// Individual indexes on code and name are sufficient for exact/regex queries.
// No text index needed since the controller uses $regex on name and exact match on code.

module.exports = mongoose.model("SocialHealthList", SocialHealthListSchema);
