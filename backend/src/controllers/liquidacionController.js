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

        const { dateFrom, dateTo, dateField } = req.query;

        // ✅ Marcar auditorías QR hecho/Cargada/Aprobada que aún no están marcadas para liquidación
        // ⚠️ SOLO si estamos viendo el mes actual (sin filtros de fecha), para no "resucitar" auditorías viejas
        if (!dateFrom && !dateTo) {
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
        }

        // ✅ Construir filtro base
        let filter = {};

        console.log('🔍 Liquidación Request:', { dateFrom, dateTo, dateField });

        if (dateFrom && dateTo) {
            // ✅ Si hay fechas, filtramos por rango y status, IGNORANDO isLiquidacion/month
            // Esto permite ver históricos
            const from = new Date(dateFrom);
            const to = new Date(dateTo);
            to.setDate(to.getDate() + 1); // Incluir hasta el final del día

            const field = dateField || 'fechaCreacionQR'; // Default a fechaCreacionQR si no se especifica

            if (field === 'fechaCreacionQR') {
                // ✅ CORREGIDO: Priorizar fechaCreacionQR, solo usar scheduledAt si fechaCreacionQR no existe
                filter.$and = [
                    {
                        $or: [
                            { fechaCreacionQR: { $gte: from, $lt: to } },
                            {
                                $and: [
                                    { fechaCreacionQR: { $exists: false } },
                                    { scheduledAt: { $gte: from, $lt: to } }
                                ]
                            }
                        ]
                    }
                ];
            } else {
                filter[field] = { $gte: from, $lt: to };
            }

            filter.status = { $in: ["QR hecho", "Cargada", "Aprobada"] };

            console.log(`📅 Filtrando Liquidación por ${field} (con fallback): ${from.toISOString()} - ${to.toISOString()}`);
        } else {
            // ✅ Default: Semana laboral actual (Viernes a Jueves)
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun, ..., 4=Jue, 5=Vie, 6=Sab
            const hours = today.getHours();
            const minutes = today.getMinutes();

            // Calcular inicio de semana (Viernes)
            let weekStart = new Date(today);
            if (dayOfWeek === 5) {
                // Viernes
                weekStart.setHours(0, 0, 0, 0);
            } else if (dayOfWeek === 6) {
                // Sábado - la semana comenzó ayer (viernes)
                weekStart.setDate(weekStart.getDate() - 1);
                weekStart.setHours(0, 0, 0, 0);
            } else if (dayOfWeek === 0) {
                // Domingo - la semana comenzó hace 2 días (viernes)
                weekStart.setDate(weekStart.getDate() - 2);
                weekStart.setHours(0, 0, 0, 0);
            } else if (dayOfWeek >= 1 && dayOfWeek <= 4) {
                // Lunes a Jueves - restar días hasta viernes anterior
                weekStart.setDate(weekStart.getDate() - (dayOfWeek + 2));
                weekStart.setHours(0, 0, 0, 0);
            }

            // Calcular fin de semana (Jueves 23:01)
            let weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6); // 6 días después del viernes = jueves
            weekEnd.setHours(23, 1, 0, 0);

            filter.$and = [
                {
                    $or: [
                        { fechaCreacionQR: { $gte: weekStart, $lte: weekEnd } },
                        {
                            $and: [
                                { fechaCreacionQR: { $exists: false } },
                                { scheduledAt: { $gte: weekStart, $lte: weekEnd } }
                            ]
                        }
                    ]
                }
            ];
            filter.status = { $in: ["QR hecho", "Cargada", "Aprobada"] };

            console.log(`📅 Filtrando Liquidación por Semana Actual: ${weekStart.toISOString()} - ${weekEnd.toISOString()}`);
        }

        // Traer auditorías
        let audits = await Audit.find(filter)
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

        const currentUser = req.user;
        const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'Supervisor';

        if (isSupervisor && currentUser?.numeroEquipo) {
            const targetNumeroEquipo = String(currentUser.numeroEquipo || '').trim().toLowerCase();

            audits = audits.filter((audit) => {
                const numeroEquipoAsesor = String(audit.asesor?.numeroEquipo || '').trim().toLowerCase();
                return numeroEquipoAsesor && numeroEquipoAsesor === targetNumeroEquipo;
            });

            if (!audits.length) {
                logger.warn(
                    ` Supervisor ${currentUser.email} (${currentUser.numeroEquipo}) sin auditorías en Liquidación tras filtrar por equipo`
                );
            } else {
                logger.info(
                    ` Supervisor ${currentUser.email} viendo ${audits.length} auditorías de Liquidación de su equipo ${currentUser.numeroEquipo}`
                );
            }
        }

        // Buscar supervisores dinámicamente por numeroEquipo
        const equipos = [...new Set(
            audits
                .map((audit) => audit.asesor?.numeroEquipo)
                .filter(Boolean)
        )];

        if (equipos.length > 0) {
            const supervisores = await User.find({
                numeroEquipo: { $in: equipos },
                role: { $in: ['supervisor', 'Supervisor'] },
                active: true
            })
                .select('nombre name email numeroEquipo')
                .lean();

            const supervisorPorEquipo = supervisores.reduce((acc, supervisor) => {
                acc[supervisor.numeroEquipo] = supervisor;
                return acc;
            }, {});

            audits.forEach((audit) => {
                const equipo = audit.asesor?.numeroEquipo;
                if (equipo && supervisorPorEquipo[equipo]) {
                    audit.asesor.supervisor = supervisorPorEquipo[equipo];
                }
            });
        }

        console.log('💰 Liquidación List - Total audits:', audits.length);

        res.json(audits);
    } catch (err) {
        logger.error('liquidacion.list error', err);
        res.status(500).json({ message: 'Error interno' });
    }
};

