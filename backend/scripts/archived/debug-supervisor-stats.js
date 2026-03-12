require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Audit = require('./src/models/Audit');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar a Mateo Viera
        const mateo = await User.findOne({ nombre: /Mateo Viera/i });
        if (!mateo) {
            console.log('❌ No se encontró a Mateo Viera');
            return;
        }
        
        console.log('👤 Mateo Viera encontrado:');
        console.log('   ID:', mateo._id);
        console.log('   Nombre:', mateo.nombre);
        console.log('   Role:', mateo.role);
        console.log('   Equipo:', mateo.numeroEquipo);
        console.log('   Supervisor:', mateo.supervisor);
        console.log('');

        // Buscar asesores que tienen a Mateo como supervisor
        const asesores = await User.find({ 
            supervisor: mateo._id,
            active: true 
        }).select('nombre role numeroEquipo supervisor');
        
        console.log(`📋 Asesores con Mateo como supervisor: ${asesores.length}`);
        asesores.forEach(a => {
            console.log(`   - ${a.nombre} (${a.role}, Equipo: ${a.numeroEquipo})`);
        });
        console.log('');

        // Buscar asesores del equipo 23
        const asesorEquipo23 = await User.find({
            numeroEquipo: '23',
            role: 'asesor',
            active: true
        }).select('nombre supervisor');
        
        console.log(`📋 Asesores del Equipo 23: ${asesorEquipo23.length}`);
        for (const a of asesorEquipo23) {
            await a.populate('supervisor', 'nombre');
            console.log(`   - ${a.nombre} → Supervisor: ${a.supervisor?.nombre || 'Sin supervisor'}`);
        }
        console.log('');

        // Contar auditorías del equipo 23 por createdBy
        const teamMembers = await User.find({ numeroEquipo: '23', active: true }).select('_id');
        const teamIds = teamMembers.map(u => u._id);
        
        const startOfMonth = new Date(2025, 10, 1); // Nov 1, 2025
        const validStates = ['QR hecho', 'Cargada', 'Aprobada'];
        
        const countByCreatedBy = await Audit.countDocuments({
            createdBy: { $in: teamIds },
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        });
        
        console.log(`📊 QRs del Equipo 23 (por createdBy, Nov 2025): ${countByCreatedBy}`);
        
        // Contar auditorías por asesor
        const asesorIds = asesores.map(a => a._id);
        const countByAsesor = await Audit.countDocuments({
            asesor: { $in: asesorIds },
            status: { $in: validStates },
            createdAt: { $gte: startOfMonth }
        });
        
        console.log(`📊 QRs con asesores de Mateo (por asesor, Nov 2025): ${countByAsesor}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
