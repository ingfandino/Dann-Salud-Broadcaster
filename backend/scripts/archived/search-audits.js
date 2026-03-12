#!/usr/bin/env node

/**
 * Verification Script: Search for audits by affiliate name
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Audit = require('../src/models/Audit');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dann-salud';

async function searchAudits() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Search by affiliate names
        const searchTerms = [
            'BARRIOS NEMMI',
            'ALDANA ABRIL'
        ];

        for (const term of searchTerms) {
            console.log(`🔍 Buscando: "${term}"`);
            const audits = await Audit.find({
                'afiliado.nombre': { $regex: term, $options: 'i' }
            })
                .populate('asesor')
                .populate('groupId')
                .sort({ createdAt: -1 })
                .limit(3);

            if (audits.length > 0) {
                console.log(`   ✅ Encontradas ${audits.length} auditoría(s):\n`);
                for (const audit of audits) {
                    console.log(`   📋 Auditoría ID: ${audit._id}`);
                    console.log(`      CUIL: ${audit.afiliado?.cuil || 'N/A'}`);
                    console.log(`      Nombre: ${audit.afiliado?.nombre || 'N/A'}`);
                    console.log(`      Grupo ID: ${audit.groupId?._id || 'N/A'}`);
                    console.log(`      Grupo Número: ${audit.groupId?.numeroEquipo || 'N/A'}`);
                    console.log(`      Asesor: ${audit.asesor?.nombre || 'N/A'} (ID: ${audit.asesor?._id || 'N/A'})`);
                    console.log(`      Asesor NumeroEquipo: ${audit.asesor?.numeroEquipo || 'N/A'}`);
                    console.log(`      Supervisor Snapshot: ${audit.supervisorSnapshot || '(ninguno)'}`);
                    console.log(`      Created At: ${audit.createdAt}`);
                    console.log(`      Scheduled At: ${audit.scheduledAt || 'N/A'}`);
                    console.log(`      FechaCreacionQR: ${audit.fechaCreacionQR || 'N/A'}\n`);
                }
            } else {
                console.log(`   ❌ No se encontraron auditorías\n`);
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

searchAudits();
