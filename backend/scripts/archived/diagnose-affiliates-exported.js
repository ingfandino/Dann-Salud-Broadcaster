// Diagnóstico profundo del campo 'exported' en Affiliates
const mongoose = require('mongoose');
require('dotenv').config();

const Affiliate = require('./src/models/Affiliate');

async function diagnose() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Conteos generales
        const total = await Affiliate.countDocuments({ active: true });
        console.log(`📊 Total afiliados activos: ${total}\n`);

        // Verificar valores del campo 'exported'
        console.log('🔍 ANÁLISIS DEL CAMPO "exported":\n');
        
        const exportedTrue = await Affiliate.countDocuments({ active: true, exported: true });
        const exportedFalse = await Affiliate.countDocuments({ active: true, exported: false });
        const exportedNull = await Affiliate.countDocuments({ active: true, exported: null });
        const exportedUndefined = await Affiliate.countDocuments({ active: true, exported: { $exists: false } });
        const exportedNotTrue = await Affiliate.countDocuments({ active: true, exported: { $ne: true } });
        
        console.log(`   exported: true  → ${exportedTrue}`);
        console.log(`   exported: false → ${exportedFalse}`);
        console.log(`   exported: null  → ${exportedNull}`);
        console.log(`   exported: undefined (no existe) → ${exportedUndefined}`);
        console.log(`   exported: != true → ${exportedNotTrue}`);
        
        const suma = exportedTrue + exportedFalse + exportedNull + exportedUndefined;
        console.log(`\n   SUMA: ${suma} (debería ser ${total})`);
        
        if (suma !== total) {
            console.log('\n⚠️ HAY UNA DISCREPANCIA EN LOS CONTEOS');
        }

        // Muestra de documentos
        console.log('\n📋 MUESTRA DE AFILIADOS (primeros 5):');
        const sample = await Affiliate.find({ active: true })
            .limit(5)
            .select('nombre cuil exported exportedAt exportedTo')
            .lean();
        
        sample.forEach((aff, i) => {
            console.log(`\n   ${i+1}. ${aff.nombre} (${aff.cuil})`);
            console.log(`      exported: ${aff.exported} (tipo: ${typeof aff.exported})`);
            console.log(`      exportedAt: ${aff.exportedAt || 'N/A'}`);
            console.log(`      exportedTo: ${aff.exportedTo || 'N/A'}`);
        });

        // Verificar si hay afiliados con exported != true que SÍ deberían estar disponibles
        console.log('\n🔍 AFILIADOS QUE DEBERÍAN ESTAR DISPONIBLES:');
        const shouldBeAvailable = await Affiliate.find({
            active: true,
            $or: [
                { exported: false },
                { exported: null },
                { exported: { $exists: false } }
            ]
        })
        .limit(10)
        .select('nombre cuil exported obraSocial')
        .lean();

        if (shouldBeAvailable.length === 0) {
            console.log('   ❌ NO HAY NINGUNO (todos tienen exported: true)');
            console.log('\n🚨 PROBLEMA DETECTADO:');
            console.log('   TODOS los afiliados fueron marcados como exportados.');
            console.log('   Posibles causas:');
            console.log('   1. El cron de exportación los marcó incorrectamente');
            console.log('   2. Hubo un bug en la carga inicial');
            console.log('   3. Se ejecutó un script que los marcó a todos');
        } else {
            console.log(`   ✅ Se encontraron ${shouldBeAvailable.length} afiliados disponibles:`);
            shouldBeAvailable.forEach((aff, i) => {
                console.log(`      ${i+1}. ${aff.nombre} - ${aff.obraSocial} (exported: ${aff.exported})`);
            });
        }

        // Verificar exportaciones recientes
        console.log('\n📅 EXPORTACIONES RECIENTES:');
        const recentExports = await Affiliate.find({
            active: true,
            exported: true,
            exportedAt: { $exists: true }
        })
        .sort({ exportedAt: -1 })
        .limit(5)
        .select('nombre exportedAt exportBatchId')
        .lean();

        if (recentExports.length === 0) {
            console.log('   ⚠️ No hay exportaciones con fecha registrada');
        } else {
            recentExports.forEach((exp, i) => {
                console.log(`   ${i+1}. ${exp.nombre} - ${exp.exportedAt?.toLocaleString('es-AR') || 'Sin fecha'}`);
            });
        }

        // Solución sugerida
        console.log('\n💡 SOLUCIÓN SUGERIDA:');
        if (exportedFalse === 0 && exportedTrue === total) {
            console.log('   🔧 Opción 1: Resetear todos a exported: false');
            console.log('      Comando: Affiliate.updateMany({ active: true }, { $set: { exported: false } })');
            console.log('');
            console.log('   🔧 Opción 2: Resetear solo los más antiguos (mantener últimos 30 días)');
            console.log('      Comando: Affiliate.updateMany({ active: true, exportedAt: { $lt: últimos30días } }, { $set: { exported: false } })');
        } else {
            console.log('   ✅ El modelo está correctamente configurado');
            console.log('   ✅ Hay afiliados disponibles para exportar');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

diagnose();
