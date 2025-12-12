// frontend/src/pages/JobDetail.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJobById, jobAction, exportJobResultsExcel } from "../services/jobService";
import { toast } from "react-toastify";
import socket, { subscribeToJobProgress } from "../services/socket";
import logger from "../utils/logger";

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJob();
    }, [id]);

    // ✅ Suscripción a actualizaciones en tiempo real del job
    useEffect(() => {
        if (!id) return;

        if (!socket.connected) {
            socket.connect();
        }

        // Suscribirse a progreso del job específico
        const cleanup = subscribeToJobProgress(id, (updatedJob) => {
            logger.info(`📊 Job ${id} actualizado vía socket:`, updatedJob);
            setJob((prevJob) => {
                if (!prevJob) return updatedJob;
                // Mantener campos poblados que no vienen en la actualización
                return {
                    ...prevJob,
                    ...updatedJob,
                    // Preservar contacts si no viene en la actualización
                    contacts: updatedJob.contacts || prevJob.contacts
                };
            });
        });

        return () => {
            cleanup();
        };
    }, [id]);

    async function loadJob() {
        try {
            const data = await getJobById(id);
            setJob(data);
        } catch {
            toast.error("Error cargando detalle del job");
        } finally {
            setLoading(false);
        }
    }

    const handleAction = async (action) => {
        try {
            // Confirmación para cancelar
            if (action === "cancel") {
                const confirmed = window.confirm(
                    "¿Seguro que deseas eliminar esta campaña? Esta acción no se puede deshacer."
                );
                if (!confirmed) return;
            }

            await jobAction(id, action);
            
            const actionLabels = {
                pause: "pausada",
                resume: "reanudada",
                cancel: "cancelada"
            };
            
            toast.success(`✅ Campaña ${actionLabels[action] || action}`);
            
            // Recargar job para obtener estado actualizado
            await loadJob();
        } catch (err) {
            logger.error(`Error ejecutando acción '${action}':`, err);
            toast.error(`❌ Error al ${action === "pause" ? "pausar" : action === "resume" ? "reanudar" : "cancelar"} la campaña`);
        }
    };

    const handleExport = async () => {
        try {
            const blob = await exportJobResultsExcel(id);
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `job_${id}_resultados.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Exportación completada ✅");
        } catch {
            toast.error("Error exportando resultados");
        }
    };

    if (loading) return <p className="p-6">Cargando...</p>;
    if (!job) return <p className="p-6">Job no encontrado</p>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">📋 Detalle de campaña</h1>
                <button
                    onClick={() => navigate(-1)}
                    className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300"
                >
                    ← Volver
                </button>
            </div>

            {/* Info principal con métricas mejoradas */}
            <div className="bg-white p-6 rounded shadow space-y-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-2xl font-bold mb-1">{job.name}</h2>
                        <p className="text-sm text-gray-600">
                            Programado: {new Date(job.scheduledFor).toLocaleString('es-AR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                    {(() => {
                        const statusColors = {
                            pendiente: "bg-blue-100 text-blue-800 border-blue-300",
                            "en_progreso": "bg-green-100 text-green-800 border-green-300",
                            pausado: "bg-yellow-100 text-yellow-800 border-yellow-300",
                            completado: "bg-emerald-100 text-emerald-800 border-emerald-300",
                            cancelado: "bg-red-100 text-red-800 border-red-300",
                            fallido: "bg-red-100 text-red-800 border-red-300"
                        };
                        const statusColor = statusColors[job.status] || "bg-gray-100 text-gray-800 border-gray-300";
                        return (
                            <span className={`px-4 py-2 rounded-lg text-sm font-bold border-2 ${statusColor}`}>
                                {job.status.toUpperCase()}
                            </span>
                        );
                    })()}
                </div>

                {/* Barra de progreso */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-700">Progreso general</span>
                        <span className="font-bold text-blue-600">{job.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.min(job.progress || 0, 100)}%` }}
                        >
                            {(job.progress || 0) > 10 && (
                                <span className="text-xs text-white font-bold">{Math.round(job.progress || 0)}%</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Métricas detalladas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border">
                        <div className="text-2xl font-bold text-gray-800">{job.stats?.total || 0}</div>
                        <div className="text-xs text-gray-600 font-medium">📊 Total</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-700">{job.stats?.sent || 0}</div>
                        <div className="text-xs text-green-600 font-medium">✅ Enviados</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <div className="text-2xl font-bold text-red-700">{job.stats?.failed || 0}</div>
                        <div className="text-xs text-red-600 font-medium">❌ Fallidos</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-700">{job.stats?.pending || 0}</div>
                        <div className="text-xs text-yellow-600 font-medium">⏳ Pendientes</div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <button
                        onClick={() => handleAction("pause")}
                        disabled={job.status === "pausado" || job.status === "completado" || job.status === "cancelado"}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                    >
                        ⏸️ Pausar
                    </button>
                    <button
                        onClick={() => handleAction("resume")}
                        disabled={job.status !== "pausado"}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                    >
                        ▶️ Reanudar
                    </button>
                    <button
                        onClick={() => handleAction("cancel")}
                        disabled={job.status === "completado" || job.status === "cancelado"}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                    >
                        🗑️ Cancelar
                    </button>
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
                    >
                        📥 Exportar Excel
                    </button>
                </div>
            </div>

            {/* Lista de contactos */}
            <div className="bg-white p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-2">📞 Contactos</h3>
                <table className="w-full border text-left">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 border">Nombre</th>
                            <th className="p-2 border">Teléfono</th>
                        </tr>
                    </thead>
                    <tbody>
                        {job.contacts?.map((c) => (
                            <tr key={c._id}>
                                <td className="p-2 border">{c.nombre || "-"}</td>
                                <td className="p-2 border">{c.telefono || "-"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}