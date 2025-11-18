// src/controllers/userController.js

const User = require("../models/User");
const { buildOwnerFilter, getTeamUserIds } = require("../middlewares/roleMiddleware");
const logger = require("../utils/logger");

// Crear usuario
async function createUser(req, res) {
    try {
        const { nombre, email, password, role, supervisor } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ error: "Email ya registrado" });
        }

        let finalRole = "asesor";
        let finalSupervisor = supervisor || null;

        if (req.user && (req.user.role === "admin" || req.user.role === "gerencia")) {
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

async function getUsers(req, res) {
    try {
        let queryFilter = {};
        const { _id, role } = req.user;
        const { scope, includeAllAuditors } = req.query;

        // Permitir a supervisores ver todos los auditores (para el dropdown de Auditor en AuditEditModal)
        if (role === "supervisor" && includeAllAuditors === "true") {
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
            // Por defecto: su equipo directo + él mismo
            const teamIds = await getTeamUserIds(_id);
            queryFilter = { _id: { $in: [...teamIds, _id] }, deletedAt: null };
        } else if (role === "asesor") {
            queryFilter = { _id: _id, deletedAt: null };
        } else {
            // admin/auditor u otros: sin filtro especial pero sin soft-deleted
            queryFilter = { deletedAt: null };
        }

        const users = await User.find(queryFilter).select("-password");
        res.json(users);
    } catch (err) {
        logger.error("❌ Error listando usuarios:", err);
        res.status(500).json({ error: err.message });
    }
}

async function getUserById(req, res) {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user || user.deletedAt) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Evitar borrar el password accidentalmente
        if (!updateData.password) {
            delete updateData.password;
        } else {
            // ✅ Hashear el password antes de actualizar
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        }

        if (!(req.user.role === "admin" || req.user.role === "gerencia")) {
            delete updateData.role;
            delete updateData.supervisor;
        }

        const updatedUser = await User.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!updatedUser) return res.status(404).json({ error: "Usuario no encontrado" });

        res.json(updatedUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
}

// Eliminar usuario definitivamente (manteniendo relaciones intactas)
async function deleteUserAdmin(req, res) {
    try {
        const id = req.params.id;
        logger.info("🧭 Entrando a deleteUserAdmin", { id });
        if (req.user.role !== "gerencia") {
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

// Elimina físico (legacy)
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

// Toggle activo/inactivo (ahora atómico y devuelve el estado actualizado)
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

// Admin con filtros (ahora excluye soft-deleted)
async function getUsersAdmin(req, res) {
    try {
        if (!(req.user.role === "admin" || req.user.role === "gerencia")) {
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

// 🔄 Cambiar rol de un usuario (solo admin)
async function updateUserRole(req, res) {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!(req.user.role === "admin" || req.user.role === "gerencia")) {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        const validRoles = ["asesor", "supervisor", "auditor", "admin", "revendedor", "gerencia", "rrhh"];
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

// 📋 Obtener lista de grupos únicos
async function getAvailableGroups(req, res) {
    try {
        if (!(req.user.role === "admin" || req.user.role === "gerencia")) {
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

module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    deleteUserAdmin,
    toggleActiveUser,
    getUsersAdmin,
    updateUserRole,
    getAvailableGroups
};