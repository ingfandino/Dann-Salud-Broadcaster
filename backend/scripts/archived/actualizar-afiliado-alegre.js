require('dotenv').config();
const mongoose = require('mongoose');
const Audit = require('./src/models/Audit');

async function actualizarAfiliado() {
    try {
        const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
        
        if (!MONGO_URI) {
            console.error('❌ ERROR: No se encontró MONGODB_URI ni MONGO_URI en las variables de entorno');
            return;
        }
        
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        const cuil = '20426843111';
        
        console.log('🔍 Buscando afiliado con CUIL:', cuil);
        
        // Buscar el afiliado
        const audit = await Audit.findOne({ cuil: cuil });
        
        if (!audit) {
            console.log('❌ No se encontró el afiliado');
            return;
        }
        
        console.log('✅ Afiliado encontrado:', audit.nombre);
        console.log('   Estado actual:', audit.status || 'vacío');
        console.log('   isRecovery:', audit.isRecovery);
        console.log('   recoveryMonth:', audit.recoveryMonth || 'null');
        
        console.log('\n📝 Actualizando...');
        
        // Actualizar el registro
        audit.status = 'QR hecho';
        audit.isRecovery = false;
        audit.recoveryMonth = null;
        audit.statusUpdatedAt = new Date();
        
        await audit.save();
        
        console.log('\n✅ ACTUALIZACIÓN EXITOSA');
        console.log('   Nuevo estado:', audit.status);
        console.log('   isRecovery:', audit.isRecovery);
        console.log('   recoveryMonth:', audit.recoveryMonth || 'null');
        console.log('   Actualizado en:', audit.statusUpdatedAt.toLocaleString('es-AR'));
        
        console.log('\n🎯 Resultado:');
        console.log('   ✅ Ahora debería aparecer en FollowUp.jsx');
        console.log('   ✅ Ahora debería aparecer en LiquidacionList.jsx (estado: QR hecho)');
        console.log('   ✅ Ya NO aparecerá en RecoveryList.jsx');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

actualizarAfiliado();
