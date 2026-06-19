"use strict";

jest.setTimeout(30000);

jest.mock("../src/services/sssaludScraper.service", () => ({
    SSSaludSession: {
        create: jest.fn(async () => ({ close: jest.fn(async () => {}) }))
    },
    scrapeCuilWithSession: jest.fn()
}));

jest.mock("../src/utils/canSellUtils", () => ({
    hasQrHechoForCuil: jest.fn(async () => false),
    computeAndUpdateCanSell: jest.fn(async affiliateId => {
        const AffiliateContribution = require("../src/models/AffiliateContribution");
        const contribution = await AffiliateContribution.findOne({ affiliateId }).lean();
        const canSell = ["not_found", "found_expired"].includes(contribution?.padron?.status);
        await AffiliateContribution.updateOne({ affiliateId }, { $set: { canSell } });
        return { success: true, canSell, evaluation: { canSell } };
    })
}));

require("./setup");

const mongoose = require("mongoose");
const Affiliate = require("../src/models/Affiliate");
const AffiliateAssignment = require("../src/models/AffiliateAssignment");
const AffiliateCheckJob = require("../src/models/AffiliateCheckJob");
const AffiliateCheckRow = require("../src/models/AffiliateCheckRow");
const AffiliateContribution = require("../src/models/AffiliateContribution");
const AffiliateOperationalState = require("../src/models/AffiliateOperationalState");
const { scrapeCuilWithSession } = require("../src/services/sssaludScraper.service");
const { hasQrHechoForCuil } = require("../src/utils/canSellUtils");
const {
    claimNextPadronRecovery,
    findPadronRecoveryCandidates,
    heartbeatPadronRecovery,
    processClaimedPadronRecovery,
    runPadronRecoveryOnce
} = require("../src/services/padronRecovery.service");

const NOW = new Date("2026-06-10T12:00:00.000Z");
const SESSION = { close: jest.fn(async () => {}) };

function scraperResult(status, overrides = {}) {
    const found = status === "found_active" || status === "found_expired";
    return {
        ok: ["not_found", "found_expired", "found_active"].includes(status),
        status,
        found,
        canSell: ["not_found", "found_expired"].includes(status),
        data: found ? {
            obraSocial: status === "found_active" ? "OS Activa" : "OS Vencida",
            periodoDesde: "01/2024",
            nextChangeDate: "01/2025",
            monthsElapsed: 29,
            estado: "VIGENTE"
        } : null,
        checkedAt: NOW,
        errorMessage: status === "captcha_failed" ? "CAPTCHA no resuelto" : null,
        ...overrides
    };
}

