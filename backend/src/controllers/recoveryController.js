const Audit = require('../models/Audit');
const { permit } = require('../middlewares/roleMiddleware');
const logger = require('../utils/logger');

// GET /api/recovery -> lista elegibles: estados target del día anterior
exports.list = async (req, res) => {
    try {
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'); // YYYY-MM
        
        // ✅ NOTA: El proceso de marcar auditorías para Recovery ahora se ejecuta mediante
        // un VERDADERO cron job en /src/cron/recoveryJob.js a las 23:01 hrs diariamente
        // Este endpoint solo consulta y devuelve los datos
        
        const User = require('../models/User');
        
        // ✅ Traer SOLO auditorías marcadas como recuperación del mes actual
        // Permanecen visibles hasta el 05 del mes siguiente (luego se ocultan el 01)
        const audits = await Audit.find({
            isRecovery: true,
            recoveryMonth: currentMonth
        })
            .populate({
                path: 'asesor',
                select: 'nombre name email numeroEquipo role'
            })
            .populate({
                path: 'administrador',
                select: 'nombre name email'
            })
            .populate('groupId', 'nombre name')
            .sort({ statusUpdatedAt: -1, createdAt: -1 }) // ✅ Descendente: más antiguos PRIMERO (más tiempo en estado)
            .lean();
        
        // ✅ Buscar supervisores dinámicamente por numeroEquipo
        for (let audit of audits) {
            if (audit.asesor?.numeroEquipo) {
                // Buscar el usuario con rol "supervisor" que tenga el mismo numeroEquipo
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
        
        // 🔍 DEBUG: Log para verificar datos
        console.log('📋 Recovery List - Total audits:', audits.length);
        if (audits.length > 0) {
            console.log('📋 Muestra del primer registro:');
            console.log('   - Asesor:', audits[0].asesor?.nombre || audits[0].asesor?.name);
            console.log('   - Asesor numeroEquipo:', audits[0].asesor?.numeroEquipo);
            console.log('   - Supervisor encontrado:', audits[0].asesor?.supervisor?.nombre || audits[0].asesor?.supervisor?.name);
            console.log('   - Supervisor numeroEquipo:', audits[0].asesor?.supervisor?.numeroEquipo);
        }
        
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


