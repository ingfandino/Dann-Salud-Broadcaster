/**
 * Migración: Marcar a Eliana Suarez como esResponsableDeReferidos = true
 * 
 * Uso: node scripts/migrateResponsableReferidos.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

async function migrate() {
    try {
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('❌ No se encontró MONGODB_URI en las variables de entorno');
            process.exit(1);
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Conectado a MongoDB');

        // Buscar a Eliana Suarez (flexible con/sin acento)
        const eliana = await User.findOne({
            $or: [
                { nombre: { $regex: /eliana.*su[aá]rez/i } },
                { email: { $regex: /eliana.*su[aá]rez/i } }
            ],
            role: 'gerencia',
            active: true
        });

        if (!eliana) {
            console.error('❌ No se encontró a Eliana Suarez (rol gerencia, activa) en la base de datos');
            process.exit(1);
        }

        console.log(`📋 Usuario encontrado: ${eliana.nombre} (${eliana.email}) - _id: ${eliana._id}`);

        // Actualizar campo
        eliana.esResponsableDeReferidos = true;
        await eliana.save();

        console.log('✅ esResponsableDeReferidos = true asignado correctamente');

        // Verificar que nadie más tenga el flag (por seguridad)
        const count = await User.countDocuments({ esResponsableDeReferidos: true });
        console.log(`📊 Total de usuarios con esResponsableDeReferidos=true: ${count}`);

        await mongoose.disconnect();
        console.log('✅ Migración completada exitosamente');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error en migración:', err);
        process.exit(1);
    }
}

migrate();
