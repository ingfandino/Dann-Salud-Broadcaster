/**
 * Script: Asignar rol 'desarrollador' a Daniel Fandiño
 * Uso: node src/scripts/assignDesarrollador.js
 */

require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

const TARGET_EMAIL = "ing.danielfandino@gmail.com";

async function run() {
    await mo
    ngoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log("✅ Conectado a MongoDB");

    const user = await User.findOne({ email: TARGET_EMAIL });
    if (!user) {
        console.error(`❌ Usuario no encontrado: ${TARGET_EMAIL}`);
        process.exit(1);
    }

    const previousRole = user.role;
    user.role = "desarrollador";
    await user.save();

    console.log(`✅ Rol actualizado: ${user.nombre} (${TARGET_EMAIL})`);
    console.log(`   Rol anterior: ${previousRole}`);
    console.log(`   Rol nuevo:    desarrollador`);

    await mongoose.disconnect();
    process.exit(0);
}

run().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
