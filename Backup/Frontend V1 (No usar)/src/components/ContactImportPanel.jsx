// frontend/src/components/ContactImportPanel.jsx

import React, { useState } from "react";
import apiClient from "../services/api";
import { toast } from "react-toastify";
import logger from "../utils/logger";

export default function ContactImportPanel() {
    const [file, setFile] = useState(null);
    const [headers, setHeaders] = useState([]);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            toast.warn("Selecciona un archivo antes de importar");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            setLoading(true);
            const res = await apiClient.post("/contacts/import", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setResult(res.data);
            toast.success("Importación completada");
            fetchHeaders();
        } catch (err) {
            logger.error("❌ Error importando:", err.response?.data || err);
            toast.error("Error al importar archivo");
        } finally {
            setLoading(false);
        }
    };

    const fetchHeaders = async () => {
        try {
            const res = await apiClient.get("/contacts/headers");
            setHeaders(res.data.headers || []);
        } catch (err) {
            logger.error("❌ Error obteniendo headers:", err.response?.data || err);
            toast.error("Error al cargar headers detectados");
        }
    };

    return (
        <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">📂 Importar contactos</h2>

            <input
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                className="mb-3"
            />
            <button
                onClick={handleUpload}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Importando..." : "Importar"}
            </button>

            <div className="mt-5">
                <h3 className="font-semibold">Headers detectados:</h3>
                {headers.length > 0 ? (
                    <ul className="list-disc ml-6">
                        {headers.map((h, idx) => (
                            <li key={idx}>{h}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No hay headers cargados aún.</p>
                )}
            </div>

            {result && (
                <div className="mt-5 border-t pt-3">
                    <h3 className="font-semibold">Resumen:</h3>
                    <p>✔️ Insertados: {result.resumen?.inserted}</p>
                    <p>❌ Inválidos: {result.resumen?.invalid}</p>

                    {result.warnings?.length > 0 && (
                        <details className="mt-3">
                            <summary className="cursor-pointer text-red-600">
                                Ver warnings ({result.warnings.length})
                            </summary>
                            <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                                {JSON.stringify(result.warnings, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}