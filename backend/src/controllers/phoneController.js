/**
 * ============================================================
 * CONTROLADOR DE TELÉFONOS CORPORATIVOS (phoneController)
 * ============================================================
 * Gestiona los teléfonos corporativos asignados a equipos de ventas.
 * Incluye CRUD de teléfonos y registro de recargas/gastos.
 * 
 * Permisos:
 * - Supervisor: Ver/editar solo teléfonos de su equipo, no puede borrar
 * - Gerencia: Acceso completo a todos los teléfonos
 */

const Phone = require('../models/Phone');
const User = require('../models/User');

/**
 * Obtiene todos los teléfonos según permisos del usuario
 */
exports.getAllPhones = async (req, res) => {
    try {
        const role = req.user?.role?.toLowerCase();
        const numeroEquipo = req.user?.numeroEquipo;

        let query = { activo: true };

        // Supervisor: solo ve teléfonos de su equipo
        if (role === 'supervisor') {
            if (!numeroEquipo) {
                return res.status(400).json({ message: 'Supervisor sin número de equipo asignado' });
            }
            query.numeroEquipo = numeroEquipo;
        }
        // Gerencia y Encargado ven todos

        const phones = await Phone.find(query)
            .populate('supervisor', 'nombre email numeroEquipo')
            .populate('asesorAsignado', 'nombre email')
            .populate('createdBy', 'nombre email')
            .populate('historialRecargas.registradoPor', 'nombre email')
            .sort({ numeroEquipo: 1, createdAt: -1 });

        res.json(phones);
    } catch (error) {
        console.error('Error al obtener teléfonos:', error);
        res.status(500).json({ message: 'Error al obtener teléfonos' });
    }
};

/**
 * Obtiene un teléfono por ID
 */
exports.getPhoneById = async (req, res) => {
    try {
        const { id } = req.params;
        const role = req.user?.role?.toLowerCase();
        const numeroEquipo = req.user?.numeroEquipo;

        const phone = await Phone.findById(id)
            .populate('supervisor', 'nombre email numeroEquipo')
            .populate('asesorAsignado', 'nombre email')
            .populate('createdBy', 'nombre email')
            .populate('updatedBy', 'nombre email')
            .populate('historialRecargas.registradoPor', 'nombre email');

        if (!phone) {
            return res.status(404).json({ message: 'Teléfono no encontrado' });
        }

        // Verificar permisos de acceso
        if (role === 'supervisor' && phone.numeroEquipo !== numeroEquipo) {
            return res.status(403).json({ message: 'No tienes permiso para ver este teléfono' });
        }

        res.json(phone);
    } catch (error) {
        console.error('Error al obtener teléfono:', error);
        res.status(500).json({ message: 'Error al obtener teléfono' });
    }
};

/**
 * Crea un nuevo teléfono
 */
exports.createPhone = async (req, res) => {
    try {
        const {
            supervisor,
            modelo,
            numeroTelefono,
            asesorAsignado,
            notas
        } = req.body;

        const role = req.user?.role?.toLowerCase();

        // Verificar que el supervisor existe
        const supervisorUser = await User.findById(supervisor);
        if (!supervisorUser) {
            return res.status(404).json({ message: 'Supervisor no encontrado' });
        }

        // Para supervisores, solo pueden crear teléfonos de su propio equipo
        // Encargado puede crear para cualquier equipo
        if (role === 'supervisor') {
            if (supervisorUser.numeroEquipo !== req.user.numeroEquipo) {
                return res.status(403).json({ message: 'Solo puedes crear teléfonos para tu propio equipo' });
            }
        }

        // Verificar que el número no exista ya
        const existing = await Phone.findOne({ numeroTelefono });
        if (existing) {
            return res.status(400).json({ message: 'Ya existe un teléfono con este número' });
        }

        const phone = new Phone({
            supervisor,
            numeroEquipo: supervisorUser.numeroEquipo || '',
            modelo,
            numeroTelefono,
            asesorAsignado: asesorAsignado || null,
            notas: notas || '',
            createdBy: req.user._id
        });

        await phone.save();

        await phone.populate('supervisor', 'nombre email numeroEquipo');
        await phone.populate('asesorAsignado', 'nombre email');
        await phone.populate('createdBy', 'nombre email');

        res.status(201).json(phone);
    } catch (error) {
        console.error('Error al crear teléfono:', error);
        res.status(500).json({ message: 'Error al crear teléfono' });
    }
};

/**
 * Actualiza un teléfono existente
 */
