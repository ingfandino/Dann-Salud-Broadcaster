// Script para probar el endpoint de obras sociales disponibles
const mongoose = require('mongoose');
require('dotenv').config();

const Affiliate = require('./src/models/Affiliate');

async function testObrasSociales() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Verificar afiliados disponibles
        // exported: { $ne: true } incluye false, null, undefined (cualquier cosa que NO sea true)
        const disponibles = await Affiliate.countDocuments({ active: true, exported: { $ne: true } });
        console.log(`📊 Afiliados disponibles (sin exportar): ${disponibles}\n`);

        // Obtener obras sociales disponibles
        const obrasSocialesDisponibles = await Affiliate.aggregate([
            { $match: { active: true, exported: { $ne: true } } },
            { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log(`🏥 Obras sociales con afiliados disponibles: ${obrasSocialesDisponibles.length}\n`);

        if (obrasSocialesDisponibles.length === 0) {
            console.log('⚠️ NO HAY OBRAS SOCIALES CON AFILIADOS DISPONIBLES');
            console.log('Esto significa que todos los afiliados ya fueron exportados.');
        } else {
            console.log('📋 OBRAS SOCIALES DISPONIBLES (muestra de las primeras 10):\n');
            obrasSocialesDisponibles.slice(0, 10).forEach(os => {
                console.log(`   • ${os._id}: ${os.count} afiliados`);
            });
        }

        // Verificar si hay afiliados en general
        const total = await Affiliate.countDocuments({ active: true });
        const exported = await Affiliate.countDocuments({ active: true, exported: true });
        
        console.log(`\n📈 RESUMEN:`);
        console.log(`   Total afiliados: ${total}`);
        console.log(`   Exportados: ${exported}`);
        console.log(`   Disponibles: ${disponibles}`);
        console.log(`   % Disponible: ${((disponibles / total) * 100).toFixed(2)}%`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testObrasSociales();
