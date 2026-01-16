/**
 * ============================================================
 * CONTROLADOR DE USUARIOS (userController)
 * ============================================================
 * Gestiona todas las operaciones CRUD de usuarios:
 * - Crear, listar, actualizar y eliminar usuarios
 * - Gestión de roles y permisos
 * - Historial de cambios de equipo (teamHistory)
 * - Activación/desactivación de cuentas
 */

const User = require("../models/User");
const { buildOwnerFilter, getTeamUserIds } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

/** Crea un nuevo usuario. Solo admin/gerencia pueden asignar roles. */
async function createUser(req, res) {
    try {
        const { nombre, email, password, role, supervisor } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ error: "Email ya registrado" });
        }

        let finalRole = "asesor";
        let finalSupervisor = supervisor || null;

        if (req.user && (req.user.role === "administrativo" || req.user.role === "gerencia")) {
            finalRole = role || "asesor";
            if (supervisor) {
                const supExists = await User.findById(supervisor);
                if (!supExists) {
                    return res.status(400).json({ error: "Supervisor no válido" });
                }
                finalSupervisor = supervisor;
            }
        }

        const user = new User({
            nombre,
            email,
            password,
            role: finalRole,
            supervisor: finalSupervisor,
            active: false
        });

        await user.save();

        res.status(201).json({
            _id: user._id,
            nombre: user.nombre,
            email: user.email,
            role: user.role,
            supervisor: user.supervisor,
        });
    } catch (err) {
        logger.error("❌ Error creando usuario:", err);
        return res.status(400).json({ error: err.message });
    }
}

/**
 * Lista usuarios según el rol del solicitante:
 * - Gerencia/Admin: todos los usuarios
 * - Supervisor: usuarios de su mismo equipo
 * - Asesor/Auditor: solo su propio usuario
 */
async function getUsers(req, res) {
    try {
        let queryFilter = {};
        const { _id, role: rawRole } = req.user;
        const role = (rawRole || "").toLowerCase();
        const { scope, includeAllAuditors, role: filterRole } = req.query;

        logger.info(`getUsers requested by ${req.user.email} with role: ${role}, filterRole: ${filterRole}`);

        // ✅ FILTRO POR ROL: Si se especifica role=supervisor, filtrar SOLO supervisores
        if (filterRole && (role === "administrativo" || role === "gerencia")) {
            queryFilter = { 
                role: { $regex: new RegExp(`^${filterRole}$`, 'i') }, 
                active: true,
                deletedAt: null 
            };
            logger.info(`🔍 Filtrando usuarios por rol: ${filterRole}`);
            const users = await User.find(queryFilter).select("-password").sort({ nombre: 1 });
            return res.json(users);
        }

        if (role === "administrativo" || role === "gerencia") {
            queryFilter = { deletedAt: null };
        } else if (role === "supervisor" && includeAllAuditors === "true") {
            // Devolver todos los usuarios sin restricción de equipo
            // El frontend filtrará solo auditores/admins/supervisors
            queryFilter = { deletedAt: null };
        } else if (role === "supervisor" && scope === "group") {
            // Supervisores: devolver TODOS los usuarios de su mismo numeroEquipo (asesores y auditores)
            let myGroup = req.user.numeroEquipo;
            if (!myGroup) {
                const me = await User.findById(_id).select("numeroEquipo");
                myGroup = me?.numeroEquipo || null;
            }
            queryFilter = { deletedAt: null };
            if (myGroup !== null) queryFilter.numeroEquipo = myGroup;
        } else if (role === "supervisor") {
            // ✅ Supervisores: devolver todos los usuarios de su mismo numeroEquipo
            // Esto permite que puedan ver y reasignar asesores dentro de su equipo
            let myGroup = req.user.numeroEquipo;
            if (!myGroup) {
                const me = await User.findById(_id).select("numeroEquipo");
                myGroup = me?.numeroEquipo || null;
            }
            queryFilter = { deletedAt: null };
            if (myGroup !== null && myGroup !== undefined && myGroup !== "") {
                queryFilter.numeroEquipo = myGroup;
            } else {
                // Si no tiene numeroEquipo, solo devolver su propio usuario
                queryFilter._id = _id;
            }
        } else if (role === "asesor" || role === "auditor") {
            // ✅ Si pide supervisores para reasignación, devolver todos los supervisores
            if (scope === "supervisors") {
                queryFilter = { role: "supervisor", active: true, deletedAt: null };
            } else if (includeAllAuditors === "true") {
                // ✅ Para checkbox "Pertenece a otro equipo": devolver todos los usuarios
                // El frontend filtrará por roles específicos
                queryFilter = { deletedAt: null };
            } else if (scope === "group" || scope === "all") {
                // ✅ Para crear turnos: devolver usuarios del mismo equipo (validadores)
                let myGroup = req.user.numeroEquipo;
                if (!myGroup) {
                    const me = await User.findById(_id).select("numeroEquipo");
                    myGroup = me?.numeroEquipo || null;
                }
                queryFilter = { deletedAt: null };
                if (myGroup !== null && myGroup !== undefined && myGroup !== "") {
                    queryFilter.numeroEquipo = myGroup;
                } else {
                    // Si no tiene numeroEquipo, solo devolver su propio usuario
                    queryFilter._id = _id;
                }
            } else {
                // Por defecto solo devolver su propio usuario
                queryFilter = { _id: _id, deletedAt: null };
            }
        } else {
            // otros: sin filtro especial pero sin soft-deleted
            queryFilter = { deletedAt: null };
        }

        const users = await User.find(queryFilter).select("-password");
        res.json(users);
    } catch (err) {
        logger.error("❌ Error listando usuarios:", err);
        res.status(500).json({ error: err.message });
    }
}