exports.updatePhone = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const role = req.user?.role?.toLowerCase();
        const numeroEquipo = req.user?.numeroEquipo;

        // Obtener teléfono actual
        const phone = await Phone.findById(id);
        if (!phone) {
            return res.status(404).json({ message: 'Teléfono no encontrado' });
        }

        // Verificar permisos
        if (role === 'supervisor' && phone.numeroEquipo !== numeroEquipo) {
            return res.status(403).json({ message: 'Solo puedes editar teléfonos de tu equipo' });
        }

        // Si se está cambiando el supervisor, actualizar también numeroEquipo
        if (updates.supervisor && updates.supervisor !== phone.supervisor.toString()) {
            const newSupervisor = await User.findById(updates.supervisor);
            if (!newSupervisor) {
                return res.status(404).json({ message: 'Nuevo supervisor no encontrado' });
            }
            
            // Supervisor no puede cambiar a un equipo diferente
            if (role === 'supervisor' && newSupervisor.numeroEquipo !== numeroEquipo) {
                return res.status(403).json({ message: 'No puedes asignar el teléfono a otro equipo' });
            }
            
            updates.numeroEquipo = newSupervisor.numeroEquipo || '';
        }

        // Agregar quién modificó
        updates.updatedBy = req.user._id;

        // Si se está cambiando el número de teléfono, verificar que no exista en otro registro
        if (updates.numeroTelefono && updates.numeroTelefono !== phone.numeroTelefono) {
            const existingPhone = await Phone.findOne({ 
                numeroTelefono: updates.numeroTelefono,
                _id: { $ne: id } // Excluir el registro actual
            });
            if (existingPhone) {
                return res.status(400).json({ message: 'Ya existe otro teléfono con este número' });
            }
        }

        const updatedPhone = await Phone.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        )
            .populate('supervisor', 'nombre email numeroEquipo')
            .populate('asesorAsignado', 'nombre email')
            .populate('createdBy', 'nombre email')
            .populate('updatedBy', 'nombre email')
            .populate('historialRecargas.registradoPor', 'nombre email');

        res.json(updatedPhone);
    } catch (error) {
        console.error('Error al actualizar teléfono:', error);
        // Manejar error de duplicado de MongoDB
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Ya existe otro teléfono con este número' });
        }
        res.status(500).json({ message: 'Error al actualizar teléfono' });
    }
};

/**
 * Elimina un teléfono (solo Gerencia)
 */
exports.deletePhone = async (req, res) => {
    try {
        const { id } = req.params;
        const role = req.user?.role?.toLowerCase();

        // Solo Gerencia puede eliminar
        if (role !== 'gerencia') {
            return res.status(403).json({ message: 'Solo Gerencia puede eliminar teléfonos' });
        }

        const phone = await Phone.findById(id);
        if (!phone) {
            return res.status(404).json({ message: 'Teléfono no encontrado' });
        }

        await Phone.findByIdAndDelete(id);

        res.json({ message: 'Teléfono eliminado correctamente', phone });
    } catch (error) {
        console.error('Error al eliminar teléfono:', error);
        res.status(500).json({ message: 'Error al eliminar teléfono' });
    }
};

/**
 * Agrega una recarga o gasto al historial del teléfono
 */
exports.addRecharge = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo, descripcion, monto, fecha } = req.body;
        const role = req.user?.role?.toLowerCase();
        const numeroEquipo = req.user?.numeroEquipo;

        // Validaciones
        if (!motivo || !['Recarga', 'Otro'].includes(motivo)) {
            return res.status(400).json({ message: 'Motivo inválido. Debe ser "Recarga" u "Otro"' });
        }

        if (motivo === 'Otro' && (!descripcion || descripcion.trim().length === 0)) {
            return res.status(400).json({ message: 'La descripción es obligatoria cuando el motivo es "Otro"' });
        }

        if (!monto || monto <= 0) {
            return res.status(400).json({ message: 'El monto debe ser mayor a 0' });
        }

        const phone = await Phone.findById(id);
        if (!phone) {
            return res.status(404).json({ message: 'Teléfono no encontrado' });
        }

        // Verificar permisos
        if (role === 'supervisor' && phone.numeroEquipo !== numeroEquipo) {
            return res.status(403).json({ message: 'Solo puedes agregar recargas a teléfonos de tu equipo' });
        }

        // Formatear descripción: primera letra mayúscula, resto minúscula
        let descripcionFormateada = '';
        if (descripcion && descripcion.trim()) {
            const desc = descripcion.trim();
            descripcionFormateada = desc.charAt(0).toUpperCase() + desc.slice(1).toLowerCase();
        }

        // Crear nueva recarga
        // NOTA: Parseamos la fecha con hora mediodía para evitar desfase por timezone
        // Si enviamos "2026-01-20" sin hora, JavaScript lo interpreta como UTC midnight,
        // lo cual en Argentina (UTC-3) se convierte al día anterior.
        const nuevaRecarga = {
            motivo,
            descripcion: descripcionFormateada,
            monto,
            fecha: fecha ? new Date(fecha + "T12:00:00") : new Date(),
            registradoPor: req.user._id
        };

        phone.historialRecargas.push(nuevaRecarga);
        phone.updatedBy = req.user._id;

        await phone.save(); // El pre-save calculará el vencimiento

        await phone.populate('supervisor', 'nombre email numeroEquipo');
        await phone.populate('asesorAsignado', 'nombre email');
        await phone.populate('historialRecargas.registradoPor', 'nombre email');

        res.json(phone);
    } catch (error) {
        console.error('Error al agregar recarga:', error);
        res.status(500).json({ message: 'Error al agregar recarga' });
    }
};

