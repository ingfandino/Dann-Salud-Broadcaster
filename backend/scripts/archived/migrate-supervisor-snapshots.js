#!/usr/bin/env node

/**
 * Migration Script: Recalculate supervisorSnapshot for all audits
 * 
 * This script updates the supervisorSnapshot field for all audits based on their
 * current groupId and asesor fields.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Audit = require('../src/models/Audit');
const { getSupervisorSnapshotForAudit } = require('../src/utils/supervisorHelper');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dann-salud';

async function migrateAudits() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Find all audits
        const audits = await Audit.find({}).populate('asesor groupId');
        console.log(`📊 Total de auditorías encontradas: ${audits.length}\n`);

        let updated = 0;
        let errors = 0;
        let unchanged = 0;

        for (const audit of audits) {
            try {
                const oldSupervisor = audit.supervisorSnapshot;

                // Calculate new supervisor snapshot using correct function signature
                // getSupervisorSnapshotForAudit expects (audit, asesor)
                const newSupervisor = await getSupervisorSnapshotForAudit(audit, audit.asesor);

                // Check if it changed
                if (JSON.stringify(oldSupervisor) !== JSON.stringify(newSupervisor)) {
                    // Update without triggering pre-save hooks (use updateOne)
                    await Audit.updateOne(
                        { _id: audit._id },
                        { $set: { supervisorSnapshot: newSupervisor } }
                    );

                    const oldName = oldSupervisor?.nombre || '(ninguno)';
                    const newName = newSupervisor?.nombre || '(ninguno)';

                    console.log(`✅ Actualizado: ${audit.afiliado?.nombre || 'Sin nombre'} (CUIL: ${audit.afiliado?.cuil || 'Sin CUIL'})`);
                    console.log(`   Grupo: ${audit.groupId?.numeroEquipo || 'N/A'}, Asesor: ${audit.asesor?.nombre || 'N/A'}`);
                    console.log(`   Supervisor: ${oldName} → ${newName}\n`);
                    updated++;
                } else {
                    unchanged++;
                }
            } catch (error) {
                console.error(`❌ Error en audit ${audit._id}:`, error.message);
                errors++;
            }
        }

        console.log('\n📈 Resumen de Migración:');
        console.log(`   ✅ Actualizados: ${updated}`);
        console.log(`   ⚪ Sin cambios: ${unchanged}`);
        console.log(`   ❌ Errores: ${errors}`);
        console.log(`   📊 Total procesados: ${audits.length}`);

    } catch (error) {
        console.error('❌ Error en migración:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Desconectado de MongoDB');
        process.exit(0);
    }
}

// Run migration
migrateAudits();
