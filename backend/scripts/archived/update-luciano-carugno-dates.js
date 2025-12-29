// Script para actualizar fechaCreacionQR para TODOS los registros de Luciano Carugno - Noviembre 2025
const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-29', cuil: '27439911862', nombre: 'ALEXIS JOEL PAEZ' },
    { fecha: '2025-11-26', cuil: '20427727336', nombre: 'FEDERICO NAHUEL ESTEVE' },
    { fecha: '2025-11-26', cuil: '20432397778', nombre: 'SAUL MERIDA CERVANTES' },
    { fecha: '2025-11-26', cuil: '20453942571', nombre: 'RAMIREZ FRANCISCO JAVIER' },
    { fecha: '2025-11-26', cuil: '27459260523', nombre: 'TEMPRANO GUADALUPE LOURDES' },
    { fecha: '2025-11-26', cuil: '20448920888', nombre: 'FACUNDO HERNAN DIAZ SALINAS' },
    { fecha: '2025-11-26', cuil: '27441566145', nombre: 'MACARENA PILAR RIVERA' },
    { fecha: '2025-11-26', cuil: '27446415854', nombre: 'JUANA NOVAS SALABERRY' },
    { fecha: '2025-11-26', cuil: '20459291548', nombre: 'AGUSTIN NICOLAS RODRIGUEZ' },
    { fecha: '2025-11-26', cuil: '27458879589', nombre: 'CESPEDES NAHIARA AGUSTINA' },
    { fecha: '2025-11-25', cuil: '20451463714', nombre: 'ZAIR CASTRO VAZQUEZ' },
    { fecha: '2025-11-19', cuil: '20433147155', nombre: 'FERNANDEZ GONZALO' },
    { fecha: '2025-11-18', cuil: '20421461822', nombre: 'NAHUEL AGUSTIN OROSCO' },
    { fecha: '2025-11-18', cuil: '20447375576', nombre: 'CRISTIAN RAUL KOSTESKI' },
    { fecha: '2025-11-18', cuil: '27264912917', nombre: 'MARTA LEONOR ROLDAN' },
    { fecha: '2025-11-18', cuil: '27461130734', nombre: 'IARA JACQUELINE IBARRA' },
    { fecha: '2025-11-14', cuil: '20441421983', nombre: 'LUCIANO EXEQUIEL MEDINA OLIVERA' },
    { fecha: '2025-11-14', cuil: '27442395433', nombre: 'NARELA SHAIEL BOZZANO' },
    { fecha: '2025-11-10', cuil: '27437188284', nombre: 'LUDMILA PAOLA GARAY MONTENEGRO' },
    { fecha: '2025-11-07', cuil: '27477352990', nombre: 'MILAGROS ELENA SHAMNE' },
    { fecha: '2025-11-07', cuil: '20464368419', nombre: 'CIRILO DAVID TORREZ' },
    { fecha: '2025-11-05', cuil: '20462065397', nombre: 'ALTAMIRANO FACUNDO NAHUEL' },
    { fecha: '2025-11-04', cuil: '27456224704', nombre: 'IBAÑEZ KAREN AYELEN' },
    { fecha: '2025-11-04', cuil: '20461227776', nombre: 'CATALANO DEMIAN GABRIEL' },
    { fecha: '2025-11-04', cuil: '20423685787', nombre: 'TORRES EMANUEL QUIMEY' },
    { fecha: '2025-11-04', cuil: '20959220515', nombre: 'AGUILERA DIAZ JAIRO JESUS' },
    { fecha: '2025-11-04', cuil: '27456887908', nombre: 'MEY MELINA ALDANA' },
    { fecha: '2025-11-04', cuil: '20462040556', nombre: 'OZUNA THIAGO EDGARDO' },
    { fecha: '2025-11-04', cuil: '20452340381', nombre: 'SANCHEZ DIEGO ARMANDO' },
];

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

        let updated = 0;
        let notFound = [];
        let alreadyCorrect = 0;

        for (const record of records) {
            const correctDate = new Date(record.fecha + 'T00:00:00.000Z');

            const audit = await Audit.findOne({ cuil: record.cuil }).lean();

            if (!audit) {
                notFound.push(record);
                continue;
            }

            // Check if already correct
            const currentDateStr = audit.fechaCreacionQR
                ? audit.fechaCreacionQR.toISOString().split('T')[0]
                : null;

            if (currentDateStr === record.fecha) {
                alreadyCorrect++;
                continue;
            }

            // Update the fechaCreacionQR
            const result = await Audit.updateOne(
                { cuil: record.cuil },
                { $set: { fechaCreacionQR: correctDate } }
            );

            if (result.modifiedCount > 0) {
                updated++;
                console.log(`✅ ${record.cuil} - ${record.nombre}: ${currentDateStr || 'null'} → ${record.fecha}`);
            }
        }

        console.log('\n=== RESUMEN ===');
        console.log('Total registros esperados:', records.length);
        console.log('Ya correctos:', alreadyCorrect);
        console.log('Actualizados:', updated);
        console.log('No encontrados:', notFound.length);

        if (notFound.length > 0) {
            console.log('\n=== NO ENCONTRADOS ===');
            notFound.forEach(r => console.log(`  ❌ ${r.cuil} - ${r.nombre}`));
        }

        await mongoose.disconnect();
        console.log('\nDone');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
