// Script para verificar y corregir datos de Joaquin Valdez - Noviembre 2025
const mongoose = require('mongoose');
require('dotenv').config();

const expectedData = [
    { fecha: '2025-11-29', nombre: 'LOPEZ TAMARA', cuil: '27475344702', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-29', nombre: 'LUDUENA TOMAS', cuil: '20465576074', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-29', nombre: 'CHAU ROCIO DEL PILAR ELIZABETH', cuil: '27470658733', obraSocial: 'Binimed', asesor: 'Ledezma Santiago', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-28', nombre: 'LOPEZ ANDRES EDUARDO', cuil: '20461879323', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-28', nombre: 'GONZÁLEZ TOMAS', cuil: '20446498062', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-27', nombre: 'FERNANDEZ MATIAS CLAUDIO', cuil: '20455377510', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-27', nombre: 'PUCCIO BLAS VALENTIN', cuil: '20454994133', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-27', nombre: 'AGUILAR ANDRES NICOLAS', cuil: '20374813944', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-27', nombre: 'DEL PIN LEILA', cuil: '27428215864', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-27', nombre: 'GRAMAJO TATIANA', cuil: '27441310337', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-26', nombre: 'EQUICE LLANOS AYLEN ELIANA', cuil: '27470717519', obraSocial: 'Binimed', asesor: 'Ledezma Santiago', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-26', nombre: 'FLORES FRANCO YAMIL', cuil: '20427774830', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-26', nombre: 'OÑATE RODRIGO GUILLERMO', cuil: '20437973238', obraSocial: 'Meplife', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-25', nombre: 'VERA LUCIA', cuil: '27429346563', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-24', nombre: 'PÉREZ FLORES AYELEN', cuil: '27430012229', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-24', nombre: 'ALAN CLAVIJO', cuil: '20389389278', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-21', nombre: 'LEIVA JOSE HERNAN', cuil: '20392752219', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-20', nombre: 'SEGURA DANEL CARLOS', cuil: '20412016352', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-20', nombre: 'IBAÑE ROCIO BELEN', cuil: '27391034430', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-20', nombre: 'AGUIRRE TANIA YAZMIN', cuil: '27444239439', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-19', nombre: 'MUÑOZ ALEXIS EZEQUIEL', cuil: '20435834311', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-19', nombre: 'ABADI IVÁN ALEJANDRO', cuil: '23434052149', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-18', nombre: 'DIEGO ROCHA', cuil: '20446128516', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-17', nombre: 'LOBO MAURICIO EZEQUIEL', cuil: '20440947078', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-17', nombre: 'PIANT FACUNDO ANDRES', cuil: '20418026112', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-15', nombre: 'AREVALOS ORTIZ AMILCAR ARNALDO', cuil: '20942626259', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-13', nombre: 'LEDESMA CAMILA LUDMILA', cuil: '27439750478', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-13', nombre: 'AXEL LOTO', cuil: '20437295698', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-13', nombre: 'SERGIO DIAZ', cuil: '20454991320', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-13', nombre: 'FLEITAS AMARILLO MARCELO', cuil: '20439109603', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-11', nombre: 'AZUL MANZI', cuil: '27460308394', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-11', nombre: 'BAZAN EMILIANO', cuil: '20463416061', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-11', nombre: 'GUZMAN ESTRELLA BELEN', cuil: '27458242815', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-10', nombre: 'DUBRAVKA THIAGO', cuil: '20441625813', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-10', nombre: 'EITAN FUNES', cuil: '20446002725', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-07', nombre: 'REZNIK CAMILA', cuil: '27472736448', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-07', nombre: 'GUIDA CAMILO ALEJANDRO', cuil: '20476532524', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-07', nombre: 'ROCCA LEANDRO URIEL', cuil: '20457361204', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-07', nombre: 'ROMERO CELESTE ARIANA', cuil: '27462848639', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'DEL RIO DIEGO RAMIRO', cuil: '20459395076', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'LUNA LEANDRO AGUSTIN', cuil: '23465847069', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'PEREZ ZARZA PILAR', cuil: '27466000278', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'CACERES SOFIA MAGALI', cuil: '27434445464', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'FARIAS NICOLAS EDUARDO', cuil: '20461103082', obraSocial: 'Binimed', asesor: 'Paulina Suarez', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'GIMENEZ RAMIRO ARIEL', cuil: '20452980070', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-06', nombre: 'VALDEZ MAURICIO', cuil: '20472361474', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-05', nombre: 'GIMENEZ DANIELA ALEJANDRA', cuil: '27406077271', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-04', nombre: 'MUÑOZ MAXIMILIANO', cuil: '20417649515', obraSocial: 'Meplife', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-04', nombre: 'RATTARO URIEL EZEQUIEL', cuil: '20474854788', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-04', nombre: 'PERALTA NAHUEL CARLOS GABRIEL', cuil: '20469131409', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-03', nombre: 'ZIEBA MARIANO ANTONIO', cuil: '23471859729', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-03', nombre: 'SOSA FERNANDA LUDMILA', cuil: '27456785439', obraSocial: 'Binimed', asesor: 'Sabrina Castro', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-03', nombre: 'LUNA LUCIA MEDELIS', cuil: '27452880763', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
    { fecha: '2025-11-03', nombre: 'GALEANO ALMA MARTINA', cuil: '27452841784', obraSocial: 'Binimed', asesor: 'Matias del Mul', supervisor: 'Joaquin Valdez' },
];

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

        const issues = {
            notFound: [],
            wrongDate: [],
            wrongStatus: [],
            ok: []
        };

        for (const expected of expectedData) {
            const audit = await Audit.findOne({ cuil: expected.cuil }).lean();

            if (!audit) {
                issues.notFound.push(expected);
                continue;
            }

            // Check status
            if (audit.status !== 'QR hecho') {
                issues.wrongStatus.push({ expected, actual: audit });
                continue;
            }

            // Check date - extract just the date part
            const actualDateStr = audit.fechaCreacionQR
                ? audit.fechaCreacionQR.toISOString().split('T')[0]
                : (audit.scheduledAt ? audit.scheduledAt.toISOString().split('T')[0] : null);

            if (actualDateStr !== expected.fecha) {
                issues.wrongDate.push({
                    expected,
                    actual: { ...audit, actualDateStr }
                });
                continue;
            }

            issues.ok.push(expected.cuil);
        }

        console.log('\n=== RESUMEN ===');
        console.log('Total esperados:', expectedData.length);
        console.log('OK:', issues.ok.length);
        console.log('No encontrados:', issues.notFound.length);
        console.log('Fecha incorrecta:', issues.wrongDate.length);
        console.log('Status incorrecto:', issues.wrongStatus.length);

        if (issues.notFound.length > 0) {
            console.log('\n=== NO ENCONTRADOS ===');
            issues.notFound.forEach(r => console.log(`  - ${r.cuil} ${r.nombre}`));
        }

        if (issues.wrongDate.length > 0) {
            console.log('\n=== FECHA INCORRECTA ===');
            issues.wrongDate.forEach(r => {
                console.log(`  - ${r.expected.cuil} ${r.expected.nombre}`);
                console.log(`    Esperado: ${r.expected.fecha}, Actual: ${r.actual.actualDateStr}`);
            });
        }

        if (issues.wrongStatus.length > 0) {
            console.log('\n=== STATUS INCORRECTO ===');
            issues.wrongStatus.forEach(r => {
                console.log(`  - ${r.expected.cuil} ${r.expected.nombre}`);
                console.log(`    Esperado: QR hecho, Actual: ${r.actual.status}`);
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
