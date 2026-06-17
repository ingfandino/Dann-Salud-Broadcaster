"use strict";

/**
 * ============================================================
 * CAN SELL UTILITIES - Phase 1 Refactor
 * ============================================================
 * Implements the strict 5-condition rule for CanSell
 * (Disponible para venta) and persists the result to
 * AffiliateContribution.canSell during bot execution.
 *
 * Conditions (ALL must be true):
 *   1. Trim. pagos > 0  (last3ClosedMonthsPaidCount > 0)
 *   2. Padron = "No"    (status is "not_found" or "found_expired")
 *   3. Verificación = "success"
 *   4. Teléfono_1 has at least 10 valid digits
 *   5. CUIL does NOT appear in Afiliaciones exitosas ("QR hecho")
 */

const AffiliateContribution = require("../models/AffiliateContribution");
const Affiliate              = require("../models/Affiliate");
const Audit                  = require("../models/Audit");
const logger                 = require("./logger");

/**
 * Result object returned by evaluateCanSellStrict
 * @typedef {Object} CanSellEvaluationResult
 * @property {boolean} canSell - Final availability decision
 * @property {boolean} c1_trim - Condition 1: Trim. pagos > 0
 * @property {boolean} c2_padron - Condition 2: Padrón status compatible
 * @property {boolean} c3_verification - Condition 3: ARCA verification success
 * @property {boolean} c4_phone - Condition 4: Valid phone number
 * @property {boolean} c5_noQr - Condition 5: No QR hecho audit
 * @property {string[]} failedReasons - Human-readable list of failed conditions
 * @property {Object} sourceValues - Raw values used for the decision
 * @property {number|null} sourceValues.last3ClosedMonthsPaidCount
 * @property {string|null} sourceValues.padronStatus
 * @property {string|null} sourceValues.verificationStatus
 * @property {string|null} sourceValues.phone
 * @property {string|null} sourceValues.cuil
 * @property {boolean} sourceValues.hasQrHecho
 */

/**
 * Returns true when the phone string contains at least 10 digits after
 * stripping all non-numeric characters.
 * @param {string|null|undefined} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
    if (!phone) return false;
    return String(phone).replace(/\D/g, "").length >= 10;
}

function normalizeCuil(cuil) {
    if (!cuil) return "";
    return String(cuil).replace(/\D/g, "");
}

function buildCuilLooseRegex(cuil) {
    const normalized = normalizeCuil(cuil);
    if (!normalized) return null;
    return new RegExp(`^\\D*${normalized.split("").join("\\D*")}\\D*$`);
}

async function hasQrHechoForCuil(cuil) {
    const normalized = normalizeCuil(cuil);
    if (!normalized) return false;

    const looseRegex = buildCuilLooseRegex(normalized);
    const qrHecho = await Audit.findOne(
        {
            status: "QR hecho",
            $or: [
                { cuil },
                { cuil: normalized },
                { cuil: looseRegex }
            ]
        },
        { _id: 1 }
    ).lean();

    return !!qrHecho;
}

/**
 * 🔍 STRICT EVALUATION HELPER
 * Evaluates all 5 CanSell conditions and returns detailed result.
 * This is the SINGLE SOURCE OF TRUTH for availability logic.
 * 
 * @param {string|import('mongoose').Types.ObjectId} affiliateId
 * @returns {Promise<CanSellEvaluationResult|null>} Detailed evaluation or null if data missing
 */
