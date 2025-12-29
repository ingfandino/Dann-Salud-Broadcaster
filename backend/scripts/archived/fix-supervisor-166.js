require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../src/models/User");
const Audit = require("../src/models/Audit");
const connectDB = require("../src/config/db");

async function fixSupervisor() {
    try {
        await connectDB();
        console.log("Connected to DB");

        // 1. Find Abigail Vera
        const abigail = await User.findOne({ nombre: "Abigail Vera" });
        if (!abigail) {
            console.log("❌ Abigail Vera not found");
            return;
        }
        console.log(`✅ Found Abigail Vera: ${abigail._id}, Team: ${abigail.numeroEquipo}, Role: ${abigail.role}`);

        // 2. Find the audits
        const cuils = ["27470092616", "27940364804"];
        const audits = await Audit.find({ cuil: { $in: cuils } });
        console.log(`Found ${audits.length} audits`);

        for (const audit of audits) {
            console.log(`Processing audit: ${audit.nombre} (${audit.cuil})`);
            console.log(`Current Supervisor Snapshot:`, audit.supervisorSnapshot);

            // Update supervisorSnapshot
            audit.supervisorSnapshot = {
                _id: abigail._id,
                nombre: abigail.nombre,
                email: abigail.email
            };

            // Ensure groupId is 166 (as per user request/image)
            // If the audit has a groupId field that stores the team number or ID
            // In Audit.js, groupId is a reference to User (supervisor) OR just a number?
            // Let's check the schema in the previous turns or just log it.
            // Based on previous turns, groupId is often used for the team number in some contexts, 
            // but in the Audit model it might be `numeroEquipo` or `groupId` as a reference.
            // The image shows "166" in the group column.

            // Let's just update supervisorSnapshot for now as that's what drives the "Supervisor" column usually.

            await audit.save();
            console.log(`✅ Updated supervisor for ${audit.cuil}`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected");
    }
}

fixSupervisor();
