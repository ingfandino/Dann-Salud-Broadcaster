// frontend/src/components/LogsPanel.jsx

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";
import socket from "../services/socket";
import logger from "../utils/logger";

export default function LogsPanel() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    // filtros
    const [tipo, setTipo] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [limit, setLimit] = useState(50);

    // expandir metadata por log
    const [expanded, setExpanded] = useState({});

    // 🔹 Cargar logs con filtros (HTTP)
    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {};
            if (tipo) params.tipo = tipo;
            if (from) params.from = from;
            if (to) params.to = to;
            if (limit) params.limit = limit;

            const res = await apiClient.get("/logs", { params });
            setLogs(res.data);
        } catch (err) {
            logger.error("❌ Error cargando logs:", err);
            toast.error("No se pudieron cargar los logs");
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    // 🔹 Exportar logs
    const handleExport = async (format) => {
        try {
            const res = await apiClient.get(`/logs/export/${format}`, {
                responseType: "blob",
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `logs.${format === "excel" ? "xlsx" : format}`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            logger.error("❌ Error exportando logs:", err);
            toast.error("No se pudo exportar");
        }
    };

    // 🔹 Inicializar logs + suscripción en tiempo real
    useEffect(() => {
        fetchLogs();

        // 👇 escuchar logs nuevos en vivo
        const handleNewLog = (newLog) => {
            setLogs((prev) => {
                // prepend para ver lo más nuevo arriba
                const updated = [newLog, ...prev];
                // respetar el límite
                return updated.slice(0, limit);
            });
        };

        socket.on("logs:new", handleNewLog);

        return () => {
            socket.off("logs:new", handleNewLog);
        };
    }, [limit]); // 👈 si cambia el límite, resuscribe

    return (
        <div className="bg-white p-6 rounded shadow space-y-4">
            <h2 className="text-lg font-bold">📑 Panel de Logs</h2>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="block text-sm">Tipo</label>
                    <select
                        className="border rounded p-2"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="info">Info</option>
                        <option value="warning">Warning</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm">Desde</label>
                    <input
                        type="date"
                        className="border rounded p-2"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm">Hasta</label>
                    <input
                        type="date"
                        className="border rounded p-2"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm">Límite</label>
                    <input
                        type="number"
                        className="border rounded p-2 w-24"
                        value={limit}
                        min={1}
                        onChange={(e) => setLimit(e.target.value)}
                    />
                </div>
                <button
                    onClick={fetchLogs}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Filtrar
                </button>
            </div>

            {/* Exportaciones (solo admin) */}
            {user?.role === "admin" && (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport("json")}
                        className="bg-gray-700 text-white px-3 py-1 rounded"
                    >
                        Export JSON
                    </button>
                    <button
                        onClick={() => handleExport("csv")}
                        className="bg-gray-700 text-white px-3 py-1 rounded"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => handleExport("excel")}
                        className="bg-gray-700 text-white px-3 py-1 rounded"
                    >
                        Export Excel
                    </button>
                </div>
            )}

            {/* Tabla de logs */}
            {loading ? (
                <p>Cargando...</p>
            ) : (
                <table className="w-full border border-gray-200 text-sm">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 border">Fecha</th>
                            <th className="p-2 border">Tipo</th>
                            <th className="p-2 border">Mensaje</th>
                            <th className="p-2 border">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center p-3 text-gray-500">
                                    No hay logs disponibles
                                </td>
                            </tr>
                        )}
                        {logs.map((log) => (
                            <React.Fragment key={log._id}>
                                <tr>
                                    <td className="p-2 border">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </td>
                                    <td className="p-2 border">{log.tipo}</td>
                                    <td className="p-2 border">{log.mensaje}</td>
                                    <td className="p-2 border text-center">
                                        <button
                                            onClick={() => toggleExpand(log._id)}
                                            className="text-blue-600 underline"
                                        >
                                            {expanded[log._id] ? "Ocultar" : "Ver detalle"}
                                        </button>
                                    </td>
                                </tr>
                                {expanded[log._id] && (
                                    <tr>
                                        <td colSpan={4} className="bg-gray-50 p-3 border">
                                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}