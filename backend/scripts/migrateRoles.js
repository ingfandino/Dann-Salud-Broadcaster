const path = require('path');
const fs = require('fs');

const envPath = path.resolve(__dirname, '../.env');
console.log('Trying to load .env from:', envPath);

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('.env loaded');
} else {
    console.error('.env file not found at:', envPath);
}

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!uri) {
    console.error('MONGO_URI or MONGODB_URI not defined in environment');
    process.exit(1);
}
const mongoose = require('mongoose');
const User = require('../src/models/User');

const migrate = async () => {
    try {
        await mongoose.connect(uri);
        console.log('Connected to DB');

        const resAdmin = await User.updateMany({ role: 'admin' }, { $set: { role: 'administrativo' } });
        console.log(`Updated ${resAdmin.modifiedCount} admins to administrativo`);

        const resRrhh = await User.updateMany({ role: 'rrhh' }, { $set: { role: 'RR.HH' } });
        console.log(`Updated ${resRrhh.modifiedCount} rrhh to RR.HH`);

        const resRrhh2 = await User.updateMany({ role: 'Rr.hh' }, { $set: { role: 'RR.HH' } });
        console.log(`Updated ${resRrhh2.modifiedCount} Rr.hh to RR.HH`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

migrate();
