import React, { useEffect, useState } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";

export default function RecoveryList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        afiliado: "",
        cuil: "",
        obraVendida: "",
        estado: "",
        origen: "",
    });
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    async function load() {
        try {
            setLoading(true);
            const { data } = await apiClient.get("/recovery");
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("No se pudo cargar Recuperación y reventas");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    const handleFilterChange = (field, value) => setFilters(prev => ({ ...prev, [field]: value }));
    const clearFilters = () => {
        setFilters({ afiliado: "", cuil: "", obraVendida: "", estado: "", origen: "" });
        setDateFrom("");
        setDateTo("");
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
            if (filters.origen) {
                const originLabel = a.isRecovery ? "Manual" : "Auto (>24h)";
                if (originLabel !== filters.origen) return false;
            }
            return true;
        });
    };

    const filtered = applyFilters(items);

    return (
        <div className="p-6 bg-gradient-to-b from-blue-50 to-purple-50 min-h-screen">
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
                        <option value="Medicenter">Medicenter</option>
                    </select>
                    <select
                        value={filters.estado}
                        onChange={(e) => handleFilterChange("estado", e.target.value)}
                        className="flex-1 min-w-[150px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Estado</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="Contactado">Contactado</option>
                        <option value="Cerrado">Cerrado</option>
                    </select>
                    <select
                        value={filters.origen}
                        onChange={(e) => handleFilterChange("origen", e.target.value)}
                        className="flex-1 min-w-[150px] p-2 border border-gray-200 rounded-lg text-sm"
                    >
                        <option value="">Origen</option>
                        <option value="Manual">Manual</option>
                        <option value="Auto (>24h)">Auto (&gt;24h)</option>
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

            <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-3 overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-blue-100 text-gray-700 font-semibold text-center">
                            <th className="px-3 py-2">Fecha</th>
                            <th className="px-3 py-2">Fecha inicio de venta</th>
                            <th className="px-3 py-2">Afiliado</th>
                            <th className="px-3 py-2">CUIL</th>
                            <th className="px-3 py-2">Teléfono</th>
                            <th className="px-3 py-2">Obra Social</th>
                            <th className="px-3 py-2">Asesor original</th>
                            <th className="px-3 py-2">Grupo original</th>
                            <th className="px-3 py-2">Estado</th>
                            <th className="px-3 py-2">Origen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" className="text-center text-gray-500 py-4">Cargando datos...</td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="text-center text-gray-500 py-4 italic">No hay registros que coincidan con los filtros.</td>
                            </tr>
                        ) : (
                            filtered.map((a) => (
                                <tr key={a._id} className="border-b hover:bg-blue-50 transition text-center">
                                    <td className="px-3 py-2 text-gray-600">{new Date(a.createdAt || a.statusUpdatedAt).toLocaleString()}</td>
                                    <td className="px-3 py-2 text-gray-600">{a.scheduledAt ? new Date(a.scheduledAt).toLocaleDateString() : '-'}</td>
                                    <td className="px-3 py-2">{a.nombre}</td>
                                    <td className="px-3 py-2">{a.cuil}</td>
                                    <td className="px-3 py-2">{a.telefono}</td>
                                    <td className="px-3 py-2">{a.obraSocialVendida}</td>
                                    <td className="px-3 py-2">{a.asesor ? (a.asesor.email || a.asesor.nombre || a.asesor.name) : '-'}</td>
                                    <td className="px-3 py-2">{a.groupId ? (a.groupId.nombre || a.groupId.name) : '-'}</td>
                                    <td className="px-3 py-2">{a.status}</td>
                                    <td className="px-3 py-2">{a.isRecovery ? 'Manual' : 'Auto (>24h)'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