async function createRecoveryCandidate({
    paidMonths = 2,
    trabaja = true,
    needsPadron = true,
    padronStatus = "captcha_failed",
    availableForSale = false,
    saleStatus = "none",
    ownership = {},
    recovery = null
} = {}) {
    const cuil = String(Math.floor(20000000000 + Math.random() * 7000000000));
    const affiliate = await Affiliate.create({
        nombre: "Recovery Test",
        cuil,
        obraSocial: "OS Importada",
        localidad: "CABA",
        telefono1: "1122334455",
        uploadedBy: new mongoose.Types.ObjectId(),
        sourceFile: "padron-recovery-test.xlsx",
        batchId: "padron-recovery-test",
        active: true
    });
    const job = await AffiliateCheckJob.create({
        requestedBy: new mongoose.Types.ObjectId(),
        requestedByRole: "gerencia",
        mode: "check_new",
        status: "completed_with_errors",
        requestedCount: 1,
        selectedCount: 1,
        failedCount: 1
    });
    const row = await AffiliateCheckRow.create({
        jobId: job._id,
        affiliateId: affiliate._id,
        cuilNormalized: cuil,
        mode: "check_new",
        status: "failed",
        stages: {
            arca: {
                status: "done",
                result: {
                    status: "success",
                    trabaja,
                    trimPagos: paidMonths,
                    last3ClosedMonthsPaidCount: paidMonths,
                    needsPadron,
                    checkedAt: NOW
                }
            },
            dateas: { status: "done" },
            padron: {
                status: "failed",
                result: {
                    status: padronStatus === "timeout" ? "error" : padronStatus,
                    sourceStatus: padronStatus,
                    errorMessage: "technical failure",
                    checkedAt: NOW
                }
            },
            finalization: { status: "done", finalizedAt: NOW }
        }
    });
    const contribution = await AffiliateContribution.create({
        affiliateId: affiliate._id,
        cuil,
        lastContributionPeriod: "04/2026",
        last3ClosedMonthsPaidCount: paidMonths,
        verification: {
            status: "success",
            checkedAt: NOW,
            checkedBy: "test",
            executionType: "manual",
            executionId: `affiliate_check:${job._id}`,
            source: "arca_mis_aportes"
        },
        padron: {
            status: ["timeout", "solver_unavailable", "failed"].includes(padronStatus)
                ? "error"
                : padronStatus,
            checkedAt: NOW,
            canSell: false
        },
        padronRecovery: recovery,
        canSell: false
    });
    const state = await AffiliateOperationalState.create({
        affiliateId: affiliate._id,
        cuil,
        cuilNormalized: cuil,
        freshness: "fresh",
        verificationStatus: "checked",
        usageStatus: "blocked",
        saleStatus,
        canSell: false,
        availableForSale,
        unavailableReason: "padron_technical_failure",
        ownership,
        contributionId: contribution._id,
        calculatedAt: NOW
    });
    return { affiliate, contribution, job, row, state };
}

async function claim(workerId = "recovery-worker", overrides = {}) {
    return claimNextPadronRecovery({
        workerId,
        leaseMs: 60000,
        maxAttempts: 5,
        retryAfterHours: 24,
        now: NOW,
        ...overrides
    });
}

