const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-27', cuil: '20356952511', nombre: 'DA SILVA SERGIO EXEQUIEL' },
    { fecha: '2025-11-25', cuil: '20388581965', nombre: 'ROJAS EZEQUIEL DAVID' },
    { fecha: '2025-11-24', cuil: '20446901657', nombre: 'VALDETARI HERNAN NEHUEN' },
    { fecha: '2025-11-22', cuil: '20448227120', nombre: 'GASPAR LUGO ARIEL HERNEN' },
    { fecha: '2025-11-22', cuil: '20436538317', nombre: 'DUARTE FACUNDO ADAN' },
    { fecha: '2025-11-06', cuil: '27477476274', nombre: 'ROJAS BRENDA ANAHI' },
    { fecha: '2025-11-25', cuil: '20451745817', nombre: 'MANSILLA DANIEL EZEQUIEL' },
    { fecha: '2025-11-25', cuil: '20470690403', nombre: 'YULAN JEREMIAS YAMIL' },
    { fecha: '2025-11-19', cuil: '27470944671', nombre: 'CHURRUARIN LAUTARO EZEQUIEL' },
    { fecha: '2025-11-12', cuil: '20351665964', nombre: 'EMMANUEL NORBERTO ACOSTA' },
    { fecha: '2025-11-12', cuil: '27356135437', nombre: 'JOANA YESICA ROLÓN ROJAS' },
    { fecha: '2025-11-10', cuil: '20427753809', nombre: 'LEDESMA DANTE LEONEL' },
    { fecha: '2025-11-10', cuil: '20475140894', nombre: 'AMODEO JOAQUIN SEBASTIAN' },
    { fecha: '2025-11-08', cuil: '23468172399', nombre: 'RODRIGUEZ MARCOS ANDRES' },
    { fecha: '2025-11-08', cuil: '23452048329', nombre: 'JONATHAN ALEXIS DELGADO' },
    { fecha: '2025-11-07', cuil: '27476550861', nombre: 'ARIANNA NICOL CORONEL' },
    { fecha: '2025-11-28', cuil: '20469130542', nombre: 'FUNES IGNACIO ZANTINO' },
    { fecha: '2025-11-19', cuil: '20472354532', nombre: 'CORREA TADEO LUCAS' },
    { fecha: '2025-11-12', cuil: '20457482761', nombre: 'APARICIO EMANUEL LEONEL' },
    { fecha: '2025-11-12', cuil: '20469366422', nombre: 'BERNAT MAXIMILIANO ALI' },
    { fecha: '2025-11-11', cuil: '20466816419', nombre: 'SALAZAR MATEO JORGE' },
    { fecha: '2025-11-10', cuil: '20456770755', nombre: 'RAMOS THIAGO ABEL' },
    { fecha: '2025-11-10', cuil: '20475141998', nombre: 'GIAMPAOLO JULIAN' },
    { fecha: '2025-11-05', cuil: '20539816021', nombre: 'CAJAL BRAIAN MISHAEL' },
    { fecha: '2025-11-05', cuil: '27443270049', nombre: 'GUAYMAS AYLEN JULISA' },
    { fecha: '2025-11-04', cuil: '20437335738', nombre: 'SOSA JOEL' },
    { fecha: '2025-11-03', cuil: '27462867579', nombre: 'CELOT MORA DOMINIQUE' },
    { fecha: '2025-11-03', cuil: '27476795538', nombre: 'AYALA MARIA DE LOS ANGELES' },
    { fecha: '2025-11-03', cuil: '27453258799', nombre: 'MACIAS URTASUN RANATA MARTINA' },
    { fecha: '2025-11-26', cuil: '27480271071', nombre: 'SANCHEZ ANTONELLA BELEN' },
    { fecha: '2025-11-24', cuil: '20429506744', nombre: 'SGORBINI TOMAS EZEQUIEL' },
    { fecha: '2025-11-20', cuil: '27439016308', nombre: 'ISAURRALDE IVANA VICTORIA' },
    { fecha: '2025-11-15', cuil: '20462001585', nombre: 'ALONSO URIEL ALEJANDRO' },
    { fecha: '2025-11-13', cuil: '20458223697', nombre: 'ROMAN LUCIANO ALI' },
    { fecha: '2025-11-11', cuil: '20471648907', nombre: 'CABALLERO AXEL TOMAS' },
    { fecha: '2025-11-10', cuil: '27477429403', nombre: 'HURYK NAHIARA FLORENCIA' },
    { fecha: '2025-11-07', cuil: '27477506130', nombre: 'RIOS MELANY LOURDES ALEJANDRA' },
    { fecha: '2025-11-05', cuil: '20474930263', nombre: 'FALCON LUCAS FERNANDO' },
    { fecha: '2025-11-03', cuil: '20467486544', nombre: 'MALAGON GABRIEL ADRIAN' },
    { fecha: '2025-11-03', cuil: '20467525213', nombre: 'QUATRARO LOPEZ FEDERICO' },
    { fecha: '2025-11-27', cuil: '20461098348', nombre: 'RODRIGUEZ HERNAN ALEJANDRO' },
    { fecha: '2025-11-27', cuil: '20445947122', nombre: 'LORENZI GUIDO' },
    { fecha: '2025-11-26', cuil: '20447966957', nombre: 'GALEANO MAXIMILIANO AGUSTIN' },
    { fecha: '2025-11-26', cuil: '20399822972', nombre: 'ARAKELIAN ANDRES' },
    { fecha: '2025-11-20', cuil: '20463545414', nombre: 'RODRIGUEZ LAUTARO VALENTIN' },
    { fecha: '2025-11-18', cuil: '20955069634', nombre: 'FLORES CESPEDES JHON JAIRO' },
    { fecha: '2025-11-18', cuil: '23456329314', nombre: 'OJEDA ANABELA IVANA' },
    { fecha: '2025-11-12', cuil: '27442593839', nombre: 'GOMEZ ANOTENELLA' },
    { fecha: '2025-11-07', cuil: '20473417228', nombre: 'REBUSTINI ISAIAS GERÓNIMO' },
    { fecha: '2025-11-04', cuil: '20466805948', nombre: 'VELASQUEZ BRANDON LAUTARO' },
    { fecha: '2025-11-04', cuil: '23318357439', nombre: 'MAIDANA JULIO ANTONIO' },
    { fecha: '2025-11-27', cuil: '20459941186', nombre: 'AREYU ABRAHAN NICOLAS' },
    { fecha: '2025-11-26', cuil: '20463434167', nombre: 'LUNA DAVID FRANCISCO' },
    { fecha: '2025-11-22', cuil: '20413893217', nombre: 'CARDOZO FABIAN' },
    { fecha: '2025-11-15', cuil: '20468200091', nombre: 'DECIMA ARIEL HERNAN' },
    { fecha: '2025-11-15', cuil: '20462650435', nombre: 'SANCHEZ ROMAN' },
    { fecha: '2025-11-07', cuil: '20468985498', nombre: 'VIGLIETTI LAUTARO NICOLAS' },
    { fecha: '2025-11-06', cuil: '20408711135', nombre: 'FRATTI RODRIGO JUAN GABRIEL' },
    { fecha: '2025-11-06', cuil: '20508504633', nombre: 'AGUIRRE GUIDO EMMANUEL' },
    { fecha: '2025-11-03', cuil: '23459123199', nombre: 'RAMIREZ PEDRO VALENTIN' },
    { fecha: '2025-11-29', cuil: '27421931882', nombre: 'PIEROLA CAYOLA MELANY' },
    { fecha: '2025-11-26', cuil: '20396644399', nombre: 'LUCHECHEN JORGE MAXIMILIANO' },
    { fecha: '2025-11-21', cuil: '20475690118', nombre: 'ROSON THIAGO AGUSTIN' },
    { fecha: '2025-11-20', cuil: '27430424160', nombre: 'MACALUCCI MARIANELA ALEJANDRA' },
    { fecha: '2025-11-17', cuil: '20470179644', nombre: 'BREST JUAN DAVID' },
    { fecha: '2025-11-12', cuil: '20452396719', nombre: 'TRASAR JULIAN TOMAS' },
    { fecha: '2025-11-12', cuil: '20463514055', nombre: 'VILLAFAÑE RAMIRO GABRIEL' },
    { fecha: '2025-11-12', cuil: '20455432260', nombre: 'MANSILLA DARIO ERNESTO' },
    { fecha: '2025-11-11', cuil: '23452860759', nombre: 'PAZ IVAN NICOLAS' },
    { fecha: '2025-11-11', cuil: '27437236718', nombre: 'MANUELLA MICAELA AILEN' },
    { fecha: '2025-11-08', cuil: '20438901680', nombre: 'DORADO SANABRIA ADRIAN MAURICIO' },
    { fecha: '2025-11-07', cuil: '27416934008', nombre: 'BENITEZ SHEILA AILIN' },
    { fecha: '2025-11-06', cuil: '27470933602', nombre: 'JUAREZ MILAGROS AGUSTINA' },
    { fecha: '2025-11-04', cuil: '20474007775', nombre: 'MARTINEZ BENJAMIN ANDRES' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Belen Salaverry (' + records.length + ' registros)');

    const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));
    let updated = 0, notFound = [];

    for (const r of records) {
        const date = new Date(r.fecha + 'T00:00:00.000Z');
        const audit = await Audit.findOne({ cuil: r.cuil }).lean();
        if (!audit) { notFound.push(r); continue; }
        await Audit.updateOne({ cuil: r.cuil }, { $set: { fechaCreacionQR: date, nombre: r.nombre } });
        updated++;
    }

    console.log('Actualizados:', updated, '| No encontrados:', notFound.length);
    if (notFound.length) notFound.forEach(x => console.log('  ❌', x.cuil, x.nombre));
    await mongoose.disconnect();
}
main().catch(console.error);
