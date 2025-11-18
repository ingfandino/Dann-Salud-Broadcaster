const Audit = require('../models/Audit');
const logger = require('../utils/logger');

// GET /api/liquidacion -> lista de auditorías con estado "QR hecho"
exports.list = async (req, res) => {
    try {
        const User = require('../models/User');
        
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const currentDay = now.getDate();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // ✅ Último día del mes a las 23:01: Soft-delete (ocultar) auditorías del mes actual
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        
        if (currentDay === lastDayOfMonth && hours === 23 && minutes >= 1) {
            await Audit.updateMany(
                { 
                    status: { $in: ["QR hecho", "Cargada", "Aprobada"] },
                    liquidacionMonth: currentMonth,
                    isLiquidacion: true
                },
                { 
                    $set: { 
                        isLiquidacion: false, // Soft-delete: ya no aparecerá en Liquidación
                        liquidacionDeletedAt: new Date() // Timestamp para auditoría
                    }
                }
            );
            console.log(`🗑️ Soft-delete Liquidación: Auditorías del mes ${currentMonth} ocultadas`);
        }
        
        // ✅ Marcar auditorías QR hecho/Cargada/Aprobada que aún no están marcadas para liquidación
        await Audit.updateMany(
            {
                status: { $in: ["QR hecho", "Cargada", "Aprobada"] },
                isLiquidacion: { $ne: true }
            },
            {
                $set: {
                    isLiquidacion: true,
                    liquidacionMonth: currentMonth
                }
            }
        );
        
        // ✅ Construir filtro base
        const filter = {
            isLiquidacion: true,
            liquidacionMonth: currentMonth
        };
        
        // ✅ Si es supervisor, filtrar por su numeroEquipo
        const currentUser = req.user;
        const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'Supervisor';
        
        if (isSupervisor && currentUser?.numeroEquipo) {
            // Primero obtener los asesores del equipo del supervisor
            const asesoresDelEquipo = await User.find({
                numeroEquipo: currentUser.numeroEquipo,
                active: true
            }).select('_id').lean();
            
            const asesoresIds = asesoresDelEquipo.map(a => a._id);
            
            // Filtrar auditorías solo de esos asesores
            filter.asesor = { $in: asesoresIds };
            
            logger.info(`👤 Supervisor ${currentUser.email} viendo Liquidación de su equipo ${currentUser.numeroEquipo}`);
        }
        
        // ✅ Traer todas las auditorías marcadas para liquidación del mes actual
        const audits = await Audit.find(filter)
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo role'
            })
            .populate({
                path: 'auditor',
                select: 'nombre name email'
            })
            .populate({
                path: 'administrador',
                select: 'nombre name email'
            })
            .populate('groupId', 'nombre name')
            .sort({ createdAt: -1 }) // Más recientes primero
            .lean();
        
        // ✅ Buscar supervisores dinámicamente por numeroEquipo
        for (let audit of audits) {
            if (audit.asesor?.numeroEquipo) {
                const supervisor = await User.findOne({
                    numeroEquipo: audit.asesor.numeroEquipo,
                    role: 'supervisor',
                    active: true
                }).select('nombre name email numeroEquipo').lean();
                
                if (supervisor) {
                    audit.asesor.supervisor = supervisor;
                }
            }
        }
        
        console.log('💰 Liquidación List - Total audits:', audits.length);
        
        res.json(audits);
    } catch (err) {
        logger.error('liquidacion.list error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};
