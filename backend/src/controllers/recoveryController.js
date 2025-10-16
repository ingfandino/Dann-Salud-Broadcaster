const Audit = require('../models/Audit');
const { permit } = require('../middlewares/roleMiddleware');
const logger = require('../utils/logger');

// GET /api/recovery -> lista elegibles: estados target y >24h (o isRecovery)
exports.list = async (req, res) => {
    try {
        const now = new Date();
        const audits = await Audit.find({
            $or: [
                {
                    status: { $in: ["Falta clave", "Rechazada", "Falta documentación"] },
                    recoveryEligibleAt: { $ne: null, $lte: now },
                    isRecovery: { $ne: true }
                },
                { isRecovery: true }
            ]
        })
            .populate('asesor', 'nombre name email')
            .populate('groupId', 'nombre name')
            .sort({ recoveryEligibleAt: -1, createdAt: -1 })
            .lean();
        res.json(audits);
    } catch (err) {
        logger.error('recovery.list error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};

// POST /api/recovery -> crear registro directo para reventa
exports.create = async (req, res) => {
    try {
        const { nombre, cuil, telefono, obraSocialVendida, datosExtra } = req.body;
        if (!nombre || !cuil || !telefono || !obraSocialVendida) {
            return res.status(400).json({ message: 'Campos requeridos: nombre, cuil, telefono, obraSocialVendida' });
        }

        const audit = new Audit({
            nombre,
            cuil,
            telefono,
            obraSocialVendida,
            tipoVenta: 'alta',
            scheduledAt: new Date(),
            createdBy: req.user._id,
            auditor: req.user._id,
            status: 'Falta documentación',
            statusUpdatedAt: new Date(),
            recoveryEligibleAt: new Date(),
            isRecovery: true,
            datosExtra: datosExtra || ''
        });
        await audit.save();
        res.status(201).json(audit);
    } catch (err) {
        logger.error('recovery.create error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};


