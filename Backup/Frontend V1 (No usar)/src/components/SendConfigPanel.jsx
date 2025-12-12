// frontend/src/components/SendConfigPanel.jsx

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchSendConfig, updateSendConfig } from "../services/sendConfigService";
import logger from "../utils/logger";

export default function SendConfigPanel() {
    const [config, setConfig] = useState({
        intervalMs: 1000,
        batchSize: 1,
        paused: false,
    });
    const [loading, setLoading] = useState(false);

    // Cargar configuración actual
    const loadConfig = async () => {
        try {
            setLoading(true);
            const data = await fetchSendConfig();
            setConfig(data);
        } catch (err) {
            logger.error("❌ Error cargando configuración:", err);
            toast.error("No se pudo cargar la configuración de envíos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadConfig();
    }, []);

    // Guardar configuración
    const handleSave = async () => {
        try {
            setLoading(true);
            await updateSendConfig(config);
            toast.success("Configuración guardada correctamente ✅");
        } catch (err) {
            logger.error("❌ Error guardando configuración:", err);
            toast.error("No se pudo guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded shadow space-y-4">
            <h2 className="text-lg font-bold">⚙️ Configuración de Envíos</h2>

            {loading && <p className="text-gray-500">Cargando...</p>}

            <div className="space-y-3">
                <div>
                    <label className="block text-sm font-medium">⏱ Intervalo entre mensajes (ms)</label>
                    <input
                        type="number"
                        min="100"
                        step="100"
                        value={config.intervalMs}
                        onChange={(e) =>
                            setConfig({ ...config, intervalMs: Number(e.target.value) })
                        }
                        className="border rounded p-2 w-full"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">📦 Tamaño del batch</label>
                    <input
                        type="number"
                        min="1"
                        value={config.batchSize}
                        onChange={(e) =>
                            setConfig({ ...config, batchSize: Number(e.target.value) })
                        }
                        className="border rounded p-2 w-full"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={config.paused}
                        onChange={(e) =>
                            setConfig({ ...config, paused: e.target.checked })
                        }
                        className="h-4 w-4"
                    />
                    <label className="text-sm font-medium">⏸ Pausar envíos</label>
                </div>
            </div>

            <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
            >
                {loading ? "Guardando..." : "Guardar cambios"}
            </button>
        </div>
    );
}