
require('dotenv').config({ path: 'backend/.env' });
const mongoose = require('mongoose');
const { Schema } = mongoose;

// Definir esquemas mínimos necesarios para la lectura
const UserSchema = new Schema({}, { strict: false });
const AuditSchema = new Schema({}, { strict: false });

const User = mongoose.model('User', UserSchema);
const Audit = mongoose.model('Audit', AuditSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Conectado a DB");

        const targetCUIL = '20430469518';

        // 1. Buscar la Auditoría
        const audit = await Audit.findOne({ cuil: targetCUIL }).lean();

        if (!audit) {
            console.log("No se encontró auditoría con CUIL:", targetCUIL);
            return;
        }

        console.log("\n=== AUDITORÍA ===");
        console.log(`ID: ${audit._id}`);
        console.log(`Status: ${audit.status}`);
        console.log(`Asesor ID: ${audit.asesor}`);
        console.log(`Supervisor Snapshot:`, audit.supervisorSnapshot);
        console.log(`Group ID:`, audit.groupId);
        console.log(`Numero Equipo:`, audit.numeroEquipo);
        console.log(`Is Referido:`, audit.isReferido);
        console.log(`Administrador:`, audit.administrador);

        // 2. Buscar Usuarios Involucrados

        // Asesor (Aryel)
        let asesor = null;
        if (audit.asesor) {
            asesor = await User.findById(audit.asesor).lean();
        }

        // Supervisor Actual (Eliana Sanchez o Aryel si ya cambió)
        let supervisorSnapshotUser = null;
        if (audit.supervisorSnapshot && audit.supervisorSnapshot._id) {
            supervisorSnapshotUser = await User.findById(audit.supervisorSnapshot._id).lean();
        }

        // Buscar específicamente a "Eliana Sanchez" para ver sus datos
        const elianaSanchez = await User.findOne({
            $or: [
                { nombre: { $regex: /eliana.*sanchez/i } },
                { name: { $regex: /eliana.*sanchez/i } }
            ]
        }).lean();

        // Buscar específicamente a "Aryel Puiggros"
        const aryelUser = await User.findOne({
            $or: [
                { nombre: { $regex: /aryel/i } },
                { name: { $regex: /aryel/i } }
            ]
        }).lean();


        console.log("\n=== ASESOR (En la Audit) ===");
        if (asesor) {
            console.log(`Nombre: ${asesor.nombre || asesor.name}`);
            console.log(`Role: ${asesor.role}`);
            console.log(`Numero Equipo: ${asesor.numeroEquipo}`);
            console.log(`Supervisor (field):`, asesor.supervisor);
        } else {
            console.log("No se encontró usuario asesor con el ID de la audit");
        }

        console.log("\n=== SUPERVISOR (En Snapshot Actual) ===");
        if (supervisorSnapshotUser) {
            console.log(`Nombre: ${supervisorSnapshotUser.nombre || supervisorSnapshotUser.name}`);
            console.log(`Role: ${supervisorSnapshotUser.role}`);
            console.log(`Numero Equipo: ${supervisorSnapshotUser.numeroEquipo}`);
        } else {
            console.log("No user found for snapshot ID (or snapshot is null/local object)");
        }

        console.log("\n=== DATOS USUARIO 'Eliana Sanchez' ===");
        if (elianaSanchez) {
            console.log(`ID: ${elianaSanchez._id}`);
            console.log(`Nombre: ${elianaSanchez.nombre || elianaSanchez.name}`);
            console.log(`Role: ${elianaSanchez.role}`);
            console.log(`Numero Equipo: ${elianaSanchez.numeroEquipo}`);
        } else {
            console.log("Usuario 'Eliana Sanchez' no encontrado en búsqueda flexible");
        }

        console.log("\n=== DATOS USUARIO 'Aryel Puiggros' ===");
        if (aryelUser) {
            console.log(`ID: ${aryelUser._id}`);
            console.log(`Nombre: ${aryelUser.nombre || aryelUser.name}`);
            console.log(`Role: ${aryelUser.role}`);
            console.log(`Numero Equipo: ${aryelUser.numeroEquipo}`);
        } else {
            console.log("Usuario 'Aryel Puiggros' no encontrado en búsqueda flexible");
        }


    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