/** Obtiene un usuario por su ID */
async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user || user.deletedAt) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/** Actualiza datos de un usuario. RR.HH solo puede modificar numeroEquipo. */
async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Validar email único si se está actualizando
        if (updateData.email) {
            const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: id } });
            if (existingUser) {
                return res.status(400).json({ error: "El email ya está registrado por otro usuario" });
            }
        }

        // ✅ Permitir limpiar numeroEquipo (campo opcional)
        // Si viene vacío o null, lo establecemos explícitamente como null
        if (updateData.numeroEquipo === "" || updateData.numeroEquipo === null || updateData.numeroEquipo === undefined) {
            updateData.numeroEquipo = null;
        }

        // Evitar borrar el password accidentalmente
        if (!updateData.password) {
            delete updateData.password;
        } else {
            // ✅ Hashear el password antes de actualizar
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        // ✅ RR.HH restrictions: can only modify numeroEquipo
        if (req.user.role === "RR.HH") {
            const allowedFields = ['numeroEquipo'];
            Object.keys(updateData).forEach(key => {
                if (!allowedFields.includes(key)) {
                    delete updateData[key];
                }
            });
        }

        // Admin and gerencia restrictions
        if (!(req.user.role === "administrativo" || req.user.role === "gerencia")) {
            delete updateData.role;
            delete updateData.supervisor;
        }

        const updatedUser = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!updatedUser) return res.status(404).json({ error: "Usuario no encontrado" });

        res.json(updatedUser);
    } catch (err) {
        // Manejar error de índice duplicado de MongoDB
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || 'campo';
            return res.status(400).json({ error: `El ${field} ya está registrado` });
        }
        logger.error("❌ Error actualizando usuario:", err);
        res.status(400).json({ error: err.message });
    }
}

