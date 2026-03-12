// scripts/checkDuplicates.js

require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/dannsalud";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function askQuestion(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function getUniqueIndexes(collection) {
    const indexes = await mongoose.connection.db.collection(collection).indexes();
    return indexes
        .filter((idx) => idx.unique && !idx.key._id) // solo índices únicos distintos de _id
        .map((idx) => Object.keys(idx.key)[0]); // obtenemos el campo del índice
}

async function checkDuplicates(collection, field) {
    const pipeline = [
        { $group: { _id: `$${field}`, count: { $sum: 1 }, docs: { $push: "$_id" } } },
        { $match: { count: { $gt: 1 } } },
    ];
    const results = await mongoose.connection.db
        .collection(collection)
        .aggregate(pipeline)
        .toArray();

    if (results.length > 0) {
        console.log(`⚠️  Duplicados encontrados en "${collection}" campo "${field}":`);
        for (const r of results) {
            console.log(`  Valor: ${r._id} (veces: ${r.count}) -> IDs: ${r.docs.join(", ")}`);

            const answer = await askQuestion(
                `¿Quieres eliminar ${r.count - 1} duplicados de "${collection}" con valor "${r._id}"? (s/n): `
            );

            if (answer.toLowerCase() === "s") {
                const toDelete = r.docs.slice(1); // conserva el primero
                await mongoose.connection.db
                    .collection(collection)
                    .deleteMany({ _id: { $in: toDelete } });
                console.log(`   🗑️  Eliminados ${toDelete.length} duplicados.`);
            } else {
                console.log("   ⏩ Omitido.");
            }
        }
    } else {
        console.log(`✅ Sin duplicados en "${collection}" campo "${field}"`);
    }
}

async function main() {
    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ Conectado a MongoDB");

        const collections = await mongoose.connection.db.listCollections().toArray();
        for (const coll of collections) {
            const collectionName = coll.name;
            const uniqueFields = await getUniqueIndexes(collectionName);

            if (uniqueFields.length === 0) {
                console.log(`ℹ️  "${collectionName}" no tiene índices únicos (aparte de _id).`);
                continue;
            }

            for (const field of uniqueFields) {
                await checkDuplicates(collectionName, field);
            }
        }

        console.log("🔍 Revisión completada.");
        rl.close();
        await mongoose.disconnect();
    } catch (err) {
        console.error("❌ Error en checkDuplicates:", err);
        rl.close();
        process.exit(1);
    }
}

main();