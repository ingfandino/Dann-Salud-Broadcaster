// frontend/src/pages/RecursosHumanos.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, UserPlus, BarChart3, UserCheck, UserCog, TrendingUp, Briefcase, UserX } from 'lucide-react';
import { toast } from 'react-toastify';
import apiClient from '../services/api';
import EmpleadosLista from '../components/RH/EmpleadosLista';
import EmpleadosFormulario from '../components/RH/EmpleadosFormulario';
import EmpleadosEstadisticas from '../components/RH/EmpleadosEstadisticas';

export default function RecursosHumanos() {
    const [activeTab, setActiveTab] = useState('lista');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const tabs = [
        { id: 'lista', label: 'Personal', icon: Users },
        { id: 'inactivos', label: 'Personal Inactivo', icon: UserX },
        { id: 'formulario', label: 'Nuevo Empleado', icon: UserPlus },
        { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 }
    ];

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const res = await apiClient.get('/employees');
            const employees = res.data || [];

            const totalEmpleados = employees.length;
            const activos = employees.filter(e => e.activo).length;
            const inactivos = employees.filter(e => !e.activo).length;
            const conContrato = employees.filter(e => e.firmoContrato).length;

            // Contar por cargo
            const cargos = {};
            employees.forEach(e => {
                if (e.activo) {
                    cargos[e.cargo] = (cargos[e.cargo] || 0) + 1;
                }
            });

            setStats({
                totalEmpleados,
                activos,
                inactivos,
                conContrato,
                cargos
            });
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEmployeeChange = () => {
        loadStats();
    };

    return (
        <motion.div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-100 p-4 md:p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">
                            👥 Recursos Humanos
                        </h1>
                        <p className="text-sm md:text-base text-gray-600">
                            Gestión integral del personal de la compañía
                        </p>
                    </motion.div>

                    <motion.div
                        className="flex items-center gap-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <button
                            onClick={() => navigate("/")}
                            className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600 transition-colors"
                        >
                            ← Volver al Menú
                        </button>
                    </motion.div>
                </div>

                {/* Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <motion.div
                            className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total Empleados</p>
                                    <p className="text-3xl font-bold text-gray-800">{stats.totalEmpleados}</p>
                                </div>
                                <Users className="w-10 h-10 text-blue-500" />
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-green-500"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Activos</p>
                                    <p className="text-3xl font-bold text-green-600">{stats.activos}</p>
                                </div>
                                <UserCheck className="w-10 h-10 text-green-500" />
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-red-500"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Inactivos</p>
                                    <p className="text-3xl font-bold text-red-600">{stats.inactivos}</p>
                                </div>
                                <UserX className="w-10 h-10 text-red-500" />
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-purple-500"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Con Contrato</p>
                                    <p className="text-3xl font-bold text-purple-600">{stats.conContrato}</p>
                                </div>
                                <Briefcase className="w-10 h-10 text-purple-500" />
                            </div>
                        </motion.div>

                        <motion.div
                            className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-orange-500"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Cargos</p>
                                    <p className="text-3xl font-bold text-orange-600">{Object.keys(stats.cargos).length}</p>
                                </div>
                                <UserCog className="w-10 h-10 text-orange-500" />
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Tabs Navigation */}
                <div className="flex gap-2 mb-6 border-b border-gray-300">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 md:px-6 py-3 font-semibold transition-all rounded-t-lg
                                    ${activeTab === tab.id
                                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white shadow-sm'
                                        : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                                    }
                                `}
                            >
                                <Icon size={20} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
                    {activeTab === 'lista' && <EmpleadosLista onEmployeeChange={handleEmployeeChange} showOnlyActive={true} />}
                    {activeTab === 'inactivos' && <EmpleadosLista onEmployeeChange={handleEmployeeChange} showOnlyInactive={true} />}
                    {activeTab === 'formulario' && (
                        <EmpleadosFormulario
                            onSuccess={() => {
                                setActiveTab('lista');
                                handleEmployeeChange();
                            }}
                        />
                    )}
                    {activeTab === 'estadisticas' && <EmpleadosEstadisticas />}
                </div>
            </div>
        </motion.div>
    );
}
