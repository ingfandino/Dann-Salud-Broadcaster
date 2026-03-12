const mongoose = require('mongoose');
require('dotenv').config();

// Milagros Krauss (under Mateo Viera)
const records = [
    { fecha: '2025-11-29', cuil: '20470954265', nombre: 'ESCOBAR KEVIN ALEXIS' },
    { fecha: '2025-11-28', cuil: '27350418046', nombre: 'DAIANA PAOLA TAPIA' },
    { fecha: '2025-11-26', cuil: '20460967148', nombre: 'FERREIRA ACOSTA ULISES' },
    { fecha: '2025-11-19', cuil: '20468722438', nombre: 'FERRARI VILLANUEVA VALENTINO' },
    { fecha: '2025-11-18', cuil: '27474714956', nombre: 'BOUZON BENITEZ DENISSE SOFIA' },
    { fecha: '2025-11-18', cuil: '27358007452', nombre: 'VALENZUELA JOHANA ELIZABETH' },
    { fecha: '2025-11-13', cuil: '20475672640', nombre: 'ENZO XAVIER WENNER' },
    { fecha: '2025-11-13', cuil: '20452252474', nombre: 'NICOLAS JEHOVA UNCOS' },
    { fecha: '2025-11-11', cuil: '27460089684', nombre: 'PAULETICH VICTORIA SOFIA' },
    { fecha: '2025-11-10', cuil: '20469458556', nombre: 'GERMAN LOPEZ' },
    { fecha: '2025-11-07', cuil: '20450722996', nombre: 'PRAT BAUTISTA' },
    { fecha: '2025-11-06', cuil: '20436290374', nombre: 'ROMERO FRANCO IVAN' },
    { fecha: '2025-11-05', cuil: '20439196425', nombre: 'CEJAS MARIANA BELEN' },
    { fecha: '2025-11-04', cuil: '20341370559', nombre: 'CABRERA ANDRES OSVALDO' },
    { fecha: '2025-11-04', cuil: '27474789352', nombre: 'LENCINA NAIR DANIELA' },
];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected - Milagros Krauss (' + records.length + ' registros)');
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
