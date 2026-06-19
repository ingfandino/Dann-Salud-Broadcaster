const mongoose = require("mongoose");

const subBranchSchema = new mongoose.Schema(
    {
        label: { type: String, required: true, trim: true },
        slug: { type: String, required: true, trim: true, lowercase: true },
    },
    { _id: false }
);

const obraSocialConfigSchema = new mongoose.Schema(
    {
        displayName: { type: String, required: true, trim: true },
        slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
        isActive: { type: Boolean, default: true },
        subBranches: { type: [subBranchSchema], default: [] },
        cardColor: { type: String, enum: ["azul", "verde", "morado"], required: true },
        minimumPaidPeriodsRequired: { type: Number, default: null },
        portalEnabled: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ObraSocialConfig", obraSocialConfigSchema);
