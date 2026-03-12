// Script para verificar numeroEquipo de usuarios
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar todos los supervisores
        const supervisores = await User.find({ 
            role: { $in: ['supervisor', 'Supervisor'] },
            active: true 
        }).select('nombre email role numeroEquipo');

        console.log('\n📊 SUPERVISORES ENCONTRADOS:', supervisores.length);
        console.log('='.repeat(80));

        supervisores.forEach((sup, index) => {
            console.log(`\n${index + 1}. ${sup.nombre}`);
            console.log(`   Email: ${sup.email}`);
            console.log(`   Role: ${sup.role}`);
            console.log(`   numeroEquipo: ${sup.numeroEquipo || '❌ NO ASIGNADO'}`);
            console.log(`   Tipo: ${typeof sup.numeroEquipo}`);
            
            if (!sup.numeroEquipo) {
                console.log('   ⚠️  PROBLEMA: Este supervisor NO tiene numeroEquipo asignado');
            }
        });

        // Buscar usuarios por numeroEquipo
        console.log('\n\n📋 USUARIOS POR EQUIPO:');
        console.log('='.repeat(80));

        const equipos = [...new Set(supervisores.map(s => s.numeroEquipo).filter(Boolean))];
        
        for (const equipo of equipos) {
            const miembros = await User.find({ 
                numeroEquipo: equipo,
                active: true 
            }).select('nombre email role');
            
            console.log(`\n🔹 Equipo ${equipo}: ${miembros.length} miembros`);
            miembros.forEach(m => {
                console.log(`   - ${m.nombre} (${m.role})`);
            });
        }

        mongoose.disconnect();
        console.log('\n✅ Desconectado de MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkUsers();
