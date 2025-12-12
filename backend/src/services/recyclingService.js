const LeadAssignment = require('../models/LeadAssignment');

exports.recycleLeads = async (daysThreshold = 3) => {
    try {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

        // Buscar asignaciones activas que cumplan criterio
        const query = {
            active: true,
            $or: [
                { status: 'No Contesta', updatedAt: { $lt: thresholdDate } },
                { status: 'Pendiente', assignedAt: { $lt: thresholdDate } }
            ]
        };

        const leadsToRecycle = await LeadAssignment.find(query);
        const count = leadsToRecycle.length;

        if (count > 0) {
            // Actualizar a inactivo y status Reciclado
            await LeadAssignment.updateMany(query, {
                $set: {
                    active: false,
                    status: 'Reciclado',
                    subStatus: `Automático por inactividad (> ${daysThreshold} días)`
                }
            });
        }

        return { success: true, count };
    } catch (error) {
        console.error("Error en reciclaje automático:", error);
        throw error;
    }
};
