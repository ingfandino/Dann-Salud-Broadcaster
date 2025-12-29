const mongoose = require('mongoose');
require('dotenv').config();

// Alejandro Mejail (16)
const alejandroMejail = [
    { fecha: '2025-11-27', cuil: '20434020248', nombre: 'CONDO GIULIANO MIGUEL' },
    { fecha: '2025-11-27', cuil: '23457868944', nombre: 'CORVALAN ARIANA ROSA' },
    { fecha: '2025-11-26', cuil: '27501400810', nombre: 'PONCE BRISA ANGELA' },
    { fecha: '2025-11-26', cuil: '20430426991', nombre: 'OCARANZA FRANCO DANIEL' },
    { fecha: '2025-11-25', cuil: '20323824569', nombre: 'REJADA JESUS ALBERTO' },
    { fecha: '2025-11-22', cuil: '27440810999', nombre: 'PIÑEYRO TRINIDAD LAURA' },
    { fecha: '2025-11-19', cuil: '27409548089', nombre: 'LUNA MARILYN JAEL' },
    { fecha: '2025-11-17', cuil: '20420225335', nombre: 'DIAZ MADEO IGNACIO MARTIN' },
    { fecha: '2025-11-13', cuil: '20459594370', nombre: 'OVEJERO LUCIANO LEONEL' },
    { fecha: '2025-11-13', cuil: '27442097394', nombre: 'LOPEZ AREVALOS MALENA' },
    { fecha: '2025-11-10', cuil: '27441006190', nombre: 'GARCIA CAMILA' },
    { fecha: '2025-11-07', cuil: '20470662639', nombre: 'BARBONA TIZIANO' },
    { fecha: '2025-11-06', cuil: '27460995189', nombre: 'AUGURUSA LUCIA CELESTE' },
    { fecha: '2025-11-06', cuil: '20436658037', nombre: 'GONZALEZ JORGE DAMIAN' },
    { fecha: '2025-11-06', cuil: '27481723685', nombre: 'RODRIGUEZ SOFIA AGUSTINA' },
    { fecha: '2025-11-06', cuil: '23430967509', nombre: 'GAUNA ALEXIS LEONEL' },
];

// Analia Suarez (34)
const analiaSuarez = [
    { fecha: '2025-11-26', cuil: '27960273880', nombre: 'COLOMBAT IRIBAR KARLA DE LA CARIDAD' },
    { fecha: '2025-11-04', cuil: '27453181990', nombre: 'CARO GUADALUPE BELEN' },
    { fecha: '2025-11-26', cuil: '20474618529', nombre: 'ALFONSO BYRON LETRIEL' },
    { fecha: '2025-11-26', cuil: '23951126179', nombre: 'EVANGELISTA EBER MICHAEL' },
    { fecha: '2025-11-14', cuil: '24260605093', nombre: 'MANSOUR GABRIEL MIGUEL' },
    { fecha: '2025-11-04', cuil: '27430511209', nombre: 'DEGREGORIO SOFIA MAGALI' },
    { fecha: '2025-11-18', cuil: '20441422513', nombre: 'LEDESMA CRISTIAN' },
    { fecha: '2025-11-18', cuil: '20452385903', nombre: 'LEWIT GONZALO' },
    { fecha: '2025-11-26', cuil: '27475610828', nombre: 'MEDINA LOURDES IARA' },
    { fecha: '2025-11-26', cuil: '27471024576', nombre: 'ARAGONE BRISA NAIR' },
    { fecha: '2025-11-20', cuil: '20476307393', nombre: 'SEGOVIA TOBIAS EZEQUIEL' },
    { fecha: '2025-11-18', cuil: '27475111716', nombre: 'RAMIREZ MARTINA IARA' },
    { fecha: '2025-11-18', cuil: '20439870703', nombre: 'BURGOS NAHUEL AGUSTIN' },
    { fecha: '2025-11-04', cuil: '20403947947', nombre: 'RIOS FABIAN AGUSTIN' },
    { fecha: '2025-11-04', cuil: '20470634368', nombre: 'TOLEDO FACUNDO NATANAEL' },
    { fecha: '2025-11-04', cuil: '20446897986', nombre: 'OJEDA EZEQUIEL ALEJANDRO' },
    { fecha: '2025-11-04', cuil: '20460208956', nombre: 'GAMBA AGUSTIN DANIEL' },
    { fecha: '2025-11-25', cuil: '20389184293', nombre: 'BERNASCONI FACUNDO EMANUEL' },
    { fecha: '2025-11-21', cuil: '20443843516', nombre: 'NAVARRO ALAN EZEQUIEL' },
    { fecha: '2025-11-20', cuil: '20462790555', nombre: 'NAVARRO DYLAN EZEQUIEL' },
    { fecha: '2025-11-18', cuil: '27466330235', nombre: 'BLANDINO MACARENA AYLEN' },
    { fecha: '2025-11-18', cuil: '27442095197', nombre: 'GARCIA SASHA BEATRIZ' },
    { fecha: '2025-11-18', cuil: '23954922944', nombre: 'TORRES MAIDA LETICIA' },
    { fecha: '2025-11-18', cuil: '20459243489', nombre: 'GAUNA ELIAS' },
    { fecha: '2025-11-04', cuil: '27456838435', nombre: 'CARRUEGO CAMILA' },
    { fecha: '2025-11-04', cuil: '20412055730', nombre: 'YAPURA JORGE GABRIEL' },
    { fecha: '2025-11-18', cuil: '20444241897', nombre: 'ORDOÑEZ IRUSTA EZEQUIEL' },
    { fecha: '2025-11-14', cuil: '20454966520', nombre: 'ACOSTA ABEL GUSTAVO' },
    { fecha: '2025-11-18', cuil: '20447008670', nombre: 'BENITEZ FACUNDO MANUEL' },
    { fecha: '2025-11-17', cuil: '20410084067', nombre: 'ALOMO BRUNO' },
    { fecha: '2025-11-10', cuil: '27437829778', nombre: 'DOMINGUEZ DIAZ VALERIA ESTEFANIA' },
    { fecha: '2025-11-04', cuil: '27334347880', nombre: 'ZARATE ELIANA MAYRA' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

    for (const group of [
        { name: 'Alejandro Mejail', records: alejandroMejail },
        { name: 'Analia Suarez', records: analiaSuarez }
    ]) {
        console.log(`\n=== ${group.name} (${group.records.length} registros) ===`);
        let updated = 0, notFound = [];
        for (const r of group.records) {
            const date = new Date(r.fecha + 'T00:00:00.000Z');
            const audit = await Audit.findOne({ cuil: r.cuil }).lean();
            if (!audit) { notFound.push(r); continue; }
            await Audit.updateOne({ cuil: r.cuil }, { $set: { fechaCreacionQR: date, nombre: r.nombre } });
            updated++;
        }
        console.log('Actualizados:', updated, '| No encontrados:', notFound.length);
        if (notFound.length) notFound.forEach(x => console.log('  ❌', x.cuil, x.nombre));
    }

    await mongoose.disconnect();
    console.log('\n✅ DONE!');
}
main().catch(console.error);
