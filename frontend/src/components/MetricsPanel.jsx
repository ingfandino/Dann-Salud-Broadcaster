// frontend/src/components/MetricsPanel.jsx

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import socket, { subscribeToMetrics } from "../services/socket";
import apiClient from "../services/api";
import logger from "../utils/logger";
import { toast } from "react-toastify";

export default function MetricsPanel() {
    const [metrics, setMetrics] = useState(null);
    const [wa, setWa] = useState({ connected: false, phoneNumber: null, loading: true });
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const cleanup = subscribeToMetrics((data) => {
            logger.info("📊 Metrics recibidas:", data);
            setMetrics(data);
        });

        // cleanup on unmount
        return () => {
            cleanup();
        };
    }, []);

    const loadWaStatus = useCallback(async () => {
        try {
            setWa((s) => ({ ...s, loading: true }));
            const res = await apiClient.get("/whatsapp/me/status");
            setWa({ connected: !!res.data?.connected, phoneNumber: res.data?.phoneNumber || null, loading: false });
        } catch {
            setWa({ connected: false, phoneNumber: null, loading: false });
        }
    }, []);

    useEffect(() => {
        loadWaStatus();
        const onReady = () => loadWaStatus();
        const onLogout = () => loadWaStatus();
        socket.on("ready", onReady);
        socket.on("authenticated", onReady);
        socket.on("logout_success", onLogout);
        return () => {
            socket.off("ready", onReady);
            socket.off("authenticated", onReady);
            socket.off("logout_success", onLogout);
        };
    }, [loadWaStatus]);

    const goToQR = () => navigate("/qr-link");

    const handleRelink = async () => {
        try {
            setBusy(true);
            await apiClient.post("/whatsapp/me/relink");
            toast.success("Solicitado nuevo QR");
        } catch (err) {
            toast.error("No se pudo refrescar el QR");
        } finally {
            setBusy(false);
        }
    };

    const handleLogout = async () => {
        try {
            setBusy(true);
            await apiClient.post("/whatsapp/me/logout");
            toast.info("Sesión desconectada. Generando nuevo QR...");
        } catch (err) {
            toast.error("No se pudo desconectar el dispositivo");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <div>
                <h2 className="text-lg font-semibold mb-2">📱 Estado de mi WhatsApp</h2>
                <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-gray-700">
                        {wa.loading ? (
                            <span>Cargando estado...</span>
                        ) : wa.connected ? (
                            <span>Conectado {wa.phoneNumber ? `( +${wa.phoneNumber} )` : ""}</span>
                        ) : (
                            <span>No vinculado</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={goToQR}
                            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                        >
                            Ir a vincular
                        </button>
                        <button
                            onClick={handleRelink}
                            disabled={busy}
                            className={`px-3 py-1.5 rounded text-sm text-white ${busy ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
                        >
                            Refrescar QR
                        </button>
                        <button
                            onClick={handleLogout}
                            disabled={busy}
                            className={`px-3 py-1.5 rounded text-sm text-white ${busy ? "bg-gray-400" : "bg-red-600 hover:bg-red-700"}`}
                        >
                            Desconectar
                        </button>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-2">📊 Métricas en tiempo real</h2>
                {metrics ? (
                    <pre className="bg-gray-100 p-3 rounded">{JSON.stringify(metrics, null, 2)}</pre>
                ) : (
                    <p>Esperando datos...</p>
                )}
            </div>
        </div>
    );
}