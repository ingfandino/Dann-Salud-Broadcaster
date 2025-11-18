// frontend/src/pages/LiquidacionList.jsx

import React, { useEffect, useState, useMemo } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

export default function LiquidacionList() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // ✅ Estados para filtros
    const [filters, setFilters] = useState({
        afiliado: "", // ✅ Nuevo filtro por nombre
        cuil: "", // ✅ Nuevo filtro por CUIL
        asesor: "",
        supervisor: "",
        dateFrom: "",
        dateTo: "",
        obraSocialVendida: "",
        auditor: "",
        administrador: "",
        estado: "" // ✅ Nuevo filtro por estado
    });
    
    // ✅ Estados para paginación semanal
    const [currentWeek, setCurrentWeek] = useState(1); // Página de semana actual
    
    // ✅ Listas para dropdowns de filtros
    const [asesores, setAsesores] = useState([]);
    const [supervisores, setSupervisores] = useState([]);
    const [auditores, setAuditores] = useState([]);
    const [administradores, setAdministradores] = useState([]);

    async function load() {
        try {
            setLoading(true);
            const { data } = await apiClient.get("/liquidacion");
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("No se pudo cargar Liquidación");
        } finally {
            setLoading(false);
        }
    }
    
    // ✅ Cargar listas para filtros
    async function loadFilterOptions() {
        try {
            const { data } = await apiClient.get("/users");
            const usuarios = Array.isArray(data) ? data : [];
            
            setAsesores(usuarios.filter(u => u.role === 'asesor').sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')));
            setSupervisores(usuarios.filter(u => u.role === 'supervisor').sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')));
            setAuditores(usuarios.filter(u => u.role === 'auditor').sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')));
            setAdministradores(usuarios.filter(u => u.role === 'admin').sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '')));
        } catch (e) {
            console.error('Error cargando opciones de filtros:', e);
        }
    }

    useEffect(() => {
        load();
        loadFilterOptions();
    }, []);

    const toTitleCase = (str) => {
        if (!str) return '';
        return str
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };
    
    // ✅ Calcular inicio de semana laboral (viernes 00:00)
    // La semana laboral va de viernes 00:00:00 a jueves 23:01:00
    const getWeekStart = (date) => {
        const d = new Date(date);
        const dayOfWeek = d.getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
        
        // Calcular días hasta el viernes más cercano (hacia atrás)
        let daysToSubtract;
        if (dayOfWeek === 5) { // Viernes
            daysToSubtract = 0; // Ya es viernes
        } else if (dayOfWeek === 6) { // Sábado
            daysToSubtract = 1; // Retroceder 1 día
        } else if (dayOfWeek === 0) { // Domingo
            daysToSubtract = 2; // Retroceder 2 días
        } else { // Lunes (1), Martes (2), Miércoles (3), Jueves (4)
            daysToSubtract = dayOfWeek + 2; // Retroceder al viernes anterior
        }
        
        d.setDate(d.getDate() - daysToSubtract);
        d.setHours(0, 0, 0, 0); // Viernes a las 00:00:00
        return d;
    };
    
    // ✅ Calcular fin de semana laboral (jueves siguiente 23:01)
    const getWeekEnd = (weekStart) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + 6); // 6 días después = Jueves
        d.setHours(23, 1, 0, 0); // 23:01:00
        return d;
    };
    
    // ✅ Agrupar items por semana laboral
    const itemsByWeek = useMemo(() => {
        const weeks = {};
        
        items.forEach(item => {
            const itemDate = new Date(item.scheduledAt || item.createdAt);
            const weekStart = getWeekStart(itemDate);
            const weekKey = weekStart.toISOString().split('T')[0];
            
            // Agrupar todos los items por semana laboral (sin límite de mes)
            if (!weeks[weekKey]) {
                weeks[weekKey] = [];
            }
            weeks[weekKey].push(item);
        });
        
        // Ordenar semanas de más reciente a más antigua
        const sortedWeeks = Object.keys(weeks).sort((a, b) => new Date(b) - new Date(a));
        return sortedWeeks.map(key => ({
            weekStart: key,
            items: weeks[key]
        }));
    }, [items]);
    
    // ✅ Items de la semana actual (página actual)
    // Si hay filtros de fecha activos, usar todos los items del mes
    const currentWeekItems = useMemo(() => {
        // Si hay filtros de fecha, usar todos los items sin filtrar por semana
        if (filters.dateFrom || filters.dateTo) {
            return items;
        }
        
        // Si no hay filtros de fecha, usar paginación semanal normal
        if (itemsByWeek.length === 0) return [];
        const weekIndex = currentWeek - 1;
        if (weekIndex >= itemsByWeek.length) return [];
        return itemsByWeek[weekIndex].items;
    }, [itemsByWeek, currentWeek, filters.dateFrom, filters.dateTo, items]);
    
    // ✅ Aplicar filtros
    const filteredItems = useMemo(() => {
        let result = [...currentWeekItems];
        
        if (filters.afiliado) {
            result = result.filter(item => 
                (item.nombre || "").toLowerCase().includes(filters.afiliado.toLowerCase())
            );
        }
        if (filters.cuil) {
            result = result.filter(item => 
                (item.cuil || "").includes(filters.cuil)
            );
        }
        if (filters.asesor) {
            result = result.filter(item => item.asesor?._id === filters.asesor);
        }
        if (filters.supervisor) {
            result = result.filter(item => item.asesor?.supervisor?._id === filters.supervisor);
        }
        if (filters.dateFrom) {
            result = result.filter(item => {
                const itemDate = new Date(item.scheduledAt).toISOString().split('T')[0];
                return itemDate >= filters.dateFrom;
            });
        }
        if (filters.dateTo) {
            result = result.filter(item => {
                const itemDate = new Date(item.scheduledAt).toISOString().split('T')[0];
                return itemDate <= filters.dateTo;
            });
        }
        if (filters.obraSocialVendida) {
            result = result.filter(item => item.obraSocialVendida === filters.obraSocialVendida);
        }
        if (filters.auditor) {
            result = result.filter(item => item.auditor?._id === filters.auditor);
        }
        if (filters.administrador) {
            result = result.filter(item => item.administrador?._id === filters.administrador);
        }
        if (filters.estado) {
            result = result.filter(item => item.status === filters.estado);
        }
        
        // ✅ Ordenar cronológicamente: más recientes primero
        result.sort((a, b) => {
            const dateA = new Date(a.scheduledAt || a.createdAt);
            const dateB = new Date(b.scheduledAt || b.createdAt);
            return dateB - dateA; // Descendente (más reciente primero)
        });
        
        return result;
    }, [currentWeekItems, filters]);
    
    const handleClearFilters = () => {
        setFilters({
            asesor: "",
            supervisor: "",
            dateFrom: "",
            dateTo: "",
            obraSocialVendida: "",
            auditor: "",
            administrador: "",
            estado: ""
        });
    };

    const handleExportXLSX = () => {
        if (!items || items.length === 0) {
            toast.warning("No hay datos para exportar");
            return;
        }

        const data = items.map((audit) => ({
            Fecha: audit.scheduledAt ? new Date(audit.scheduledAt).toLocaleDateString("es-AR") : "-",
            Afiliado: audit.nombre || "-",
            CUIL: audit.cuil || "-",
            "Obra Social Vendida": audit.obraSocialVendida || "-",
            Asesor: audit.asesor?.nombre || audit.asesor?.name || audit.asesor?.email || "-",
            Supervisor: audit.asesor?.supervisor?.nombre || audit.asesor?.supervisor?.name || audit.asesor?.supervisor?.email || "-",
            Auditor: audit.auditor?.nombre || audit.auditor?.name || audit.auditor?.email || "-",
            Administrador: audit.administrador?.nombre || audit.administrador?.name || audit.administrador?.email || "-",
            "¿Recuperada?": audit.isRecuperada ? "Sí" : "No",
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Liquidación");
        const today = new Date().toISOString().slice(0, 10);
        const filename = `liquidacion_${today}.xlsx`;
        XLSX.writeFile(wb, filename);

        toast.success("Exportado correctamente");
    };

    const OBRAS_SOCIALES = ["Binimed", "Meplife", "TURF"];

    return (
        <div className="w-full">
            <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">💰 Liquidación (QR Hecho)</h2>
                    <p className="text-sm text-gray-600 mt-1">
                        Semana laboral: Viernes 00:00 hrs a Jueves 23:01 hrs
                    </p>
                </div>
                <button
                    onClick={handleExportXLSX}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                    📄 Exportar
                </button>
            </div>

            {/* Paginación semanal y contador */}
            {(itemsByWeek.length > 0 || filters.dateFrom || filters.dateTo) && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 shadow-sm rounded-xl border border-purple-200 p-4 mb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Navegación de semanas o mensaje de filtro de fecha */}
                        {filters.dateFrom || filters.dateTo ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-700">📅 Filtrado por fecha personalizada</span>
                                <span className="text-xs text-gray-600">
                                    {filters.dateFrom && filters.dateTo 
                                        ? `(${filters.dateFrom} - ${filters.dateTo})`
                                        : filters.dateFrom 
                                        ? `(desde ${filters.dateFrom})`
                                        : `(hasta ${filters.dateTo})`}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700">Semana:</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                                        disabled={currentWeek === 1}
                                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        ← Anterior
                                    </button>
                                    <span className="px-4 py-1 bg-indigo-600 text-white rounded-lg font-semibold">
                                        {currentWeek}
                                    </span>
                                    <button
                                        onClick={() => setCurrentWeek(Math.min(itemsByWeek.length, currentWeek + 1))}
                                        disabled={currentWeek === itemsByWeek.length}
                                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        Siguiente →
                                    </button>
                                </div>
                                <span className="text-xs text-gray-600">
                                    (de {itemsByWeek.length})
                                </span>
                            </div>
                        )}
                        
                        {/* Contador de QR Hechos, Cargada y Aprobada */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700">
                                {filters.dateFrom || filters.dateTo ? 'Total filtrado:' : 'Total esta semana:'}
                            </span>
                            <span className="px-3 py-1 bg-green-600 text-white rounded-lg font-bold">
                                {filteredItems.filter(item => item.status === 'QR hecho').length} QR Hechos
                            </span>
                            <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-bold">
                                {filteredItems.filter(item => item.status === 'Cargada').length} Cargada
                            </span>
                            <span className="px-3 py-1 bg-teal-600 text-white rounded-lg font-bold">
                                {filteredItems.filter(item => item.status === 'Aprobada').length} Aprobada
                            </span>
                            <span className="px-3 py-1 bg-gray-700 text-white rounded-lg font-bold">
                                Total: {filteredItems.filter(item => ['QR hecho', 'Cargada', 'Aprobada'].includes(item.status)).length}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Resumen de QR Hechos por Supervisor */}
            {(() => {
                // Filtrar solo items con estado "QR hecho"
                const qrHechosItems = filteredItems.filter(item => item.status === 'QR hecho');
                
                // Agrupar por supervisor
                const supervisorCounts = {};
                qrHechosItems.forEach(item => {
                    const supervisor = item.asesor?.supervisor;
                    const nombreSupervisor = supervisor?.nombre || supervisor?.name || supervisor?.email || 'Sin supervisor';
                    
                    if (!supervisorCounts[nombreSupervisor]) {
                        supervisorCounts[nombreSupervisor] = 0;
                    }
                    supervisorCounts[nombreSupervisor]++;
                });
                
                // Convertir a array y ordenar por cantidad (descendente)
                const supervisoresOrdenados = Object.entries(supervisorCounts)
                    .sort(([, countA], [, countB]) => countB - countA);
                
                const totalQRHechos = qrHechosItems.length;
                
                if (totalQRHechos === 0) return null;
                
                return (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm rounded-xl border border-blue-200 p-3 mb-4">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-bold text-gray-800">
                                Total QR Hechos: <span className="text-blue-600">{totalQRHechos}</span>
                            </span>
                            <span className="text-gray-400">|</span>
                            {supervisoresOrdenados.map(([supervisor, count]) => (
                                <span key={supervisor} className="text-gray-700">
                                    <span className="font-semibold">{toTitleCase(supervisor)}:</span>{' '}
                                    <span className="text-indigo-600">{count}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* Filtros */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">🔍 Filtros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Afiliado */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Afiliado</label>
                        <input 
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={filters.afiliado} 
                            onChange={(e) => setFilters({ ...filters, afiliado: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>

                    {/* CUIL */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">CUIL</label>
                        <input 
                            type="text"
                            placeholder="Buscar por CUIL..."
                            value={filters.cuil} 
                            onChange={(e) => setFilters({ ...filters, cuil: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>

                    {/* Asesor */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Asesor</label>
                        <select 
                            value={filters.asesor} 
                            onChange={(e) => setFilters({ ...filters, asesor: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Todos</option>
                            {asesores.map(a => (
                                <option key={a._id} value={a._id}>{a.nombre || a.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Supervisor */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Supervisor</label>
                        <select 
                            value={filters.supervisor} 
                            onChange={(e) => setFilters({ ...filters, supervisor: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Todos</option>
                            {supervisores.map(s => (
                                <option key={s._id} value={s._id}>{s.nombre || s.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Auditor */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Auditor</label>
                        <select 
                            value={filters.auditor} 
                            onChange={(e) => setFilters({ ...filters, auditor: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Todos</option>
                            {auditores.map(a => (
                                <option key={a._id} value={a._id}>{a.nombre || a.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Administrador */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Administrador</label>
                        <select 
                            value={filters.administrador} 
                            onChange={(e) => setFilters({ ...filters, administrador: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Todos</option>
                            {administradores.map(a => (
                                <option key={a._id} value={a._id}>{a.nombre || a.email}</option>
                            ))}
                        </select>
                    </div>

                    {/* Obra Social Vendida */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Obra Social Vendida</label>
                        <select 
                            value={filters.obraSocialVendida} 
                            onChange={(e) => setFilters({ ...filters, obraSocialVendida: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Todas</option>
                            {OBRAS_SOCIALES.map(os => (
                                <option key={os} value={os}>{os}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fecha Desde */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Desde</label>
                        <input 
                            type="date" 
                            value={filters.dateFrom} 
                            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>

                    {/* Fecha Hasta */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fecha Hasta</label>
                        <input 
                            type="date" 
                            value={filters.dateTo} 
                            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>

                    {/* Estado */}
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                        <select 
                            value={filters.estado} 
                            onChange={(e) => setFilters({ ...filters, estado: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="">Todos</option>
                            <option value="QR hecho">QR hecho</option>
                            <option value="Cargada">Cargada</option>
                            <option value="Aprobada">Aprobada</option>
                        </select>
                    </div>

                    {/* Botón Limpiar */}
                    <div className="flex items-end">
                        <button
                            onClick={handleClearFilters}
                            className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm"
                        >
                            🗑️ Limpiar
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-gray-500 py-8">Cargando datos...</div>
            ) : filteredItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                    {items.length === 0 
                        ? "No hay auditorías en liquidación."
                        : "No hay resultados para los filtros aplicados."}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse bg-white shadow-md rounded-lg">
                        <thead>
                            <tr className="bg-blue-100 text-gray-700 font-semibold">
                                <th className="px-4 py-3 text-left text-sm">Fecha</th>
                                <th className="px-4 py-3 text-left text-sm">Afiliado</th>
                                <th className="px-4 py-3 text-left text-sm">CUIL</th>
                                <th className="px-4 py-3 text-left text-sm">O.S. Vendida</th>
                                <th className="px-4 py-3 text-left text-sm">Asesor</th>
                                <th className="px-4 py-3 text-left text-sm">Supervisor</th>
                                <th className="px-4 py-3 text-left text-sm">Auditor</th>
                                <th className="px-4 py-3 text-left text-sm">Administrador</th>
                                <th className="px-4 py-3 text-center text-sm">¿Recuperada?</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((audit, idx) => (
                                <tr
                                    key={audit._id || idx}
                                    className="border-t border-gray-200 hover:bg-gray-50 transition"
                                >
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {audit.scheduledAt
                                            ? new Date(audit.scheduledAt).toLocaleDateString("es-AR")
                                            : "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                                        {toTitleCase(audit.nombre) || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {audit.cuil || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                            {audit.obraSocialVendida || "-"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {toTitleCase(audit.asesor?.nombre || audit.asesor?.name) || audit.asesor?.email || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {(() => {
                                            const supervisor = audit.asesor?.supervisor;
                                            const nombreSup = supervisor?.nombre || supervisor?.name || supervisor?.email;
                                            if (!nombreSup) return "-";
                                            return (
                                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                                                    {toTitleCase(nombreSup)}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {toTitleCase(audit.auditor?.nombre || audit.auditor?.name) || audit.auditor?.email || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {toTitleCase(audit.administrador?.nombre || audit.administrador?.name) || audit.administrador?.email || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-center">
                                        <span className={`font-semibold ${audit.isRecuperada ? 'text-green-600' : 'text-gray-400'}`}>
                                            {audit.isRecuperada ? 'Sí' : 'No'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
