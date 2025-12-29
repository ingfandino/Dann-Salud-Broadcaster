require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Audit = require('./src/models/Audit');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const mateo = await User.findOne({ nombre: /Mateo Viera/i });
        const numeroEquipo = mateo.numeroEquipo;
        
        console.log(`👤 Mateo Viera - Equipo ${numeroEquipo}\n`);

        const startOfMonth = new Date(2025, 10, 1);
        const validStates = ['QR hecho', 'Cargada', 'Aprobada'];
        
        // Lógica REPLICADA de liquidacionController.js
        const qrMonth = await Audit.find({
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        }).populate('asesor', 'numeroEquipo').lean().then(audits => {
            return audits.filter(audit => 
                audit.asesor?.numeroEquipo === numeroEquipo
            ).length;
        });
        
        console.log(`📊 QRs del Equipo ${numeroEquipo} (Nov 2025) - Lógica replicada: ${qrMonth}`);
        console.log('   (Debería coincidir exactamente con Liquidación)');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

test();
