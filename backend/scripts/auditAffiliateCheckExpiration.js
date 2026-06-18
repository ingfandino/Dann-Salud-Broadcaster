#!/usr/bin/env node
"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env"), quiet: true });

function parseArgs(argv) {
    const args = { limit: 100 };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--limit") {
            args.limit = Number(argv[index + 1]);
            index += 1;
        } else if (arg === "--help" || arg === "-h") {
            args.help = true;
        } else {
            args.unknown = arg;
        }
    }
    return args;
}

function printHelp() {
    console.log("Usage: node scripts/auditAffiliateCheckExpiration.js --limit <1-500>");
    console.log("Dry-run only. Prints aggregate Affiliate Check ownership-expiration metrics.");
}

function sanitizeStats(stats) {
    return {
        dryRun: true,
        currentTime: stats.now,
        batchSize: stats.batchSize,
        activeAssignmentsScanned: stats.scanned,
        assignmentsDue: stats.eligible,
        assignmentsNotDue: stats.skippedNotDue,
        alreadyExpired: stats.alreadyExpired,
        missingExpiresAt: stats.missingExpiresAt,
        duplicateActiveAssignmentAnomalies: stats.duplicateActiveAssignmentAnomalies,
        proposedEffects: stats.effects,
        errors: stats.errors,
        durationMs: stats.durationMs,
        safeToExecute: stats.safeToExecute === true && stats.errors === 0
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
        printHelp();
        return;
    }
    if (args.unknown) {
        throw new Error(`Argumento no soportado: ${args.unknown}`);
    }
    if (!Number.isInteger(args.limit) || args.limit <= 0 || args.limit > 500) {
        throw new Error("--limit debe ser un entero entre 1 y 500");
    }

    const mongoose = require("mongoose");
    const connectDB = require("../src/config/db");
    const {
        auditAffiliateCheckExpiration
    } = require("../src/services/affiliateCheckExpiration.service");

    try {
        await connectDB();
        const stats = await auditAffiliateCheckExpiration({ limit: args.limit });
        console.log(JSON.stringify(sanitizeStats(stats), null, 2));
    } finally {
        await mongoose.disconnect().catch(() => {});
    }
}

main().catch(error => {
    console.error(JSON.stringify({
        success: false,
        code: "AFFILIATE_CHECK_EXPIRATION_AUDIT_FAILED",
        message: error?.message || "Error ejecutando auditoria de vencimiento"
    }, null, 2));
    process.exitCode = 1;
});
