// Script para actualizar fechaCreacionQR y nombre para Nahia Avellaneda y Facundo Tevez
const mongoose = require('mongoose');
require('dotenv').config();

// ==================== NAHIA AVELLANEDA (33 registros) ====================
const nahiaAvellaneda = [
    { fecha: '2025-11-29', cuil: '27424593643', nombre: 'ROMERO DANIELA MICAELA' },
    { fecha: '2025-11-27', cuil: '20449641133', nombre: 'MINGRONI THIAGO' },
    { fecha: '2025-11-27', cuil: '20450762483', nombre: 'FUNES MILTON' },
    { fecha: '2025-11-26', cuil: '20383909040', nombre: 'IVAN EDUARDO MENDOZA CACERES' },
    { fecha: '2025-11-25', cuil: '20419124363', nombre: 'DOPAZO NICOLAS' },
    { fecha: '2025-11-25', cuil: '23397080714', nombre: 'FERNANDEZ NATALIA ELISABET' },
    { fecha: '2025-11-25', cuil: '27440993058', nombre: 'MIÑIO VICTORIA SOFIA' },
    { fecha: '2025-11-01', cuil: '20231518305', nombre: 'CASTILLO WALTER HÉCTOR' },
    { fecha: '2025-11-24', cuil: '27423537448', nombre: 'GUADALUPE PEREZ' },
    { fecha: '2025-11-24', cuil: '20425710711', nombre: 'GALVAN GEREMIAS EZEQUIEL' },
    { fecha: '2025-11-22', cuil: '20433962045', nombre: 'SALOME ENRIQUEZ' },
    { fecha: '2025-11-21', cuil: '20444233126', nombre: 'SANTUCHO JAVIER IGNACIO' },
    { fecha: '2025-11-19', cuil: '20471388875', nombre: 'SALGUERO AXEL' },
    { fecha: '2025-11-18', cuil: '27427774959', nombre: 'CASTELO FLORENCIA' },
    { fecha: '2025-11-18', cuil: '20439108607', nombre: 'SANDOVAL MATIAS JAVIER' },
    { fecha: '2025-11-17', cuil: '20431816025', nombre: 'TORES HECTOR HUMBERTO' },
    { fecha: '2025-11-17', cuil: '27439182720', nombre: 'CEBALLOS YANINA ALEJANDRA' },
    { fecha: '2025-11-15', cuil: '27440965275', nombre: 'HUMOFFE MELINA JAZMIN' },
    { fecha: '2025-11-14', cuil: '27455264257', nombre: 'CALDERON MARTINA EMILY' },
    { fecha: '2025-11-14', cuil: '20418841770', nombre: 'CRESPIN VALERIA NOEMI' },
    { fecha: '2025-11-13', cuil: '23452994429', nombre: 'BASUALDO DAMIAN FACUNDO' },
    { fecha: '2025-11-12', cuil: '20435051775', nombre: 'BELMONTE GONZALO' },
    { fecha: '2025-11-11', cuil: '20440494847', nombre: 'AVILA FRANCISCO NAHUEL' },
    { fecha: '2025-11-11', cuil: '27464241812', nombre: 'MELINA NEREA TORRES' },
    { fecha: '2025-11-10', cuil: '20462785489', nombre: 'MENGUEZ DILAN EZEQUIEL' },
    { fecha: '2025-11-08', cuil: '20460212562', nombre: 'LETI LEANDRO NAHUEL' },
    { fecha: '2025-11-08', cuil: '23462911904', nombre: 'LAMAS AGUSTINA MICAELA' },
    { fecha: '2025-11-08', cuil: '27458940881', nombre: 'FANTONE MALENA AGUSTINA' },
    { fecha: '2025-11-07', cuil: '20441832533', nombre: 'MATIAS OSUNA' },
    { fecha: '2025-11-07', cuil: '20442142565', nombre: 'SANTOS ALEJO EMMANUEL' },
    { fecha: '2025-11-06', cuil: '20426717604', nombre: 'PEÑA NAHUEL ALBERTO' },
    { fecha: '2025-11-03', cuil: '27471155816', nombre: 'VERON ABIGAIL TABATHA' },
    { fecha: '2025-11-03', cuil: '20456131728', nombre: 'TIZIANO ARIEL NICCOLINI' },
];

