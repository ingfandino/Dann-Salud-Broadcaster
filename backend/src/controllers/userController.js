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

        if (req.user && req.user.role === "admin") {
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

        if (role === "supervisor") {
            const teamIds = await getTeamUserIds(_id);
            queryFilter = { _id: { $in: [...teamIds, _id] } };
        } else if (role === "asesor") {
            queryFilter = { _id: _id };
        }

        // Excluir soft-deleted por defecto
        queryFilter.deletedAt = null;

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
        }

        if (req.user.role !== "admin") {
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

        const user = await User.findById(id);
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

        logger.info("🗑️ Eliminando usuario definitivamente", { userId: id, email: user.email });

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

        const user = await User.findByIdAndDelete(id).select("-password");
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });

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
        if (req.user.role !== "admin") {
            return res.status(403).json({ error: "Acceso denegado" });
        }

        let { page = 1, limit = 10, search = "", sortBy = "createdAt", order = "desc" } = req.query;
        page = parseInt(page);
        limit = parseInt(limit);

        const query = { deletedAt: null };
        if (search) {
            query.$or = [
                { nombre: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
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

        const validRoles = ["asesor", "supervisor", "auditor", "admin"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: "Rol no válido" });
        }

        if (req.user._id.toString() === id) {
            return res.status(403).json({ error: "No puedes cambiar tu propio rol" });
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

module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    deleteUserAdmin,
    toggleActiveUser,
    getUsersAdmin,
    updateUserRole
};