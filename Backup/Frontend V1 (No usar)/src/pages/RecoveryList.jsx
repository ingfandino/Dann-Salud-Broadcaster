import React, { useEffect, useState } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import { Edit2, Clock, User, Phone } from "lucide-react";
import RecoveryEditModal from "../components/RecoveryEditModal";

export default function RecoveryList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        afiliado: "",
        cuil: "",
        obraVendida: "",
        estado: "",
    });
    const [selectedAudit, setSelectedAudit] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    async function load() {
        try {
            setLoading(true);
            const { data } = await apiClient.get("/recovery");

            // 🔍 DEBUG: Log para verificar datos recibidos
            console.log('🔍 RecoveryList - Total items:', data?.length);
            if (data && data.length > 0) {
                console.log('🔍 Primer item completo:', data[0]);
                console.log('🔍 Asesor:', data[0].asesor);
                console.log('🔍 Asesor numeroEquipo:', data[0].asesor?.numeroEquipo);
                console.log('🔍 Supervisor:', data[0].asesor?.supervisor);
                console.log('🔍 Supervisor numeroEquipo:', data[0].asesor?.supervisor?.numeroEquipo);
            }

            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('❌ Error al cargar recovery:', e);
            toast.error("No se pudo cargar Recuperación y reventas");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
    const clearFilters = () => {
        setFilters({ afiliado: "", cuil: "", obraVendida: "", estado: "" });
        setDateFrom("");
        setDateTo("");
    };

    const handleEdit = (audit) => {
        setSelectedAudit(audit);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedAudit(null);
    };

    const handleSave = (updatedAudit, deletedId) => {
        console.log('🔄 handleSave called:', { updatedAudit, deletedId });

        if (deletedId) {
            // Eliminar item de la lista
            console.log('🗑️ Eliminando item:', deletedId);
            setItems(prev => prev.filter(item => item._id !== deletedId));
        } else if (updatedAudit) {
            // Actualizar item en la lista (mantenerlo visible aunque cambie de estado)
            console.log('✅ Actualizando item en lista local:', updatedAudit._id, 'Nuevo estado:', updatedAudit.status);
            setItems(prev => {
                const updated = prev.map(item =>
                    item._id === updatedAudit._id ? updatedAudit : item
                );
                console.log('📊 Lista después de actualizar:', updated.length, 'items');
                return updated;
            });
        } else {
            console.warn('⚠️ handleSave llamado sin updatedAudit ni deletedId');
        }
    };

    // ✅ Función para obtener color según estado (colores de FollowUp.jsx adaptados para badges)
    const getStatusColor = (status) => {
        const statusColors = {
            "Mensaje enviado": "bg-cyan-100 text-cyan-800 border-cyan-300",
            "En videollamada": "bg-blue-600 text-white border-blue-700",
            "Rechazada": "bg-red-100 text-red-800 border-red-300",
            "Falta documentación": "bg-orange-100 text-orange-800 border-orange-300",
            "Falta clave": "bg-orange-100 text-orange-800 border-orange-300",
            "Reprogramada": "bg-violet-100 text-violet-800 border-violet-300",
            "Reprogramada (falta confirmar hora)": "bg-violet-100 text-violet-800 border-violet-300",
            "Completa": "bg-lime-600 text-white border-lime-700",
            "QR hecho": "bg-green-600 text-white border-green-700",
            "No atendió": "bg-yellow-100 text-yellow-800 border-yellow-300",
            "Tiene dudas": "bg-pink-100 text-pink-800 border-pink-300",
            "Falta clave y documentación": "bg-orange-100 text-orange-800 border-orange-300",
            "No le llegan los mensajes": "bg-purple-100 text-purple-800 border-purple-300",
            "Cortó": "bg-yellow-100 text-yellow-800 border-yellow-300",
            "Autovinculación": "bg-amber-700 text-white border-amber-800",
            "Caída": "bg-red-600 text-white border-red-700",
            "Pendiente": "bg-gray-200 text-gray-800 border-gray-300",
            "Rehacer vídeo": "bg-red-300 text-red-900 border-red-400",
            "Cargada": "bg-indigo-600 text-white border-indigo-700",
            "Contactado": "bg-blue-100 text-blue-800 border-blue-300",
            "Cerrado": "bg-green-100 text-green-800 border-green-300",
            "Rechazo": "bg-red-200 text-red-900 border-red-400",
        };
        return statusColors[status] || "bg-gray-100 text-gray-700 border-gray-300";
    };

    // ✅ Función para calcular tiempo transcurrido
    const getTimeInStatus = (statusUpdatedAt) => {
        if (!statusUpdatedAt) return "-";
        const hours = Math.floor((new Date() - new Date(statusUpdatedAt)) / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d ${hours % 24}h`;
        return `${hours}h`;
    };

    // ✅ Función para formatear nombre
    const toTitleCase = (str) => {
        if (!str) return "-";
        return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const applyFilters = (list) => {
        return (list || []).filter(a => {
            const created = new Date(a.createdAt || a.statusUpdatedAt || 0);
            if (dateFrom) {
                const from = new Date(dateFrom + "T00:00:00");
                if (created < from) return false;
            }
            if (dateTo) {
                const to = new Date(dateTo + "T23:59:59");
                if (created > to) return false;
            }
            if (filters.afiliado && !(a.nombre || "").toLowerCase().includes(filters.afiliado.toLowerCase())) return false;
            if (filters.cuil && !(a.cuil || "").toLowerCase().includes(filters.cuil.toLowerCase())) return false;
            if (filters.obraVendida && (a.obraSocialVendida || "") !== filters.obraVendida) return false;
            if (filters.estado && (a.status || "") !== filters.estado) return false;
            // ✅ Columna Origen eliminada
            return true;
        });
    };

    const filtered = applyFilters(items);

    return (
        <div className="p-2 md:p-4 bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-3">Filtros</h2>
                <div className="flex flex-wrap gap-3">
                    <input
                        type="text"
                        placeholder="Buscar afiliado"
                        value={filters.afiliado}
                        onChange={(e) => handleFilterChange("afiliado", e.target.value)}
                        className="flex-1 min-w-[160px] p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                        type="text"
                        placeholder="Buscar CUIL"
                        value={filters.cuil}
                        onChange={(e) => handleFilterChange("cuil", e.target.value)}
                        className="flex-1 min-w-[140px] p-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <select
                        value={filters.obraVendida}
                        onChange={(e) => handleFilterChange("obraVendida", e.target.value)}
                        className="flex-1 min-w-[180px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Obra social vendida</option>
                        <option value="Binimed">Binimed</option>
                        <option value="Meplife">Meplife</option>
                        <option value="TURF">TURF</option>
                    </select>
                    <select
                        value={filters.estado}
                        onChange={(e) => handleFilterChange("estado", e.target.value)}
                        className="flex-1 min-w-[150px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Estado</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Contactado">Contactado</option>
                        <option value="Cargada">Cargada</option>
                        <option value="Falta clave">Falta clave</option>
                        <option value="Falta documentación">Falta documentación</option>
                        <option value="Falta clave y documentación">Falta clave y documentación</option>
                        <option value="Completa">Completa</option>
                        <option value="QR hecho">QR hecho</option>
                        <option value="Aprobada">Aprobada</option>
                        <option value="Rechazó">Rechazó</option>
                        <option value="Cortó">Cortó</option>
                        <option value="Autovinculación">Autovinculación</option>
                        <option value="Caída">Caída</option>
                    </select>

                    <div className="flex items-center gap-2 min-w-[320px]">
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Desde</label>
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-xs text-gray-500">Hasta</label>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="p-2 border border-gray-200 rounded-lg text-sm" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => { /* filtrado es reactivo */ }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition">Aplicar filtros</button>
                    <button onClick={clearFilters} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm transition">Limpiar</button>
                </div>
            </div>

            <div className="bg-white shadow-lg rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto" style={{ maxWidth: '100%' }}>
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gradient-to-r from-purple-100 to-blue-100">
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tiempo</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Inicio</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Afiliado</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">CUIL</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Teléfono</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">O.Social</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Asesor</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Supervisor</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Grupo</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Admin</th>
                                <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Estado</th>
                                <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase">📝</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="12" className="text-center text-gray-500 py-8">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                                            <span>Cargando datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="text-center text-gray-500 py-8 italic">No hay registros que coincidan con los filtros.</td>
                                </tr>
                            ) : (
                                filtered.map((a, index) => {
                                    const rowColor = index % 2 === 0 ? "bg-white" : "bg-gray-50";
                                    return (
                                        <tr key={a._id} className={`${rowColor} hover:bg-purple-50 transition-colors`}>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-1 text-xs">
                                                    <Clock size={12} className="text-orange-500" />
                                                    <span className="font-semibold text-orange-600">
                                                        {getTimeInStatus(a.statusUpdatedAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-600">
                                                {a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '-'}
                                            </td>
                                            <td className="px-2 py-2 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <User size={12} className="text-blue-500" />
                                                    <span className="font-medium text-gray-900">{toTitleCase(a.nombre)}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-xs font-mono text-gray-700">{a.cuil}</td>
                                            <td className="px-2 py-2 whitespace-nowrap text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Phone size={12} className="text-green-500" />
                                                    <span className="font-mono text-gray-700">{a.telefono}</span>
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                    {a.obraSocialVendida}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-xs">
                                                <span className="font-medium text-gray-900">
                                                    {toTitleCase(a.asesor?.nombre || a.asesor?.name || a.asesor?.email || '-')}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-xs">
                                                <span className="font-medium text-gray-900">
                                                    {toTitleCase(a.asesor?.supervisor?.nombre || a.asesor?.supervisor?.name || '-')}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                                    {a.asesor?.numeroEquipo || '-'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-xs">
                                                <span className="font-medium text-gray-900">
                                                    {toTitleCase(a.administrador?.nombre || a.administrador?.name || '-')}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(a.status)}`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleEdit(a)}
                                                    className="inline-flex items-center justify-center p-2 text-purple-600 hover:text-purple-900 hover:bg-purple-100 rounded-lg transition"
                                                    title="Editar reventa"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Edición */}
            {showModal && selectedAudit && (
                <RecoveryEditModal
                    audit={selectedAudit}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

