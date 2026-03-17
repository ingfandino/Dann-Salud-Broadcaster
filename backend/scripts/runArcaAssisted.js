const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const parseArgs = require("minimist");
const connectDB = require("../src/config/db");
const Affiliate = require("../src/models/Affiliate");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const { BrowserSession, scrapeCuilWithSession } = require("../src/services/contributionScraper.service");

// Helper to log with timestamp
const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
const logErr = (msg) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);

async function processCuil(cuil, affiliateId, session) {
    log(`--------------------------------------------------`);
    log(`Processing CUIL: ${cuil} (Affiliate: ${affiliateId || 'none'})`);
    
    try {
        const result = await scrapeCuilWithSession(cuil, session, { executionId: "manual-assisted", assistedMode: true });
        
        log(`Result for ${cuil}: ${result.status} ${result.lastContributionPeriod ? `(Period: ${result.lastContributionPeriod})` : ''}`);
        
        if (affiliateId) {
            // Upsert contribution record
            await AffiliateContribution.findOneAndUpdate(
                { affiliateId: affiliateId },
                {
                    $set: {
                        cuil: cuil,
                        lastContributionPeriod: result.lastContributionPeriod,
                        verification: {
                            status: result.status,
                            checkedAt: new Date(),
                            errorMessage: result.message || null
                        },
                        rawResponse: result.rawResponse || null
                    }
                },
                { upsert: true, new: true }
            );
            log(`Saved result to database for affiliate ${affiliateId}`);
        } else {
            log(`No affiliate ID provided, result not saved to DB.`);
        }
        
        return result.status;
    } catch (err) {
        logErr(`Failed to process CUIL ${cuil}: ${err.message}`);
        return "error";
    }
}

async function run() {
    log(`Starting ARCA Assisted Execution...`);
    
    // Parse CLI args
    const argv = parseArgs(process.argv.slice(2));
    const cuilArg = argv.cuil ? String(argv.cuil) : null;
    const mode = argv.mode;
    const limit = parseInt(argv.limit, 10) || 1;
    
    if (!cuilArg && mode !== "pending") {
        logErr("You must provide either --cuil <number> or --mode pending");
        process.exit(1);
    }
    
    // Connect DB
    await connectDB();
    
    let affiliatesToProcess = [];
    
    if (cuilArg) {
        log(`Mode: Single CUIL`);
        const affiliate = await Affiliate.findOne({ cuil: cuilArg }).lean();
        if (affiliate) {
            affiliatesToProcess.push(affiliate);
        } else {
            log(`Warning: CUIL ${cuilArg} not found in database. Will process anyway without saving.`);
            affiliatesToProcess.push({ _id: null, cuil: cuilArg });
        }
    } else if (mode === "pending") {
        log(`Mode: Pending (Limit: ${limit})`);
        
        // Find affiliates without contribution records or with pending status
        const pipeline = [
            {
                $lookup: {
                    from: "affiliatecontributions",
                    localField: "_id",
                    foreignField: "affiliateId",
                    as: "contribution"
                }
            },
            {
                $unwind: {
                    path: "$contribution",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    $or: [
                        { contribution: { $exists: false } },
                        { "contribution.verification.status": "pending" },
                        { "contribution.verification.status": "error" }
                    ]
                }
            },
            { $limit: limit },
            { $project: { _id: 1, cuil: 1, nombre: 1 } }
        ];
        
        affiliatesToProcess = await Affiliate.aggregate(pipeline);
        log(`Found ${affiliatesToProcess.length} pending affiliates.`);
    }
    
    if (affiliatesToProcess.length === 0) {
        log(`No affiliates to process. Exiting.`);
        process.exit(0);
    }
    
    // Ensure headful mode is forced
    process.env.PLAYWRIGHT_HEADLESS = "false";
    
    log(`Initializing Playwright session (visible browser)...`);
    const session = await BrowserSession.create();
    
    const stats = { success: 0, captcha: 0, no_data: 0, error: 0, total: 0 };
    
    try {
        for (const [index, affiliate] of affiliatesToProcess.entries()) {
            log(`[${index + 1}/${affiliatesToProcess.length}] --------------------------------`);
            const status = await processCuil(affiliate.cuil, affiliate._id, session);
            
            stats.total++;
            if (stats[status] !== undefined) {
                stats[status]++;
            } else {
                stats.error++;
            }
            
            if (status === "captcha") {
                logErr(`CAPTCHA timeout reached. Batch paused/stopped.`);
                break;
            }
            
            // Wait a bit between requests if there are more
            if (index < affiliatesToProcess.length - 1) {
                const delay = Math.floor(Math.random() * 3000) + 2000;
                log(`Waiting ${delay}ms before next...`);
                await new Promise(r => setTimeout(r, delay));
            }
        }
    } finally {
        log(`==================================================`);
        log(`Summary:`);
        log(`Total processed: ${stats.total}`);
        log(`Success:         ${stats.success}`);
        log(`No Data:         ${stats.no_data}`);
        log(`CAPTCHA:         ${stats.captcha}`);
        log(`Errors:          ${stats.error}`);
        log(`==================================================`);
        
        log(`Closing session...`);
        await session.close();
        
        log(`Disconnecting from DB...`);
        await mongoose.disconnect();
        
        log(`Done.`);
    }
}

run().catch(err => {
    logErr(`Fatal error: ${err.stack}`);
    process.exit(1);
});
