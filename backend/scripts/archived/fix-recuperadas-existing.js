// Script para marcar todas las auditorías recuperadas existentes con QR hecho
const mongoose = require('mongoose');
require('dotenv').config();

const Audit = require('./src/models/Audit');

async function fixExistingRecoveryAudits() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // Buscar todas las auditorías que:
        // 1. Tienen isRecovery = true (o tuvieron)
        // 2. Tienen status = "QR hecho" o "QR Hecho" (case-insensitive)
        // 3. NO tienen isRecuperada = true
        const result = await Audit.updateMany(
            {
                status: { $regex: /^QR hecho$/i }, // ✅ Case-insensitive
                $or: [
                    { isRecovery: true },
                    { recoveryDeletedAt: { $exists: true, $ne: null } }
                ],
                isRecuperada: { $ne: true }
            },
            {
                $set: {
                    isRecuperada: true
                }
            }
        );

        console.log(`✅ ${result.modifiedCount} auditorías actualizadas`);
        console.log(`   - Ahora tienen isRecuperada: true`);
        
        // Mostrar algunas auditorías actualizadas para verificación
        const updated = await Audit.find({
            status: { $regex: /^QR hecho$/i },
            isRecuperada: true,
            $or: [
                { isRecovery: true },
                { recoveryDeletedAt: { $exists: true, $ne: null } }
            ]
        }).select('nombre cuil status isRecuperada isRecovery recoveryDeletedAt').limit(10);

        console.log('\n📋 Algunas auditorías actualizadas:');
        updated.forEach(a => {
            console.log(`   • ${a.nombre} (${a.cuil}) - Status: ${a.status} - Recuperada: ${a.isRecuperada}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixExistingRecoveryAudits();
