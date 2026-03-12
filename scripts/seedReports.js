// scripts/seedReports.js

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

// Cargar .env del backend (ajusta si tu .env está en otra ruta)
dotenv.config({ path: path.resolve(__dirname, "../backend/.env") });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error("❌ MONGO_URI no encontrado. Asegúrate de que ../backend/.env exista y tenga MONGO_URI.");
    process.exit(1);
}

// Definimos aquí un esquema local (no necesitamos importar el modelo del backend)
const reportSchema = new mongoose.Schema(
    {
        fecha: { type: Date, required: true },
        telefono: String,
        nombre: String,
        obraSocial: String,
        respondio: Boolean,
        asesorNombre: String,
        grupo: String,
    },
    { timestamps: true }
);

// Evita redeclarar el modelo si el script se ejecuta en hot-reload
const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

// Generador de datos de prueba
function generateReports(n = 50) {
    const obras = ["OSDE", "Swiss Medical", "Galeno", "Medicus", "OSF"];
    const nombres = ["Ana Pérez", "Juan Gómez", "María López", "Carlos Díaz", "Lucía Ruiz"];
    const asesores = ["Sofía", "Martín", "Luciano", "Valeria"];
    const grupos = ["Grupo Norte", "Grupo Sur", "Grupo Oeste"];

    const today = new Date();
    return Array.from({ length: n }, (_, i) => {
        const daysBack = Math.floor(Math.random() * 20);
        const d = new Date(today);
        d.setDate(d.getDate() - daysBack);

        return {
            fecha: d,
            telefono: "+54" + (900000000 + Math.floor(Math.random() * 9000000)),
            nombre: `${nombres[i % nombres.length]} ${i}`,
            obraSocial: obras[i % obras.length],
            respondio: Math.random() > 0.5,
            asesorNombre: asesores[i % asesores.length],
            grupo: grupos[i % grupos.length],
        };
    });
}

async function seedReports() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conectado a MongoDB");

        // Vaciar colección (opcional)
        await Report.deleteMany({});
        console.log("🗑️ Colección 'reports' vaciada");

        const data = generateReports(100);
        await Report.insertMany(data);
        console.log(`✅ Insertados ${data.length} reportes de prueba`);

    } catch (err) {
        console.error("❌ Error seeding reports:", err);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Desconectado. Proceso finalizado.");
        process.exit();
    }
}

seedReports();