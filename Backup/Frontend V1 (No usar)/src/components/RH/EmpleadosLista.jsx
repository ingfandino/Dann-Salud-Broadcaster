// frontend/src/components/RH/EmpleadosLista.jsx

import { useState, useEffect } from 'react';
import { Edit, Trash2, CheckCircle, XCircle, Search, Filter, AlertCircle } from 'lucide-react';
import apiClient from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import EmpleadoEditModal from './EmpleadoEditModal';

export default function EmpleadosLista({ onEmployeeChange, showOnlyActive = false, showOnlyInactive = false }) {
    const { user } = useAuth();
    const isSupervisor = user?.role?.toLowerCase() === 'supervisor';
    const isGerenciaOrRRHH = user?.role?.toLowerCase() === 'gerencia' || user?.role?.toLowerCase() === 'rrhh';

    // Función para verificar si puede editar/borrar un empleado específico
    const canEditDeleteEmployee = (empleado) => {
        // ✅ Item 9: Solo Gerencia, RR.HH. y Admin pueden editar/borrar
        const role = user?.role?.toLowerCase();
        if (role === 'gerencia' || role === 'rrhh' || role === 'admin') return true;

        // ❌ Supervisores YA NO pueden editar (según requerimiento Item 9)
        return false;
    };
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEquipo, setFilterEquipo] = useState('');
    const [filterActivo, setFilterActivo] = useState('todos');
    const [selectedEmpleado, setSelectedEmpleado] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        fetchEmpleados();
    }, []);

    const fetchEmpleados = async () => {
        try {
            setLoading(true);
            const { data } = await apiClient.get('/employees');
            setEmpleados(data);
        } catch (error) {
            console.error('Error al cargar empleados:', error);
            toast.error('Error al cargar empleados');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (empleado) => {
        setSelectedEmpleado(empleado);
        setShowEditModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de ELIMINAR este empleado? Esta acción no se puede deshacer y permitirá crear un nuevo registro para este usuario.')) return;

        try {
            await apiClient.delete(`/employees/${id}`);
            toast.success('Empleado eliminado correctamente');
            fetchEmpleados();
            if (onEmployeeChange) onEmployeeChange();
        } catch (error) {
            console.error('Error al eliminar empleado:', error);
            toast.error('Error al eliminar empleado');
        }
    };

    const handleUpdateSuccess = () => {
        setShowEditModal(false);
        setSelectedEmpleado(null);
        fetchEmpleados();
        if (onEmployeeChange) onEmployeeChange();
    };

    // Filtrar empleados
    const equipos = [...new Set(empleados.map(e => e.numeroEquipo).filter(Boolean))].sort();

    const filteredEmpleados = empleados.filter(empleado => {
        const matchSearch = empleado.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            empleado.userId?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchEquipo = !filterEquipo || empleado.numeroEquipo === filterEquipo;

        // Si se especifica showOnlyActive o showOnlyInactive, usar eso en lugar del filtro
        let matchActivo;
        if (showOnlyActive) {
            matchActivo = empleado.activo === true;
        } else if (showOnlyInactive) {
            matchActivo = empleado.activo === false;
        } else {
            matchActivo = filterActivo === 'todos' ||
                (filterActivo === 'activos' && empleado.activo) ||
                (filterActivo === 'inactivos' && !empleado.activo);
        }

        return matchSearch && matchEquipo && matchActivo;
    });

    // Función para obtener prioridad de cargo (menor número = mayor jerarquía)
    const getRolePriority = (cargo) => {
        const priorities = {
            'gerencia': 1,
            'admin': 2,
            'supervisor': 3,
            'auditor': 4,
            'asesor': 5,
            'rrhh': 6,
            'revendedor': 7
        };
        return priorities[cargo?.toLowerCase()] || 99;
    };

    // Agrupar por equipo y ordenar por jerarquía dentro de cada grupo
    const empleadosPorEquipo = filteredEmpleados.reduce((acc, emp) => {
        const equipo = emp.numeroEquipo || 'Sin equipo';
        if (!acc[equipo]) acc[equipo] = [];
        acc[equipo].push(emp);
        return acc;
    }, {});

    // Ordenar empleados dentro de cada grupo por jerarquía de cargo
    Object.keys(empleadosPorEquipo).forEach(equipo => {
        empleadosPorEquipo[equipo].sort((a, b) => {
            return getRolePriority(a.cargo) - getRolePriority(b.cargo);
        });
    });

    const getRoleBadgeColor = (role) => {
        const colors = {
            gerencia: 'bg-purple-100 text-purple-700',
            admin: 'bg-red-100 text-red-700',
            auditor: 'bg-blue-100 text-blue-700',
            supervisor: 'bg-green-100 text-green-700',
            asesor: 'bg-yellow-100 text-yellow-700',
            rrhh: 'bg-pink-100 text-pink-700',
            revendedor: 'bg-gray-100 text-gray-700'
        };
        return colors[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            <div>
                {/* Mensaje informativo para supervisores */}
                {isSupervisor && (
                    <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-blue-800">Permisos de Supervisor</p>
                                <p className="text-sm text-blue-700 mt-1">
                                    Puedes ver todo el personal, crear nuevos empleados desde "Nuevo Empleado",
                                    y editar/eliminar solo los empleados de tu equipo ({user.numeroEquipo ? `Equipo ${user.numeroEquipo}` : 'sin equipo asignado'}).
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mensaje informativo sobre el tipo de personal mostrado */}
                {(showOnlyActive || showOnlyInactive) && (
                    <div className="mb-4 p-3 bg-gray-50 border-l-4 border-gray-400 rounded-r-lg">
                        <p className="text-sm text-gray-700">
                            {showOnlyActive && '✅ Mostrando solo personal activo'}
                            {showOnlyInactive && '❌ Mostrando solo personal inactivo'}
                        </p>
                    </div>
                )}

                {/* Filtros */}
                <div className="mb-6 flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar empleado..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={filterEquipo}
                        onChange={(e) => setFilterEquipo(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Todos los equipos</option>
                        {equipos.map(equipo => (
                            <option key={equipo} value={equipo}>{equipo}</option>
                        ))}
                    </select>

                    {/* Solo mostrar filtro activo/inactivo si no se está usando showOnlyActive o showOnlyInactive */}
                    {!showOnlyActive && !showOnlyInactive && (
                        <select
                            value={filterActivo}
                            onChange={(e) => setFilterActivo(e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="todos">Todos</option>
                            <option value="activos">Activos</option>
                            <option value="inactivos">Inactivos</option>
                        </select>
                    )}
                </div>

                {/* Lista de empleados agrupados por equipo */}
                {Object.keys(empleadosPorEquipo).length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        No se encontraron empleados
                    </div>
                ) : (
                    Object.keys(empleadosPorEquipo).sort().map(equipo => (
                        <div key={equipo} className="mb-8">
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                <Filter size={20} />
                                Equipo {equipo}
                            </h3>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Entrevista</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">F. Ingreso</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cargo</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Contrato</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Activo</th>
                                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {empleadosPorEquipo[equipo].map((empleado) => (
                                            <tr key={empleado._id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-medium text-gray-900">{empleado.nombreCompleto}</div>
                                                        <div className="text-sm text-gray-500">{empleado.userId?.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {empleado.fechaEntrevista
                                                        ? new Date(empleado.fechaEntrevista).toLocaleDateString('es-AR')
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {empleado.fechaIngreso
                                                        ? new Date(empleado.fechaIngreso).toLocaleDateString('es-AR')
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(empleado.cargo)}`}>
                                                        {empleado.cargo}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {empleado.telefonoPersonal || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {empleado.firmoContrato ? (
                                                        <CheckCircle className="inline text-green-500" size={20} />
                                                    ) : (
                                                        <XCircle className="inline text-red-500" size={20} />
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {empleado.activo ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            Sí
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                            No
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEdit(empleado)}
                                                            disabled={!canEditDeleteEmployee(empleado)}
                                                            className={`p-1 ${canEditDeleteEmployee(empleado)
                                                                ? 'text-blue-600 hover:text-blue-800 cursor-pointer'
                                                                : 'text-gray-400 cursor-not-allowed opacity-50'
                                                                }`}
                                                            title={canEditDeleteEmployee(empleado) ? "Editar" : "Sin permisos (solo tu equipo)"}
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                        {empleado.activo && (
                                                            <button
                                                                onClick={() => handleDelete(empleado._id)}
                                                                disabled={!canEditDeleteEmployee(empleado)}
                                                                className={`p-1 ${canEditDeleteEmployee(empleado)
                                                                    ? 'text-red-600 hover:text-red-800 cursor-pointer'
                                                                    : 'text-gray-400 cursor-not-allowed opacity-50'
                                                                    }`}
                                                                title={canEditDeleteEmployee(empleado) ? "Desactivar" : "Sin permisos (solo tu equipo)"}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de edición */}
            {showEditModal && selectedEmpleado && (
                <EmpleadoEditModal
                    empleado={selectedEmpleado}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedEmpleado(null);
                    }}
                    onSuccess={handleUpdateSuccess}
                />
            )}
        </>
    );
}
