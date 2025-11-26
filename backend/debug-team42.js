// Script de diagnóstico para investigar el equipo 42
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Audit = require('./src/models/Audit');
const envConfig = require('./src/config');

async function diagnose() {
    try {
        await mongoose.connect(envConfig.MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        // 1. Buscar al supervisor Nahuel Sanchez
        console.log('=== SUPERVISOR NAHUEL SANCHEZ ===');
        const supervisor = await User.findOne({
            nombre: /nahuel.*sanchez/i,
            role: { $in: ['supervisor', 'supervisor_reventa'] }
        });

        if (supervisor) {
            console.log('Encontrado:');
            console.log('  - ID:', supervisor._id);
            console.log('  - Nombre:', supervisor.nombre);
            console.log('  - Role:', supervisor.role);
            console.log('  - numeroEquipo:', supervisor.numeroEquipo);
            console.log('  - Email:', supervisor.email);
        } else {
            console.log('❌ No se encontró al supervisor');
        }

        // 2. Buscar todos los usuarios del equipo 42
        console.log('\n=== USUARIOS DEL EQUIPO 42 ===');
        const team42Users = await User.find({
            numeroEquipo: '42',
            active: { $ne: false }
        }).select('nombre role numeroEquipo email');

        console.log(`Total usuarios activos con numeroEquipo='42': ${team42Users.length}`);
        team42Users.forEach(u => {
            console.log(`  - ${u.nombre} (${u.role}) - numeroEquipo: "${u.numeroEquipo}"`);
        });

        // 3. Buscar asesores del equipo 42
        console.log('\n=== ASESORES DEL EQUIPO 42 ===');
        const asesores42 = await User.find({
            numeroEquipo: '42',
            role: { $in: ['asesor', 'auditor'] },
            active: { $ne: false }
        }).select('nombre role numeroEquipo email');

        console.log(`Total asesores/auditores activos: ${asesores42.length}`);
        asesores42.forEach(u => {
            console.log(`  - ${u.nombre} (${u.role})`);
        });

        // 4. Buscar una auditoría de ejemplo del equipo 42
        console.log('\n=== AUDITORÍA DE EJEMPLO DEL EQUIPO 42 ===');
        const sampleAudit = await Audit.findOne({})
            .populate('asesor', 'nombre numeroEquipo role')
            .populate('groupId', 'nombre numeroEquipo')
            .sort({ createdAt: -1 });

        if (sampleAudit && sampleAudit.asesor) {
            console.log('Auditoría encontrada:');
            console.log('  - ID:', sampleAudit._id);
            console.log('  - Afiliado:', sampleAudit.nombre);
            console.log('  - Asesor:', sampleAudit.asesor?.nombre);
            console.log('  - Asesor numeroEquipo:', sampleAudit.asesor?.numeroEquipo);
            console.log('  - groupId (objeto):', sampleAudit.groupId);
        }

        // 5. Verificar variaciones de numeroEquipo
        console.log('\n=== VARIACIONES DE numeroEquipo EN LA BASE ===');
        const allNumeroEquipos = await User.distinct('numeroEquipo');
        console.log('Valores únicos de numeroEquipo:', allNumeroEquipos.filter(Boolean));

        await mongoose.disconnect();
        console.log('\n✅ Diagnóstico completado');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

diagnose();