/** Elimina un usuario definitivamente. Solo gerencia y RR.HH. */
async function deleteUserAdmin(req, res) {
    try {
        const id = req.params.id;
        logger.info("🧭 Entrando a deleteUserAdmin", { id });
        // Solo gerencia y RRHH pueden cambiar numeroEquipo
        if (req.user.role !== "gerencia" && req.user.role !== "RR.HH") {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        // No permitir eliminar cuentas de Gerencia
        if ((user.role || "").toLowerCase() === "gerencia") {
            return res.status(403).json({ error: "No se puede eliminar una cuenta de Gerencia" });
        }

        logger.info(`🗑️ Eliminando usuario definitivamente: ${user.nombre || user.name || user.email} (${id})`);

        await User.findByIdAndDelete(id);

        res.json({ message: "Usuario eliminado definitivamente", userId: id });
    } catch (err) {
        logger.error("❌ Error eliminando usuario:", err);
        res.status(500).json({ error: err.message });
    }
}

/** Elimina un usuario permanentemente (legacy). Solo gerencia. */
async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        logger.info("🧭 Entrando a deleteUser (soft delete)", { id });

        if (req.user.role !== "gerencia") {
            return res.status(403).json({ error: "Acceso denegado" });
        }
        const user = await User.findById(id).select("-password");
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        if ((user.role || "").toLowerCase() === "gerencia") {
            return res.status(403).json({ error: "No se puede eliminar una cuenta de Gerencia" });
        }

        await User.findByIdAndDelete(id);

        res.json({ message: "Usuario eliminado permanentemente" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

/** Alterna el estado activo/inactivo de un usuario */
async function toggleActiveUser(req, res) {
    try {
        const { id } = req.params;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        const newActive = !user.active;

        const updated = await User.findByIdAndUpdate(
            id,
            { $set: { active: newActive } },
            { new: true }
        );

        res.json({ message: "Estado actualizado", active: updated.active });
    } catch (err) {
        logger.error("❌ Error toggling usuario:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

/** Lista usuarios con filtros, paginación y ordenamiento. Solo admin/gerencia. */
async function getUsersAdmin(req, res) {
    try {
        if (!(req.user.role === "administrativo" || req.user.role === "gerencia")) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        let { page = 1, limit = 10, search = "", sortBy = "createdAt", order = "desc", grupo = "" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = { deletedAt: null };
        if (search) {
            query.$or = [
                { nombre: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        // Filtro por grupo
        if (grupo) {
            query.numeroEquipo = grupo;
        }

        const sortOrder = order === "asc" ? 1 : -1;

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select("-password")
            .populate("supervisor", "nombre email")
            .sort({ [sortBy]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit);


        res.json({
            users,
            total,
            page,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        logger.error("❌ Error listando usuarios admin:", err);
        res.status(500).json({ error: err.message });
    }
}

/** Cambia el rol de un usuario. No permite cambiar roles de Gerencia. */
async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { role } = req.body;

        // Solo admin, gerencia y RRHH pueden editar usuarios
        if (!(req.user.role === "administrativo" || req.user.role === "gerencia" || req.user.role === "RR.HH")) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        const validRoles = ["asesor", "supervisor", "auditor", "administrativo", "gerencia", "RR.HH", "recuperador"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Rol no válido" });
        }

        if (req.user._id.toString() === id) {
            return res.status(403).json({ error: "No puedes cambiar tu propio rol" });
        }

        const target = await User.findById(id).select("role");
        if (!target) return res.status(404).json({ error: "Usuario no encontrado" });
        if ((target.role || "").toLowerCase() === "gerencia") {
            return res.status(403).json({ error: "No puedes cambiar el rol de un usuario de Gerencia" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { role } },
            { new: true }
        );

        if (!updatedUser) return res.status(404).json({ error: "Usuario no encontrado" });

        logger.info("🔄 Rol actualizado correctamente", {
            userId: id,
            newRole: role,
            updatedBy: req.user.email,
        });

        return res.json({ message: "Rol actualizado correctamente", role });
    } catch (err) {
        logger.error("❌ Error actualizando rol de usuario:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
    }
}

/** Obtiene lista de números de equipo únicos. Solo admin/gerencia. */
async function getAvailableGroups(req, res) {
    try {
        if (!(req.user.role === "administrativo" || req.user.role === "gerencia")) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        const grupos = await User.distinct("numeroEquipo", {
            deletedAt: null,
            numeroEquipo: { $exists: true, $ne: null, $ne: "" }
        });

        // Ordenar alfabéticamente
        grupos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        res.json({ grupos });
    } catch (err) {
        logger.error("❌ Error obteniendo grupos:", err);
        res.status(500).json({ error: err.message });
    }
}

/** Actualiza solo la contraseña de un usuario */
async function updateUserPassword(req, res) {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.trim() === '') {
            return res.status(400).json({ error: 'La contraseña no puede estar vacía' });
        }

        // Hashear el password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { password: hashedPassword } },
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        logger.info(`🔑 Contraseña actualizada para usuario: ${updatedUser.email} por ${req.user.email}`);

        res.json({ message: 'Contraseña actualizada correctamente', user: updatedUser });
    } catch (err) {
        logger.error('❌ Error actualizando contraseña:', err);
        res.status(500).json({ error: err.message });
    }
}

/** Registra un cambio de equipo en el historial del usuario */
async function addTeamChange(req, res) {
    try {
        const { id } = req.params;
        const { nuevoEquipo, fechaInicio, notes } = req.body;

        logger.info(`[TEAM_CHANGE] Request: user=${id}, nuevoEquipo=${nuevoEquipo}, fechaInicio=${fechaInicio}`);

        if (!nuevoEquipo || !fechaInicio) {
            return res.status(400).json({ error: 'nuevoEquipo y fechaInicio son requeridos' });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        // Inicializar teamHistory si no existe
        if (!user.teamHistory || !Array.isArray(user.teamHistory)) {
            user.teamHistory = [];
        }

        const newFechaInicio = new Date(fechaInicio + 'T00:00:00.000Z');

        // Buscar periodo actual abierto
        const currentPeriodIndex = user.teamHistory.findIndex(h => !h.fechaFin);

        if (currentPeriodIndex !== -1) {
            const currentPeriod = user.teamHistory[currentPeriodIndex];
            const currentStart = new Date(currentPeriod.fechaInicio);

            // Normalizar fechas para comparación (solo día)
            const newStartDay = newFechaInicio.toISOString().split('T')[0];
            const currentStartDay = currentStart.toISOString().split('T')[0];

            if (newStartDay === currentStartDay) {
                // Si la fecha es la misma, reemplazar el periodo actual
                logger.info(`[TEAM_CHANGE] Reemplazando periodo actual (misma fecha de inicio: ${newStartDay})`);
                user.teamHistory[currentPeriodIndex] = {
                    numeroEquipo: nuevoEquipo,
                    fechaInicio: newFechaInicio,
                    fechaFin: null,
                    changedBy: req.user._id,
                    changedAt: new Date(),
                    notes: notes || ''
                };
            } else if (newFechaInicio > currentStart) {
                // Fecha posterior: cerrar periodo anterior y crear nuevo
                const fechaFinAnterior = new Date(newFechaInicio);
                fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1);
                currentPeriod.fechaFin = fechaFinAnterior;

                logger.info(`[TEAM_CHANGE] Cerrando periodo ${currentPeriod.numeroEquipo}: hasta ${fechaFinAnterior.toISOString().split('T')[0]}`);

                user.teamHistory.push({
                    numeroEquipo: nuevoEquipo,
                    fechaInicio: newFechaInicio,
                    fechaFin: null,
                    changedBy: req.user._id,
                    changedAt: new Date(),
                    notes: notes || ''
                });
            } else {
                // Fecha anterior: cerrar el periodo actual al día anterior de su inicio
                // y crear el nuevo periodo con la fecha indicada
                const oldStart = new Date(currentPeriod.fechaInicio);
                const fechaFinNuevo = new Date(oldStart);
                fechaFinNuevo.setDate(fechaFinNuevo.getDate() - 1);

                // Insertar nuevo periodo ANTES del actual
                const newPeriod = {
                    numeroEquipo: nuevoEquipo,
                    fechaInicio: newFechaInicio,
                    fechaFin: fechaFinNuevo,
                    changedBy: req.user._id,
                    changedAt: new Date(),
                    notes: notes || ''
                };

                user.teamHistory.push(newPeriod);
                logger.info(`[TEAM_CHANGE] Insertando periodo histórico: ${nuevoEquipo} del ${newStartDay} al ${fechaFinNuevo.toISOString().split('T')[0]}`);
            }
        } else {
            // No hay periodo abierto, crear uno nuevo
            user.teamHistory.push({
                numeroEquipo: nuevoEquipo,
                fechaInicio: newFechaInicio,
                fechaFin: null,
                changedBy: req.user._id,
                changedAt: new Date(),
                notes: notes || ''
            });
        }

        // Actualizar numeroEquipo del usuario
        user.numeroEquipo = nuevoEquipo;

        await user.save();

        logger.info(`[TEAM_CHANGE] User ${id} (${user.nombre}) ahora tiene equipo ${nuevoEquipo}`);

        res.json({
            message: 'Historial de equipo actualizado exitosamente',
            teamHistory: user.teamHistory,
            numeroEquipo: user.numeroEquipo
        });

    } catch (err) {
        logger.error('❌ Error en addTeamChange:', err);
        res.status(500).json({ error: err.message });
    }
}

/** Edita un periodo existente en el historial de equipos */
async function editTeamPeriod(req, res) {
    try {
        const { id, periodId } = req.params;
        const { fechaInicio, fechaFin, notes } = req.body;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const period = user.teamHistory.id(periodId);
        if (!period) {
            return res.status(404).json({ error: 'Periodo no encontrado' });
        }

        // Actualizar campos
        if (fechaInicio) period.fechaInicio = new Date(fechaInicio);
        if (fechaFin !== undefined) period.fechaFin = fechaFin ? new Date(fechaFin) : null;
        if (notes !== undefined) period.notes = notes;

        // Validar historial
        const { validateTeamHistory } = require('../utils/supervisorHelper');
        const validation = validateTeamHistory(user.teamHistory);
        if (!validation.valid) {
            return res.status(400).json({ error: 'Validación fallida', details: validation.errors });
        }

        await user.save();

        logger.info(`[TEAM_EDIT] Periodo ${periodId} del user ${id} editado por ${req.user.email}`);

        res.json({
            message: 'Periodo actualizado exitosamente',
            teamHistory: user.teamHistory
        });

    } catch (err) {
        logger.error('❌ Error en editTeamPeriod:', err);
        res.status(500).json({ error: err.message });
    }
}

/** Elimina un periodo del historial (no el actual/abierto) */
async function deleteTeamPeriod(req, res) {
    try {
        const { id, periodId } = req.params;

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const period = user.teamHistory.id(periodId);
        if (!period) {
            return res.status(404).json({ error: 'Periodo no encontrado' });
        }

        // No permitir eliminar el periodo actual (abierto)
        if (!period.fechaFin) {
            return res.status(400).json({ error: 'No se puede eliminar el periodo actual (abierto)' });
        }

        period.remove();
        await user.save();

        logger.info(`[TEAM_DELETE] Periodo ${periodId} del user ${id} eliminado por ${req.user.email}`);

        res.json({
            message: 'Periodo eliminado exitosamente',
            teamHistory: user.teamHistory
        });

    } catch (err) {
        logger.error('❌ Error en deleteTeamPeriod:', err);
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    updateUserPassword,
    deleteUser,
    deleteUserAdmin,
    toggleActiveUser,
    getUsersAdmin,
    updateUserRole,
    getAvailableGroups,
    addTeamChange,
    editTeamPeriod,
    deleteTeamPeriod
};