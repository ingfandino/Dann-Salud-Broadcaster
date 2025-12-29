require('dotenv').config();
const mongoose = require('mongoose');
const Audit = require('./src/models/Audit');
const User = require('./src/models/User');

async function updateAudit() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const cuil = '20417159372';
        
        // Buscar la auditoría
        const audit = await Audit.findOne({ cuil }).populate('asesor');
        
        if (!audit) {
            console.log(`❌ No se encontró auditoría con CUIL: ${cuil}`);
            return;
        }
        
        console.log('📋 Auditoría encontrada:');
        console.log(`   Nombre: ${audit.nombre}`);
        console.log(`   CUIL: ${audit.cuil}`);
        console.log(`   Teléfono: ${audit.telefono}`);
        console.log(`   Estado: ${audit.status}`);
        console.log(`   Asesor actual: ${audit.asesor?.nombre || 'N/A'}`);
        console.log(`   Equipo actual: ${audit.asesor?.numeroEquipo || 'N/A'}`);
        console.log('');

        // Buscar a Naiara Jorge
        const naiara = await User.findOne({ 
            nombre: /Naiara Jorge/i,
            numeroEquipo: '166'
        });
        
        if (!naiara) {
            console.log('❌ No se encontró a Naiara Jorge en el equipo 166');
            return;
        }
        
        console.log('👤 Asesor nuevo encontrado:');
        console.log(`   Nombre: ${naiara.nombre}`);
        console.log(`   Equipo: ${naiara.numeroEquipo}`);
        console.log(`   Role: ${naiara.role}`);
        console.log('');

        // Actualizar la auditoría
        audit.asesor = naiara._id;
        await audit.save();
        
        console.log('✅ Auditoría actualizada exitosamente');
        console.log(`   Nueva asesora: ${naiara.nombre}`);
        console.log(`   Nuevo equipo: ${naiara.numeroEquipo}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n�� Desconectado de MongoDB');
    }
}

updateAudit();
