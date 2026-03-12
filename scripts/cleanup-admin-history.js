/**
 * Script de limpieza: Elimina entradas falsas "Sin Admin → Sin Admin" del administradorHistory
 * 
 * Uso:
 *   node scripts/cleanup-admin-history.js          # Modo dry-run (solo muestra lo que haría)
 *   node scripts/cleanup-admin-history.js --exec    # Ejecuta la limpieza real
 */

const mongoose = require('mongoose');
const path = require('path');

// Cargar configuración del backend
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DRY_RUN = !process.argv.includes('--exec');

async function main() {
  if (!MONGO_URI) {
    console.error('❌ No se encontró MONGODB_URI ni MONGO_URI en el .env del backend');
    process.exit(1);
  }

  console.log(`🔧 Conectando a MongoDB...`);
  await mongoose.connect(MONGO_URI);
  console.log(`✅ Conectado`);

  if (DRY_RUN) {
    console.log('\n⚠️  MODO DRY-RUN: No se modificará nada. Usa --exec para ejecutar.\n');
  } else {
    console.log('\n🚨 MODO EJECUCIÓN: Se eliminarán las entradas falsas.\n');
  }

  const db = mongoose.connection.db;
  const auditsCollection = db.collection('audits');

  // Buscar auditorías que tengan administradorHistory con entradas donde ambos son null
  const auditsWithHistory = await auditsCollection.find({
    'administradorHistory.0': { $exists: true }
  }).project({
    _id: 1,
    nombre: 1,
    cuil: 1,
    administradorHistory: 1
  }).toArray();

  console.log(`📋 Auditorías con administradorHistory: ${auditsWithHistory.length}`);

  let totalFalsas = 0;
  let totalLegitimas = 0;
  let auditsAfectadas = 0;

  for (const audit of auditsWithHistory) {
    const history = audit.administradorHistory || [];
    const falsas = [];
    const legitimas = [];

    for (const entry of history) {
      const prev = entry.previousAdmin;
      const next = entry.newAdmin;

      // Entrada falsa: ambos son null/undefined (Sin Admin → Sin Admin)
      const prevIsNull = !prev || prev === null;
      const nextIsNull = !next || next === null;

      if (prevIsNull && nextIsNull) {
        falsas.push(entry);
      } else if (prev && next && prev.toString() === next.toString()) {
        // Entrada falsa: ambos son el mismo ID (Admin A → Admin A)
        falsas.push(entry);
      } else {
        legitimas.push(entry);
      }
    }

    if (falsas.length > 0) {
      auditsAfectadas++;
      totalFalsas += falsas.length;
      totalLegitimas += legitimas.length;

      console.log(`\n  📄 ${audit.nombre || 'N/A'} (CUIL: ${audit.cuil || 'N/A'}) [${audit._id}]`);
      console.log(`     ❌ Entradas falsas: ${falsas.length}`);
      console.log(`     ✅ Entradas legítimas: ${legitimas.length}`);

      for (const f of falsas) {
        const fecha = f.changedAt ? new Date(f.changedAt).toLocaleString('es-AR') : 'sin fecha';
        console.log(`        ❌ null → null  (${fecha})`);
      }

      if (!DRY_RUN) {
        // Reemplazar el array completo con solo las entradas legítimas
        await auditsCollection.updateOne(
          { _id: audit._id },
          { $set: { administradorHistory: legitimas } }
        );
        console.log(`     🗑️  Limpiado: quedan ${legitimas.length} entradas legítimas`);
      }
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log(`📊 RESUMEN:`);
  console.log(`   Auditorías revisadas:    ${auditsWithHistory.length}`);
  console.log(`   Auditorías afectadas:    ${auditsAfectadas}`);
  console.log(`   Entradas falsas:         ${totalFalsas}`);
  console.log(`   Entradas legítimas:      ${totalLegitimas}`);
  console.log('════════════════════════════════════════');

  if (DRY_RUN && totalFalsas > 0) {
    console.log('\n⚠️  Para ejecutar la limpieza real, correr:');
    console.log('   node scripts/cleanup-admin-history.js --exec\n');
  } else if (!DRY_RUN && totalFalsas > 0) {
    console.log(`\n✅ Limpieza completada: ${totalFalsas} entradas falsas eliminadas.\n`);
  } else {
    console.log('\n✅ No se encontraron entradas falsas. Base de datos limpia.\n');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Error:', err);
  mongoose.disconnect();
  process.exit(1);
});
