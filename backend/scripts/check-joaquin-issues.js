// Script para verificar problemas con los 54 registros de Joaquin Valdez
const mongoose = require('mongoose');
require('dotenv').config();

const cuils = ['27475344702', '20465576074', '27470658733', '20461879323', '20446498062', '20455377510', '20454994133', '20374813944', '27428215864', '27441310337', '27470717519', '20427774830', '20437973238', '27429346563', '27430012229', '20389389278', '20392752219', '20412016352', '27391034430', '27444239439', '20435834311', '23434052149', '20446128516', '20440947078', '20418026112', '20942626259', '27439750478', '20437295698', '20454991320', '20439109603', '27460308394', '20463416061', '27458242815', '20441625813', '20446002725', '27472736448', '20476532524', '20457361204', '27462848639', '20459395076', '23465847069', '27466000278', '27434445464', '20461103082', '20452980070', '20472361474', '27406077271', '20417649515', '20474854788', '20469131409', '23471859729', '27456785439', '27452880763', '27452841784'];

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

    let issues = [];
    let ok = 0;

    for (const cuil of cuils) {
        const audit = await Audit.findOne({ cuil }).lean();

        if (!audit) {
            issues.push({ cuil, issue: 'NO EXISTE' });
            continue;
        }

        if (audit.status !== 'QR hecho') {
            issues.push({ cuil, nombre: audit.nombre, issue: 'STATUS: ' + audit.status });
            continue;
        }

        const supSnap = audit.supervisorSnapshot;
        if (!supSnap || !supSnap.nombre || !supSnap.nombre.toLowerCase().includes('joaquin')) {
            issues.push({ cuil, nombre: audit.nombre, issue: 'SUPERVISOR: ' + (supSnap ? supSnap.nombre : 'null') });
            continue;
        }

        ok++;
    }

    console.log('=== VERIFICACIÓN ===');
    console.log('Total esperados:', cuils.length);
    console.log('OK:', ok);
    console.log('Problemas:', issues.length);

    if (issues.length > 0) {
        console.log('\n=== PROBLEMAS ===');
        issues.forEach(i => console.log(`  ${i.cuil} ${i.nombre || ''} - ${i.issue}`));
    }

    await mongoose.disconnect();
}

main().catch(console.error);
