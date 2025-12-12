const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-28', cuil: '20424956652', nombre: 'FERNANDEZ CARLOS' },
    { fecha: '2025-11-28', cuil: '20440049223', nombre: 'CAÑETE DE DOMINICI MARCOS JULIAN' },
    { fecha: '2025-11-28', cuil: '27460216635', nombre: 'NAHIARA ALVARADO' },
    { fecha: '2025-11-27', cuil: '20469570860', nombre: 'BRUNO LEANDRO RUIZ' },
    { fecha: '2025-11-27', cuil: '20444604639', nombre: 'MOLINA DANTE GABRIEL' },
    { fecha: '2025-11-26', cuil: '27456830124', nombre: 'RODRIGUEZ ANAHI NICOLE' },
    { fecha: '2025-11-26', cuil: '20465842920', nombre: 'CORERA NICOAS MATIAS' },
    { fecha: '2025-11-26', cuil: '20466409074', nombre: 'CRISTIAN VALENTIN OLIVERA' },
    { fecha: '2025-11-25', cuil: '20417159372', nombre: 'GOMEZ MARIO ALEJANDRO' },
    { fecha: '2025-11-25', cuil: '27460116304', nombre: 'VALENTINA JOANA QUIROGA' },
    { fecha: '2025-11-25', cuil: '20349236339', nombre: 'LEONEL ENRIQUE IRIGOLLEN' },
    { fecha: '2025-11-24', cuil: '20947195418', nombre: 'ALDO SEGOVIA' },
    { fecha: '2025-11-24', cuil: '27464169313', nombre: 'MALACZENKO ABRIL' },
    { fecha: '2025-11-24', cuil: '27469497629', nombre: 'MALENA LUCIANA RIEDEL' },
    { fecha: '2025-11-24', cuil: '27467047235', nombre: 'TATIANA PEREZ CHAMORRO' },
    { fecha: '2025-11-24', cuil: '27945697917', nombre: 'CARMEN ROSIELY PEREIRA' },
    { fecha: '2025-11-22', cuil: '23412014774', nombre: 'CANDELARIA MARILINA GANZO' },
    { fecha: '2025-11-21', cuil: '27426223681', nombre: 'MARISA ELIZABETH SANTACRUZ' },
    { fecha: '2025-11-21', cuil: '20465620596', nombre: 'AGUSTIN ALEJANDRO GOMEZ' },
    { fecha: '2025-11-18', cuil: '20420221917', nombre: 'ALAN WILMER SORIA MOLLO' },
    { fecha: '2025-11-18', cuil: '27427640073', nombre: 'PERTICONE LARA CANDELA' },
    { fecha: '2025-11-18', cuil: '20426219620', nombre: 'MARIANO ERIC LEONEL CABRAL' },
    { fecha: '2025-11-17', cuil: '20429442053', nombre: 'HERNANDEZ QUIROGA MARTIN ALEJANDRO' },
    { fecha: '2025-11-17', cuil: '27368429118', nombre: 'JOHANA GABRIELA BRUNO' },
    { fecha: '2025-11-15', cuil: '20467360680', nombre: 'JUAREZ DIRRHIFER IGNACIO' },
    { fecha: '2025-11-13', cuil: '27481802003', nombre: 'VICTORIA JAEL ASSINI' },
    { fecha: '2025-11-12', cuil: '27453053747', nombre: 'LOURDES HAUCHAR' },
    { fecha: '2025-11-12', cuil: '27452261451', nombre: 'ERIKA PAULA JOVANOVICH' },
    { fecha: '2025-11-12', cuil: '20466980553', nombre: 'GIAN FRANCO ALEGRE' },
    { fecha: '2025-11-11', cuil: '20439132508', nombre: 'FACUNDO NICOLAS ABBA' },
    { fecha: '2025-11-11', cuil: '20443610678', nombre: 'LUCAS GONZALO GUANCA' },
    { fecha: '2025-11-11', cuil: '20454947038', nombre: 'VIDETTA FRANCISCO AGUSTIN' },
    { fecha: '2025-11-10', cuil: '20444138425', nombre: 'NICOLAS BERNAL' },
    { fecha: '2025-11-07', cuil: '27444573940', nombre: 'LUDMILA MILAGROS DOMINGORE' },
    { fecha: '2025-11-07', cuil: '27449996467', nombre: 'MICAELA TABORDA' },
    { fecha: '2025-11-07', cuil: '20443920650', nombre: 'LUCA SANTINO GIUFFRIDA' },
    { fecha: '2025-11-07', cuil: '23471847194', nombre: 'ACOSTA LEDESMA MARINA' },
    { fecha: '2025-11-07', cuil: '27395885370', nombre: 'SMITH SOFIA' },
    { fecha: '2025-11-06', cuil: '20454803893', nombre: 'FINOCCHIARO GUIDO' },
    { fecha: '2025-11-06', cuil: '20453961231', nombre: 'DI STEFANO LUCAS ARIEL' },
    { fecha: '2025-11-05', cuil: '20472201825', nombre: 'DOMINGUEZ JORGE ALEJANDRO' },
    { fecha: '2025-11-05', cuil: '20462050292', nombre: 'DOMINGUEZ PERALTA MARTIN JAVIER' },
    { fecha: '2025-11-04', cuil: '27463501527', nombre: 'UÑATES ARIANA GABRIELA' },
    { fecha: '2025-11-04', cuil: '20471677141', nombre: 'SANTA CRUZ ALAN EZEQUIEL' },
    { fecha: '2025-11-04', cuil: '27457352447', nombre: 'FANELLI DOVER MAITENA AZUL' },
    { fecha: '2025-11-03', cuil: '20436652101', nombre: 'FLEITAS MAXIMILIANO JAVIER' },
    { fecha: '2025-11-03', cuil: '20474160093', nombre: 'RUIZ IGNACIO GABRIEL' },
    { fecha: '2025-11-03', cuil: '27454005843', nombre: 'BENITEZ DYLAN DANIEL' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Abigail Vera (' + records.length + ' registros)');
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