// ==================== FACUNDO TEVEZ (60 registros) ====================
const facundoTevez = [
    { fecha: '2025-11-29', cuil: '20452392233', nombre: 'LAUTARO PUCHETA' },
    { fecha: '2025-11-28', cuil: '20430971167', nombre: 'MEDINA MARTIN GASTON' },
    { fecha: '2025-11-27', cuil: '20428992025', nombre: 'AGUSTIN ARJONA' },
    { fecha: '2025-11-26', cuil: '23453020789', nombre: 'PARODI BRUNO CESAR EDUARDO' },
    { fecha: '2025-11-26', cuil: '20466405664', nombre: 'MACHUCA KEVIN ARIEL ALEJANDRO' },
    { fecha: '2025-11-26', cuil: '20463369195', nombre: 'LAUTARO MORALEZ' },
    { fecha: '2025-11-26', cuil: '20386240907', nombre: 'GRIEVE SAMIR NOEL' },
    { fecha: '2025-11-26', cuil: '20459127640', nombre: 'BATALLA LUCAS BENJAMIN' },
    { fecha: '2025-11-25', cuil: '27405490299', nombre: 'RAMALLO MARCELA DANIELA' },
    { fecha: '2025-11-24', cuil: '23411331369', nombre: 'MIRKO LAGOS' },
    { fecha: '2025-11-24', cuil: '20430577949', nombre: 'MOLINA FACUNDO NICOLAS' },
    { fecha: '2025-11-21', cuil: '20420240245', nombre: 'LIMEREZ JULIAN EZEQUIEL' },
    { fecha: '2025-11-21', cuil: '20438731548', nombre: 'GALO RIVERO' },
    { fecha: '2025-11-20', cuil: '20466265153', nombre: 'CACERES LAUTARO' },
    { fecha: '2025-11-20', cuil: '20407471696', nombre: 'STORINO LEANDRO' },
    { fecha: '2025-11-19', cuil: '27475142158', nombre: 'SAAVEDRA CHARO LUCIA' },
    { fecha: '2025-11-19', cuil: '27466474903', nombre: 'CAIAFA BRISA ANAHI' },
    { fecha: '2025-11-18', cuil: '20465251221', nombre: 'SOLANO AGUSTIN JULIO CESAR' },
    { fecha: '2025-11-18', cuil: '27438009936', nombre: 'AMAYA LOURDES AILEN' },
    { fecha: '2025-11-17', cuil: '23437962499', nombre: 'BARRAZA ESTEBAN NAHUEL' },
    { fecha: '2025-11-17', cuil: '27423009352', nombre: 'BUSTOS MARIA FLORENCIA' },
    { fecha: '2025-11-17', cuil: '20466677389', nombre: 'JUAN CARLOS TABOADA' },
    { fecha: '2025-11-15', cuil: '20450763994', nombre: 'CONDORI MATEO' },
    { fecha: '2025-11-15', cuil: '23436618069', nombre: 'TIRITOPPOLA JAVIER' },
    { fecha: '2025-11-14', cuil: '27443404622', nombre: 'COULLET AZUL SELENE' },
    { fecha: '2025-11-14', cuil: '20464220276', nombre: 'NICOLAS KOSTIAK' },
    { fecha: '2025-11-14', cuil: '20450426408', nombre: 'DA SILVA SANTIAGO EZEQUIEL' },
    { fecha: '2025-11-14', cuil: '27428185914', nombre: 'KOZLOWSKI GUADALUPE' },
    { fecha: '2025-11-13', cuil: '20475614330', nombre: 'ROMERO SANTIAGO LEONEL' },
    { fecha: '2025-11-12', cuil: '20461191232', nombre: 'BENITEZ ZORRILLA RENATO JOAN' },
    { fecha: '2025-11-12', cuil: '20440796932', nombre: 'SALAS ALEX DARIO' },
    { fecha: '2025-11-12', cuil: '27439181031', nombre: 'ACHAR MAGALI' },
    { fecha: '2025-11-12', cuil: '20473482968', nombre: 'SIMON ACHRAM' },
    { fecha: '2025-11-11', cuil: '20950537745', nombre: 'VERA CARDOZO LUCAS MATIAS' },
    { fecha: '2025-11-10', cuil: '27412834602', nombre: 'NAYLA BAREIRO' },
    { fecha: '2025-11-10', cuil: '20444166267', nombre: 'BARBOZA MATEO' },
    { fecha: '2025-11-10', cuil: '27441285340', nombre: 'YANINA REA' },
    { fecha: '2025-11-10', cuil: '20473845157', nombre: 'FERNANDEZ ENZO SANTIAGO' },
    { fecha: '2025-11-10', cuil: '27439181090', nombre: 'FERBENZA SAENZ MORENA' },
    { fecha: '2025-11-07', cuil: '20446870719', nombre: 'PATRICIO ARRIOLA' },
    { fecha: '2025-11-07', cuil: '27462069893', nombre: 'GALARZA MICAELA' },
    { fecha: '2025-11-07', cuil: '20371622269', nombre: 'JUAN ALEXIS FABIAN' },
    { fecha: '2025-11-07', cuil: '20417255258', nombre: 'LINARES PABLO SANTIAGO' },
    { fecha: '2025-11-07', cuil: '20445049825', nombre: 'PEREYRA NESTOR ALEXANDRO' },
    { fecha: '2025-11-07', cuil: '20406202993', nombre: 'CASTAÑARES JUAN' },
    { fecha: '2025-11-07', cuil: '27478034674', nombre: 'GOMEZ TATIANA' },
    { fecha: '2025-11-07', cuil: '23380274094', nombre: 'MOCCAGATTA MICAELA ARACELI' },
    { fecha: '2025-11-06', cuil: '20428362668', nombre: 'PEÑALOZA ADRIAN ALEJANDRO' },
    { fecha: '2025-11-06', cuil: '20465624222', nombre: 'FLAMENCO AXEL NICOLAS' },
    { fecha: '2025-11-06', cuil: '20457388935', nombre: 'CASTRO NAHUEL SEBASTIAN' },
    { fecha: '2025-11-06', cuil: '20456796657', nombre: 'CRISTALDO LUCAS EZEQUIEL' },
    { fecha: '2025-11-06', cuil: '20456797106', nombre: 'IBAÑEZ RAMIRO GABRIEL' },
    { fecha: '2025-11-06', cuil: '23418902809', nombre: 'NAGERA BRAIAN NAHUEL' },
    { fecha: '2025-11-06', cuil: '27461229110', nombre: 'LENCINA WENDY ABIGAIL' },
    { fecha: '2025-11-06', cuil: '20465854805', nombre: 'TOME VALENTIN' },
    { fecha: '2025-11-05', cuil: '20472289757', nombre: 'SILVA AXEL TIZIANO' },
    { fecha: '2025-11-05', cuil: '20445441717', nombre: 'SUAVE FABIAN MAXIMILIANO' },
    { fecha: '2025-11-04', cuil: '27433324027', nombre: 'LUZ MARIA TESSORE' },
    { fecha: '2025-11-04', cuil: '27449685739', nombre: 'RAMIREZ SOFIA' },
    { fecha: '2025-11-03', cuil: '27411695323', nombre: 'CORONEL SASHA IVANA' },
];

async function main() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');

        const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

        const allRecords = [
            { supervisor: 'Nahia Avellaneda', records: nahiaAvellaneda },
            { supervisor: 'Facundo Tevez', records: facundoTevez },
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
        console.log('Total registros procesados:', nahiaAvellaneda.length + facundoTevez.length);
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
