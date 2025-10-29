// frontend/src/pages/QRLink.jsx

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../services/api";
import socket from "../services/socket";
import QRCode from "react-qr-code";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import logger from "../utils/logger";

export default function QRLink() {
    const [qr, setQr] = useState(null);
    const [status, setStatus] = useState("Esperando QR...");
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const pollRef = useRef(null);
    const statusPollRef = useRef(null);
    // Usamos una ref para leer el estado de navegación UNA SOLA VEZ y evitar bucles.
    const fromLogoutRef = useRef(location.state?.fromLogout);
    // Modo especial tras logout para evitar redirecciones por estado 'connected' transitorio
    const logoutModeRef = useRef(false);
    // Evitar múltiples navegaciones concurrentes
    const navigatedRef = useRef(false);

    const stopQrPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            console.log("[QRLink] Polling de QR detenido.");
        }
    }, []);

    const stopStatusPolling = useCallback(() => {
        if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
            console.log("[QRLink] Status polling detenido.");
        }
    }, []);

    const safeNavigateToBulk = useCallback(() => {
        if (navigatedRef.current) return;
        navigatedRef.current = true;
        stopQrPolling();
        stopStatusPolling();
        navigate("/bulk-messages", { replace: true });
    }, [navigate, stopQrPolling, stopStatusPolling]);

    const fetchQR = useCallback(async () => {
        console.log("[QRLink] Intentando obtener QR...");
        try {
            setRefreshing(true);
            const res = await apiClient.get("/whatsapp/me/qr");
            if (res.data?.connected) {
                if (logoutModeRef.current) {
                    // En modo logout ignoramos el conectado residual hasta que llegue logout_success o nuevo QR
                    setStatus("Cerrando sesión...");
                    return;
                }
                toast.success("✅ Dispositivo ya vinculado");
                stopQrPolling();
                stopStatusPolling();
                navigate("/bulk-messages", { replace: true });
                return;
            }
            if (res.data?.qr) {
                setQr(res.data.qr);
                setStatus("📱 Escanea este QR con WhatsApp");
                // Al mostrar el QR, detenemos SOLO el polling de QR, pero dejamos corriendo el de estado
                stopQrPolling();
            } else {
                setQr(null);
                setStatus("⏳ Esperando nuevo QR...");
            }
        } catch (err) {
            logger.warn("QR no disponible aún, reintentando...");
        } finally {
            setRefreshing(false);
        }
    }, [navigate, stopQrPolling, stopStatusPolling]);

    const startPolling = useCallback(() => {
        stopQrPolling(); // Asegurarse de que no haya polls duplicados
        console.log("[QRLink] Iniciando polling...");
        pollRef.current = setInterval(() => {
            setQr((currentQr) => {
                if (!currentQr) {
                    fetchQR();
                }
                return currentQr;
            });
        }, 5000);
    }, [fetchQR, stopQrPolling]);

    const checkConnected = useCallback(async () => {
        try {
            const res = await apiClient.get("/whatsapp/me/status");
            if (res.data?.connected) {
                if (logoutModeRef.current) {
                    // Ignorar estado conectado transitorio justo después del logout
                    return;
                }
                console.log("[QRLink] Estado conectado detectado por polling de estado");
                toast.success("✅ Dispositivo vinculado correctamente");
                safeNavigateToBulk();
            }
        } catch (err) {
            // silencioso
        }
    }, [safeNavigateToBulk]);

    const startStatusPolling = useCallback(() => {
        if (statusPollRef.current) clearInterval(statusPollRef.current);
        console.log("[QRLink] Iniciando status polling...");
        // Verificar inmediatamente antes de esperar el primer tick
        checkConnected();
        statusPollRef.current = setInterval(() => {
            checkConnected();
        }, 3000);
    }, [checkConnected]);

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setQr(null);
            setStatus("Generando nuevo QR...");
            stopQrPolling();
            stopStatusPolling();
            await apiClient.post("/whatsapp/me/relink");
            toast.success("Se ha solicitado un nuevo QR");
            // El evento de socket 'qr_refresh' o el polling se encargarán de obtener el nuevo QR
        } catch (err) {
            toast.error("No se pudo refrescar el QR");
        } finally {
            setRefreshing(false);
        }
    };

    // --- EFECTO PRINCIPAL PARA INICIALIZACIÓN Y SOCKETS ---
    useEffect(() => {
        console.log("[QRLink] Montando componente y configurando listeners...");

        const onQr = (qrCode) => {
            console.log("[QRLink] Socket: 'qr' recibido");
            setQr(qrCode);
            setStatus("📱 Escanea este QR con WhatsApp");
            stopQrPolling();
            // Ya tenemos QR nuevo, podemos salir del modo logout
            logoutModeRef.current = false;
            // Verificar de inmediato por si el estado ya quedó conectado
            checkConnected();
        };

        const onReady = () => {
            console.log("[QRLink] Socket: 'ready' recibido");
            // Forzar salida de logout mode y navegar para evitar bucles
            logoutModeRef.current = false;
            toast.success("✅ Dispositivo vinculado correctamente");
            safeNavigateToBulk();
        };

        const onAuthenticated = () => {
            console.log("[QRLink] Socket: 'authenticated' recibido");
            // Forzar salida de logout mode y navegar para evitar bucles
            logoutModeRef.current = false;
            toast.success("✅ Dispositivo vinculado correctamente");
            safeNavigateToBulk();
        };

        const onQrRefresh = () => {
            console.log("[QRLink] Socket: 'qr_refresh' recibido");
            setQr(null);
            setStatus("♻️ Generando nuevo QR...");
            fetchQR();
            startPolling();
        };

        const onLogoutSuccess = () => {
            console.log("[QRLink] Socket: 'logout_success' recibido");
            toast.info("Sesión cerrada. Generando nuevo QR...");
            setQr(null);
            setStatus("Generando nuevo QR...");
            setTimeout(() => {
                fetchQR();
                startPolling();
                startStatusPolling();
            }, 1000);
            // Ya terminó el proceso de logout del backend
            logoutModeRef.current = false;
        };

        socket.on("qr", onQr);
        socket.on("ready", onReady);
        socket.on("authenticated", onReady);
        socket.on("qr_refresh", onQrRefresh);
        socket.on("qr_expired", onQrRefresh);
        socket.on("logout_success", onLogoutSuccess);
        const onConnect = () => {
            console.log("[QRLink] Socket: 'connect' recibido, verificando estado...");
            checkConnected();
        };
        socket.on("connect", onConnect);

        const init = async () => {
            if (fromLogoutRef.current) {
                setStatus("Cerrando sesión... Por favor, espera.");
                window.history.replaceState({}, document.title);
                fromLogoutRef.current = false;
                // Proactivo: iniciar polling para no depender solo del evento de socket
                setQr(null);
                // Activar modo logout por un breve período para evitar ping-pong
                logoutModeRef.current = true;
                startPolling();
                // retrasar el status polling unos segundos para evitar detectar 'connected' residual
                setTimeout(() => {
                    startStatusPolling();
                    // salir automáticamente del modo logout tras 8s si no llegaron eventos
                    setTimeout(() => { logoutModeRef.current = false; }, 8000);
                }, 1500);
                setTimeout(() => fetchQR(), 500);
            } else {
                try {
                    const res = await apiClient.get("/whatsapp/me/status");
                    if (res.data?.connected) {
                        toast.success("Dispositivo ya vinculado");
                        safeNavigateToBulk();
                        return;
                    }
                    fetchQR();
                    startPolling();
                    startStatusPolling();
                } catch (err) {
                    logger.warn("No se pudo verificar el estado de WhatsApp. Iniciando escucha.");
                    fetchQR();
                    startPolling();
                    startStatusPolling();
                }
            }
        };

        init();

        return () => {
            console.log("[QRLink] Desmontando y limpiando listeners...");
            stopQrPolling();
            stopStatusPolling();
            socket.off("qr", onQr);
            socket.off("ready", onReady);
            socket.off("authenticated", onReady);
            socket.off("qr_refresh", onQrRefresh);
            socket.off("qr_expired", onQrRefresh);
            socket.off("logout_success", onLogoutSuccess);
            socket.off("connect", onConnect);
        };
    }, [navigate, fetchQR, startPolling, stopQrPolling, stopStatusPolling, startStatusPolling, checkConnected, safeNavigateToBulk]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-green-100 p-6">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-lg p-8 flex flex-col items-center max-w-md w-full"
            >
                <h1 className="text-3xl font-extrabold text-gray-800 mb-2 flex items-center gap-2">
                    🔗 Vincular WhatsApp
                </h1>
                <p className="mb-6 text-gray-600 text-center">{status}</p>

                {qr ? (
                    <motion.div
                        key={qr}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="border-4 border-white shadow-xl p-3 bg-white rounded-xl"
                    >
                        <QRCode value={qr} size={260} style={{ display: "block" }} />
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
                        <svg
                            className="animate-spin h-6 w-6 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        Cargando QR...
                    </div>
                )}

                <div className="mt-6 flex flex-col gap-3 w-full">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`w-full px-4 py-2 rounded-lg text-white font-semibold transition ${refreshing ? "bg-gray-400 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
                            }`}
                    >
                        {refreshing ? "🔄 Actualizando..." : "♻️ Refrescar QR"}
                    </button>

                    <button
                        onClick={() => navigate("/")}
                        className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                    >
                        ⬅️ Volver al menú
                    </button>
                </div>

                <p className="mt-6 text-sm text-gray-500 text-center">
                    Abre WhatsApp ➜ Menú de dispositivos vinculados ➜ Escanea el código QR
                </p>
            </motion.div>
        </div>
    );
}