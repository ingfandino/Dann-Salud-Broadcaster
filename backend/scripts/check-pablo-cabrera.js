const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Find Pablo Cabrera
    const user = await User.findOne({ nombre: { $regex: /pablo.*cabrera/i } }).lean();

    if (!user) {
        console.log('User not found');
        process.exit(1);
    }

    console.log('\n=== Pablo Cabrera ===');
    console.log('ID:', user._id);
    console.log('Nombre:', user.nombre);
    console.log('Email:', user.email);
    console.log('NumeroEquipo actual:', user.numeroEquipo);
    console.log('\n=== Team History ===');

    if (user.teamHistory && user.teamHistory.length > 0) {
        user.teamHistory.forEach((h, i) => {
            console.log(`\nPeriodo ${i + 1}:`);
            console.log('  numeroEquipo:', h.numeroEquipo);
            console.log('  fechaInicio:', h.fechaInicio);
            console.log('  fechaFin:', h.fechaFin || 'ABIERTO');
            console.log('  notes:', h.notes || '(sin notas)');
        });

        // Check for open periods
        const openPeriods = user.teamHistory.filter(h => !h.fechaFin);
        console.log('\nPeriodos abiertos:', openPeriods.length);

    } else {
        console.log('(Sin historial)');
    }

    await mongoose.disconnect();
}

main().catch(console.error);