/**
 * Elimina una recarga del historial (solo Gerencia)
 */
exports.deleteRecharge = async (req, res) => {
    try {
        const { id, rechargeId } = req.params;
        const role = req.user?.role?.toLowerCase();

        // Solo Gerencia puede eliminar recargas
        if (role !== 'gerencia') {
            return res.status(403).json({ message: 'Solo Gerencia puede eliminar recargas' });
        }

        const phone = await Phone.findById(id);
        if (!phone) {
            return res.status(404).json({ message: 'Teléfono no encontrado' });
        }

        const rechargeIndex = phone.historialRecargas.findIndex(
            r => r._id.toString() === rechargeId
        );

        if (rechargeIndex === -1) {
            return res.status(404).json({ message: 'Recarga no encontrada' });
        }

        phone.historialRecargas.splice(rechargeIndex, 1);
        phone.updatedBy = req.user._id;

        await phone.save(); // Recalculará vencimiento

        await phone.populate('supervisor', 'nombre email numeroEquipo');
        await phone.populate('asesorAsignado', 'nombre email');
        await phone.populate('historialRecargas.registradoPor', 'nombre email');

        res.json(phone);
    } catch (error) {
        console.error('Error al eliminar recarga:', error);
        res.status(500).json({ message: 'Error al eliminar recarga' });
    }
};

/**
 * Obtiene los asesores de un equipo específico (para el dropdown)
 */
exports.getAsesoresByEquipo = async (req, res) => {
    try {
        const { numeroEquipo } = req.params;
        const role = req.user?.role?.toLowerCase();

        // Supervisor solo puede ver asesores de su equipo
        if (role === 'supervisor' && req.user.numeroEquipo !== numeroEquipo) {
            return res.status(403).json({ message: 'Solo puedes ver asesores de tu equipo' });
        }

        const asesores = await User.find({
            numeroEquipo,
            role: { $in: ['asesor', 'Asesor', 'auditor', 'Auditor'] },
            active: true
        }).select('_id nombre email role');

        res.json(asesores);
    } catch (error) {
        console.error('Error al obtener asesores:', error);
        res.status(500).json({ message: 'Error al obtener asesores del equipo' });
    }
};

/**
 * Obtiene estadísticas de teléfonos
 */
exports.getPhoneStats = async (req, res) => {
    try {
        const role = req.user?.role?.toLowerCase();
        const numeroEquipo = req.user?.numeroEquipo;

        let query = { activo: true };

        if (role === 'supervisor') {
            if (!numeroEquipo) {
                return res.status(400).json({ message: 'Supervisor sin número de equipo asignado' });
            }
            query.numeroEquipo = numeroEquipo;
        }

        const phones = await Phone.find(query);
        const now = new Date();
        const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

        const stats = {
            total: phones.length,
            sinRecarga: phones.filter(p => !p.ultimaRecarga).length,
            proximosAVencer: phones.filter(p => 
                p.proximoVencimiento && 
                p.proximoVencimiento <= in48Hours && 
                p.proximoVencimiento > now
            ).length,
            vencidos: phones.filter(p => 
                p.proximoVencimiento && 
                p.proximoVencimiento <= now
            ).length,
            totalGastadoMes: 0
        };

        // Calcular gasto del mes actual
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        phones.forEach(phone => {
            phone.historialRecargas.forEach(recarga => {
                if (new Date(recarga.fecha) >= startOfMonth) {
                    stats.totalGastadoMes += recarga.monto;
                }
            });
        });

        res.json(stats);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ message: 'Error al obtener estadísticas' });
    }
};
