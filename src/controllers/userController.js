// src/controllers/userController.js

const User = require("../models/User");

// Crear usuario (solo admin en rutas, pero aquí reforzamos lógica)
exports.createUser = async (req, res) => {
    try {
        const { nombre, email, password, role, supervisor } = req.body;

        // Verificamos si email ya existe
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ error: "Email ya registrado" });
        }

        let finalRole = "asesor"; // default
        let finalSupervisor = supervisor || null;

        if (req.user && req.user.role === "admin") {
            // Admin puede crear cualquier rol
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
        });

        await user.save();

        // No devolvemos password
        const safeUser = {
            _id: user._id,
            nombre: user.nombre,
            email: user.email,
            role: user.role,
            supervisor: user.supervisor,
        };

        res.status(201).json(safeUser);
    } catch (err) {
        console.error("❌ Error creando usuario:", err);
        res.status(400).json({ error: err.message });
    }
};

// Obtener todos los usuarios
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Obtener un usuario por ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Actualizar usuario
exports.updateUser = async (req, res) => {
    try {
        // No permitir cambiar directamente el password aquí
        if (req.body.password) {
            delete req.body.password;
        }

        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
            select: "-password",
        });
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id).select("-password");
        if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json({ message: "Usuario eliminado" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};