const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-29', cuil: '23456867944', nombre: 'BENITEZ LUCIANA' },
    { fecha: '2025-11-29', cuil: '27469164123', nombre: 'PITA CATALINA' },
    { fecha: '2025-11-28', cuil: '20458209805', nombre: 'ANDRADE LUCAS NAHUEL' },
    { fecha: '2025-11-28', cuil: '27456883805', nombre: 'PICCOLI AGUSTINA' },
    { fecha: '2025-11-28', cuil: '20480280300', nombre: 'BAQUEIRO MATEO' },
    { fecha: '2025-11-28', cuil: '23471306959', nombre: 'CATIVA CARLOS' },
    { fecha: '2025-11-28', cuil: '23480564634', nombre: 'ZELARRAYAN JESABEL' },
    { fecha: '2025-11-28', cuil: '27464368537', nombre: 'ROGGIANO ORNELLA' },
    { fecha: '2025-11-27', cuil: '27317268810', nombre: 'VALDEZ LORENA' },
    { fecha: '2025-11-27', cuil: '27391603028', nombre: 'MOLINA BARBARA' },
    { fecha: '2025-11-27', cuil: '20445633292', nombre: 'DIAZ ENZO FRANCISCO GONZALO' },
    { fecha: '2025-11-27', cuil: '27386167139', nombre: 'DIAZ YAMILA NATALIA' },
    { fecha: '2025-11-27', cuil: '20416628778', nombre: 'DOMINGUEZ RODRIGUEZ BRIAN JESUS ENZO' },
    { fecha: '2025-11-27', cuil: '23448686639', nombre: 'PEREYRA NAHUEL' },
    { fecha: '2025-11-26', cuil: '20399641129', nombre: 'DIAZ MARIANO' },
    { fecha: '2025-11-26', cuil: '27955097160', nombre: 'CENTURION ANA MARIA' },
    { fecha: '2025-11-26', cuil: '20468209439', nombre: 'ARBELO RAMIRO' },
    { fecha: '2025-11-26', cuil: '27427544627', nombre: 'JULIAN BRENDA' },
    { fecha: '2025-11-26', cuil: '27469056754', nombre: 'INSAURRALDE PRISCILA CELESTE' },
    { fecha: '2025-11-25', cuil: '20440954430', nombre: 'SOFFIANTINI DIEGO' },
    { fecha: '2025-11-25', cuil: '20454763085', nombre: 'GONZALEZ AGUSTIN' },
    { fecha: '2025-11-25', cuil: '20454957793', nombre: 'ESPEJO SANTIAGO' },
    { fecha: '2025-11-25', cuil: '20409326715', nombre: 'NIZ AXEL' },
    { fecha: '2025-11-24', cuil: '27458190807', nombre: 'ORTIZ VALENTINA ORIANA' },
    { fecha: '2025-11-24', cuil: '20429424101', nombre: 'ARAGUNDE LUCAS' },
    { fecha: '2025-11-24', cuil: '20388624494', nombre: 'SANTILLAN NESTOR JAVIER' },
    { fecha: '2025-11-24', cuil: '20241369251', nombre: 'RUIZ DIAZ CRISTIAN MANUEL' },
    { fecha: '2025-11-22', cuil: '20441093412', nombre: 'VESCIO LUCA' },
    { fecha: '2025-11-22', cuil: '20437369497', nombre: 'GOMEZ ALAN' },
    { fecha: '2025-11-20', cuil: '20264432252', nombre: 'BARRIOS MARCOS' },
    { fecha: '2025-11-20', cuil: '27429475509', nombre: 'MAMANI LUANA MICAELA' },
    { fecha: '2025-11-19', cuil: '27499685519', nombre: 'NARANJO SABRINA ELISABET' },
    { fecha: '2025-11-19', cuil: '27429977415', nombre: 'ZEBALLOS IARA ADELA' },
    { fecha: '2025-11-18', cuil: '20441421428', nombre: 'DURE MAURO' },
    { fecha: '2025-11-18', cuil: '20438210777', nombre: 'BASALDUA SEBASTIAN ROMAN' },
    { fecha: '2025-11-18', cuil: '27439048889', nombre: 'MEZA ERIKA CAROLINA' },
    { fecha: '2025-11-18', cuil: '20443516434', nombre: 'CAMPOS IGNACIO JOSE' },
    { fecha: '2025-11-18', cuil: '20458693375', nombre: 'CHUCALAZ SEQUEIRA URIEL' },
    { fecha: '2025-11-15', cuil: '27442080971', nombre: 'MIÑO ANTONELLA' },
    { fecha: '2025-11-15', cuil: '20444219867', nombre: 'CHAZARRETA GUSTAVO ENRIQUE' },
    { fecha: '2025-11-15', cuil: '20438157213', nombre: 'RODRIGUEZ SANTIAGO AGUSTIN' },
    { fecha: '2025-11-15', cuil: '20445473201', nombre: 'LUNA MARTIN EZEQUIEL' },
    { fecha: '2025-11-14', cuil: '20437231932', nombre: 'CICUTIN MARTIN' },
    { fecha: '2025-11-13', cuil: '27442549937', nombre: 'MIÑAN MARTINA' },
    { fecha: '2025-11-13', cuil: '20461872884', nombre: 'CASONES LEONARDO' },
    { fecha: '2025-11-10', cuil: '23442577099', nombre: 'RAMOS LEONARDO CESAR' },
    { fecha: '2025-11-10', cuil: '27457863123', nombre: 'LINARDELLI ENRIQUEZ AYLEN' },
    { fecha: '2025-11-10', cuil: '20428745052', nombre: 'DOS SANTOS GERONIMO TOMAS' },
    { fecha: '2025-11-07', cuil: '27455759396', nombre: 'GOMEZ JAZMIN AGOSTINA' },
    { fecha: '2025-11-07', cuil: '20449663625', nombre: 'ROBLEDO TIAGO JOEL' },
    { fecha: '2025-11-07', cuil: '20447643279', nombre: 'ALVAREZ ESTEBAN DAVID' },
    { fecha: '2025-11-07', cuil: '27455236342', nombre: 'RODRIGUEZ BRENDA EVELYN' },
    { fecha: '2025-11-06', cuil: '27461946785', nombre: 'LAMILLA AGOSTINA MORENA' },
    { fecha: '2025-11-06', cuil: '27467028362', nombre: 'MORALES LOURDES GERALDINE' },
    { fecha: '2025-11-06', cuil: '20465575191', nombre: 'CAPAY MAURO TOMAS' },
    { fecha: '2025-11-06', cuil: '20342721134', nombre: 'ARISTEGUI IVAN' },
    { fecha: '2025-11-06', cuil: '20434007462', nombre: 'MARTINEZ LOPEZ ARIEL SEBASTIAN' },
    { fecha: '2025-11-05', cuil: '20313500773', nombre: 'MANSILLA SERGIO ROLANDO' },
    { fecha: '2025-11-05', cuil: '20419818152', nombre: 'PUSS ALAN NAHUEL' },
    { fecha: '2025-11-04', cuil: '20404906578', nombre: 'CEPEDA ELIAS MARIO' },
    { fecha: '2025-11-03', cuil: '27444851290', nombre: 'PONCE KAREN SOFIA' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Gaston Sarmiento (' + records.length + ' registros)');
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