async function evaluateCanSellStrict(affiliateId) {
    const strId = String(affiliateId);
    
    try {
        // Fetch required data
        const [contrib, affiliate] = await Promise.all([
            AffiliateContribution.findOne(
                { affiliateId: strId },
                { last3ClosedMonthsPaidCount: 1, "verification.status": 1, "padron.status": 1, cuil: 1 }
            ).lean(),
            Affiliate.findById(strId, { telefono1: 1, cuil: 1 }).lean(),
        ]);

        // Handle missing data
        if (!contrib || !affiliate) {
            logger.debug(`[CANSELL-EVAL] Datos incompletos para affiliateId=${strId} contrib=${!!contrib} affiliate=${!!affiliate}`);
            return null;
        }

        const cuil = affiliate.cuil || contrib.cuil;
        
        if (!cuil) {
            logger.debug(`[CANSELL-EVAL] CUIL faltante para affiliateId=${strId}`);
            return null;
        }

        // Evaluate each condition
        // C1: Trim. pagos > 0
        const c1_trim = contrib.last3ClosedMonthsPaidCount != null && contrib.last3ClosedMonthsPaidCount > 0;
        
        // C2: Padrón compatible (not_found or found_expired)
        const padronStatus = contrib.padron?.status ?? null;
        const c2_padron = padronStatus === "not_found" || padronStatus === "found_expired";
        
        // C3: ARCA verification = success
        const verificationStatus = contrib.verification?.status ?? null;
        const c3_verification = verificationStatus === "success";
        
        // C4: Valid phone (≥10 digits)
        const phone = affiliate.telefono1;
        const c4_phone = isValidPhone(phone);
        
        // C5: No QR hecho audit for this CUIL
        const hasQrHecho = await hasQrHechoForCuil(cuil);
        const c5_noQr = !hasQrHecho;
        
        // Final decision
        const canSell = c1_trim && c2_padron && c3_verification && c4_phone && c5_noQr;
        
        // Build failed reasons list
        const failedReasons = [];
        if (!c1_trim) failedReasons.push("Trimestre sin pagos");
        if (!c2_padron) {
            if (padronStatus === "found_active") failedReasons.push("Padrón: Afiliado activo");
            else if (padronStatus === "captcha_failed") failedReasons.push("Padrón: Error captcha");
            else if (padronStatus === "error") failedReasons.push("Padrón: Error consulta");
            else if (padronStatus === null || padronStatus === undefined) failedReasons.push("Padrón: Sin verificar");
            else failedReasons.push(`Padrón: ${padronStatus}`);
        }
        if (!c3_verification) {
            if (verificationStatus === "error") failedReasons.push("ARCA: Error verificación");
            else if (verificationStatus === "captcha") failedReasons.push("ARCA: Captcha requerido");
            else if (verificationStatus === "no_data") failedReasons.push("ARCA: Sin datos");
            else if (verificationStatus === "pending") failedReasons.push("ARCA: Pendiente");
            else failedReasons.push(`ARCA: ${verificationStatus || "Sin verificar"}`);
        }
        if (!c4_phone) failedReasons.push(`Teléfono inválido: ${phone || "vacío"}`);
        if (!c5_noQr) failedReasons.push("Ya tiene QR hecho");

        // Build source values for debugging
        const sourceValues = {
            last3ClosedMonthsPaidCount: contrib.last3ClosedMonthsPaidCount,
            padronStatus,
            verificationStatus,
            phone,
            cuil,
            hasQrHecho,
            affiliateId: strId,
        };

        return {
            canSell,
            c1_trim,
            c2_padron,
            c3_verification,
            c4_phone,
            c5_noQr,
            failedReasons,
            sourceValues,
        };
        
    } catch (err) {
        logger.error(`[CANSELL-EVAL] Error evaluando canSell para affiliateId=${strId}: ${err.message}`);
        return null;
    }
}

/**
 * 💾 COMPUTE AND PERSIST CanSell
 * Evaluates using the strict helper and persists to AffiliateContribution.canSell.
 * 
 * This must be called after every ARCA save, every Padron save, and when 
 * Audit status changes to/from "QR hecho" so the value never remains stale.
 *
 * @param {string|import('mongoose').Types.ObjectId} affiliateId
 * @returns {Promise<{success: boolean, canSell: boolean|null, evaluation: CanSellEvaluationResult|null, error: string|null}>}
 */
async function computeAndUpdateCanSell(affiliateId) {
    const strId = String(affiliateId);
    
    try {
        // Use the strict evaluator (single source of truth)
        const evaluation = await evaluateCanSellStrict(affiliateId);
        
        if (!evaluation) {
            const error = `Datos incompletos para evaluar canSell`;
            logger.warn(`[CANSELL-UPDATE] ${error} | affiliateId=${strId}`);
            return { success: false, canSell: null, evaluation: null, error };
        }

        const { canSell, failedReasons, sourceValues } = evaluation;

        // Enhanced logging for observability
        logger.info(
            `[CANSELL-UPDATE] affiliateId=${strId} | canSell=${canSell} | ` +
            `conditions=[c1:${evaluation.c1_trim},c2:${evaluation.c2_padron},c3:${evaluation.c3_verification},c4:${evaluation.c4_phone},c5:${evaluation.c5_noQr}] | ` +
            (failedReasons.length > 0 ? `failed=[${failedReasons.join(";")}]` : "all_passed")
        );

        // Persist to database
        const updated = await AffiliateContribution.findOneAndUpdate(
            { affiliateId: strId },
            { $set: { canSell } },
            { new: true }
        );

        if (!updated) {
            const error = `No se encontró AffiliateContribution para actualizar`;
            logger.error(`[CANSELL-UPDATE] ${error} | affiliateId=${strId}`);
            return { success: false, canSell, evaluation, error };
        }

        return { success: true, canSell, evaluation, error: null };
        
    } catch (err) {
        const error = `Error inesperado: ${err.message}`;
        logger.error(`[CANSELL-UPDATE] ${error} | affiliateId=${strId}`);
        return { success: false, canSell: null, evaluation: null, error };
    }
}

/**
 * 🔍 COMPUTE WITHOUT PERSISTING (Dry-run mode)
 * Useful for validation scripts that need to compare without modifying.
 * 
 * @param {string|import('mongoose').Types.ObjectId} affiliateId
 * @returns {Promise<CanSellEvaluationResult|null>} Evaluation result without persisting
 */
async function evaluateCanSellDryRun(affiliateId) {
    return await evaluateCanSellStrict(affiliateId);
}

module.exports = { 
    evaluateCanSellStrict,      // 🔍 Pure evaluation helper
    computeAndUpdateCanSell,    // 💾 Evaluation + persistence
    evaluateCanSellDryRun,      // 🔍 Dry-run for validation
    isValidPhone,               // 📞 Phone validation utility
    normalizeCuil,
    buildCuilLooseRegex,
    hasQrHechoForCuil,
};
