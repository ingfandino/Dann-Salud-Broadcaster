"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const AffiliateCheckJob = require("../models/AffiliateCheckJob");

const ACTIVE_STATUSES = ["pending", "processing", "pausing", "paused", "retrying", "stuck"];
const NEW_INDEX = "uniq_active_affiliate_check_owner_mode";
const OLD_INDEX = "uniq_active_affiliate_check_channel";
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const dropOld = args.has("--drop-old");

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || "";
    if (!uri) throw new Error("MONGO_URI no definido");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

    const duplicates = await AffiliateCheckJob.aggregate([
        {
            $match: {
                channelOwner: { $exists: true, $ne: null },
                mode: { $in: ["check_new", "check_reusable", "check_import"] },
                status: { $in: ACTIVE_STATUSES },
                isDeleted: false
            }
        },
        { $group: { _id: { channelOwner: "$channelOwner", mode: "$mode" }, count: { $sum: 1 }, jobIds: { $push: "$_id" } } },
        { $match: { count: { $gt: 1 } } }
    ]);

    const indexesBefore = await AffiliateCheckJob.collection.indexes();
    const hasNewIndex = indexesBefore.some(index => index.name === NEW_INDEX);
    const hasOldIndex = indexesBefore.some(index => index.name === OLD_INDEX);

    console.log(JSON.stringify({ apply, dropOld, hasNewIndex, hasOldIndex, duplicateGroups: duplicates }, null, 2));

    if (duplicates.length > 0) {
        throw new Error("Existen trabajos activos duplicados por supervisor y modo. Resolver antes de crear índice único.");
    }

    if (!apply) return;

    if (!hasNewIndex) {
        await AffiliateCheckJob.collection.createIndex(
            { channelOwner: 1, mode: 1 },
            {
                name: NEW_INDEX,
                unique: true,
                partialFilterExpression: {
                    channelOwner: { $type: "objectId" },
                    mode: { $in: ["check_new", "check_reusable", "check_import"] },
                    status: { $in: ACTIVE_STATUSES },
                    isDeleted: false
                }
            }
        );
    }

    const indexesAfterCreate = await AffiliateCheckJob.collection.indexes();
    if (!indexesAfterCreate.some(index => index.name === NEW_INDEX)) {
        throw new Error("El índice nuevo no quedó creado; no se puede continuar.");
    }

    if (dropOld && hasOldIndex) {
        await AffiliateCheckJob.collection.dropIndex(OLD_INDEX);
    }

    const indexesAfter = await AffiliateCheckJob.collection.indexes();
    console.log(JSON.stringify({ indexes: indexesAfter.map(index => ({ name: index.name, key: index.key, unique: Boolean(index.unique), partialFilterExpression: index.partialFilterExpression || null })) }, null, 2));
}

main()
    .catch(error => {
        console.error(error.stack || error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    });
