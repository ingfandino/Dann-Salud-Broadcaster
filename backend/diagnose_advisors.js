require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const supervisors = await User.find({ role: { $in: ['supervisor', 'supervisor_reventa'] } });
        console.log(`\n--- SUPERVISORES (${supervisors.length}) ---`);

        let totalLinkedByID = 0;
        let totalLinkedByTeam = 0;

        for (const s of supervisors) {
            // Check by ID
            const byId = await User.find({ supervisor: s._id, role: 'asesor' });

            // Check by Team
            let byTeam = [];
            if (s.numeroEquipo) {
                // Find advisors with same team string
                byTeam = await User.find({
                    numeroEquipo: s.numeroEquipo,
                    role: 'asesor',
                    _id: { $ne: s._id } // Exclude self
                });
            }

            console.log(`Sup: ${s.nombre} | Team: ${s.numeroEquipo || 'N/A'}`);
            console.log(`   -> Linked by ID: ${byId.length}`);
            console.log(`   -> Linked by Team: ${byTeam.length}`);

            totalLinkedByID += byId.length;
            totalLinkedByTeam += byTeam.length;
        }

        console.log(`\nTotal Linked by ID: ${totalLinkedByID}`);
        console.log(`Total Linked by Team: ${totalLinkedByTeam}`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}

run();
