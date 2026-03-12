/**
 * Script de migración v3: Corregir fechas con métodos UTC correctos
 * 
 * Ejecutar con: node scripts/fix-separation-dates.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const EmployeeSeparation = require('../src/models/EmployeeSeparation');
const Employee = require('../src/models/Employee');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dannsalud';

/**
 * Normaliza una fecha a las 12:00 UTC para evitar off-by-one-day
 * IMPORTANTE: Usa métodos getUTC* para evitar conversión a hora local
 */
function normalizeToNoonUTC(date) {
    if (!date) return null;
    const d = new Date(date);
    // Usar getUTCFullYear, getUTCMonth, getUTCDate para preservar la fecha original
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
}

async function fixSeparationDates() {
    try {
        console.log('🔌 Conectando a MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Conectado a MongoDB\n');

        const separations = await EmployeeSeparation.find({});
        console.log(`📋 Encontrados ${separations.length} registros de separación\n`);

        let updated = 0;
        let errors = 0;

        for (const sep of separations) {
            console.log(`\n🔍 Procesando: ${sep.nombreEmpleado}`);

            const employee = await Employee.findById(sep.employeeId);

            if (!employee) {
                console.log(`   ⚠️  Empleado no encontrado (ID: ${sep.employeeId})`);
                errors++;
                continue;
            }

            // Usar SOLO fechaIngreso
            const fechaCorrecta = employee.fechaIngreso;

            if (!fechaCorrecta) {
                console.log(`   ⚠️  El empleado no tiene fechaIngreso registrada`);
                errors++;
                continue;
            }

            // Mostrar la fecha original almacenada (en UTC)
            const fechaOriginal = new Date(fechaCorrecta);
            console.log(`   - fechaIngreso almacenada: ${fechaOriginal.toISOString()}`);
            console.log(`   - fechaIngreso (DD/MM/YYYY): ${fechaOriginal.getUTCDate()}/${fechaOriginal.getUTCMonth() + 1}/${fechaOriginal.getUTCFullYear()}`);

            // Normalizar a 12:00 UTC usando métodos UTC
            const fechaInicioNormalized = normalizeToNoonUTC(fechaCorrecta);
            const fechaBajaNormalized = normalizeToNoonUTC(sep.fechaBaja);

            // Actualizar el registro
            await EmployeeSeparation.findByIdAndUpdate(sep._id, {
                fechaInicio: fechaInicioNormalized,
                fechaBaja: fechaBajaNormalized
            });

            console.log(`   ✅ ACTUALIZADO:`);
            console.log(`      fechaInicio: ${fechaInicioNormalized.toISOString()} (${fechaInicioNormalized.getUTCDate()}/${fechaInicioNormalized.getUTCMonth() + 1}/${fechaInicioNormalized.getUTCFullYear()})`);
            console.log(`      fechaBaja: ${fechaBajaNormalized.toISOString()} (${fechaBajaNormalized.getUTCDate()}/${fechaBajaNormalized.getUTCMonth() + 1}/${fechaBajaNormalized.getUTCFullYear()})`);
            updated++;
        }

        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMEN:');
        console.log(`   - Total procesados: ${separations.length}`);
        console.log(`   - Actualizados: ${updated}`);
        console.log(`   - Errores: ${errors}`);
        console.log('='.repeat(50) + '\n');

        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

fixSeparationDates();
