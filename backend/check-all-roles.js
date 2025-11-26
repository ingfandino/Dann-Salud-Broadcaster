require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Audit = require('./src/models/Audit');

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const mateo = await User.findOne({ nombre: /Mateo Viera/i });
        const numeroEquipo = '23';
        
        console.log(`👤 Mateo Viera - Equipo ${numeroEquipo}\n`);

        // Buscar TODOS los usuarios del equipo (no solo asesores)
        const todosDelEquipo = await User.find({ 
            numeroEquipo,
            active: true 
        }).select('nombre role');
        
        console.log(`📋 TODOS los usuarios del Equipo ${numeroEquipo}: ${todosDelEquipo.length}`);
        todosDelEquipo.forEach(u => console.log(`   - ${u.nombre} (${u.role})`));
        console.log('');

        const todosIds = todosDelEquipo.map(u => u._id);
        const startOfMonth = new Date(2025, 10, 1);
        const validStates = ['QR hecho', 'Cargada', 'Aprobada'];
        
        // Contar por asesor (cualquier rol del equipo)
        const qrByAsesor = await Audit.countDocuments({
            asesor: { $in: todosIds },
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        });
        
        console.log(`📊 QRs con asesor del Equipo ${numeroEquipo} (Nov 2025): ${qrByAsesor}`);
        
        // Contar por createdBy (para comparar)
        const qrByCreatedBy = await Audit.countDocuments({
            createdBy: { $in: todosIds },
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        });
        
        console.log(`📊 QRs con createdBy del Equipo ${numeroEquipo} (Nov 2025): ${qrByCreatedBy}`);
        
        // Contar por validador
        const qrByValidador = await Audit.countDocuments({
            validador: { $in: todosIds },
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        });
        
        console.log(`📊 QRs con validador del Equipo ${numeroEquipo} (Nov 2025): ${qrByValidador}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

check();
