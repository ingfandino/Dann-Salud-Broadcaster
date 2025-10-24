// frontend/src/pages/Dashboard.jsx

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart2, MessageSquare, Users, LogOut, SquareUserRound, ClipboardList } from "lucide-react";
import { API_URL } from "../config.js";

export default function Dashboard() {
    const { user, token, logout } = useAuth();

    const [metrics, setMetrics] = useState({
        mensajesHoy: 0,
        usuariosActivos: 0,
        contactosCargados: 0,
    });

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const res = await axios.get(`${API_URL}/metrics/dashboard`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setMetrics(res.data);
            } catch (error) {
                console.error("❌ Error cargando métricas:", error);
            }
        };

        fetchMetrics();
    }, [token]);

    const navLinks = {
        asesor: [
            { to: "/reports", icon: <BarChart2 className="w-5 h-5" />, label: "Mis Reportes" },
            { to: "/bulk-messages", icon: <MessageSquare className="w-5 h-5" />, label: "Mensajería Masiva" },
            { to: "/audits", icon: <SquareUserRound className="w-5 h-5" />, label: "Auditorías" },
        ],
        supervisor: [
            { to: "/reports", icon: <BarChart2 className="w-5 h-5" />, label: "Reportes de mi Equipo" },
            { to: "/bulk-messages", icon: <MessageSquare className="w-5 h-5" />, label: "Mensajería Masiva" },
            { to: "/audits", icon: <SquareUserRound className="w-5 h-5" />, label: "Auditorías" },
        ],
        auditor: [
            { to: "/audits", icon: <SquareUserRound className="w-5 h-5" />, label: "Auditorías" },
        ],
        admin: [
            { to: "/audits", icon: <SquareUserRound className="w-5 h-5" />, label: "Auditorías" },
        ],
        gerencia: [
            { to: "/reports", icon: <BarChart2 className="w-5 h-5" />, label: "Reportes Globales" },
            { to: "/bulk-messages", icon: <MessageSquare className="w-5 h-5" />, label: "Mensajería Masiva" },
            { to: "/audits", icon: <SquareUserRound className="w-5 h-5" />, label: "Auditorías" },
            { to: "/admin/users", icon: <Users className="w-5 h-5" />, label: "Gestionar Usuarios" },
        ],
    };

    return (
        <div className="flex min-h-screen bg-gray-50 relative overflow-hidden">
            {/* 🎨 Blobs de fondo */}
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-blue/30 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-green/20 rounded-full blur-3xl"></div>

            {/* Sidebar */}
            <motion.aside
                initial={{ x: -200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-64 bg-gradient-to-b from-white via-brand-blue/90 to-brand-purple/80 text-white flex flex-col justify-between shadow-xl backdrop-blur-md"
            >
                {/* Logo + Usuario */}
                <div className="p-6 flex flex-col items-center bg-white/30 rounded-xl shadow-md mx-4 mt-6">
                    <img
                        src="/logo.png"
                        alt="Dann+Salud"
                        className="w-40 md:w-52 lg:w-64 h-auto object-contain drop-shadow-lg mb-4"
                    />
                    <h2 className="text-lg font-bold text-gray-900 text-center">
                        {user?.nombre}
                    </h2>
                    <p className="text-sm text-gray-800 capitalize">{user?.role}</p>
                </div>

                {/* Menú */}
                <nav className="flex-1 px-4 space-y-2 mt-6">
                    {navLinks[user?.role]?.map((link, idx) => {
                        const isBulkMessages = link.label === "Mensajería Masiva";

                        return (
                            <motion.div whileHover={{ scale: 1.05 }} key={idx}>
                                <Link
                                    to={link.to}
                                    className={`relative flex items-center gap-3 px-4 py-2 rounded-lg transition overflow-hidden
                        ${isBulkMessages
                                            ? "text-black font-semibold bg-yellow-400 border border-yellow-600 shadow-md under-construction"
                                            : "hover:bg-white/20 text-white"
                                        }`}
                                >
                                    {isBulkMessages && (
                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg, #facc15 0, #facc15 10px, #b91c1c 10px, #b91c1c 20px)] opacity-60 animate-stripes"></div>
                                    )}
                                    <div className="relative flex items-center gap-3 z-10">
                                        {link.icon}
                                        <span>{link.label}</span>
                                    </div>
                                </Link>
                            </motion.div>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4">
                    <motion.button
                        onClick={logout}
                        whileHover={{ scale: 1.05 }}
                        className="flex items-center gap-2 w-full px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg"
                    >
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </motion.button>
                </div>
            </motion.aside>

            {/* Contenido principal */}
            <main className="flex-1 p-10 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>
                    <p className="text-gray-700 mb-8">
                        Bienvenido, <span className="font-semibold">{user?.nombre}</span>. Selecciona una opción en el menú lateral.
                    </p>

                    {/* 🔹 Cards métricas */}
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white shadow-md rounded-xl p-6">
                            <p className="text-gray-500">Mensajes enviados hoy</p>
                            <h2 className="text-2xl font-bold text-brand-blue">{metrics.mensajesHoy}</h2>
                        </div>
                        <div className="bg-white shadow-md rounded-xl p-6">
                            <p className="text-gray-500">Usuarios activos</p>
                            <h2 className="text-2xl font-bold text-brand-green">{metrics.usuariosActivos}</h2>
                        </div>
                        <div className="bg-white shadow-md rounded-xl p-6">
                            <p className="text-gray-500">Contactos cargados</p>
                            <h2 className="text-2xl font-bold text-brand-purple">{metrics.contactosCargados}</h2>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}