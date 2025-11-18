// Verificar si Rodriguez tiene validador asignado
const mongoose = require('mongoose');
require('dotenv').config();

const Audit = require('./src/models/Audit');
const User = require('./src/models/User');

async function checkValidador() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        const cuil = '20441724129';
        
        // Buscar la auditoría
        const audit = await Audit.findOne({ cuil: cuil })
            .select('nombre cuil validador asesor createdBy createdAt')
            .lean();
        
        if (!audit) {
            console.log(`❌ No se encontró auditoría con CUIL: ${cuil}`);
            process.exit(1);
        }
        
        console.log('📋 AUDITORÍA:');
        console.log('   Nombre:', audit.nombre);
        console.log('   CUIL:', audit.cuil);
        console.log('   Creada:', audit.createdAt);
        console.log('   validador (campo en BD):', audit.validador);
        
        // Si tiene validador, buscar info del usuario
        if (audit.validador) {
            const validador = await User.findById(audit.validador)
                .select('nombre name email role')
                .lean();
            
            if (validador) {
                console.log('\n✅ VALIDADOR ASIGNADO:');
                console.log('   Nombre:', validador.nombre || validador.name);
                console.log('   Email:', validador.email);
                console.log('   Rol:', validador.role);
            } else {
                console.log('\n⚠️ El campo validador tiene un ID, pero el usuario NO existe en BD');
            }
        } else {
            console.log('\n❌ NO TIENE VALIDADOR ASIGNADO');
            console.log('\n🔍 Posibles razones:');
            console.log('   1. Se creó antes de que existiera el campo "validador"');
            console.log('   2. Se creó sin seleccionar validador en el formulario');
            console.log('   3. Hubo un error en el backend al guardar');
        }
        
        // Verificar quién la creó
        if (audit.createdBy) {
            const creator = await User.findById(audit.createdBy)
                .select('nombre name email role')
                .lean();
            
            if (creator) {
                console.log('\n👤 CREADA POR:');
                console.log('   Nombre:', creator.nombre || creator.name);
                console.log('   Email:', creator.email);
                console.log('   Rol:', creator.role);
            }
        }
        
        // Verificar el asesor
        if (audit.asesor) {
            const asesor = await User.findById(audit.asesor)
                .select('nombre name email numeroEquipo')
                .lean();
            
            if (asesor) {
                console.log('\n👤 ASESOR ASIGNADO:');
                console.log('   Nombre:', asesor.nombre || asesor.name);
                console.log('   Email:', asesor.email);
                console.log('   Equipo:', asesor.numeroEquipo);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkValidador();
