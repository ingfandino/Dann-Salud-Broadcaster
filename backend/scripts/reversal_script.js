const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Affiliate = require('../src/models/Affiliate');

async function reverseUpload() {
    try {
        console.log('Connecting to DB...');
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dannsalud';
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const BATCH_ID = "45af91a2-e698-40f0-9ac6-d414bfce522c";

        console.log(`PRE-CHECK: Searching for records with batchId: "${BATCH_ID}"`);
        const preCount = await Affiliate.countDocuments({ batchId: BATCH_ID });
        console.log(`Found ${preCount} records to delete.`);

        if (preCount === 0) {
            console.log("No records found. Aborting.");
            return;
        }

        console.log("Starting deletion...");
        const result = await Affiliate.deleteMany({ batchId: BATCH_ID });

        console.log(`DELETION COMPLETE. Deleted ${result.deletedCount} records.`);

        // Verification
        const postCount = await Affiliate.countDocuments({ batchId: BATCH_ID });
        console.log(`POST-CHECK: Records remaining with this batchId: ${postCount}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
}

reverseUpload();