describe("padronRecovery.service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        hasQrHechoForCuil.mockResolvedValue(false);
        scrapeCuilWithSession.mockResolvedValue(scraperResult("found_expired"));
    });

    test("does not run or call Padrón when disabled", async () => {
        const result = await runPadronRecoveryOnce({
            env: { PADRON_RECOVERY_ENABLED: "false" },
            now: NOW,
            session: SESSION
        });

        expect(result).toEqual({ enabled: false, processed: 0, recovered: 0, notSellable: 0, failed: 0 });
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test.each([
        ["zero paid months", { paidMonths: 0 }],
        ["trabaja false", { trabaja: false }],
        ["needsPadron false", { needsPadron: false }],
        ["non-technical Padrón status", { padronStatus: "found_active" }],
        ["already available stock", { availableForSale: true }],
        ["QR hecho state", { saleStatus: "qr_done" }]
    ])("excludes %s from recovery candidates", async (_label, options) => {
        await createRecoveryCandidate(options);
        const candidates = await findPadronRecoveryCandidates({ now: NOW, limit: 10 });
        expect(candidates).toHaveLength(0);
    });

    test("requires no active ownership or active assignment", async () => {
        const supervisorId = new mongoose.Types.ObjectId();
        await createRecoveryCandidate({
            ownership: {
                supervisorId,
                assignedAt: NOW,
                expiresAt: new Date(NOW.getTime() + 60000),
                source: "check_job"
            }
        });
        expect(await findPadronRecoveryCandidates({ now: NOW, limit: 10 })).toHaveLength(0);

        const candidate = await createRecoveryCandidate();
        await AffiliateAssignment.create({
            affiliateId: candidate.affiliate._id,
            supervisorId,
            assignedBy: new mongoose.Types.ObjectId(),
            source: "check_job",
            sourceJobId: candidate.job._id,
            status: "active",
            assignedAt: NOW,
            expiresAt: new Date(NOW.getTime() + 60000)
        });
        expect(await findPadronRecoveryCandidates({ now: NOW, limit: 10 })).toHaveLength(0);
    });

    test("uses the existing QR guard before claiming", async () => {
        await createRecoveryCandidate();
        hasQrHechoForCuil.mockResolvedValue(true);
        expect(await claim()).toBeNull();
    });

    test("atomically claims with a lease, refuses stealing, and heartbeats only for owner", async () => {
        const { contribution, row } = await createRecoveryCandidate();
        const claimed = await claim("owner");
        const stolen = await claim("other");
        const wrongHeartbeat = await heartbeatPadronRecovery({
            rowId: row._id,
            workerId: "other",
            leaseMs: 120000,
            now: NOW
        });
        const heartbeatAt = new Date(NOW.getTime() + 1000);
        const ownedHeartbeat = await heartbeatPadronRecovery({
            rowId: row._id,
            workerId: "owner",
            leaseMs: 120000,
            now: heartbeatAt
        });

        expect(claimed.contribution.padronRecovery).toMatchObject({
            status: "processing",
            claimedBy: "owner",
            attempts: 1,
            sourceRowId: row._id
        });
        expect(claimed.contribution.padronRecovery.leaseUntil).toEqual(new Date(NOW.getTime() + 60000));
        expect(stolen).toBeNull();
        expect(wrongHeartbeat).toBeNull();
        expect(ownedHeartbeat.padronRecovery.heartbeatAt).toEqual(heartbeatAt);
        expect((await AffiliateContribution.findById(contribution._id)).padronRecovery.claimedBy).toBe("owner");
    });

    test("reclaims an expired lease and respects retry-after for failed attempts", async () => {
        const expired = await createRecoveryCandidate({
            recovery: {
                status: "processing",
                claimedBy: "dead-worker",
                attempts: 1,
                maxAttempts: 5,
                lastAttemptAt: new Date(NOW.getTime() - 25 * 60 * 60 * 1000),
                leaseUntil: new Date(NOW.getTime() - 1000)
            }
        });
        const reclaimed = await claim("new-worker");
        expect(reclaimed.contribution._id.toString()).toBe(expired.contribution._id.toString());
        expect(reclaimed.contribution.padronRecovery.attempts).toBe(2);
        expect(reclaimed.contribution.padronRecovery.claimedBy).toBe("new-worker");

        await createRecoveryCandidate({
            recovery: {
                status: "failed",
                attempts: 1,
                maxAttempts: 5,
                lastAttemptAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000)
            }
        });
        const candidates = await findPadronRecoveryCandidates({ now: NOW, limit: 10 });
        expect(candidates.length).toBeGreaterThan(0);
        const tooSoon = await claim("retry-worker");
        expect(tooSoon).toBeNull();
    });

    test("max attempts prevents further claims", async () => {
        await createRecoveryCandidate({
            recovery: {
                status: "failed",
                attempts: 5,
                maxAttempts: 5,
                lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000)
            }
        });
        expect(await claim()).toBeNull();
        expect(scrapeCuilWithSession).not.toHaveBeenCalled();
    });

    test("sellable recovery updates canonical Padrón and releases only to general stock", async () => {
        const supervisorId = new mongoose.Types.ObjectId();
        const { affiliate, contribution, job } = await createRecoveryCandidate({
            ownership: {
                supervisorId,
                assignedAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000),
                expiresAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000),
                source: "check_job"
            }
        });
        await AffiliateAssignment.create({
            affiliateId: affiliate._id,
            supervisorId,
            assignedBy: new mongoose.Types.ObjectId(),
            source: "check_job",
            sourceJobId: job._id,
            status: "active",
            assignedAt: new Date(NOW.getTime() - 60 * 24 * 60 * 60 * 1000),
            expiresAt: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
        });
        const claimed = await claim();
        const result = await processClaimedPadronRecovery({
            claimed,
            workerId: "recovery-worker",
            leaseMs: 60000,
            session: SESSION,
            now: NOW
        });
        const [stored, state, assignments] = await Promise.all([
            AffiliateContribution.findById(contribution._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean(),
            AffiliateAssignment.find({ affiliateId: affiliate._id }).lean()
        ]);

        expect(result).toMatchObject({ success: true, recovered: true, status: "found_expired" });
        expect(stored.padron.status).toBe("found_expired");
        expect(stored.canSell).toBe(true);
        expect(stored.padronRecovery).toMatchObject({
            status: "recovered",
            claimedBy: "recovery-worker",
            lastResultStatus: "found_expired"
        });
        expect(stored.padronRecovery.recoveredAt).toEqual(NOW);
        expect(state).toMatchObject({
            availableForSale: true,
            usageStatus: "available",
            canSell: true,
            unavailableReason: null
        });
        expect(state.ownership.supervisorId).toBeNull();
        expect(assignments).toHaveLength(1);
        expect(assignments[0]).toMatchObject({
            status: "expired",
            releaseReason: "padron_recovery_stale_assignment"
        });
    });

    test("found_active remains unavailable and is marked not_sellable", async () => {
        scrapeCuilWithSession.mockResolvedValue(scraperResult("found_active"));
        const { affiliate, contribution } = await createRecoveryCandidate();
        const claimed = await claim();
        const result = await processClaimedPadronRecovery({
            claimed,
            workerId: "recovery-worker",
            leaseMs: 60000,
            session: SESSION,
            now: NOW
        });
        const [stored, state] = await Promise.all([
            AffiliateContribution.findById(contribution._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(result).toMatchObject({ success: true, recovered: false, status: "found_active" });
        expect(stored.canSell).toBe(false);
        expect(stored.padronRecovery.status).toBe("not_sellable");
        expect(state.availableForSale).toBe(false);
        expect(state.unavailableReason).toMatch(/Afiliado activo/);
    });

    test("technical failure remains unavailable and records retry metadata", async () => {
        scrapeCuilWithSession.mockResolvedValue(scraperResult("captcha_failed"));
        const { affiliate, contribution } = await createRecoveryCandidate();
        const claimed = await claim();
        const result = await processClaimedPadronRecovery({
            claimed,
            workerId: "recovery-worker",
            leaseMs: 60000,
            session: SESSION,
            now: NOW
        });
        const [stored, state] = await Promise.all([
            AffiliateContribution.findById(contribution._id).lean(),
            AffiliateOperationalState.findOne({ affiliateId: affiliate._id }).lean()
        ]);

        expect(result).toMatchObject({ success: false, retryable: true, status: "captcha_failed" });
        expect(stored.padron.status).toBe("captcha_failed");
        expect(stored.canSell).toBe(false);
        expect(stored.padronRecovery).toMatchObject({
            status: "failed",
            attempts: 1,
            lastErrorMessage: "CAPTCHA no resuelto",
            lastResultStatus: "captcha_failed"
        });
        expect(stored.padronRecovery.lastAttemptAt).toEqual(NOW);
        expect(state.availableForSale).toBe(false);
    });

    test("enabled single run is bounded by max-per-run", async () => {
        await createRecoveryCandidate();
        await createRecoveryCandidate();
        const result = await runPadronRecoveryOnce({
            workerId: "bounded-worker",
            env: {
                PADRON_RECOVERY_ENABLED: "true",
                PADRON_RECOVERY_MAX_PER_RUN: "1",
                PADRON_RECOVERY_LEASE_MS: "60000",
                PADRON_RECOVERY_MAX_ATTEMPTS: "5",
                PADRON_RECOVERY_RETRY_AFTER_HOURS: "24"
            },
            session: SESSION,
            now: NOW
        });

        expect(result.processed).toBe(1);
        expect(scrapeCuilWithSession).toHaveBeenCalledTimes(1);
    });
});
