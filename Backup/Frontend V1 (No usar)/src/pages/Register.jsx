// frontend/src/pages/Register.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        username: "",
        nombre: "",
        email: "",
        password: "",
        numeroEquipo: "",
    });
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const { ok, msg } = await register(form);
        if (!ok) {
            setError(msg);
        } else {
            setSuccess("Registro completado. Serás redirigido...");
            setTimeout(() => navigate("/login"), 3000);
        }
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-indigo-100 via-white to-blue-100">
            {/* Fix: ocultar ícono nativo de revelar contraseña (Edge) */}
            <style>
                {`
                input[type='password']::-ms-reveal, input[type='password']::-ms-clear { display: none; }
                `}
            </style>
            {/* Sprites decorativos */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.5, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-400 to-fuchsia-400 blur-3xl"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 0.5, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className="pointer-events-none absolute bottom-[-6rem] right-[-6rem] h-80 w-80 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 blur-3xl"
            />

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-stretch justify-center px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Panel de identidad */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="hidden md:flex flex-col justify-center rounded-2xl bg-white/40 p-8 backdrop-blur-md ring-1 ring-black/5 shadow-xl"
                    >
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-2xl">📝</div>
                            <div>
                                <div className="text-xl font-extrabold text-gray-900">Dann+Salud Online</div>
                                <div className="text-sm text-gray-600">Crea tu cuenta</div>
                            </div>
                        </div>
                        <div className="space-y-3 text-gray-700">
                            <div className="text-2xl font-semibold leading-snug">
                                Desbloquea campañas masivas y auto-respuestas inteligentes.
                            </div>
                            <ul className="text-sm leading-relaxed list-disc ml-5">
                                <li>Organiza tus campañas y contactos desde un único lugar.</li>
                                <li>Conecta tu WhatsApp con sesión dedicada.</li>
                                <li>Automatiza respuestas y mide resultados.</li>
                            </ul>
                        </div>
                    </motion.div>

                    {/* Formulario */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center justify-center"
                    >
                        <motion.form
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            onSubmit={handleSubmit}
                            className="w-full max-w-md rounded-2xl bg-white/80 p-6 shadow-2xl backdrop-blur-md ring-1 ring-black/5"
                        >
                            <div className="mb-2 flex items-center gap-2">
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">🔑</div>
                                <h2 className="text-lg font-bold">Registro</h2>
                            </div>
                            {error && (
                                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            {success && (
                                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                    {success}
                                </div>
                            )}
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Usuario</label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={form.username}
                                        onChange={handleChange}
                                        placeholder="Tu usuario"
                                        className="w-full rounded-lg border border-gray-300 bg-white/60 p-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Nombre completo</label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={form.nombre}
                                        onChange={handleChange}
                                        placeholder="Tu nombre"
                                        className="w-full rounded-lg border border-gray-300 bg-white/60 p-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Correo electrónico</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="tu@correo.com"
                                        className="w-full rounded-lg border border-gray-300 bg-white/60 p-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={form.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            className="w-full appearance-none rounded-lg border border-gray-300 bg-white/60 p-2.5 pr-10 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute inset-y-0 right-2 my-auto rounded px-2 text-sm text-gray-600 hover:text-gray-900"
                                            aria-label="Mostrar u ocultar contraseña"
                                        >
                                            {showPassword ? "Ocultar" : "Mostrar"}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Número de equipo</label>
                                    <input
                                        type="text"
                                        name="numeroEquipo"
                                        value={form.numeroEquipo}
                                        onChange={handleChange}
                                        placeholder="Ej: 12"
                                        className="w-full rounded-lg border border-gray-300 bg-white/60 p-2.5 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="mt-1 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 font-medium text-white shadow hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                >
                                    Registrarse
                                </button>
                            </div>
                            <div className="mt-4 text-center text-sm text-gray-600">
                                ¿Ya tienes cuenta? {" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("/login")}
                                    className="text-indigo-600 hover:underline"
                                >
                                    Inicia sesión
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}