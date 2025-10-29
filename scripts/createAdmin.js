// scripts/createAdmin.js

require("dotenv").config({
    path: require("path").resolve(__dirname, "../backend/.env"),
});
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_CREATE_ADMIN !== 'true') {
    console.error("Refusing to create admin in production. Set ALLOW_CREATE_ADMIN=true to override.");
    process.exit(1);
}

const createAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        console.log("DEBUG MONGO_URI:", mongoUri);

        if (!mongoUri) throw new Error("❌ No se encontró MONGO_URI en el archivo .env");

        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log("✅ Conectado a MongoDB");

        // 🔹 Definición mínima del schema inline
        const userSchema = new mongoose.Schema(
            {
                username: { type: String, required: true, unique: true, trim: true },
                nombre: { type: String, required: true, trim: true },
                email: { type: String, required: true, unique: true, lowercase: true, trim: true },
                password: { type: String, required: true, minlength: 6 },
                numeroEquipo: { type: String, trim: true },
                role: { type: String, enum: ["admin", "supervisor", "asesor"], default: "asesor" },
                supervisor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
                active: { type: Boolean, default: false },
            },
            { timestamps: true }
        );

        // Hash de contraseña antes de guardar
        userSchema.pre("save", async function (next) {
            if (!this.isModified("password")) return next();
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
            next();
        });

        const User = mongoose.models.User || mongoose.model("User", userSchema);

        // 🔹 Verificar si ya existe admin
        let admin = await User.findOne({ role: "admin" });
        if (!admin) {
            admin = new User({
                username: "admin",
                nombre: "Administrador",
                email: "admin@example.com",
                password: "admin123", // se hashea en el pre-save
                role: "admin",
                active: true,
            });
            await admin.save();
            console.log("✅ Admin creado:", admin.email);
        } else {
            console.log("ℹ️ Ya existe un admin:", admin.email);
        }
    } catch (err) {
        console.error("❌ Error creando admin:", err);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Conexión cerrada");
    }
};

createAdmin();