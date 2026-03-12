// Script de migración urgente: Recuperar auditorías perdidas
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dann-salud-broadcaster';

const AuditSchema = new mongoose.Schema({}, { strict: false });
const Audit = mongoose.model('Audit', AuditSchema);

async function migrateRecoveryAudits() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        
        // Estados que deben estar en Recuperación
        const recoveryStates = [
            "Falta clave", 
            "Falta documentación",
            "Falta clave y documentación",
            "Pendiente"
        ];

        // Buscar todas las auditorías con estos estados
        const audits = await Audit.find({
            status: { $in: recoveryStates }
        });

        console.log(`\n📊 Auditorías encontradas con estados de recuperación: ${audits.length}`);

        if (audits.length === 0) {
            console.log('❌ No se encontraron auditorías con esos estados');
            return;
        }

        // Mostrar resumen por estado
        const countByStatus = {};
        recoveryStates.forEach(state => {
            const count = audits.filter(a => a.status === state).length;
            if (count > 0) {
                countByStatus[state] = count;
                console.log(`   - ${state}: ${count}`);
            }
        });

        // Preguntar confirmación
        console.log(`\n⚠️  Se marcarán ${audits.length} auditorías para Recuperación`);
        console.log(`   recoveryMonth: ${currentMonth}`);
        console.log(`   isRecovery: true`);

        // Actualizar todas las auditorías
        const result = await Audit.updateMany(
            { 
                status: { $in: recoveryStates }
            },
            { 
                $set: { 
                    isRecovery: true,
                    recoveryMovedAt: new Date(),
                    recoveryMonth: currentMonth
                }
            }
        );

        console.log(`\n✅ Migración completada:`);
        console.log(`   - Auditorías actualizadas: ${result.modifiedCount}`);
        console.log(`   - Ahora visibles en pestaña Recuperación ♻️`);

        // Mostrar algunas auditorías como muestra
        console.log(`\n📋 Primeras 5 auditorías recuperadas:`);
        const sample = audits.slice(0, 5);
        sample.forEach((a, idx) => {
            console.log(`   ${idx + 1}. ${a.nombre || 'Sin nombre'} - CUIL: ${a.cuil || 'N/A'} - Estado: ${a.status}`);
        });

    } catch (error) {
        console.error('❌ Error en migración:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

migrateRecoveryAudits();
