require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Audit = require('./src/models/Audit');

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const mateo = await User.findOne({ nombre: /Mateo Viera/i });
        const numeroEquipo = mateo.numeroEquipo;
        
        console.log(`👤 Mateo Viera - Equipo ${numeroEquipo}\n`);

        // Nueva lógica: buscar asesores del equipo
        const asesoresDelEquipo = await User.find({ 
            numeroEquipo,
            role: 'asesor',
            active: true 
        }).select('nombre');
        
        console.log(`📋 Asesores del Equipo ${numeroEquipo}: ${asesoresDelEquipo.length}`);
        asesoresDelEquipo.forEach(a => console.log(`   - ${a.nombre}`));
        console.log('');

        const asesorIds = asesoresDelEquipo.map(u => u._id);
        const startOfMonth = new Date(2025, 10, 1);
        const validStates = ['QR hecho', 'Cargada', 'Aprobada'];
        
        const qrMonth = await Audit.countDocuments({
            asesor: { $in: asesorIds },
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        });
        
        console.log(`📊 QRs del Equipo ${numeroEquipo} en Noviembre 2025: ${qrMonth}`);
        console.log('   (Debería ser ~77 según Liquidación)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
