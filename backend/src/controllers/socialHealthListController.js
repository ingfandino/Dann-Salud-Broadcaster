/**
 * ============================================================
 * CONTROLLER: SocialHealthList
 * ============================================================
 * Endpoint para consultar el catálogo AFIP T05 de Obras Sociales.
 * Soporta búsqueda por nombre o código, ordenado alfabéticamente.
 */

const SocialHealthList = require("../models/SocialHealthList");
const { filterSocialHealthItems, formatSocialHealthItem } = require("../utils/socialHealthSearch");

/**
 * GET /api/social-health-list
 * Query params:
 *   - search: string opcional para filtrar por nombre o código
 */
exports.getSocialHealthList = async (req, res) => {
    try {
        const { search } = req.query;
        const items = await SocialHealthList.find({})
            .sort({ name: 1 })
            .lean();

        const data = search && String(search).trim()
            ? filterSocialHealthItems(items, search)
            : items.map(formatSocialHealthItem);

        res.json({
            success: true,
            count: data.length,
            data,
        });
    } catch (err) {
        console.error("Error fetching SocialHealthList:", err);
        res.status(500).json({
            success: false,
            message: "Error al obtener la lista de obras sociales",
        });
    }
};
