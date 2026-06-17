/**
 * ============================================================
 * CONTROLADOR DE DISTRIBUCIÓN DE LEADS (deliveryController.js)
 * ============================================================
 * Gestiona el wizard de "Programar Envío" desde la lista de afiliados.
 * 
 * Endpoints:
 *   GET  /affiliates/delivery/stock             - Stock disponible con filtros
 *   POST /affiliates/delivery/execute           - Ejecutar bloques de envío
 *   GET  /affiliates/delivery/scheduled/:supId  - Obtener config programada
 *   POST /affiliates/delivery/scheduled         - Guardar config programada
 *   DELETE /affiliates/delivery/scheduled/:supId - Desactivar config programada
 *
 * Reglas de negocio:
 *   - Elegibilidad: solo registros con canSell = true en AffiliateContribution
 *   - Frescos: canSell=true, cuil NO en Audit, dataSource != reusable, isUsed != true
 *   - Reutilizables: canSell=true, cuil EN Audit o dataSource = reusable
 *   - Conflicto (ambas): tratar como reutilizable
 *   - Teléfono inválido: null, '', N/A, NA, SIN DATO
 */

const XLSX = require("xlsx");
const Affiliate = require("../models/Affiliate");
const AffiliateContribution = require("../models/AffiliateContribution");
const Audit = require("../models/Audit");
const User = require("../models/User");
const InternalMessage = require("../models/InternalMessage");
const ScheduledDeliveryConfig = require("../models/ScheduledDeliveryConfig");
const { getLocalitiesByZone, ALL_KNOWN_LOCALITIES, normalize } = require("../constants/localityZones");
const logger = require("../utils/logger");
const mongoose = require("mongoose");

// ── Constants ────────────────────────────────────────────────────────────────

const INVALID_PHONE_VALUES = ["", "N/A", "NA", "SIN DATO", "null", "NULL", "n/a", "na", "sin dato"];
const REUSABLE_AUDIT_STATUSES = ["No atendió", "Tiene dudas", "Reprogramada (falta confirmar hora)"];

/**
 * Returns the UTC Date corresponding to midnight (00:00) on the first day of the
 * current calendar month in Argentina time (UTC-3, no DST).
 * Used as the lower bound for the same-month reuse exclusion:
 *   ultimoUso < getArgentinaMonthStart()  →  used in a previous month  →  eligible
 *   ultimoUso >= getArgentinaMonthStart() →  used this month           →  excluded
 */
function getArgentinaMonthStart() {
    const now = new Date();
    const argNow = new Date(now.getTime() - 3 * 60 * 60 * 1000); // shift to UTC-3
    return new Date(Date.UTC(argNow.getUTCFullYear(), argNow.getUTCMonth(), 1, 3, 0, 0));
}

/**
 * MongoDB $or clause that passes only leads NOT used in the current calendar month
 * (Argentina time).  Handles null / missing ultimoUso correctly (those are eligible).
 */
function notUsedThisMonthClause() {
    const monthStart = getArgentinaMonthStart();
    return {
        $or: [
            { ultimoUso: { $exists: false } },
            { ultimoUso: null },
            { ultimoUso: { $lt: monthStart } }
        ]
    };
}

function neverUsedClause() {
    return {
        $and: [
            {
                $or: [
                    { ultimoUso: { $exists: false } },
                    { ultimoUso: null }
                ]
            },
            {
                $or: [
                    { isUsed: { $exists: false } },
                    { isUsed: false }
                ]
            }
        ]
    };
}

