// Script para actualizar fechaCreacionQR para TODOS los registros de Joaquin Valdez - Noviembre 2025
const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-29', cuil: '27475344702', nombre: 'LOPEZ TAMARA' },
    { fecha: '2025-11-29', cuil: '20465576074', nombre: 'LUDUENA TOMAS' },
    { fecha: '2025-11-29', cuil: '27470658733', nombre: 'CHAU ROCIO DEL PILAR ELIZABETH' },
    { fecha: '2025-11-28', cuil: '20461879323', nombre: 'LOPEZ ANDRES EDUARDO' },
    { fecha: '2025-11-28', cuil: '20446498062', nombre: 'GONZÁLEZ TOMAS' },
    { fecha: '2025-11-27', cuil: '20455377510', nombre: 'FERNANDEZ MATIAS CLAUDIO' },
    { fecha: '2025-11-27', cuil: '20454994133', nombre: 'PUCCIO BLAS VALENTIN' },
    { fecha: '2025-11-27', cuil: '20374813944', nombre: 'AGUILAR ANDRES NICOLAS' },
    { fecha: '2025-11-27', cuil: '27428215864', nombre: 'DEL PIN LEILA' },
    { fecha: '2025-11-27', cuil: '27441310337', nombre: 'GRAMAJO TATIANA' },
    { fecha: '2025-11-26', cuil: '27470717519', nombre: 'EQUICE LLANOS AYLEN ELIANA' },
    { fecha: '2025-11-26', cuil: '20427774830', nombre: 'FLORES FRANCO YAMIL' },
    { fecha: '2025-11-26', cuil: '20437973238', nombre: 'OÑATE RODRIGO GUILLERMO' },
    { fecha: '2025-11-25', cuil: '27429346563', nombre: 'VERA LUCIA' },
    { fecha: '2025-11-24', cuil: '27430012229', nombre: 'PÉREZ FLORES AYELEN' },
    { fecha: '2025-11-24', cuil: '20389389278', nombre: 'ALAN CLAVIJO' },
    { fecha: '2025-11-21', cuil: '20392752219', nombre: 'LEIVA JOSE HERNAN' },
    { fecha: '2025-11-20', cuil: '20412016352', nombre: 'SEGURA DANEL CARLOS' },
    { fecha: '2025-11-20', cuil: '27391034430', nombre: 'IBAÑE ROCIO BELEN' },
    { fecha: '2025-11-20', cuil: '27444239439', nombre: 'AGUIRRE TANIA YAZMIN' },
    { fecha: '2025-11-19', cuil: '20435834311', nombre: 'MUÑOZ ALEXIS EZEQUIEL' },
    { fecha: '2025-11-19', cuil: '23434052149', nombre: 'ABADI IVÁN ALEJANDRO' },
    { fecha: '2025-11-18', cuil: '20446128516', nombre: 'DIEGO ROCHA' },
    { fecha: '2025-11-17', cuil: '20440947078', nombre: 'LOBO MAURICIO EZEQUIEL' },
    { fecha: '2025-11-17', cuil: '20418026112', nombre: 'PIANT FACUNDO ANDRES' },
    { fecha: '2025-11-15', cuil: '20942626259', nombre: 'AREVALOS ORTIZ AMILCAR ARNALDO' },
    { fecha: '2025-11-13', cuil: '27439750478', nombre: 'LEDESMA CAMILA LUDMILA' },
    { fecha: '2025-11-13', cuil: '20437295698', nombre: 'AXEL LOTO' },
    { fecha: '2025-11-13', cuil: '20454991320', nombre: 'SERGIO DIAZ' },
    { fecha: '2025-11-13', cuil: '20439109603', nombre: 'FLEITAS AMARILLO MARCELO' },
    { fecha: '2025-11-11', cuil: '27460308394', nombre: 'AZUL MANZI' },
    { fecha: '2025-11-11', cuil: '20463416061', nombre: 'BAZAN EMILIANO' },
    { fecha: '2025-11-11', cuil: '27458242815', nombre: 'GUZMAN ESTRELLA BELEN' },
    { fecha: '2025-11-10', cuil: '20441625813', nombre: 'DUBRAVKA THIAGO' },
    { fecha: '2025-11-10', cuil: '20446002725', nombre: 'EITAN FUNES' },
    { fecha: '2025-11-07', cuil: '27472736448', nombre: 'REZNIK CAMILA' },
    { fecha: '2025-11-07', cuil: '20476532524', nombre: 'GUIDA CAMILO ALEJANDRO' },
    { fecha: '2025-11-07', cuil: '20457361204', nombre: 'ROCCA LEANDRO URIEL' },
    { fecha: '2025-11-07', cuil: '27462848639', nombre: 'ROMERO CELESTE ARIANA' },
    { fecha: '2025-11-06', cuil: '20459395076', nombre: 'DEL RIO DIEGO RAMIRO' },
    { fecha: '2025-11-06', cuil: '23465847069', nombre: 'LUNA LEANDRO AGUSTIN' },
    { fecha: '2025-11-06', cuil: '27466000278', nombre: 'PEREZ ZARZA PILAR' },
    { fecha: '2025-11-06', cuil: '27434445464', nombre: 'CACERES SOFIA MAGALI' },
    { fecha: '2025-11-06', cuil: '20461103082', nombre: 'FARIAS NICOLAS EDUARDO' },
    { fecha: '2025-11-06', cuil: '20452980070', nombre: 'GIMENEZ RAMIRO ARIEL' },
    { fecha: '2025-11-06', cuil: '20472361474', nombre: 'VALDEZ MAURICIO' },
    { fecha: '2025-11-05', cuil: '27406077271', nombre: 'GIMENEZ DANIELA ALEJANDRA' },
    { fecha: '2025-11-04', cuil: '20417649515', nombre: 'MUÑOZ MAXIMILIANO' },
    { fecha: '2025-11-04', cuil: '20474854788', nombre: 'RATTARO URIEL EZEQUIEL' },
    { fecha: '2025-11-04', cuil: '20469131409', nombre: 'PERALTA NAHUEL CARLOS GABRIEL' },
    { fecha: '2025-11-03', cuil: '23471859729', nombre: 'ZIEBA MARIANO ANTONIO' },
    { fecha: '2025-11-03', cuil: '27456785439', nombre: 'SOSA FERNANDA LUDMILA' },
    { fecha: '2025-11-03', cuil: '27452880763', nombre: 'LUNA LUCIA MEDELIS' },
    { fecha: '2025-11-03', cuil: '27452841784', nombre: 'GALEANO ALMA MARTINA' },
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
        console.log('Total registros:', records.length);
        console.log('Ya correctos:', alreadyCorrect);
        console.log('Actualizados:', updated);
        console.log('No encontrados:', notFound.length);

        if (notFound.length > 0) {
            console.log('\n=== NO ENCONTRADOS ===');
            notFound.forEach(r => console.log(`  ❌ ${r.cuil} - ${r.nombre}`));
        }

        // Now let's check if all 54 are in status 'QR hecho' and have supervisor 'Joaquin Valdez'
        console.log('\n=== VERIFICACIÓN FINAL ===');

        const cuils = records.map(r => r.cuil);
        const audits = await Audit.find({ cuil: { $in: cuils } })
            .populate('asesor', 'nombre supervisor')
            .populate({ path: 'asesor', populate: { path: 'supervisor', select: 'nombre' } })
            .lean();

        console.log('Total encontrados:', audits.length);

        const wrongStatus = audits.filter(a => a.status !== 'QR hecho');
        if (wrongStatus.length > 0) {
            console.log('\n❌ Con status diferente a "QR hecho":');
            wrongStatus.forEach(a => console.log(`  - ${a.cuil} ${a.nombre}: status="${a.status}"`));
        }

        // Check supervisor assignment
        const withoutSupervisor = audits.filter(a => {
            const supName = a.supervisorSnapshot?.nombre || a.asesor?.supervisor?.nombre;
            return !supName || !supName.toLowerCase().includes('joaquin');
        });

        if (withoutSupervisor.length > 0) {
            console.log('\n❌ Sin supervisor Joaquin Valdez asignado:');
            withoutSupervisor.forEach(a => {
                const supName = a.supervisorSnapshot?.nombre || a.asesor?.supervisor?.nombre || 'ninguno';
                console.log(`  - ${a.cuil} ${a.nombre}: supervisor="${supName}"`);
            });
        }

        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
