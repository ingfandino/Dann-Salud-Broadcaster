// scripts/clearReports.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });

// Definir modelo rápido para evitar conflicto con ESM
const reportSchema = new mongoose.Schema({}, { strict: false });
const Report = mongoose.model("Report", reportSchema, "reports");

async function clear() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        await Report.deleteMany({});
        console.log("✅ Colección 'reports' vaciada");
    } catch (err) {
        console.error("❌ Error limpiando reports:", err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

clear();