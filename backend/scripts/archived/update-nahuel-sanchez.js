const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-28', cuil: '20454662033', nombre: 'DEL CASTILLO RICARDO CESAR' },
    { fecha: '2025-11-28', cuil: '27475401188', nombre: 'MONZON IVANA GUADALUPE' },
    { fecha: '2025-11-27', cuil: '27448598999', nombre: 'PETRUCCELLI ESTEFANIA' },
    { fecha: '2025-11-27', cuil: '20474842615', nombre: 'BLANCO JAVIER LEONEL' },
    { fecha: '2025-11-27', cuil: '27433969508', nombre: 'PUEBLA CAMILA ANAEL' },
    { fecha: '2025-11-27', cuil: '20476294003', nombre: 'ARCE LAUTARO TOMAS' },
    { fecha: '2025-11-26', cuil: '27474068191', nombre: 'GALVAN SAIRA LUZ MIA' },
    { fecha: '2025-11-24', cuil: '20458933805', nombre: 'CANDIA ALEX NAHUEL' },
    { fecha: '2025-11-24', cuil: '27466295650', nombre: 'VILLADA VALENTINA NADIR' },
    { fecha: '2025-11-22', cuil: '20443974270', nombre: 'ECKERDT NICOLAS GABRIEL' },
    { fecha: '2025-11-21', cuil: '20480399235', nombre: 'JOHN ALAN CASTILLO' },
    { fecha: '2025-11-19', cuil: '20437803839', nombre: 'PICKART ULISES' },
    { fecha: '2025-11-19', cuil: '20415671203', nombre: 'SERRON ALFREDO DIEGO' },
    { fecha: '2025-11-18', cuil: '20430324625', nombre: 'SOTO CUEVAS ALAN DAVID' },
    { fecha: '2025-11-18', cuil: '20433011016', nombre: 'FERREIRA SAUER ULISES VALENTIN' },
    { fecha: '2025-11-18', cuil: '27471627866', nombre: 'BENITEZ MAIA JACQUELINE ABRIL' },
    { fecha: '2025-11-17', cuil: '20407130988', nombre: 'GONZALEZ STRUPENI LEANDRO' },
    { fecha: '2025-11-17', cuil: '20440025359', nombre: 'SOTELO RODRIGO EZEQUIEL' },
    { fecha: '2025-11-15', cuil: '20955930496', nombre: 'RODRIGUEZ RUBEN SEBASTIAN' },
    { fecha: '2025-11-14', cuil: '20437225193', nombre: 'ONETO MARTIN EZEQUIEL' },
    { fecha: '2025-11-13', cuil: '20463546135', nombre: 'AMARILLA THIAGO JAVIER' },
    { fecha: '2025-11-12', cuil: '20409546715', nombre: 'CALABRO NICOLAS' },
    { fecha: '2025-11-12', cuil: '20470067404', nombre: 'BANDITO RAMIRO SANTIAGO' },
    { fecha: '2025-11-11', cuil: '20383943281', nombre: 'GODOY LAUTARO JOAQUIN' },
    { fecha: '2025-11-11', cuil: '27443639417', nombre: 'CHEHEBAR MAGALI ESTEFANIA' },
    { fecha: '2025-11-11', cuil: '20472317238', nombre: 'MAQUIAVELO RODRIGO JOEL' },
    { fecha: '2025-11-10', cuil: '27441721418', nombre: 'ORQUERA DELFINA IRIEL' },
    { fecha: '2025-11-10', cuil: '20453029930', nombre: 'DIZ MARTIN MAXIMILIANO' },
    { fecha: '2025-11-10', cuil: '27470311547', nombre: 'CLEMENTINO LUCIA' },
    { fecha: '2025-11-07', cuil: '27445318383', nombre: 'MOLINA ANA PAULA' },
    { fecha: '2025-11-07', cuil: '27482146185', nombre: 'CENTURION LARA MARIEL' },
    { fecha: '2025-11-07', cuil: '27449366382', nombre: 'MARTINEZ MEDINA PAOLA MARISOL' },
    { fecha: '2025-11-07', cuil: '23457491654', nombre: 'SILVERO DELFINA DANIELA' },
    { fecha: '2025-11-07', cuil: '27466982178', nombre: 'VELARDO IARA CAMILA' },
    { fecha: '2025-11-06', cuil: '27452969098', nombre: 'UBELLART NEREA' },
    { fecha: '2025-11-06', cuil: '27445473656', nombre: 'SILVA DAMARIS SOLEDAD LUCIA' },
    { fecha: '2025-11-06', cuil: '20479654671', nombre: 'VELAZQUEZ NAHUEL NICOLAS' },
    { fecha: '2025-11-06', cuil: '23451476599', nombre: 'ARANCIBIA TORRICO DARIEL ALEXANDER' },
    { fecha: '2025-11-06', cuil: '27462747387', nombre: 'ALEGRE LOURDES SOLANGE' },
    { fecha: '2025-11-06', cuil: '20456872345', nombre: 'AGUILAR MORINIGO KEVIN MARCELO' },
    { fecha: '2025-11-05', cuil: '20473080533', nombre: 'DE LAVALLE LUIS SANTIAGO' },
    { fecha: '2025-11-05', cuil: '27478293858', nombre: 'ROMERO GERALDINE MILAGROS' },
    { fecha: '2025-11-04', cuil: '27454644080', nombre: 'ROMERO MARIANELA DENISE' },
    { fecha: '2025-11-04', cuil: '20442543608', nombre: 'SAAVEDRA TICLAYAURI JOSE PABLO' },
    { fecha: '2025-11-03', cuil: '27457389693', nombre: 'FERNANDEZ KEILA MILAGROS' },
    { fecha: '2025-11-03', cuil: '20474305229', nombre: 'BRIGUERA FACUNDO SEBASTIÁN' },
    { fecha: '2025-11-01', cuil: '23469575144', nombre: 'PIEDRABUENA SELENE TAMARA' },
    { fecha: '2025-11-01', cuil: '20471256006', nombre: 'ISIDORI TEO' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Nahuel Sanchez (' + records.length + ' registros)');
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
