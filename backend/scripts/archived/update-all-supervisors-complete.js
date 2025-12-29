// Script COMPLETO para actualizar fechaCreacionQR y nombre para TODOS los supervisores
const mongoose = require('mongoose');
require('dotenv').config();

// ==================== JOAQUIN VALDEZ (54 registros) ====================
const joaquinValdez = [
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

// ==================== ARYEL PUIGGROS (49 registros) ====================
const aryelPuiggros = [
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

// ==================== LUCIANO CARUGNO (29 registros) ====================
const lucianoCarugno = [
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
        console.log('Connected to MongoDB\n');

        const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

        const allRecords = [
            { supervisor: 'Joaquin Valdez', records: joaquinValdez },
            { supervisor: 'Aryel Puiggros', records: aryelPuiggros },
            { supervisor: 'Luciano Carugno', records: lucianoCarugno },
        ];

        let totalUpdated = 0;
        let totalNotFound = 0;

        for (const group of allRecords) {
            console.log(`\n========== ${group.supervisor} (${group.records.length} registros) ==========`);
            let updated = 0;
            let notFound = [];

            for (const record of group.records) {
                const correctDate = new Date(record.fecha + 'T00:00:00.000Z');

                const audit = await Audit.findOne({ cuil: record.cuil }).lean();

                if (!audit) {
                    notFound.push(record);
                    continue;
                }

                // Update fechaCreacionQR AND nombre
                const result = await Audit.updateOne(
                    { cuil: record.cuil },
                    {
                        $set: {
                            fechaCreacionQR: correctDate,
                            nombre: record.nombre
                        }
                    }
                );

                if (result.modifiedCount > 0 || result.matchedCount > 0) {
                    updated++;
                    const oldName = audit.nombre || 'N/A';
                    if (oldName !== record.nombre) {
                        console.log(`✅ ${record.cuil}: "${oldName}" → "${record.nombre}" | Fecha: ${record.fecha}`);
                    }
                }
            }

            console.log(`\nResumen ${group.supervisor}: ${updated} actualizados, ${notFound.length} no encontrados`);

            if (notFound.length > 0) {
                console.log('No encontrados:');
                notFound.forEach(r => console.log(`  ❌ ${r.cuil} - ${r.nombre}`));
            }

            totalUpdated += updated;
            totalNotFound += notFound.length;
        }

        console.log('\n========== RESUMEN TOTAL ==========');
        console.log('Total registros procesados:', joaquinValdez.length + aryelPuiggros.length + lucianoCarugno.length);
        console.log('Total actualizados:', totalUpdated);
        console.log('Total no encontrados:', totalNotFound);

        await mongoose.disconnect();
        console.log('\nDone!');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
