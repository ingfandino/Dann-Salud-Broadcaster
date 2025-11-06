// frontend/src/pages/Reports.jsx

import React, { useState, useEffect, useMemo } from "react";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import logger from "../utils/logger";

// ✅ Helpers
function formatDateTime(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("es-AR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function toYMD(dateStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
}

export default function Reports() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [campaigns, setCampaigns] = useState([]);
    const [filters, setFilters] = useState({
        startDate: "",
        endDate: "",
        status: "",
        asesor: "",
        q: "",
    });
    const [page, setPage] = useState(1);
    const [perPage] = useState(15);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            // ✅ Obtener TODOS los jobs (sin filtro, respeta jerarquía en backend)
            const res = await apiClient.get("/send-jobs");
            setCampaigns(res.data || []);
            setPage(1);
        } catch (err) {
            logger.error("❌ Error cargando campañas:", err);
            toast.error("Error cargando campañas");
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    // ✅ Filtrado en memoria por campaña
    const filtered = useMemo(() => {
        const { startDate, endDate, status, asesor, q } = filters;
        let out = [...campaigns];

        if (startDate) {
            out = out.filter((c) => toYMD(c.scheduledFor || c.createdAt) >= startDate);
        }
        if (endDate) {
            out = out.filter((c) => toYMD(c.scheduledFor || c.createdAt) <= endDate);
        }
        if (status) {
            out = out.filter((c) => (c.status || "").toLowerCase() === status.toLowerCase());
        }
        if (asesor) {
            out = out.filter((c) => 
                (c.createdBy?.nombre || "").toLowerCase().includes(asesor.toLowerCase())
            );
        }
        if (q) {
            const qq = q.toLowerCase();
            out = out.filter((c) =>
                (c.name || "").toLowerCase().includes(qq) ||
                (c.createdBy?.nombre || "").toLowerCase().includes(qq)
            );
        }
        return out.sort((a, b) => 
            new Date(b.scheduledFor || b.createdAt) - new Date(a.scheduledFor || a.createdAt)
        );
    }, [campaigns, filters]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const current = filtered.slice((page - 1) * perPage, page * perPage);

    // ✅ Exportar Excel detallado de una campaña específica
    const handleExportCampaign = async (jobId) => {
        try {
            const res = await apiClient.get(`/send-jobs/${jobId}/export`, {
                responseType: "blob"
            });
            
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `campaña_${jobId}_detalle.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("✅ Excel descargado");
        } catch (err) {
            logger.error("Error descargando Excel:", err);
            toast.error("Error descargando Excel");
        }
    };
    
    // ✅ MEJORA 3: Exportar reporte de auto-respuestas
    const handleExportAutoResponses = async (jobId) => {
        try {
            const res = await apiClient.get(`/send-jobs/${jobId}/autoresponse-report`, {
                responseType: "blob"
            });
            
            const blob = new Blob([res.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `autorespuestas_${jobId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("✅ Reporte de auto-respuestas descargado");
        } catch (err) {
            if (err.response?.status === 404) {
                toast.warning("⚠️ No hay auto-respuestas registradas para esta campaña");
            } else {
                logger.error("Error descargando reporte de auto-respuestas:", err);
                toast.error("Error descargando reporte");
            }
        }
    };

    // ✅ Mapeo de estados a colores
    const statusColors = {
        pendiente: "bg-blue-100 text-blue-800",
        ejecutando: "bg-green-100 text-green-800",
        pausado: "bg-yellow-100 text-yellow-800",
        completado: "bg-emerald-100 text-emerald-800",
        cancelado: "bg-red-100 text-red-800",
        fallido: "bg-red-100 text-red-800"
    };

    const statusLabels = {
        pendiente: "Pendiente",
        ejecutando: "En ejecución",
        pausado: "Pausada",
        completado: "Completada",
        cancelado: "Cancelada",
        fallido: "Fallida"
    };

    return (
        <motion.div
            className="p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <div className="flex items-center justify-between mb-4">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <h1 className="text-2xl font-bold">📊 Reporte de Campañas</h1>
                    <p className="text-sm text-gray-600">Historial completo de campañas de mensajería</p>
                </motion.div>

                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <button
                        onClick={() => navigate("/")}
                        className="px-3 py-2 rounded text-white bg-red-500 hover:bg-red-600"
                    >
                        ← Volver al Menú
                    </button>
                </motion.div>
            </div>

            {/* Filtros */}
            <motion.div
                className="bg-white p-4 rounded shadow mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
            >
                <h2 className="font-semibold mb-3">🔍 Filtros</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <input 
                        type="date" 
                        name="startDate" 
                        value={filters.startDate} 
                        onChange={handleChange}
                        placeholder="Desde"
                        className="border p-2 rounded"
                    />
                    <input 
                        type="date" 
                        name="endDate" 
                        value={filters.endDate} 
                        onChange={handleChange}
                        placeholder="Hasta"
                        className="border p-2 rounded"
                    />
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleChange}
                        className="border p-2 rounded"
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="ejecutando">En ejecución</option>
                        <option value="pausado">Pausada</option>
                        <option value="completado">Completada</option>
                        <option value="cancelado">Cancelada</option>
                        <option value="fallido">Fallida</option>
                    </select>
                    <input 
                        type="text" 
                        name="asesor" 
                        placeholder="Buscar asesor" 
                        value={filters.asesor}
                        onChange={handleChange} 
                        className="border p-2 rounded"
                    />
                    <input 
                        type="text" 
                        name="q" 
                        placeholder="Buscar campaña..." 
                        value={filters.q}
                        onChange={handleChange} 
                        className="border p-2 rounded lg:col-span-1"
                    />
                </div>
                <div className="mt-3 flex gap-2">
                    <button 
                        onClick={fetchCampaigns} 
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        🔄 Actualizar
                    </button>
                    <button 
                        onClick={() => { 
                            setFilters({ startDate: "", endDate: "", status: "", asesor: "", q: "" }); 
                            setPage(1); 
                        }}
                        className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </motion.div>

            {/* Tabla de Campañas */}
            <motion.div
                className="bg-white rounded shadow overflow-x-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
            >
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        Cargando campañas...
                    </div>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b">
                                <th className="p-3 text-left text-sm font-semibold">Fecha/Hora</th>
                                <th className="p-3 text-left text-sm font-semibold">Campaña</th>
                                <th className="p-3 text-left text-sm font-semibold">Asesor</th>
                                <th className="p-3 text-left text-sm font-semibold">Contactos</th>
                                <th className="p-3 text-left text-sm font-semibold">Enviados</th>
                                <th className="p-3 text-left text-sm font-semibold">Fallidos</th>
                                <th className="p-3 text-left text-sm font-semibold">Respuestas</th>
                                <th className="p-3 text-left text-sm font-semibold">Estado</th>
                                <th className="p-3 text-left text-sm font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {current.length > 0 ? (
                                current.map((campaign) => {
                                    const stats = campaign.stats || { total: 0, sent: 0, failed: 0 };
                                    const statusColor = statusColors[campaign.status] || "bg-gray-100 text-gray-800";
                                    const statusLabel = statusLabels[campaign.status] || campaign.status;
                                    
                                    return (
                                        <tr key={campaign._id} className="border-b hover:bg-gray-50">
                                            <td className="p-3 text-sm">
                                                {formatDateTime(campaign.scheduledFor || campaign.createdAt)}
                                            </td>
                                            <td className="p-3">
                                                <div className="font-medium text-sm">{campaign.name}</div>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div>{campaign.createdBy?.nombre || "N/A"}</div>
                                                {campaign.createdBy?.numeroEquipo && (
                                                    <div className="text-xs text-gray-500">
                                                        Equipo {campaign.createdBy.numeroEquipo}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-3 text-sm text-center font-semibold">
                                                {stats.total}
                                            </td>
                                            <td className="p-3 text-sm text-center">
                                                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                                                    ✅ {stats.sent}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-center">
                                                <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
                                                    ❌ {stats.failed}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm text-center">
                                                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                                    💬 {campaign.repliesCount || 0}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${statusColor}`}>
                                                    {statusLabel}
                                                </span>
                                            </td>
                                            <td className="p-3 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleExportCampaign(campaign._id)}
                                                        className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
                                                        title="Descargar Excel detallado"
                                                    >
                                                        📥 Excel
                                                    </button>
                                                    <button
                                                        onClick={() => handleExportAutoResponses(campaign._id)}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1"
                                                        title="Reporte de auto-respuestas"
                                                    >
                                                        🤖 Auto-resp.
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="9" className="p-8 text-center text-gray-500">
                                        {loading ? "Cargando..." : "No hay campañas para mostrar"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </motion.div>

            {/* Paginación */}
            <motion.div
                className="mt-4 flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
            >
                <div className="text-sm text-gray-600">
                    Mostrando <span className="font-semibold">{Math.min((page - 1) * perPage + 1, total)}</span> - <span className="font-semibold">{Math.min(page * perPage, total)}</span> de <span className="font-semibold">{total}</span> campañas
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        disabled={page <= 1} 
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ← Anterior
                    </button>
                    <span className="px-3 text-sm">
                        Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
                    </span>
                    <button 
                        disabled={page >= totalPages} 
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Siguiente →
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}