// frontend/src/pages/Login.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { motion } from "framer-motion";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        const { ok, msg } = await login(email, password);
        if (!ok) {
            setError(msg || "Credenciales inválidas");
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
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-2xl">💬</div>
                            <div>
                                <div className="text-xl font-extrabold text-gray-900">Dann+Salud Online</div>
                                <div className="text-sm text-gray-600">Broadcaster & Autorespuestas</div>
                            </div>
                        </div>
                        <div className="space-y-3 text-gray-700">
                            <div className="text-2xl font-semibold leading-snug">
                                Conversa con tus clientes a escala, manteniendo el toque humano.
                            </div>
                            <ul className="text-sm leading-relaxed list-disc ml-5">
                                <li>Campañas masivas con seguimiento en tiempo real.</li>
                                <li>Multi-sesión WhatsApp por asesor.</li>
                                <li>Auto-respuestas inteligentes con anti-spam.</li>
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
                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">🔐</div>
                                <h2 className="text-lg font-bold">Iniciar Sesión</h2>
                            </div>
                            {error && (
                                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-3">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
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
                                    <div className="mt-2 flex items-center justify-between">
                                        <label className="flex items-center gap-2 text-sm text-gray-600">
                                            <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                            Recordarme
                                        </label>
                                        <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-indigo-600 hover:underline">
                                            ¿Olvidaste tu contraseña?
                                        </button>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="mt-1 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 py-2.5 font-medium text-white shadow hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                >
                                    Entrar
                                </button>
                            </div>
                            <div className="mt-4 text-center text-sm text-gray-600">
                                ¿No tienes cuenta?{" "}
                                <button
                                    type="button"
                                    onClick={() => navigate("/register")}
                                    className="text-indigo-600 hover:underline"
                                >
                                    Regístrate
                                </button>
                            </div>
                        </motion.form>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}