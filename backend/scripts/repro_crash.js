const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Affiliate = require('../src/models/Affiliate');

async function testCrash() {
    try {
        console.log('Connecting to DB...');
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dannsalud';
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const badKeys = [
            "normal_key",
            "key.with.dots",
            "$dollarSign",
            "",
            "   ",
            "key with spaces",
            "very_long_key_".repeat(10),
            "key/with/slashes",
            "key[brackets]"
        ];

        for (const key of badKeys) {
            console.log(`Testing key: "${key}"`);
            try {
                const affiliate = new Affiliate({
                    nombre: "Test Crash",
                    cuil: "99999999999",
                    obraSocial: "TestOS",
                    localidad: "TestCity",
                    telefono1: "11111111",
                    uploadedBy: new mongoose.Types.ObjectId(), // Fake ID
                    sourceFile: "TEST_REPRO",
                    batchId: "TEST_REPRO",
                    additionalData: {
                        [key]: "some value"
                    }
                });

                // We validate first to see if that throws, as save() does validation
                await affiliate.validate();
                console.log(`✅ Key "${key}" passed validation.`);
            } catch (err) {
                console.error(`❌ CRASH / ERROR with key "${key}":`, err.message);
            }
        }

    } catch (error) {
        console.error('Fatal Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed');
    }
}

testCrash();
