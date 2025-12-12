// frontend/src/components/SendPanel.jsx

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import socket from "../services/socket";
import { fetchJobs, createJob, jobAction } from "../services/jobService";
import logger from "../utils/logger";

export default function SendPanel() {
    const [template, setTemplate] = useState("");
    const [scheduledFor, setScheduledFor] = useState("");
    const [jobs, setJobs] = useState([]);

    // 🔹 Cargar lista inicial de jobs
    const loadJobs = async () => {
        try {
            const data = await fetchJobs();
            setJobs(data);
        } catch (err) {
            logger.error("❌ Error cargando jobs:", err.response?.data || err);
            toast.error("No se pudieron cargar los jobs");
        }
    };

    useEffect(() => {
        // pedir la lista inicial
        loadJobs();

        // manejar actualizaciones globales de jobs
        socket.on("jobs:update", (updatedJob) => {
            setJobs((prev) => {
                const exists = prev.some((j) => j._id === updatedJob._id);
                return exists
                    ? prev.map((j) => (j._id === updatedJob._id ? updatedJob : j))
                    : [updatedJob, ...prev];
            });
        });

        return () => {
            socket.off("jobs:update");
        };
    }, []);

    // 🔹 Crear un nuevo job
    const handleCreateJob = async () => {
        if (!template.trim()) {
            toast.warning("Debes escribir un mensaje antes de enviar");
            return;
        }
        try {
            await createJob({
                template,
                contacts: ["mock-contact-id"], // ⚠️ TODO: enlazar con selección real de contactos importados
                scheduledFor,
            });
            toast.success("Job creado correctamente");
            setTemplate("");
            setScheduledFor("");
            loadJobs();
        } catch (err) {
            logger.error("❌ Error creando job:", err.response?.data || err);
            toast.error("No se pudo crear el job");
        }
    };

    // 🔹 Acciones sobre un job
    const handleJobAction = async (id, action) => {
        try {
            await jobAction(id, action);
            toast.success(`Job ${action} ejecutado correctamente`);
            loadJobs();
        } catch (err) {
            logger.error(`❌ Error en acción ${action} para job ${id}:`, err.response?.data || err);
            toast.error(`No se pudo ${action} el job`);
        }
    };

    return (
        <div className="bg-white p-6 rounded shadow space-y-4">
            <h2 className="text-lg font-bold">📤 Panel de envíos</h2>

            {/* Formulario de creación */}
            <div className="space-y-2">
                <textarea
                    className="w-full border rounded p-2 h-32"
                    placeholder="Escribe el template aquí..."
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                />
                <input
                    type="datetime-local"
                    className="border rounded p-2 w-full"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                />
                <button
                    onClick={handleCreateJob}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    Crear job
                </button>
            </div>

            {/* Lista de jobs */}
            <h3 className="font-semibold mt-4">📋 Jobs creados</h3>
            <div className="space-y-2">
                {jobs.length === 0 && (
                    <p className="text-gray-500">No hay jobs aún</p>
                )}
                {jobs.map((job) => {
                    const progress =
                        job.contacts?.length && job.currentIndex != null
                            ? Math.round((job.currentIndex / job.contacts.length) * 100)
                            : 0;

                    return (
                        <div
                            key={job._id}
                            className="border rounded p-2 flex justify-between items-center"
                        >
                            <div>
                                <p className="font-medium">
                                    {job.template?.slice(0, 30)}...
                                </p>
                                <p className="text-sm text-gray-500">
                                    Estado: {job.status} | Progreso: {progress}%
                                </p>
                                <p className="text-xs text-gray-400">
                                    Programado:{" "}
                                    {job.scheduledFor
                                        ? new Date(job.scheduledFor).toLocaleString()
                                        : "Inmediato"}
                                </p>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-2">
                                {job.status === "ejecutando" && (
                                    <button
                                        onClick={() => handleJobAction(job._id, "pause")}
                                        className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                                    >
                                        Pausar
                                    </button>
                                )}
                                {job.status === "pausado" && (
                                    <button
                                        onClick={() => handleJobAction(job._id, "resume")}
                                        className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
                                    >
                                        Reanudar
                                    </button>
                                )}
                                {["pendiente", "ejecutando", "pausado"].includes(job.status) && (
                                    <button
                                        onClick={() => handleJobAction(job._id, "cancel")}
                                        className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}