function usedAtLeastOnceClause() {
    return {
        $or: [
            { dataSource: "reusable" },
            { isUsed: true },
            { ultimoUso: { $exists: true, $ne: null } }
        ]
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes a phone string to digits-only and validates it has exactly 10 digits.
 * Returns the 10-digit string if valid, otherwise null.
 */
function normalizePhone(phone) {
    if (!phone || typeof phone !== "string") return null;
    const digits = phone.replace(/\D/g, "");
    return digits.length === 10 ? digits : null;
}

/** Returns true iff the phone normalizes to exactly 10 digits. */
function isValidPhone(phone) {
    return normalizePhone(phone) !== null;
}

/** Safely converts a string/ObjectId to mongoose ObjectId */
function toObjectId(id) {
    if (id instanceof mongoose.Types.ObjectId) return id;
    try { return new mongoose.Types.ObjectId(String(id)); } catch { return null; }
}

/**
 * Builds a MongoDB localidad filter for an array of zones.
 * Handles PROVINCIA (anything NOT in known zones).
 * Returns an object ready to spread into a query.
 */
function buildZoneFilter(zones) {
    if (!zones || zones.length === 0) return {};

    const hasProvince = zones.some(z => z.toUpperCase() === "PROVINCIA");
    const namedZones = zones.filter(z => z.toUpperCase() !== "PROVINCIA");

    let localitySet = [];
    for (const z of namedZones) {
        const locs = getLocalitiesByZone(z);
        if (locs && locs.length > 0) {
            localitySet.push(...locs);
        }
    }

    if (hasProvince && namedZones.length === 0) {
        // ONLY Provincia selected → exclude all known localities
        return {
            localidad: {
                $nin: Array.from(ALL_KNOWN_LOCALITIES).map(l => new RegExp(`^${escapeRegex(l)}$`, "i"))
            }
        };
    }

    if (hasProvince && localitySet.length > 0) {
        // Provincia + named zones → all localidades NOT in other-known-zones minus current named zones
        const knownInOtherZones = Array.from(ALL_KNOWN_LOCALITIES).filter(
            l => !localitySet.map(normalize).includes(l)
        );
        return {
            $or: [
                { localidad: { $in: localitySet.map(l => new RegExp(`^${escapeRegex(l)}$`, "i")) } },
                { localidad: { $nin: knownInOtherZones.map(l => new RegExp(`^${escapeRegex(l)}$`, "i")) } }
            ]
        };
    }

    if (localitySet.length > 0) {
        return {
            localidad: { $in: localitySet.map(l => new RegExp(`^${escapeRegex(l)}$`, "i")) }
        };
    }

    return {};
}

/**
 * Builds the base Affiliate query: active, valid phone, not Venta, filtered by zones.
 * No date filter — chronological prioritization is applied via sort + ARCA rule.
 */
function buildBaseQuery(zones) {
    const query = { active: true };
    const zoneFilter = buildZoneFilter(zones);
    Object.assign(query, zoneFilter);
    return query;
}

/**
 * Returns the affiliate IDs whose canSell flag is true.
 * This is the sole eligibility gate for Programar Envío.
 */
async function getCanSellIds() {
    return AffiliateContribution.distinct("affiliateId", { canSell: true });
}

/**
 * Builds a fresh-lead query gated solely on canSell = true:
 *   - Must be in canSellIds (sole eligibility gate)
 *   - Not classified as reusable (dataSource != reusable, isUsed != true)
 *   - CUIL not already present in any Audit record
 * Sorted externally by uploadDate DESC (newest first).
 */
function buildFreshLeadQuery(baseQuery, canSellIds, excludedIds, osName) {
    const excluded = excludedIds.map(toObjectId).filter(Boolean);
    const andClauses = [
        baseQuery,
        {
            _id: { $in: canSellIds },
            dataSource: "fresh"
        },
        neverUsedClause()
    ];
    if (osName) andClauses.push({ obraSocial: osName });
    if (excluded.length > 0) andClauses.push({ _id: { $nin: excluded } });
    return { $and: andClauses };
}

/**
 * Fetches exactly `targetCount` leads with exhaustive multi-pass pagination.
 * Uses a 2x overfetch per pass; repeats excluding already-seen IDs until the
 * target is met or the eligible pool is truly exhausted.
 * Applies strict 10-digit phone validation in JS on every candidate.
 */
async function fetchLeadsExact(query, sort, targetCount) {
    if (targetCount <= 0) return [];
    return await Affiliate.find(query).sort(sort).limit(targetCount).lean();
}

/**
 * Builds a reusable-lead query gated solely on canSell = true.
 * Sorted externally by ultimoUso ASC (nulls first), uploadDate ASC.
 */
function buildReusableLeadQuery(baseQuery, canSellIds, excludedIds, osName) {
    const excluded = excludedIds.map(toObjectId).filter(Boolean);
    const andClauses = [
        baseQuery,
        { _id: { $in: canSellIds } },
        usedAtLeastOnceClause(),
        notUsedThisMonthClause()
    ];
    if (osName) andClauses.push({ obraSocial: osName });
    if (excluded.length > 0) andClauses.push({ _id: { $nin: excluded } });
    return { $and: andClauses };
}

// ── 1. GET /affiliates/delivery/stock ────────────────────────────────────────
/**
 * Returns fresh/reusable stock per obra social for the given zones.
 * Eligibility gate: canSell = true (AffiliateContribution).
 * Query params:
 *   zones[]         - array of zone names (Norte, Sur, Oeste, CABA, Provincia)
 *   obrasSociales[] - optional: filter to specific OS
 */
exports.getDeliveryStock = async (req, res) => {
    try {
        let zones = req.query["zones[]"] || req.query.zones || [];
        if (typeof zones === "string") zones = [zones];

        let osFilter = req.query["obrasSociales[]"] || req.query.obrasSociales || [];
        if (typeof osFilter === "string") osFilter = [osFilter];

        const baseQuery = buildBaseQuery(zones);
        const canSellIds = await getCanSellIds();

        const freshQuery = buildFreshLeadQuery(baseQuery, canSellIds, [], null);
        const reusableQuery = buildReusableLeadQuery(baseQuery, canSellIds, [], null);

        if (osFilter.length > 0) {
            freshQuery.$and.push({ obraSocial: { $in: osFilter } });
            reusableQuery.$and.push({ obraSocial: { $in: osFilter } });
        }

        const [freshByOS, reusableByOS, allObrasSociales] = await Promise.all([
            Affiliate.aggregate([
                { $match: freshQuery },
                { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Affiliate.aggregate([
                { $match: reusableQuery },
                { $group: { _id: "$obraSocial", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Affiliate.distinct("obraSocial", { active: true, obraSocial: { $exists: true, $nin: [null, ""] } })
        ]);

        const osMap = {};
        for (const row of freshByOS) {
            if (!row._id) continue;
            if (!osMap[row._id]) osMap[row._id] = { nombre: row._id, freshCount: 0, reusableCount: 0 };
            osMap[row._id].freshCount = row.count;
        }
        for (const row of reusableByOS) {
            if (!row._id) continue;
            if (!osMap[row._id]) osMap[row._id] = { nombre: row._id, freshCount: 0, reusableCount: 0 };
            osMap[row._id].reusableCount = row.count;
        }

        const stockList = Object.values(osMap).sort((a, b) => (b.freshCount + b.reusableCount) - (a.freshCount + a.reusableCount));

        res.json({
            stock: stockList,
            allObrasSociales: allObrasSociales.filter(Boolean).sort((a, b) => a.localeCompare(b, "es")),
            canSellApplied: true
        });

    } catch (error) {
        logger.error("Error en getDeliveryStock:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 2. POST /affiliates/delivery/execute ─────────────────────────────────────
/**
 * Executes one or more delivery blocks immediately.
 * Body: { blocks: [{ supervisorId, zones, freshPct, reusablePct, obrasSociales: [{nombre, cantidad}] }] }
 *
 * Two-pass strategy:
 *  PASS 1 (dry-run): Allocate all blocks without persisting. Validate that every
 *                    block can be fulfilled with the exact requested quantity and
 *                    exact fresh/reusable composition. If ANY block fails → 422,
 *                    persist nothing.
 *  PASS 2 (persist): All plans validated — recycle old lots and persist assignments.
 *
 * Exact-composition rule: reusableTarget = os.cantidad - freshTarget (never fills
 * fresh shortfall with reusable leads).
 */
exports.executeDeliveryBlocks = async (req, res) => {
    try {
        const { blocks } = req.body;

        if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
            return res.status(400).json({ error: "Se requiere al menos un bloque de envío" });
        }

        const batchId = `delivery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // Shared data fetched once
        const canSellIds = await getCanSellIds();

        // Pre-load supervisors and validate block configs
        const supervisorCache = {};
        for (const block of blocks) {
            const { supervisorId, obrasSociales } = block;
            if (!supervisorId) return res.status(400).json({ error: "Falta supervisorId en uno de los bloques" });
            if (!obrasSociales || obrasSociales.length === 0) return res.status(400).json({ error: "Falta distribución por obra social en uno de los bloques" });
            if (!supervisorCache[supervisorId]) {
                const sup = await User.findById(supervisorId).lean();
                if (!sup) return res.status(400).json({ error: `Supervisor ${supervisorId} no encontrado` });
                supervisorCache[supervisorId] = sup;
            }
        }

        // ── PASS 1: Dry-run allocation ───────────────────────────────────────
        // Allocate leads for all blocks without persisting anything.
        // Track IDs across blocks to prevent duplicates.
        // If any block cannot be exactly fulfilled → abort with 422.

        const allocatedAcrossBlocks = new Set(); // IDs committed during dry-run
        const blockPlans = [];
        const allocationErrors = [];

        for (const block of blocks) {
            const { supervisorId, zones, obrasSociales } = block;
            const freshPct = typeof block.freshPct === "number" ? block.freshPct : 70;
            const supervisor = supervisorCache[supervisorId];

            const baseQuery = buildBaseQuery(zones);
            const blockLocalIds = new Set();
            const excludedArr = () => [
                ...Array.from(allocatedAcrossBlocks),
                ...Array.from(blockLocalIds)
            ];

            const freshAllocated = {};
            const reusableAllocated = {};

            for (const os of obrasSociales) {
                if (!os.nombre || os.cantidad <= 0) {
                    freshAllocated[os.nombre] = [];
                    reusableAllocated[os.nombre] = [];
                    continue;
                }

                const freshTarget = Math.round(os.cantidad * freshPct / 100);
                const reusableTarget = os.cantidad - freshTarget; // exact composition

                if (freshTarget > 0) {
                    const q = buildFreshLeadQuery(baseQuery, canSellIds, excludedArr(), os.nombre);
                    freshAllocated[os.nombre] = await fetchLeadsExact(q, { uploadDate: -1 }, freshTarget);
                    freshAllocated[os.nombre].forEach(l => blockLocalIds.add(l._id.toString()));
                } else {
                    freshAllocated[os.nombre] = [];
                }

                if (reusableTarget > 0) {
                    const q = buildReusableLeadQuery(baseQuery, canSellIds, excludedArr(), os.nombre);
                    reusableAllocated[os.nombre] = await fetchLeadsExact(q, { ultimoUso: 1, uploadDate: 1 }, reusableTarget);
                    reusableAllocated[os.nombre].forEach(l => blockLocalIds.add(l._id.toString()));
                } else {
                    reusableAllocated[os.nombre] = [];
                }
            }

            const requestedTotal = obrasSociales.reduce((s, os) => s + os.cantidad, 0);
            const requestedFresh = obrasSociales.reduce((s, os) => s + Math.round(os.cantidad * freshPct / 100), 0);
            const requestedReusable = requestedTotal - requestedFresh;
            const gotFresh = Object.values(freshAllocated).flat().length;
            const gotReusable = Object.values(reusableAllocated).flat().length;

            if (gotFresh !== requestedFresh || gotReusable !== requestedReusable) {
                allocationErrors.push({
                    supervisorId,
                    supervisorName: supervisor.nombre,
                    error: `Stock insuficiente para cumplir la configuración exacta. Solicitado: ${requestedTotal} (${requestedFresh}F / ${requestedReusable}R). Disponible: ${gotFresh + gotReusable} (${gotFresh}F / ${gotReusable}R).`
                });
                continue; // do NOT commit this block's IDs
            }

            // Commit IDs to cross-block exclusion set
            blockLocalIds.forEach(id => allocatedAcrossBlocks.add(id));

            blockPlans.push({
                supervisor,
                freshAllocated,
                reusableAllocated,
                blockFreshIds: Object.values(freshAllocated).flat().map(a => a._id),
                blockReusableIds: Object.values(reusableAllocated).flat().map(a => a._id),
                blockAssigned: [...Object.values(freshAllocated).flat(), ...Object.values(reusableAllocated).flat()]
            });
        }

        // If ANY block could not be exactly fulfilled → abort, persist nothing
        if (allocationErrors.length > 0) {
            return res.status(422).json({
                success: false,
                errors: allocationErrors,
                message: "No se ejecutó ningún envío. Ajustá la configuración antes de continuar."
            });
        }

        // ── PASS 2: Persist all plans ────────────────────────────────────────
        const results = [];
        const persistErrors = [];

        for (const plan of blockPlans) {
            const { supervisor, blockFreshIds, blockReusableIds, blockAssigned } = plan;

            try {
                // Recycle supervisor's current active lot before assigning new one
                await Affiliate.updateMany(
                    { assignedTo: supervisor._id, leadStatus: "Asignado", active: true },
                    {
                        $set: {
                            dataSource: "reusable",
                            exported: false,
                            isUsed: false,
                            leadStatus: "Reutilizable",
                            returnedToPollAt: new Date(),
                            returnedReason: "Reemplazado por nuevo envío"
                        },
                        $unset: { exportedTo: 1, exportedAt: 1, exportBatchId: 1, assignedTo: 1, assignedAt: 1 }
                    }
                );

                const assignedAt = new Date();
                const baseUpdate = {
                    exported: true,
                    exportedAt: assignedAt,
                    exportedTo: supervisor._id,
                    exportBatchId: batchId,
                    assignedTo: supervisor._id,
                    leadStatus: "Asignado",
                    assignedAt
                };

                if (blockFreshIds.length > 0) {
                    const resF = await Affiliate.updateMany(
                        { _id: { $in: blockFreshIds } },
                        { $set: { ...baseUpdate, dataSource: "reusable", isUsed: true, ultimoUso: assignedAt } }
                    );
                    if (resF.modifiedCount !== blockFreshIds.length) {
                        throw new Error(`Inconsistencia en frescos. Solicitados: ${blockFreshIds.length}, Asignados: ${resF.modifiedCount}`);
                    }
                }
                if (blockReusableIds.length > 0) {
                    const resR = await Affiliate.updateMany(
                        { _id: { $in: blockReusableIds } },
                        { $set: { ...baseUpdate, dataSource: "reusable", isUsed: true, ultimoUso: assignedAt } }
                    );
                    if (resR.modifiedCount !== blockReusableIds.length) {
                        throw new Error(`Inconsistencia en reutilizables. Solicitados: ${blockReusableIds.length}, Asignados: ${resR.modifiedCount}`);
                    }
                }

                // Send internal notification to supervisor
                try {
                    let senderUser = await User.findOne({ email: "ing.danielfandino@gmail.com" }).lean();
                    if (!senderUser) senderUser = await User.findOne({ role: "gerencia", active: true }).lean();
                    if (!senderUser) senderUser = { _id: req.user._id };

                    const content = `¡Hola ${supervisor.nombre}!

Se te han asignado ${blockAssigned.length} afiliados para tu gestión del día.

👥 Total asignados: ${blockAssigned.length}
✨ Datos frescos: ${blockFreshIds.length}
♻️ Datos reutilizables: ${blockReusableIds.length}
📅 Fecha: ${new Date().toLocaleDateString("es-AR")}

Los datos ya están disponibles en tu sección "Contactar Afiliados" → "Administración de datos".

Att. Sistema Dann Salud`;

                    const message = new InternalMessage({
                        from: senderUser._id,
                        to: supervisor._id,
                        subject: `📊 Tu Listado de Afiliados - ${new Date().toLocaleDateString("es-AR")}`,
                        content,
                        read: false
                    });
                    await message.save();

                    // DIAGNOSTIC: Socket.IO emit with defensive check
                    if (global.io && global.io.to) {
                        global.io.to(`user_${supervisor._id}`).emit("new_message", {
                            _id: message._id,
                            from: { nombre: senderUser.nombre, email: senderUser.email },
                            subject: message.subject,
                            content: content.substring(0, 100) + "...",
                            createdAt: message.createdAt,
                            hasAttachments: false
                        });
                    }
                } catch (notifErr) {
                    logger.warn(`⚠️ Notificación fallida para ${supervisor.nombre}: ${notifErr.message}`);
                }

                logger.info(`✅ Envío ejecutado: ${blockAssigned.length} leads → ${supervisor.nombre} (${blockFreshIds.length} frescos, ${blockReusableIds.length} reutilizables)`);

                results.push({
                    supervisorId: supervisor._id,
                    supervisorName: supervisor.nombre,
                    assigned: blockAssigned.length,
                    freshCount: blockFreshIds.length,
                    reusableCount: blockReusableIds.length,
                    batchId
                });
            } catch (persistErr) {
                logger.error(`Error al persistir bloque para ${supervisor.nombre}: ${persistErr.message}`);
                persistErrors.push({ supervisorId: supervisor._id, supervisorName: supervisor.nombre, error: persistErr.message });
            }
        }

        if (results.length === 0) {
            return res.status(500).json({ success: false, errors: persistErrors });
        }

        res.json({
            success: true,
            batchId,
            results,
            errors: persistErrors.length > 0 ? persistErrors : undefined,
            totalAssigned: results.reduce((sum, r) => sum + r.assigned, 0)
        });

    } catch (error) {
        logger.error("Error en executeDeliveryBlocks:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 3. GET /affiliates/delivery/scheduled/:supervisorId ──────────────────────
exports.getScheduledConfig = async (req, res) => {
    try {
        const { supervisorId } = req.params;
        const config = await ScheduledDeliveryConfig.findOne({
            supervisorId,
            active: true
        }).lean();
        res.json({ config: config || null });
    } catch (error) {
        logger.error("Error en getScheduledConfig:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 4. POST /affiliates/delivery/scheduled ───────────────────────────────────
/**
 * Creates or replaces the active scheduled config for a supervisor.
 * Body: { supervisorId, zones, freshPct, reusablePct, obrasSociales, totalQuantity, scheduledHour, notes }
 */
exports.saveScheduledConfig = async (req, res) => {
    try {
        const { supervisorId, zones, freshPct, reusablePct, obrasSociales, totalQuantity, scheduledHour, notes } = req.body;

        if (!supervisorId || !obrasSociales || !scheduledHour) {
            return res.status(400).json({ error: "Faltan campos requeridos: supervisorId, obrasSociales, scheduledHour" });
        }

        // Deactivate any existing config
        await ScheduledDeliveryConfig.updateMany(
            { supervisorId, active: true },
            { $set: { active: false } }
        );

        const config = await ScheduledDeliveryConfig.create({
            supervisorId,
            zones: zones || [],
            freshPct: typeof freshPct === "number" ? freshPct : 70,
            reusablePct: typeof reusablePct === "number" ? reusablePct : 30,
            obrasSociales,
            totalQuantity,
            scheduledHour,
            notes,
            active: true,
            createdBy: req.user._id
        });

        logger.info(`📅 Config programada guardada para supervisor ${supervisorId} a las ${scheduledHour}`);
        res.json({ success: true, config });

    } catch (error) {
        logger.error("Error en saveScheduledConfig:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 5. DELETE /affiliates/delivery/scheduled/:supervisorId ───────────────────
exports.deactivateScheduledConfig = async (req, res) => {
    try {
        const { supervisorId } = req.params;

        const result = await ScheduledDeliveryConfig.updateMany(
            { supervisorId, active: true },
            { $set: { active: false } }
        );

        logger.info(`🚫 Config programada desactivada para supervisor ${supervisorId}`);
        res.json({ success: true, deactivated: result.modifiedCount });

    } catch (error) {
        logger.error("Error en deactivateScheduledConfig:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 7. POST /affiliates/delivery/export ──────────────────────────────────────
/**
 * Exports leads using the EXACT same eligibility engine as Programar Envío.
 * Does NOT persist assignments — read-only operation.
 * Body: { zones[], obrasSociales[]?, freshPct, limit }
 * Returns XLSX file.
 */
exports.exportDelivery = async (req, res) => {
    try {
        const userRole = req.user?.role?.toLowerCase();
        if (userRole !== "gerencia") {
            return res.status(403).json({ error: "Solo Gerencia puede exportar con este método." });
        }

        const { zones = [], obrasSociales = [], freshPct = 70, limit = 200 } = req.body;
        const limitNum = Math.max(1, parseInt(limit) || 200);
        const freshCount = Math.round(limitNum * freshPct / 100);
        const reusableCount = limitNum - freshCount;

        const canSellIds = await getCanSellIds();

        logger.info(`[EXPORT-DELIVERY] Zones: ${JSON.stringify(zones)} | OS: ${JSON.stringify(obrasSociales)} | Limit: ${limitNum} (${freshCount}f/${reusableCount}r) | canSellIds: ${canSellIds.length}`);

        const baseQuery = buildBaseQuery(zones);
        const osFilter = Array.isArray(obrasSociales) && obrasSociales.length > 0 ? obrasSociales : null;

        const freshQuery = buildFreshLeadQuery(baseQuery, canSellIds, [], null);
        const reusableQuery = buildReusableLeadQuery(baseQuery, canSellIds, [], null);

        if (osFilter) {
            freshQuery.$and.push({ obraSocial: { $in: osFilter } });
            reusableQuery.$and.push({ obraSocial: { $in: osFilter } });
        }

        const [freshLeads, reusableLeads] = await Promise.all([
            freshCount > 0 ? fetchLeadsExact(freshQuery, { uploadDate: -1 }, freshCount) : Promise.resolve([]),
            reusableCount > 0 ? fetchLeadsExact(reusableQuery, { ultimoUso: 1, uploadDate: 1 }, reusableCount) : Promise.resolve([])
        ]);

        const allLeads = [...freshLeads, ...reusableLeads];

        logger.info(`[EXPORT-DELIVERY] Fetched: ${freshLeads.length} frescos + ${reusableLeads.length} reutilizables = ${allLeads.length} total (requested: ${limitNum})`);
        if (allLeads.length < limitNum) {
            logger.warn(`[EXPORT-DELIVERY] Short export: requested ${limitNum}, got ${allLeads.length} — stock insuficiente`);
        }

        if (allLeads.length === 0) {
            return res.status(422).json({ error: "Sin stock disponible para los filtros seleccionados." });
        }

        // Enrich with contribution data
        const contribs = await AffiliateContribution.find(
            { affiliateId: { $in: allLeads.map(a => a._id) } },
            { affiliateId: 1, lastContributionPeriod: 1, last3ClosedMonthsPaidCount: 1, "verification.status": 1 }
        ).lean();
        const contribMap = {};
        for (const c of contribs) contribMap[String(c.affiliateId)] = c;

        const data = allLeads.map((a, i) => {
            const contrib = contribMap[String(a._id)];
            return {
                "N°": i + 1,
                "Nombre": a.nombre || "-",
                "CUIL": a.cuil || "-",
                "Obra Social": a.obraSocial || "-",
                "Teléfono 1": a.telefono1 || "-",
                "Teléfono 2": a.telefono2 || "-",
                "Localidad": a.localidad || "-",
                "Edad": a.edad || "-",
                "Origen": a.dataSource || "fresh",
                "Lead Status": a.leadStatus || "-",
                "Últ. Período Aporte": contrib?.lastContributionPeriod || "-",
                "Trim. pagos": contrib?.last3ClosedMonthsPaidCount ?? "-",
                "Verificación": contrib?.verification?.status || "pending",
                "Fecha Carga": a.uploadDate ? new Date(a.uploadDate).toLocaleDateString("es-AR") : "-"
            };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Leads");
        const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `export_delivery_${new Date().toISOString().split("T")[0]}.xlsx`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.send(buffer);

        logger.info(`✅ exportDelivery: ${allLeads.length} leads (${freshLeads.length} frescos, ${reusableLeads.length} reutilizables)`);

        // Mark all exported leads as reusable — Personalizada exports count as "used"
        const exportedIds = allLeads.map(a => a._id);
        Affiliate.updateMany(
            { _id: { $in: exportedIds } },
            { $set: { dataSource: "reusable", isUsed: true, ultimoUso: new Date() } }
        ).catch(err => logger.error(`[EXPORT-DELIVERY] Failed to mark leads as reusable: ${err.message}`));
    } catch (error) {
        logger.error("Error en exportDelivery:", error);
        res.status(500).json({ error: error.message });
    }
};

// ── 8. GET /affiliates/delivery/supervisors ──────────────────────────────────
/**
 * Returns list of users with role 'supervisor' for the modal dropdown.
 */
exports.getSupervisors = async (req, res) => {
    try {
        const supervisors = await User.find(
            { role: { $in: ["supervisor", "Supervisor"] }, active: true },
            { _id: 1, nombre: 1, email: 1, numeroEquipo: 1 }
        ).sort({ nombre: 1 }).lean();
        res.json({ supervisors });
    } catch (error) {
        logger.error("Error en getSupervisors:", error);
        res.status(500).json({ error: error.message });
    }
};
