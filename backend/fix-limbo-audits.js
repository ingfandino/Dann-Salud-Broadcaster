// Script para corregir auditorías en estado LIMBO
// (isRecovery=true pero recoveryMonth=undefined)

const mongoose = require('mongoose');
require('dotenv').config();

const Audit = require('./src/models/Audit');
const User = require('./src/models/User');

async function fixLimboAudits() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');
        
        // Estados que SÍ deben estar en Recovery
        const validRecoveryStates = [
            "Falta clave", 
            "Falta documentación",
            "Falta clave y documentación",
            "Pendiente"
        ];
        
        // ✅ BUSCAR: Auditorías con isRecovery=true pero sin recoveryMonth
        const limboAudits = await Audit.find({
            isRecovery: true,
            $or: [
                { recoveryMonth: { $exists: false } },
                { recoveryMonth: null },
                { recoveryMonth: undefined }
            ]
        })
        .populate('asesor', 'nombre numeroEquipo')
        .lean();
        
        console.log(`🔍 Auditorías en LIMBO encontradas: ${limboAudits.length}`);
        console.log('   (isRecovery=true pero recoveryMonth undefined/null)\n');
        
        if (limboAudits.length === 0) {
            console.log('✅ No hay auditorías en estado limbo. Todo está correcto.');
            process.exit(0);
        }
        
        // Mostrar muestra
        console.log('📋 MUESTRA (primeras 10):');
        limboAudits.slice(0, 10).forEach(a => {
            console.log(`   • ${a.nombre} (${a.cuil})`);
            console.log(`     Estado: "${a.status}" | Asesor: ${a.asesor?.nombre} | Equipo: ${a.asesor?.numeroEquipo}`);
        });
        
        // Separar por tipo
        const shouldBeInRecovery = limboAudits.filter(a => validRecoveryStates.includes(a.status));
        const shouldBeInFollowUp = limboAudits.filter(a => !validRecoveryStates.includes(a.status));
        
        console.log(`\n📊 ANÁLISIS:`);
        console.log(`   ✅ Con estado DE recuperación (mover a Recovery): ${shouldBeInRecovery.length}`);
        console.log(`   ⚠️  Con estado NO de recuperación (restaurar a FollowUp): ${shouldBeInFollowUp.length}`);
        
        if (shouldBeInRecovery.length > 0) {
            console.log(`\n   📋 Estados de recuperación encontrados:`);
            const estadosRecovery = {};
            shouldBeInRecovery.forEach(a => {
                estadosRecovery[a.status] = (estadosRecovery[a.status] || 0) + 1;
            });
            Object.entries(estadosRecovery).forEach(([status, count]) => {
                console.log(`      - ${status}: ${count}`);
            });
        }
        
        if (shouldBeInFollowUp.length > 0) {
            console.log(`\n   📋 Estados NO de recuperación encontrados:`);
            const estadosFollowUp = {};
            shouldBeInFollowUp.forEach(a => {
                estadosFollowUp[a.status] = (estadosFollowUp[a.status] || 0) + 1;
            });
            Object.entries(estadosFollowUp).forEach(([status, count]) => {
                console.log(`      - ${status}: ${count}`);
            });
        }
        
        // Buscar Rodriguez específicamente
        const rodriguez = limboAudits.find(a => a.cuil === '20441724129');
        if (rodriguez) {
            console.log(`\n🎯 Rodriguez Ezequiel Adonai encontrado:`);
            console.log(`   Estado: "${rodriguez.status}"`);
            console.log(`   Acción: ${validRecoveryStates.includes(rodriguez.status) ? 'Mover a Recovery' : 'Restaurar a FollowUp'}`);
        }
        
        console.log(`\n⏳ Esperando 5 segundos antes de ejecutar correcciones... (Ctrl+C para cancelar)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        
        // ✅ CORRECCIÓN 1: Auditorías con estados de recuperación → Establecer recoveryMonth
        if (shouldBeInRecovery.length > 0) {
            const result1 = await Audit.updateMany(
                {
                    _id: { $in: shouldBeInRecovery.map(a => a._id) }
                },
                {
                    $set: {
                        isRecovery: true, // Mantener
                        recoveryMonth: currentMonth, // ✅ Establecer mes actual
                        recoveryMovedAt: new Date()
                    }
                }
            );
            console.log(`\n✅ ${result1.modifiedCount} auditorías movidas a Recovery (recoveryMonth establecido)`);
        }
        
        // ✅ CORRECCIÓN 2: Auditorías sin estados de recuperación → Restaurar a FollowUp
        if (shouldBeInFollowUp.length > 0) {
            const result2 = await Audit.updateMany(
                {
                    _id: { $in: shouldBeInFollowUp.map(a => a._id) }
                },
                {
                    $set: {
                        isRecovery: false,
                        recoveryMonth: null,
                        recoveryMovedAt: null,
                        recoveryDeletedAt: null
                    }
                }
            );
            console.log(`✅ ${result2.modifiedCount} auditorías restauradas a FollowUp (isRecovery=false)`);
        }
        
        // Verificar Rodriguez
        if (rodriguez) {
            const updatedRodriguez = await Audit.findOne({ cuil: '20441724129' })
                .select('nombre cuil status isRecovery recoveryMonth')
                .lean();
            
            console.log(`\n🎯 Estado FINAL de Rodriguez:`);
            console.log(`   Estado: "${updatedRodriguez.status}"`);
            console.log(`   isRecovery: ${updatedRodriguez.isRecovery}`);
            console.log(`   recoveryMonth: ${updatedRodriguez.recoveryMonth || 'null'}`);
            console.log(`   Visible en: ${updatedRodriguez.isRecovery ? 'Recovery' : 'FollowUp'}`);
        }
        
        console.log(`\n✅ CORRECCIÓN COMPLETADA`);
        console.log(`\n📌 SIGUIENTE PASO:`);
        console.log(`   1. Refresca la página de FollowUp (Ctrl+F5)`);
        console.log(`   2. Verifica que Rodriguez aparezca ${validRecoveryStates.includes(rodriguez?.status) ? 'en Recovery' : 'en FollowUp'}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixLimboAudits();
