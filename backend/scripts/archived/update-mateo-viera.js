const mongoose = require('mongoose');
require('dotenv').config();

const records = [
    { fecha: '2025-11-13', cuil: '20475686781', nombre: 'SAENZ JOAQUIN' },
    { fecha: '2025-11-07', cuil: '20439049732', nombre: 'IVAN AGUSTIN MOCHET' },
    { fecha: '2025-11-06', cuil: '20444854961', nombre: 'RAMIREZ CHÁVEZ EMILIANO EZEQUIEL' },
    { fecha: '2025-11-04', cuil: '20473140625', nombre: 'PAULUK JAVIER ESTEBAN' },
    { fecha: '2025-11-21', cuil: '20439798883', nombre: 'PALAVECINO PABLO ANDRES' },
    { fecha: '2025-11-07', cuil: '27452025391', nombre: 'ROUCHY ROCIO LUJAN' },
    { fecha: '2025-11-05', cuil: '20434624879', nombre: 'PROPATO CRISTIAN GABRIEL' },
    { fecha: '2025-11-03', cuil: '23469380009', nombre: 'ALMADA LUCA EMMANUEL' },
    { fecha: '2025-11-11', cuil: '20430113160', nombre: 'YAGO DARIEL MIGUENS' },
    { fecha: '2025-11-08', cuil: '20466886859', nombre: 'PALAVECINO BERGARA LEANDRO EZEQUIEL' },
    { fecha: '2025-11-07', cuil: '27441125114', nombre: 'ROCHA GODOY ANTONELLA' },
    { fecha: '2025-11-07', cuil: '20471853551', nombre: 'MANSILLA ALEXANDER JOAQUIN' },
    { fecha: '2025-11-07', cuil: '27480255211', nombre: 'CARDOZO LUCIANA CIELO' },
    { fecha: '2025-11-03', cuil: '20514089389', nombre: 'ROMERO FABRIZIO JOEL' },
    { fecha: '2025-11-03', cuil: '20476899843', nombre: 'MANSILLA TOMAS VALENTIN' },
    { fecha: '2025-11-29', cuil: '20442634182', nombre: 'RIOS DYLAN URIEL' },
    { fecha: '2025-11-28', cuil: '20477543805', nombre: 'MATIAS AGUSTIN MAINERI' },
    { fecha: '2025-11-27', cuil: '20444238330', nombre: 'SANTIAGO FERREYRA MONTOYA' },
    { fecha: '2025-11-27', cuil: '20441839252', nombre: 'MARTIN NICOLAS MONTEL' },
    { fecha: '2025-11-26', cuil: '27467024758', nombre: 'ARNDT AGOSTONI LUDMILA ABRIL' },
    { fecha: '2025-11-19', cuil: '20471614360', nombre: 'AGUSTIN SANTIAGO GERK' },
    { fecha: '2025-11-19', cuil: '27430133204', nombre: 'JULIETA GONZALEZ' },
    { fecha: '2025-11-18', cuil: '20426843111', nombre: 'FRANCO NICOLAS ALEGRE' },
    { fecha: '2025-11-18', cuil: '27457474232', nombre: 'CHAZARRETA ZAHIRA AYELEN' },
    { fecha: '2025-11-17', cuil: '20424347680', nombre: 'TABOADA JOAQUIN GABRIEL' },
    { fecha: '2025-11-14', cuil: '20472184181', nombre: 'ROMANO BENJAMIN' },
    { fecha: '2025-11-10', cuil: '20459101811', nombre: 'VILLEGAS MARCO' },
    { fecha: '2025-11-07', cuil: '20439114135', nombre: 'ALBORNOZ DIEGO FERNANDO' },
    { fecha: '2025-11-07', cuil: '20421032255', nombre: 'RENIERI AGUSTIN TOMAS' },
    { fecha: '2025-11-06', cuil: '23458734879', nombre: 'TABORDA FELIPE URIEL' },
    { fecha: '2025-11-06', cuil: '20454153252', nombre: 'SZEINBEIN MARCO' },
    { fecha: '2025-11-06', cuil: '23469882349', nombre: 'GOMEZ ARISTIQUI MARCOS LEONEL' },
    { fecha: '2025-11-03', cuil: '20453040454', nombre: 'DEL PRESTAMO GONZALO JOEL' },
    { fecha: '2025-11-03', cuil: '20468218144', nombre: 'VACAS ELIAS NICOLAS' },
    { fecha: '2025-11-03', cuil: '20468921856', nombre: 'SALVADOR LAUTARO AGUSTIN' },
    { fecha: '2025-11-03', cuil: '20459237381', nombre: 'DUARTE FRANCO JOAQUIN' },
    { fecha: '2025-11-27', cuil: '27464337011', nombre: 'SOFIA GUADALUPE JARA' },
    { fecha: '2025-11-26', cuil: '20466408361', nombre: 'LUCIANO BERTOLINI' },
    { fecha: '2025-11-25', cuil: '20428204698', nombre: 'ALEX MANUEL AHUNTCHAIN' },
    { fecha: '2025-11-10', cuil: '20416149918', nombre: 'SIMON NETO' },
    { fecha: '2025-11-06', cuil: '20453033555', nombre: 'CUTTIANI MATEO VALENTIN' },
    { fecha: '2025-11-05', cuil: '20472930363', nombre: 'GONZALEZ THIAGO SEBASTIAN' },
    { fecha: '2025-11-04', cuil: '20445888177', nombre: 'FRANCO NEHUEN DUARTE' },
    { fecha: '2025-11-03', cuil: '20461082824', nombre: 'ASTUDILLO IAN ELIO EXEQUIEL' },
    { fecha: '2025-11-27', cuil: '27947414475', nombre: 'NAVARRO MERCEDES YOHANA GIMENEZ' },
    { fecha: '2025-11-26', cuil: '20453009506', nombre: 'LUNA TOMAS DAVID' },
    { fecha: '2025-11-20', cuil: '20479444189', nombre: 'PREZIOSA VERDUN VALENTINO' },
    { fecha: '2025-11-19', cuil: '23423126809', nombre: 'LUCAS ARIEL DEMOLIS' },
    { fecha: '2025-11-17', cuil: '20440524916', nombre: 'JAVIER AGUSTIN MODON' },
    { fecha: '2025-11-13', cuil: '27401433304', nombre: 'PRADO JIMENA' },
    { fecha: '2025-11-11', cuil: '20467033841', nombre: 'VILLAFUERTE ALEJANDRO EZEQUIEL' },
    { fecha: '2025-11-07', cuil: '20481671842', nombre: 'FLEITA RENATO ALEJO' },
    { fecha: '2025-11-07', cuil: '20453106277', nombre: 'BARBARO FACUNDO LAUTARO' },
    { fecha: '2025-11-05', cuil: '27369051070', nombre: 'ORTIZ MARIA FLORENCIA' },
    { fecha: '2025-11-04', cuil: '20453070736', nombre: 'FESER CRISTIAN MAXIMILIANO' },
    { fecha: '2025-11-07', cuil: '20454815840', nombre: 'AGUIRRE GAITAN NAZARENO LUCIANO' },
    { fecha: '2025-11-07', cuil: '20400106941', nombre: 'ALVAREZ FRANCO LEANDRO RAMON' },
    { fecha: '2025-11-07', cuil: '20302731943', nombre: 'GOROSO DIEGO DAMIAN' },
    { fecha: '2025-11-06', cuil: '20463597023', nombre: 'LÓPEZ GRANERO GONZALO' },
    { fecha: '2025-11-24', cuil: '20419704025', nombre: 'KEVIN CABRERA MAXIMILIANO' },
    { fecha: '2025-11-19', cuil: '20443633341', nombre: 'PFARHERR MANA AGUSTIN LAUTARO' },
    { fecha: '2025-11-19', cuil: '20413928649', nombre: 'MUÑOZ OWEN NAHUEL' },
    { fecha: '2025-11-13', cuil: '20426614740', nombre: 'LISANDRO MOLTRASSIO' },
    { fecha: '2025-11-13', cuil: '27362364103', nombre: 'AYELEN LILIAN GARCIA' },
    { fecha: '2025-11-11', cuil: '27470146147', nombre: 'RODRIGUEZ XIOMARA NAHIR' },
    { fecha: '2025-11-08', cuil: '27471992661', nombre: 'CAÑETE AGUSTINA MAGALI' },
    { fecha: '2025-11-08', cuil: '20469406270', nombre: 'DE MARE AGUSTIN NICOLAS' },
    { fecha: '2025-11-06', cuil: '20446123034', nombre: 'MOYANO SANTIAGO DANIEL' },
    { fecha: '2025-11-21', cuil: '23474134849', nombre: 'GOMEZ RODRIGO ALEJANDRO' },
    { fecha: '2025-11-12', cuil: '27190816635', nombre: 'FLORENCIA LUCIANA BLANCO' },
    { fecha: '2025-11-11', cuil: '20477522115', nombre: 'SANTIAGO CRINIGAN' },
    { fecha: '2025-11-07', cuil: '20472182022', nombre: 'VILLAREAL BENJAMIN MAGNO' },
    { fecha: '2025-11-04', cuil: '20476362866', nombre: 'HERNANDEZ MORENO ADRIAN EZEQUIEL' },
    { fecha: '2025-11-03', cuil: '20439006820', nombre: 'MENDOZA WALTER ESTEBAN' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Mateo Viera (' + records.length + ' registros)');
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
