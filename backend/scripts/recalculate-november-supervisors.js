const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = require('../src/models/User');
    const Audit = require('../src/models/Audit');
    const { getSupervisorSnapshotForAudit } = require('../src/utils/supervisorHelper');

    const from = new Date('2025-11-01T00:00:00.000Z');
    const to = new Date('2025-12-01T00:00:00.000Z');

    // Buscar ventas de noviembre
    const audits = await Audit.find({
        $or: [
            { fechaCreacionQR: { $gte: from, $lt: to } },
            { scheduledAt: { $gte: from, $lt: to } }
        ]
    }).populate('asesor', 'nombre numeroEquipo teamHistory');

    console.log(`=== Recalculando ${audits.length} ventas de noviembre ===`);

    let success = 0;
    let errors = 0;
    let noAsesor = 0;

    for (const audit of audits) {
        try {
            if (!audit.asesor) {
                noAsesor++;
                continue;
            }

            const snapshot = await getSupervisorSnapshotForAudit(audit, audit.asesor);

            if (snapshot) {
                audit.supervisorSnapshot = snapshot;
                await audit.save();
                success++;
            } else {
                errors++;
            }
        } catch (err) {
            console.error(`Error en ${audit._id}:`, err.message);
            errors++;
        }
    }

    console.log(`\n✅ Recálculo completado`);
    console.log(`   Exitosos: ${success}`);
    console.log(`   Sin asesor: ${noAsesor}`);
    console.log(`   Errores: ${errors}`);

    await mongoose.disconnect();
}

main().catch(console.error);
