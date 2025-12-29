#!/usr/bin/env node

/**
 * Verification Script: Check specific audits supervisor snapshot
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Audit = require('../src/models/Audit');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dann-salud';

async function verifyAudits() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Check specific audits mentioned by user
        const cuils = ['27460071262', '27472734968'];

        for (const cuil of cuils) {
            const audit = await Audit.findOne({ 'afiliado.cuil': cuil })
                .populate('asesor')
                .populate('groupId')
                .sort({ createdAt: -1 }); // Get most recent

            if (audit) {
                console.log(`📋 Auditoría encontrada:`);
                console.log(`   CUIL: ${cuil}`);
                console.log(`   Nombre: ${audit.afiliado?.nombre || 'N/A'}`);
                console.log(`   Grupo: ${audit.groupId?.numeroEquipo || 'N/A'}`);
                console.log(`   Asesor: ${audit.asesor?.nombre || 'N/A'}`);
                console.log(`   Supervisor Snapshot: ${audit.supervisorSnapshot || '(ninguno)'}`);
                console.log(`   Fecha Creación: ${audit.createdAt}\n`);
            } else {
                console.log(`❌ No se encontró auditoría para CUIL: ${cuil}\n`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

verifyAudits();
