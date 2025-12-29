const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-29', cuil: '20472800788', nombre: 'FERREIRA BENJAMIN SIMON' },
    { fecha: '2025-11-29', cuil: '20475973314', nombre: 'DELFINO LUCA' },
    { fecha: '2025-11-27', cuil: '20438053760', nombre: 'GONZALO MORINIGO' },
    { fecha: '2025-11-27', cuil: '20436549041', nombre: 'CESAR SAMUEL BARRERA' },
    { fecha: '2025-11-27', cuil: '27446668930', nombre: 'LOPEZ HERNANDEZ ROCIO LOURDES' },
    { fecha: '2025-11-26', cuil: '20315977232', nombre: 'FRANCO ANGEL' },
    { fecha: '2025-11-25', cuil: '20418062704', nombre: 'LEONEL JUAREZ' },
    { fecha: '2025-11-24', cuil: '20408780722', nombre: 'LEANDRO GIBODOUT' },
    { fecha: '2025-11-21', cuil: '20441009675', nombre: 'MEZA DEMIAN VALENTIN' },
    { fecha: '2025-11-21', cuil: '20427782019', nombre: 'MATHIAS ALTAMIRANDA' },
    { fecha: '2025-11-20', cuil: '27421765834', nombre: 'ARANDA SCALISE NOELIA JAZMIN' },
    { fecha: '2025-11-20', cuil: '23437259259', nombre: 'RAMIRO CALLEJA' },
    { fecha: '2025-11-19', cuil: '23419711659', nombre: 'RECALDE WILLIAM  LEONARDO' },
    { fecha: '2025-11-19', cuil: '27458692284', nombre: 'KAREN FALI' },
    { fecha: '2025-11-18', cuil: '27421019962', nombre: 'MOYANO JULIETA AILEN' },
    { fecha: '2025-11-17', cuil: '20459896199', nombre: 'HEINE LUCAS ADRIAN' },
    { fecha: '2025-11-14', cuil: '20438580310', nombre: 'AGUSTIN LUNA' },
    { fecha: '2025-11-13', cuil: '20467421876', nombre: 'SALVADOR ALVAREZ' },
    { fecha: '2025-11-13', cuil: '20436245751', nombre: 'ULISES NUÑEZ' },
    { fecha: '2025-11-11', cuil: '20404598504', nombre: 'MARCOS TUSET' },
    { fecha: '2025-11-11', cuil: '20413851840', nombre: 'IVAN RODRIGUEZ' },
    { fecha: '2025-11-10', cuil: '27448303107', nombre: 'MELANY IGLESIAS' },
    { fecha: '2025-11-10', cuil: '27463511530', nombre: 'BENITEZ PILAR ROCIO' },
    { fecha: '2025-11-10', cuil: '27467378851', nombre: 'REGINA HONZTEIN' },
    { fecha: '2025-11-10', cuil: '20459285661', nombre: 'GIANLUCA DE CUNTO' },
    { fecha: '2025-11-07', cuil: '20417236911', nombre: 'FACUNDO RENES' },
    { fecha: '2025-11-07', cuil: '27336534912', nombre: 'ALBORNOZ SOFIA CELESTE' },
    { fecha: '2025-11-07', cuil: '20449641753', nombre: 'CASTILLO MATÍAS JESUS' },
    { fecha: '2025-11-07', cuil: '20475744110', nombre: 'DOS SANTOS LORENZO' },
    { fecha: '2025-11-06', cuil: '27454754781', nombre: 'ETEVENAUX MORENO PILAR' },
    { fecha: '2025-11-06', cuil: '20434576254', nombre: 'MAIDANA ALAN ANDRES' },
    { fecha: '2025-11-06', cuil: '27468171924', nombre: 'YBARRA VALENTINA VICTORIA' },
    { fecha: '2025-11-06', cuil: '20458710695', nombre: 'ZORZIN BAUTISTA EZEQUIEL' },
    { fecha: '2025-11-06', cuil: '20460889643', nombre: 'GONZALEZ GABRIEL ALEJANDRO' },
    { fecha: '2025-11-05', cuil: '20465575884', nombre: 'SILVA FABRICIO VALENTIN' },
    { fecha: '2025-11-05', cuil: '20471322955', nombre: 'NOVOA LAUTARO NEGUEN' },
    { fecha: '2025-11-05', cuil: '20450735044', nombre: 'PAZOS ELISES JESUS' },
    { fecha: '2025-11-05', cuil: '20471381528', nombre: 'SAVADIA SANTIAGO' },
    { fecha: '2025-11-04', cuil: '20458127264', nombre: 'SILVA CHAMARRO NAHUEL ALEXIS' },
    { fecha: '2025-11-04', cuil: '20450676889', nombre: 'OLIVERA ESTEBAN MAXIMILIANO' },
    { fecha: '2025-11-03', cuil: '27456341611', nombre: 'RIVEROS ARAYA ARACELI ORIANA' },
    { fecha: '2025-11-03', cuil: '20467412052', nombre: 'LOPEZ JUAN CRUZ ALEJANDRO' },
    { fecha: '2025-11-03', cuil: '27466299052', nombre: 'LUQUEZ SCIANCALEPORE MARTINA GIOVANNA' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Santiago Goldsztein (' + records.length + ' registros)');
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
