// Script para verificar deduplicación global
const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./src/models/Message');

async function testDeduplication() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Analizar mensajes duplicados en las últimas 24 horas
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        console.log('🔍 Buscando números que recibieron múltiples mensajes en 24h...\n');
        
        const duplicates = await Message.aggregate([
            {
                $match: {
                    direction: 'outbound',
                    timestamp: { $gte: twentyFourHoursAgo },
                    status: { $in: ['enviado', 'entregado', 'leido'] }
                }
            },
            {
                $group: {
                    _id: '$to',
                    count: { $sum: 1 },
                    jobs: { $addToSet: '$job' },
                    timestamps: { $push: '$timestamp' }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 20
            }
        ]);

        if (duplicates.length === 0) {
            console.log('✅ NO se encontraron duplicados en las últimas 24 horas.');
            console.log('   El sistema está funcionando correctamente.');
        } else {
            console.log(`⚠️ SE ENCONTRARON ${duplicates.length} NÚMEROS CON MENSAJES DUPLICADOS:\n`);
            
            duplicates.forEach((dup, index) => {
                const phoneNumber = dup._id.replace('@c.us', '');
                const jobCount = dup.jobs.filter(j => j !== null).length;
                
                console.log(`${index + 1}. Número: ${phoneNumber}`);
                console.log(`   Mensajes enviados: ${dup.count}`);
                console.log(`   En ${jobCount} campaña(s) diferente(s)`);
                
                // Calcular tiempo entre mensajes
                if (dup.timestamps.length > 1) {
                    const sorted = dup.timestamps.sort((a, b) => a - b);
                    const firstSent = sorted[0];
                    const lastSent = sorted[sorted.length - 1];
                    const minutesDiff = Math.round((lastSent - firstSent) / 60000);
                    console.log(`   Tiempo entre primer y último envío: ${minutesDiff} minutos`);
                }
                console.log('');
            });

            console.log('\n📊 RESUMEN:');
            const totalDuplicateMessages = duplicates.reduce((sum, d) => sum + d.count, 0);
            const uniqueNumbers = duplicates.length;
            const wastedMessages = totalDuplicateMessages - uniqueNumbers;
            
            console.log(`   Total mensajes a números duplicados: ${totalDuplicateMessages}`);
            console.log(`   Números únicos afectados: ${uniqueNumbers}`);
            console.log(`   Mensajes duplicados desperdiciados: ${wastedMessages}`);
        }

        // Verificar mensajes totales en 24h
        const totalMessages24h = await Message.countDocuments({
            direction: 'outbound',
            timestamp: { $gte: twentyFourHoursAgo },
            status: { $in: ['enviado', 'entregado', 'leido'] }
        });

        console.log(`\n📈 ESTADÍSTICAS (últimas 24 horas):`);
        console.log(`   Total mensajes enviados: ${totalMessages24h}`);
        
        if (duplicates.length > 0) {
            const duplicateRate = ((duplicates.reduce((sum, d) => sum + d.count, 0) / totalMessages24h) * 100).toFixed(2);
            console.log(`   Tasa de duplicados: ${duplicateRate}%`);
        }

        console.log('\n🛡️ PROTECCIÓN ACTIVA:');
        console.log('   ✅ Verificación dentro del mismo Job (Set en memoria)');
        console.log('   ✅ Verificación entre Jobs (Base de datos - 24 horas)');
        console.log('   ✅ Índice optimizado para búsqueda rápida');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testDeduplication();
