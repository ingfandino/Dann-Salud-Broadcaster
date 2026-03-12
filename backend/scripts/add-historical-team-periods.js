const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const updates = [
        {
            name: 'Pablo Cabrera',
            email: 'pabloalexisc75@gmail.com',
            historyEntry: {
                numeroEquipo: '999',
                fechaInicio: new Date('2025-11-12T00:00:00.000Z'),
                fechaFin: new Date('2025-12-03T00:00:00.000Z'),
                changedAt: new Date(),
                notes: 'Periodo histórico agregado manualmente (antes de implementación de historial)'
            }
        },
        {
            name: 'Martin',
            searchRegex: /mart.*nu/i,
            historyEntry: {
                numeroEquipo: '999',
                fechaInicio: new Date('2025-10-20T00:00:00.000Z'),
                fechaFin: new Date('2025-12-03T00:00:00.000Z'),
                changedAt: new Date(),
                notes: 'Periodo histórico agregado manualmente (antes de implementación de historial)'
            }
        },
        {
            name: 'Taiana Zorrilla',
            searchRegex: /taiana.*zorrilla/i,
            historyEntry: {
                numeroEquipo: '888',
                fechaInicio: new Date('2025-07-22T00:00:00.000Z'),
                fechaFin: new Date('2025-12-03T00:00:00.000Z'),
                changedAt: new Date(),
                notes: 'Periodo histórico agregado manualmente (antes de implementación de historial)'
            }
        }
    ];

    for (const update of updates) {
        let user;
        if (update.email) {
            user = await User.findOne({ email: update.email });
        } else if (update.searchRegex) {
            user = await User.findOne({ nombre: update.searchRegex });
        }

        if (!user) {
            console.log(`❌ No se encontró usuario: ${update.name}`);
            continue;
        }

        console.log(`\n=== ${user.nombre} ===`);
        console.log('ID:', user._id);
        console.log('TeamHistory antes:', JSON.stringify(user.teamHistory, null, 2));

        // Inicializar teamHistory si no existe
        if (!user.teamHistory || !Array.isArray(user.teamHistory)) {
            user.teamHistory = [];
        }

        // Verificar si ya existe un periodo similar (mismo equipo y fechas)
        const exists = user.teamHistory.some(h =>
            h.numeroEquipo === update.historyEntry.numeroEquipo &&
            new Date(h.fechaInicio).getTime() === update.historyEntry.fechaInicio.getTime()
        );

        if (exists) {
            console.log('⚠️  Periodo ya existe, saltando...');
            continue;
        }

        // Insertar al inicio del array (periodo histórico)
        user.teamHistory.unshift(update.historyEntry);

        await user.save();
        console.log('✅ Periodo histórico agregado');
        console.log('TeamHistory después:', JSON.stringify(user.teamHistory, null, 2));
    }

    await mongoose.disconnect();
    console.log('\n✅ DONE');
}

main().catch(console.error);
