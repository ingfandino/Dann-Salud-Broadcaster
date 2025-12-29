// Script para actualizar fechaCreacionQR para TODOS los registros de Aryel Puiggros - Noviembre 2025
const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-10', cuil: '27477539314', nombre: 'VALENTINA SOTELO' },
    { fecha: '2025-11-10', cuil: '20443034812', nombre: 'LAVERIA TOBIAS' },
    { fecha: '2025-11-10', cuil: '23434736064', nombre: 'SANCHEZ MAIRA' },
    { fecha: '2025-11-11', cuil: '20458257427', nombre: 'TOMAS BELIZAN' },
    { fecha: '2025-11-11', cuil: '20417787985', nombre: 'ROMERO DEL PINO' },
    { fecha: '2025-11-11', cuil: '20453945015', nombre: 'ENZO VILLALBA' },
    { fecha: '2025-11-12', cuil: '20954621562', nombre: 'SEBASTIAN ORTIZ' },
    { fecha: '2025-11-12', cuil: '20944625306', nombre: 'MARCOS ACOSTA' },
    { fecha: '2025-11-12', cuil: '20480347642', nombre: 'LAUTARO ARANGÙIS' },
    { fecha: '2025-11-12', cuil: '20441325615', nombre: 'AGUSTIN SANDOVAL' },
    { fecha: '2025-11-12', cuil: '20440924485', nombre: 'VILLAVICENCIO AGUSTIN' },
    { fecha: '2025-11-13', cuil: '20445597350', nombre: 'EZEQUIEL FERNANDEZ' },
    { fecha: '2025-11-13', cuil: '20422284991', nombre: 'ALVAREZ NAZARENO' },
    { fecha: '2025-11-13', cuil: '20454153171', nombre: 'AGUSTIN ARCE' },
    { fecha: '2025-11-13', cuil: '20469142109', nombre: 'MATIAS REGUEIRA' },
    { fecha: '2025-11-14', cuil: '27444575986', nombre: 'CANDELA PEDRA' },
    { fecha: '2025-11-14', cuil: '20420535989', nombre: 'FLEITA KEVIN' },
    { fecha: '2025-11-17', cuil: '27442688333', nombre: 'FERNANDEZ MARIANA' },
    { fecha: '2025-11-18', cuil: '23944468129', nombre: 'ISAAC MONTECINOS' },
    { fecha: '2025-11-19', cuil: '20474184146', nombre: 'SOTELO LEONEL' },
    { fecha: '2025-11-20', cuil: '20470235234', nombre: 'FLEITAS LEANDRO' },
    { fecha: '2025-11-20', cuil: '20475109326', nombre: 'ALVAREZ MAXIMILIANO' },
    { fecha: '2025-11-20', cuil: '23421188769', nombre: 'BALDERRAMA ANGEL DAVID' },
    { fecha: '2025-11-21', cuil: '27455757261', nombre: 'GALOCHA MAIRA SILVINA' },
    { fecha: '2025-11-21', cuil: '27458712641', nombre: 'LOPEZ BELEN' },
    { fecha: '2025-11-21', cuil: '27444151442', nombre: 'MOLINA ROCIO' },
    { fecha: '2025-11-25', cuil: '27467006393', nombre: 'BIANCA CARUSSO' },
    { fecha: '2025-11-26', cuil: '20456056858', nombre: 'TRIPOLI LUCAS' },
    { fecha: '2025-11-27', cuil: '20444518651', nombre: 'OCAMPO LEONARDO GABRIEL' },
    { fecha: '2025-11-28', cuil: '20469359701', nombre: 'ALEJANDRO SANCHEZ' },
    { fecha: '2025-11-29', cuil: '20469939856', nombre: 'GABRIEL JIMENEZ' },
    { fecha: '2025-11-29', cuil: '27424727798', nombre: 'IGNACIO CHOQUE KAREN MICAELA' },
    { fecha: '2025-11-29', cuil: '20462935162', nombre: 'VERDEJO AGUSTIN NICOLAS' },
    { fecha: '2025-11-03', cuil: '20483729473', nombre: 'FERNANDEZ IAGO EMANUEL' },
    { fecha: '2025-11-03', cuil: '27944413222', nombre: 'CORREA CARNEIRO SONIA PATRICIA' },
    { fecha: '2025-11-03', cuil: '27452197141', nombre: 'DELVALLE FLOR DORIS VALERIA' },
    { fecha: '2025-11-03', cuil: '27471842562', nombre: 'DIAZ DAFNE ABIGAIL' },
    { fecha: '2025-11-03', cuil: '27451475334', nombre: 'GONZALEZ HAIDBANXXER KIARA' },
    { fecha: '2025-11-04', cuil: '20462907614', nombre: 'CARBO ALEJANDRO AGUSTIN' },
    { fecha: '2025-11-04', cuil: '20469140971', nombre: 'GONZALEZ LEGUIZAMON CRISTIAN DAVID' },
    { fecha: '2025-11-05', cuil: '20460275793', nombre: 'FOSSACECA TIAGO' },
    { fecha: '2025-11-05', cuil: '27456264307', nombre: 'LARREA LEIVA LUDMILA SOLANGE' },
    { fecha: '2025-11-06', cuil: '20467496892', nombre: 'VERA ALAN EZEQUIEL' },
    { fecha: '2025-11-06', cuil: '20435715193', nombre: 'PEREYRA AGUSTIN' },
    { fecha: '2025-11-06', cuil: '20421368709', nombre: 'DARRICHON MAURO' },
    { fecha: '2025-11-07', cuil: '20472362802', nombre: 'BLANCO MAXIMILIANO GABRIEL' },
    { fecha: '2025-11-07', cuil: '27452390235', nombre: 'GIULIANA CIRUZZI' },
    { fecha: '2025-11-07', cuil: '20439790270', nombre: 'BARBOZA LUCAS' },
    { fecha: '2025-11-08', cuil: '27413040049', nombre: 'YESICA NUÑEZ' },
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
