// Script de migración: Actualizar auto-respuestas existentes a matchType="exact"
// Este script actualiza todas las auto-respuestas que tengan matchType="contains" o null a "exact"

require('dotenv').config();
const mongoose = require('mongoose');
const Autoresponse = require('../models/Autoresponse');

async function migrate() {
    try {
        const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!MONGO_URI) {
            console.error('❌ Error: MONGODB_URI o MONGO_URI no está definido en .env');
            process.exit(1);
        }
        
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar auto-respuestas con matchType="contains" o sin matchType
        const toUpdate = await Autoresponse.find({
            $or: [
                { matchType: "contains" },
                { matchType: { $exists: false } },
                { matchType: null }
            ]
        });

        console.log(`📊 Encontradas ${toUpdate.length} auto-respuestas para actualizar`);

        if (toUpdate.length === 0) {
            console.log('✨ No hay auto-respuestas para actualizar');
            return;
        }

        // Actualizar cada una
        let updated = 0;
        for (const ar of toUpdate) {
            ar.matchType = "exact";
            await ar.save();
            updated++;
            console.log(`  ✅ Actualizada: "${ar.keyword || 'fallback'}" → matchType: exact`);
        }

        console.log(`\n✅ Migración completada: ${updated} auto-respuestas actualizadas a matchType="exact"`);
        console.log('ℹ️  Ahora solo se enviarán auto-respuestas con coincidencia EXACTA (tolerando mayús/minús y espacios)');

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('👋 Conexión cerrada');
        process.exit(0);
    }
}

migrate();
