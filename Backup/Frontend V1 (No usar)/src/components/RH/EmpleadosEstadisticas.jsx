// frontend/src/components/RH/EmpleadosEstadisticas.jsx

import { useState, useEffect } from 'react';
import { TrendingUp, Users as UsersIcon, Award, Calendar, CheckCircle } from 'lucide-react';
import apiClient from '../../services/api';
import { toast } from 'react-toastify';

export default function EmpleadosEstadisticas() {
    const [usuarios, setUsuarios] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Filtros
    const [filterRole, setFilterRole] = useState('');
    const [filterEquipo, setFilterEquipo] = useState('');

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            const { data } = await apiClient.get('/users');
            setUsuarios(data.filter(u => u.active));
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
            toast.error('Error al cargar usuarios');
        }
    };

    const fetchStats = async (userId) => {
        try {
            setLoading(true);
            const { data } = await apiClient.get(`/employees/stats/${userId}`);
            setStats(data);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
            toast.error(error.response?.data?.message || 'Error al cargar estadísticas');
            setStats(null);
        } finally {
            setLoading(false);
        }
    };

    const handleUserSelect = (userId) => {
        setSelectedUserId(userId);
        if (userId) {
            fetchStats(userId);
        } else {
            setStats(null);
        }
    };

    const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
        const colorClasses = {
            blue: 'bg-blue-100 text-blue-600 border-blue-200',
            green: 'bg-green-100 text-green-600 border-green-200',
            purple: 'bg-purple-100 text-purple-600 border-purple-200',
            orange: 'bg-orange-100 text-orange-600 border-orange-200',
            red: 'bg-red-100 text-red-600 border-red-200'
        };

        return (
            <div className={`border-2 rounded-lg p-4 ${colorClasses[color]}`}>
                <div className="flex items-center gap-3 mb-2">
                    <Icon size={24} />
                    <span className="font-medium text-sm">{label}</span>
                </div>
                <div className="text-3xl font-bold">{value}</div>
            </div>
        );
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Estadísticas de Empleados</h2>
                <p className="text-gray-600">
                    Seleccione un empleado para ver sus estadísticas según su rol
                </p>
            </div>

            {/* Filtros */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎭 Filtrar por Rol
                    </label>
                    <select
                        value={filterRole}
                        onChange={(e) => {
                            setFilterRole(e.target.value);
                            setSelectedUserId('');
                            setStats(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Todos los roles</option>
                        <option value="asesor">Asesor</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="auditor">Auditor</option>
                        <option value="admin">Admin</option>
                        <option value="gerencia">Gerencia</option>
                        <option value="rrhh">RR.HH.</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        🏢 Filtrar por Equipo
                    </label>
                    <select
                        value={filterEquipo}
                        onChange={(e) => {
                            setFilterEquipo(e.target.value);
                            setSelectedUserId('');
                            setStats(null);
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Todos los equipos</option>
                        {[...new Set(usuarios.map(u => u.numeroEquipo).filter(Boolean))]
                            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                            .map(equipo => (
                                <option key={equipo} value={equipo}>Equipo {equipo}</option>
                            ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        ⏰ Acciones Rápidas
                    </label>
                    <button
                        onClick={() => {
                            setFilterRole('');
                            setFilterEquipo('');
                            setSelectedUserId('');
                            setStats(null);
                        }}
                        className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        🗑️ Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Selector de usuario */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seleccionar Empleado {filterRole || filterEquipo ? '(filtrado)' : ''}
                </label>
                <select
                    value={selectedUserId}
                    onChange={(e) => handleUserSelect(e.target.value)}
                    className="w-full max-w-xl px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Seleccionar...</option>
                    {usuarios
                        .filter(user => {
                            const matchRole = !filterRole || user.role?.toLowerCase() === filterRole.toLowerCase();
                            const matchEquipo = !filterEquipo || user.numeroEquipo === filterEquipo;
                            return matchRole && matchEquipo;
                        })
                        .map(user => (
                            <option key={user._id} value={user._id}>
                                {user.nombre} - {user.role} {user.numeroEquipo ? `(Equipo ${user.numeroEquipo})` : ''}
                            </option>
                        ))}
                </select>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            )}

            {/* Estadísticas */}
            {!loading && stats && (
                <div>
                    {/* Información del Empleado */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Información del Empleado</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <span className="text-sm text-gray-600">Nombre:</span>
                                <p className="font-semibold text-gray-800">{stats.employee.nombreCompleto}</p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600">Cargo:</span>
                                <p className="font-semibold text-gray-800 capitalize">{stats.employee.cargo}</p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600">Equipo:</span>
                                <p className="font-semibold text-gray-800">
                                    {stats.employee.numeroEquipo || 'Sin equipo'}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600">Fecha de Ingreso:</span>
                                <p className="font-semibold text-gray-800">
                                    {new Date(stats.employee.fechaIngreso).toLocaleDateString('es-AR')}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600">Teléfono:</span>
                                <p className="font-semibold text-gray-800">
                                    {stats.employee.telefonoPersonal || '-'}
                                </p>
                            </div>
                            <div>
                                <span className="text-sm text-gray-600">Estado:</span>
                                <p className={`font-semibold ${stats.employee.activo ? 'text-green-600' : 'text-red-600'}`}>
                                    {stats.employee.activo ? 'Activo' : 'Inactivo'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas según el rol */}
                    {stats.role === 'asesor' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <TrendingUp size={24} className="text-blue-600" />
                                Estadísticas de Ventas (Asesor)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <StatCard
                                    icon={CheckCircle}
                                    label="QR Hechos (Semana)"
                                    value={stats.stats.qrWeek}
                                    color="green"
                                />
                                <StatCard
                                    icon={Calendar}
                                    label="QR Hechos (Mes)"
                                    value={stats.stats.qrMonth}
                                    color="blue"
                                />
                                <StatCard
                                    icon={Award}
                                    label="Máx. QR (Semana)"
                                    value={stats.stats.maxQrWeek}
                                    color="purple"
                                />
                                <StatCard
                                    icon={Award}
                                    label="Máx. QR (Mes)"
                                    value={stats.stats.maxQrMonth}
                                    color="purple"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Ventas Incompletas"
                                    value={stats.stats.incomplete}
                                    color="orange"
                                />
                            </div>
                        </div>
                    )}

                    {stats.role === 'supervisor' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <UsersIcon size={24} className="text-green-600" />
                                Estadísticas del Equipo (Supervisor)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <StatCard
                                    icon={UsersIcon}
                                    label="Tamaño del Equipo"
                                    value={stats.stats.teamSize}
                                    color="blue"
                                />
                                <StatCard
                                    icon={CheckCircle}
                                    label="QR Hechos (Semana)"
                                    value={stats.stats.qrWeek}
                                    color="green"
                                />
                                <StatCard
                                    icon={Calendar}
                                    label="QR Hechos (Mes)"
                                    value={stats.stats.qrMonth}
                                    color="blue"
                                />
                                <StatCard
                                    icon={TrendingUp}
                                    label="Ventas Incompletas"
                                    value={stats.stats.incomplete}
                                    color="orange"
                                />
                            </div>
                        </div>
                    )}

                    {stats.role === 'auditor' && (
                        <div className="space-y-6">
                            {/* Estadísticas de Auditorías */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <CheckCircle size={24} className="text-purple-600" />
                                    Estadísticas de Auditorías
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <StatCard
                                        icon={CheckCircle}
                                        label="Auditorías (Semana)"
                                        value={stats.stats.auditsWeek}
                                        color="green"
                                    />
                                    <StatCard
                                        icon={Calendar}
                                        label="Auditorías (Mes)"
                                        value={stats.stats.auditsMonth}
                                        color="blue"
                                    />
                                    <StatCard
                                        icon={Calendar}
                                        label="Auditorías (Mes Anterior)"
                                        value={stats.stats.auditsLastMonth}
                                        color="purple"
                                    />
                                    <StatCard
                                        icon={Award}
                                        label="Total Auditorías"
                                        value={stats.stats.totalAudits}
                                        color="orange"
                                    />
                                </div>
                            </div>

                            {/* Estadísticas de Ventas (también vende) */}
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <TrendingUp size={24} className="text-blue-600" />
                                    Estadísticas de Ventas (También Vende)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <StatCard
                                        icon={CheckCircle}
                                        label="QR Hechos (Semana)"
                                        value={stats.stats.qrWeek}
                                        color="green"
                                    />
                                    <StatCard
                                        icon={Calendar}
                                        label="QR Hechos (Mes)"
                                        value={stats.stats.qrMonth}
                                        color="blue"
                                    />
                                    <StatCard
                                        icon={Award}
                                        label="Máx. QR (Semana)"
                                        value={stats.stats.maxQrWeek}
                                        color="purple"
                                    />
                                    <StatCard
                                        icon={Award}
                                        label="Máx. QR (Mes)"
                                        value={stats.stats.maxQrMonth}
                                        color="purple"
                                    />
                                    <StatCard
                                        icon={TrendingUp}
                                        label="Ventas Incompletas"
                                        value={stats.stats.incomplete}
                                        color="orange"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {stats.role === 'admin' && (
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Award size={24} className="text-red-600" />
                                Estadísticas de QR Generados (Admin)
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard
                                    icon={CheckCircle}
                                    label="QR (Semana)"
                                    value={stats.stats.qrWeek}
                                    color="green"
                                />
                                <StatCard
                                    icon={Calendar}
                                    label="QR (Mes)"
                                    value={stats.stats.qrMonth}
                                    color="blue"
                                />
                                <StatCard
                                    icon={Calendar}
                                    label="QR (Mes Anterior)"
                                    value={stats.stats.qrLastMonth}
                                    color="purple"
                                />
                                <StatCard
                                    icon={Award}
                                    label="Total QR Generados"
                                    value={stats.stats.totalQr}
                                    color="orange"
                                />
                            </div>
                        </div>
                    )}

                    {['gerencia', 'rrhh', 'revendedor'].includes(stats.role) && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 mb-2">
                                <UsersIcon size={48} className="mx-auto" />
                            </div>
                            <p className="text-gray-600">
                                No hay estadísticas específicas disponibles para el rol de {stats.role}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {!loading && !stats && selectedUserId && (
                <div className="text-center py-12 text-gray-500">
                    No se encontraron estadísticas para este usuario
                </div>
            )}

            {!loading && !stats && !selectedUserId && (
                <div className="text-center py-12 text-gray-400">
                    <UsersIcon size={48} className="mx-auto mb-4" />
                    <p>Seleccione un empleado para ver sus estadísticas</p>
                </div>
            )}
        </div>
    );
}
