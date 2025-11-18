// Script para asignar validadores a auditorías que no tienen
// Estrategia: Asignar al supervisor del equipo del asesor

const mongoose = require('mongoose');
require('dotenv').config();

const Audit = require('./src/models/Audit');
const User = require('./src/models/User');

async function fixValidadores() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB\n');

        // Buscar auditorías sin validador
        const auditsWithoutValidador = await Audit.find({
            $or: [
                { validador: { $exists: false } },
                { validador: null }
            ]
        })
        .populate('asesor', 'nombre name email numeroEquipo')
        .select('nombre cuil asesor createdAt')
        .lean();

        console.log(`🔍 Auditorías sin validador: ${auditsWithoutValidador.length}\n`);

        if (auditsWithoutValidador.length === 0) {
            console.log('✅ Todas las auditorías tienen validador asignado');
            process.exit(0);
        }

        // Mostrar muestra
        console.log('📋 MUESTRA (primeras 10):');
        auditsWithoutValidador.slice(0, 10).forEach(a => {
            console.log(`   • ${a.nombre} (${a.cuil})`);
            console.log(`     Asesor: ${a.asesor?.nombre || a.asesor?.name || 'Sin asesor'}`);
            console.log(`     Equipo: ${a.asesor?.numeroEquipo || 'N/A'}`);
        });

        console.log(`\n⏳ Procesando asignación de validadores...`);

        let fixed = 0;
        let errors = 0;
        const updates = [];

        for (const audit of auditsWithoutValidador) {
            try {
                let validadorId = null;

                // Si tiene asesor, buscar el supervisor de su equipo
                if (audit.asesor?.numeroEquipo) {
                    const supervisor = await User.findOne({
                        numeroEquipo: audit.asesor.numeroEquipo,
                        role: { $in: ['supervisor', 'supervisor_reventa'] },
                        active: { $ne: false }
                    }).select('_id nombre name').lean();

                    if (supervisor) {
                        validadorId = supervisor._id;
                        updates.push({
                            auditId: audit._id,
                            nombre: audit.nombre,
                            cuil: audit.cuil,
                            validador: supervisor.nombre || supervisor.name,
                            equipo: audit.asesor.numeroEquipo
                        });
                    } else {
                        console.log(`   ⚠️  No se encontró supervisor para equipo ${audit.asesor.numeroEquipo} (${audit.nombre})`);
                        errors++;
                    }
                } else {
                    console.log(`   ⚠️  Auditoría sin asesor o sin equipo: ${audit.nombre}`);
                    errors++;
                }

                // Actualizar si encontramos validador
                if (validadorId) {
                    await Audit.updateOne(
                        { _id: audit._id },
                        { $set: { validador: validadorId } }
                    );
                    fixed++;
                }
            } catch (err) {
                console.error(`   ❌ Error procesando ${audit.nombre}:`, err.message);
                errors++;
            }
        }

        console.log(`\n✅ RESULTADO:`);
        console.log(`   ✅ Auditorías actualizadas: ${fixed}`);
        console.log(`   ⚠️  Errores/omitidas: ${errors}`);

        if (updates.length > 0) {
            console.log(`\n📋 ACTUALIZACIONES REALIZADAS (muestra):`);
            updates.slice(0, 10).forEach(u => {
                console.log(`   • ${u.nombre} (${u.cuil})`);
                console.log(`     Validador asignado: ${u.validador}`);
                console.log(`     Equipo: ${u.equipo}`);
            });
        }

        // Verificar Rodriguez específicamente
        const rodriguez = await Audit.findOne({ cuil: '20441724129' })
            .populate('validador', 'nombre name')
            .lean();

        if (rodriguez) {
            console.log(`\n🎯 Rodriguez Ezequiel Adonai:`);
            console.log(`   Validador: ${rodriguez.validador?.nombre || rodriguez.validador?.name || '❌ Sin validador'}`);
        }

        console.log(`\n✅ Proceso completado`);
        console.log(`\n📌 SIGUIENTE PASO:`);
        console.log(`   1. Refresca la página de FollowUp (Ctrl+F5)`);
        console.log(`   2. Abre detalles de Rodriguez y verifica que ahora muestre el validador`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixValidadores();
