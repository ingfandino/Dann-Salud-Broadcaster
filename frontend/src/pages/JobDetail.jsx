// frontend/src/pages/JobDetail.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJobById, jobAction, exportJobResultsExcel } from "../services/jobService";
import { toast } from "react-toastify";

export default function JobDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJob();
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
            await jobAction(id, action);
            toast.success(`Acción '${action}' ejecutada`);
            loadJob();
        } catch {
            toast.error(`Error al ejecutar acción '${action}'`);
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

            {/* Info principal */}
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-semibold mb-2">{job.name}</h2>
                <p><strong>Estado:</strong> {job.status}</p>
                <p><strong>Programado para:</strong> {new Date(job.scheduledFor).toLocaleString()}</p>
                <p><strong>Progreso:</strong> {job.progress}%</p>
                <p>
                    <strong>Total:</strong> {job.stats?.total} | ✅ {job.stats?.sent} | ❌ {job.stats?.failed} | ⏳ {job.stats?.pending}
                </p>

                <div className="mt-4 flex gap-2">
                    <button onClick={() => handleAction("pause")} className="px-3 py-2 bg-yellow-500 text-white rounded">
                        Pausar
                    </button>
                    <button onClick={() => handleAction("resume")} className="px-3 py-2 bg-green-600 text-white rounded">
                        Reanudar
                    </button>
                    <button onClick={() => handleAction("cancel")} className="px-3 py-2 bg-red-600 text-white rounded">
                        Cancelar
                    </button>
                    <button onClick={handleExport} className="px-3 py-2 bg-blue-600 text-white rounded">
                        Exportar Excel
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