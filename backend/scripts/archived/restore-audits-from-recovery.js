// Script para restaurar auditorías que fueron movidas incorrectamente a Recovery
// ANTES de que se implementara el cron job correcto

const mongoose = require('mongoose');
require('dotenv').config();

const Audit = require('./src/models/Audit');
const User = require('./src/models/User'); // ✅ Requerido para populate

async function restoreAudits() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');
        
        console.log('\n🔍 Buscando auditorías marcadas incorrectamente...\n');
        
        // Estados que SÍ deben estar en Recovery
        const validRecoveryStates = [
            "Falta clave", 
            "Falta documentación",
            "Falta clave y documentación",
            "Pendiente"
        ];
        
        // ✅ ESTRATEGIA 1: Buscar auditorías con isRecovery=true pero que NO tienen estados de recuperación
        const wronglyMarked = await Audit.find({
            isRecovery: true,
            status: { $nin: validRecoveryStates }
        }).select('nombre cuil status isRecovery recoveryMovedAt asesor').populate('asesor', 'nombre numeroEquipo').lean();
        
        console.log(`📋 Auditorías con isRecovery=true pero estado incorrecto: ${wronglyMarked.length}`);
        
        if (wronglyMarked.length > 0) {
            console.log('\n🔍 Muestra:');
            wronglyMarked.slice(0, 10).forEach(a => {
                console.log(`   • ${a.nombre} (${a.cuil}) - Estado: "${a.status}" - Asesor: ${a.asesor?.nombre}`);
            });
        }
        
        // ✅ ESTRATEGIA 2: Buscar ESPECÍFICAMENTE la auditoría de Rodriguez
        const rodriguez = await Audit.findOne({ cuil: '20441724129' })
            .populate('asesor', 'nombre numeroEquipo')
            .lean();
        
        if (rodriguez) {
            console.log('\n🎯 Auditoría de Rodriguez Ezequiel Adonai:');
            console.log('   Nombre:', rodriguez.nombre);
            console.log('   Estado:', rodriguez.status);
            console.log('   isRecovery:', rodriguez.isRecovery);
            console.log('   Asesor:', rodriguez.asesor?.nombre);
            console.log('   Equipo:', rodriguez.asesor?.numeroEquipo);
        }
        
        // ✅ CORRECCIÓN: Restaurar auditorías que NO deberían estar en Recovery
        console.log('\n❓ ¿Deseas restaurar estas auditorías a FollowUp? (Ctrl+C para cancelar o espera 5s)');
        
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const result = await Audit.updateMany(
            {
                isRecovery: true,
                status: { $nin: validRecoveryStates }
            },
            {
                $set: {
                    isRecovery: false,
                    recoveryMovedAt: null,
                    recoveryDeletedAt: null,
                    recoveryMonth: null
                }
            }
        );
        
        console.log(`\n✅ ${result.modifiedCount} auditorías restauradas a FollowUp`);
        
        // Verificar Rodriguez específicamente
        if (rodriguez && !validRecoveryStates.includes(rodriguez.status)) {
            console.log(`✅ Auditoría de Rodriguez restaurada (si tenía isRecovery=true)`);
        }
        
        // Mostrar auditorías restauradas
        const restored = await Audit.find({
            _id: { $in: wronglyMarked.map(a => a._id) }
        }).select('nombre cuil status isRecovery').lean();
        
        console.log('\n📋 Auditorías restauradas (verificación):');
        restored.slice(0, 10).forEach(a => {
            console.log(`   • ${a.nombre} (${a.cuil}) - Estado: "${a.status}" - isRecovery: ${a.isRecovery}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

restoreAudits();