// POST /api/liquidacion/export -> Exportar a Excel
// CRÍTICO: Esta función NO ES ASYNC para evitar que express-async-errors envuelva la respuesta binaria en JSON
exports.exportLiquidation = (req, res) => {
    const ExcelJS = require('exceljs');
    const { dateFrom, dateTo, dateField } = req.body;

    console.log('📊 Exportando Liquidación:', { dateFrom, dateTo, user: req.user.email });

    // 1. Construir Filtro Base
    let filter = {};

    // SIEMPRE filtrar por status "QR hecho" (requisito estricto)
    filter.status = "QR hecho";

    if (dateFrom && dateTo) {
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        to.setDate(to.getDate() + 1);

        const field = dateField || 'fechaCreacionQR';

        if (field === 'fechaCreacionQR') {
            filter.$or = [
                { fechaCreacionQR: { $gte: from, $lt: to } },
                { scheduledAt: { $gte: from, $lt: to } }
            ];
        } else {
            filter[field] = { $gte: from, $lt: to };
        }
        console.log(`📅 Export Filter: ${field} between ${from.toISOString()} and ${to.toISOString()}`);
    } else {
        // Default: Mes actual
        const now = new Date();
        const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        filter.isLiquidacion = true;
        filter.liquidacionMonth = currentMonth;
        console.log(`📅 Export Filter: Mes Actual (${currentMonth})`);
    }

    // 2. Obtener Auditorías (usando promesas puras, NO await)
    Audit.find(filter)
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
        .sort({ scheduledAt: -1 })
        .lean()
        .then(async (audits) => {
            // 3. Lógica de Roles
            const currentUser = req.user;
            const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'Supervisor';

            // Filtrar por equipo si es supervisor
            if (isSupervisor && currentUser?.numeroEquipo) {
                const targetNumeroEquipo = String(currentUser.numeroEquipo || '').trim().toLowerCase();
                audits = audits.filter((audit) => {
                    const numeroEquipoAsesor = String(audit.asesor?.numeroEquipo || '').trim().toLowerCase();
                    return numeroEquipoAsesor && numeroEquipoAsesor === targetNumeroEquipo;
                });
            }

            // Enriquecer con supervisores
            const equipos = [...new Set(audits.map((audit) => audit.asesor?.numeroEquipo).filter(Boolean))];

            let supervisorPorEquipo = {};
            if (equipos.length > 0) {
                const User = require('../models/User');
                const supervisores = await User.find({
                    numeroEquipo: { $in: equipos },
                    role: { $in: ['supervisor', 'Supervisor'] },
                    active: true
                }).select('nombre name email numeroEquipo').lean();

                supervisorPorEquipo = supervisores.reduce((acc, supervisor) => {
                    acc[supervisor.numeroEquipo] = supervisor;
                    return acc;
                }, {});

                audits.forEach((audit) => {
                    const equipo = audit.asesor?.numeroEquipo;
                    if (equipo && supervisorPorEquipo[equipo]) {
                        audit.asesor.supervisor = supervisorPorEquipo[equipo];
                    }
                });
            }

            // 4. Generar Excel
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Dann Salud';
            workbook.created = new Date();

            const columns = [
                { header: 'Fecha', key: 'fecha', width: 15 },
                { header: 'Afiliado', key: 'afiliado', width: 30 },
                { header: 'CUIL', key: 'cuil', width: 15 },
                { header: 'O.S. Vendida', key: 'os', width: 15 },
                { header: 'Asesor', key: 'asesor', width: 25 },
                { header: 'Supervisor', key: 'supervisor', width: 25 },
                { header: 'Auditor', key: 'auditor', width: 20 },
                { header: 'Admin', key: 'admin', width: 20 },
                { header: 'Estado', key: 'estado', width: 15 }
            ];

            // Helper para agregar hoja
            const addSheet = (sheetName, items) => {
                const safeName = sheetName.replace(/[*?:\\/\\[\\]]/g, '').substring(0, 30) || 'Hoja 1';
                const sheet = workbook.addWorksheet(safeName);
                sheet.columns = columns;

                items.forEach(item => {
                    // Usar componentes UTC para evitar desplazamiento de timezone
                    const dateObj = item.fechaCreacionQR || item.scheduledAt;
                    let fechaStr = '';
                    if (dateObj) {
                        const d = new Date(dateObj);
                        fechaStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
                    }

                    sheet.addRow({
                        fecha: fechaStr,
                        afiliado: item.nombre || '',
                        cuil: item.cuil || '',
                        os: item.obraSocialVendida || '',
                        asesor: item.asesor?.nombre || '',
                        supervisor: item.supervisorSnapshot?.nombre || item.asesor?.supervisor?.nombre || item.asesor?.numeroEquipo || 'Sin Supervisor',
                        auditor: item.auditor?.nombre || '',
                        admin: item.administrador?.nombre || '',
                        estado: item.status || ''
                    });
                });

                // Estilo Header
                sheet.getRow(1).eachCell((cell) => {
                    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
                    cell.alignment = { horizontal: 'center' };
                });
            };

            if (isSupervisor) {
                // Caso Supervisor: Una sola hoja
                addSheet(`Equipo ${currentUser.numeroEquipo || 'Mío'}`, audits);
            } else {
                // Caso Gerencia: Agrupar por Supervisor (usar supervisorSnapshot para historial correcto)
                const auditsBySupervisor = audits.reduce((acc, audit) => {
                    const supName = audit.supervisorSnapshot?.nombre || audit.asesor?.supervisor?.nombre || `Equipo ${audit.asesor?.numeroEquipo || 'Sin Asignar'}`;
                    if (!acc[supName]) acc[supName] = [];
                    acc[supName].push(audit);
                    return acc;
                }, {});

                if (Object.keys(auditsBySupervisor).length === 0) {
                    addSheet('Sin Datos', []);
                } else {
                    Object.entries(auditsBySupervisor).forEach(([supName, items]) => {
                        addSheet(supName, items);
                    });
                }
            }

            console.log(`📊 Generando ${workbook.worksheets.length} hojas con ${audits.length} registros`);

            // 5. Generar buffer y enviar (TODO síncronamente)
            return workbook.xlsx.writeBuffer();
        })
        .then((buffer) => {
            console.log(`📊 Buffer generado: ${buffer.length} bytes`);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=liquidacion_${Date.now()}.xlsx`);
            res.setHeader('Content-Length', buffer.length);

            res.end(buffer, 'binary');
        })
        .catch((err) => {
            logger.error('❌ Error exportando liquidación:', err);

            if (!res.headersSent) {
                res.status(500).json({ error: 'Error al generar exportación' });
            }
        });
};

// POST /api/liquidacion/export-direct -> VERSION DIRECTA PARA DEBUGGING
// Esta versión es ULTRA SIMPLE para identificar dónde se produce la envoltura JSON
exports.exportLiquidationDirect = (req, res) => {
    console.log('🔍 [DIRECT] ===== INICIO EXPORT DIRECTO =====');
    console.log('🔍 [DIRECT] Headers antes:', res.getHeaders());

    const ExcelJS = require('exceljs');

    console.log('🔍 [DIRECT] Creando workbook...');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Dann Salud Test';

    console.log('🔍 [DIRECT] Creando sheet...');
    const sheet = workbook.addWorksheet('Test');
    sheet.columns = [
        { header: 'Columna1', key: 'col1', width: 20 },
        { header: 'Columna2', key: 'col2', width: 20 }
    ];

    sheet.addRow({ col1: 'Dato1', col2: 'Dato2' });
    sheet.addRow({ col1: 'Dato3', col2: 'Dato4' });

    console.log('🔍 [DIRECT] Generando buffer...');

    workbook.xlsx.writeBuffer()
        .then((buffer) => {
            console.log('🔍 [DIRECT] Buffer generado:', buffer.length, 'bytes');
            console.log('🔍 [DIRECT] Es Buffer?:', Buffer.isBuffer(buffer));
            console.log('🔍 [DIRECT] Primeros 10 bytes:', buffer.slice(0, 10));

            console.log('🔍 [DIRECT] Configurando headers...');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=test-direct.xlsx');
            res.setHeader('Content-Length', buffer.length);

            console.log('🔍 [DIRECT] Headers configurados:', res.getHeaders());
            console.log('🔍 [DIRECT] Enviando buffer con res.end()...');

            res.end(buffer, 'binary');

            console.log('🔍 [DIRECT] res.end() llamado');
            console.log('🔍 [DIRECT] headersSent?:', res.headersSent);
            console.log('🔍 [DIRECT] ===== FIN EXPORT DIRECTO =====');
        })
        .catch((err) => {
            console.error('🔍 [DIRECT] ERROR:', err);

            if (!res.headersSent) {
                res.status(500).json({ error: err.message });
            }
        });

    console.log('🔍 [DIRECT] Función retornada (sin return explícito)');
};
