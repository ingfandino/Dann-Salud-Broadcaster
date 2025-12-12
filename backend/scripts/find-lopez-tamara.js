const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Audit = mongoose.model('Audit', new mongoose.Schema({}, { strict: false }));

    const audit = await Audit.findOne({ cuil: '27475344702' }).lean();

    if (!audit) {
        console.log('NO ENCONTRADO');
    } else {
        console.log('ID:', audit._id);
        console.log('Nombre:', audit.nombre);
        console.log('CUIL:', audit.cuil);
        console.log('Status:', audit.status);
        console.log('fechaCreacionQR:', audit.fechaCreacionQR);
        console.log('scheduledAt:', audit.scheduledAt);
        console.log('Snapshot:', JSON.stringify(audit.supervisorSnapshot));
    }

    await mongoose.disconnect();
}

main().catch(console.error);
