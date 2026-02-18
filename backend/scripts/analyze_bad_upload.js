const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Affiliate = require('../src/models/Affiliate');

async function analyze() {
    try {
        console.log('Connecting to DB...');
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dannsalud';
        await mongoose.connect(uri);
        console.log('Connected to DB');

        // Check total count
        const totalCount = await Affiliate.countDocuments({});
        console.log(`TOTAL AFFILIATES IN DB: ${totalCount}`);

        const filename = 'Leads_Enero_38.000(1).xlsx';
        console.log(`Searching for records with sourceFile: "${filename}"`);

        // Find records with this filename
        const count = await Affiliate.countDocuments({ sourceFile: filename });
        console.log(`Total records with filename '${filename}': ${count}`);

        // Group by batchId to see distinct uploads
        const batches = await Affiliate.aggregate([
            { $match: { sourceFile: filename } },
            {
                $group: {
                    _id: "$batchId",
                    count: { $sum: 1 },
                    firstUploadDate: { $min: "$uploadDate" },
                    lastUploadDate: { $max: "$uploadDate" }
                }
            }
        ]);

        console.log('Batches found:');
        batches.forEach(b => {
            console.log(`- BatchID: ${b._id}`);
            console.log(`  Count: ${b.count}`);
            console.log(`  Time: ${b.firstUploadDate}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
}

analyze();
