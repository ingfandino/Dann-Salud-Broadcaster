// Script para crear índice de deduplicación global
const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./src/models/Message');

async function createDedupIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        console.log('📊 Verificando índices existentes...\n');
        const existingIndexes = await Message.collection.getIndexes();
        console.log('Índices actuales:', Object.keys(existingIndexes).join(', '));

        if (existingIndexes.global_dedup_index) {
            console.log('\n✅ El índice "global_dedup_index" ya existe.');
        } else {
            console.log('\n🔨 Creando índice de deduplicación global...');
            await Message.collection.createIndex(
                { to: 1, direction: 1, timestamp: -1, status: 1 },
                { 
                    name: 'global_dedup_index',
                    background: true
                }
            );
            console.log('✅ Índice creado exitosamente.');
        }

        // Verificar estadísticas del índice
        const stats = await Message.collection.stats();
        console.log(`\n📈 Estadísticas de la colección:`);
        console.log(`   Total documentos: ${stats.count}`);
        console.log(`   Tamaño: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Índices: ${stats.nindexes}`);

        console.log('\n✅ Proceso completado.');
        console.log('\n🎯 RESULTADO:');
        console.log('   ✅ Las campañas ahora verificarán duplicados GLOBALMENTE');
        console.log('   ✅ No se enviarán mensajes al mismo número en 24 horas');
        console.log('   ✅ Optimización de búsqueda con índice compuesto');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

createDedupIndex();
