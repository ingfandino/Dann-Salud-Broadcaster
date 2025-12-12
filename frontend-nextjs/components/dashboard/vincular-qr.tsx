"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import QRCode from "react-qr-code"
import { toast } from "sonner"
import { RefreshCw, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { connectSocket, getSocket } from "@/lib/socket"
import { cn } from "@/lib/utils"
import { useTheme } from "./theme-provider"

interface VincularQRProps {
    onSuccess: () => void
}

export function VincularQR({ onSuccess }: VincularQRProps) {
    const { theme } = useTheme()
    const [qr, setQr] = useState<string | null>(null)
    const [status, setStatus] = useState<"loading" | "scanning" | "connected" | "error">("loading")
    const [statusMessage, setStatusMessage] = useState("Iniciando vinculación...")
    const [refreshing, setRefreshing] = useState(false)

    const statusPollRef = useRef<NodeJS.Timeout | null>(null)
    const hasNavigatedRef = useRef(false)

    // Safe navigation to prevent double redirects
    const safeNavigate = useCallback(() => {
        if (hasNavigatedRef.current) return
        hasNavigatedRef.current = true

        if (statusPollRef.current) {
            clearInterval(statusPollRef.current)
            statusPollRef.current = null
        }

        toast.success("✅ WhatsApp vinculado correctamente")
        setTimeout(() => onSuccess(), 500)
    }, [onSuccess])

    // Check connection status via polling (fallback)
    const checkConnected = useCallback(async () => {
        try {
            const res = await api.whatsapp.status()
            if (res.data?.connected) {
                console.log("[VincularQR] Estado conectado detectado por polling")
                setStatus("connected")
                setStatusMessage("Vinculación exitosa")
                safeNavigate()
            }
        } catch (err) {
            // Silent fail - socket events are primary
        }
    }, [safeNavigate])

    // Start status polling
    const startStatusPolling = useCallback(() => {
        if (statusPollRef.current) clearInterval(statusPollRef.current)

        console.log("[VincularQR] Iniciando polling de estado...")
        checkConnected() // Check immediately

        statusPollRef.current = setInterval(() => {
            checkConnected()
        }, 3000)
    }, [checkConnected])

    // Fetch QR code
    const fetchQR = useCallback(async () => {
        try {
            console.log("[VincularQR] Solicitando QR...")
            setStatus("loading")
            setStatusMessage("Generando código QR...")

            const res = await api.whatsapp.qr()

            if (res.data?.connected) {
                console.log("[VincularQR] Ya está conectado")
                safeNavigate()
                return
            }

            if (res.data?.qr) {
                setQr(res.data.qr)
                setStatus("scanning")
                setStatusMessage("📱 Escanea este código QR con WhatsApp")
            } else if (res.data?.initializing) {
                setStatusMessage("⏳ Inicializando cliente de WhatsApp...")
                // Wait for socket event
            } else {
                setStatusMessage("⏳ Esperando código QR...")
            }
        } catch (err: any) {
            console.error("[VincularQR] Error obteniendo QR:", err)
            setStatus("error")
            setStatusMessage("Error al generar código QR")
            toast.error("No se pudo obtener el código QR")
        }
    }, [safeNavigate])

    // Handle QR refresh
    const handleRefresh = async () => {
        try {
            setRefreshing(true)
            setQr(null)
            setStatusMessage("Generando nuevo código QR...")

            await api.whatsapp.relink()
            toast.success("Solicitando nuevo código QR...")

            // Socket event will provide new QR
            // Reset refreshing after 10s if no QR received (fallback)
            setTimeout(() => {
                if (refreshing) {
                    setRefreshing(false)
                    console.warn("[VincularQR] Timeout esperando nuevo QR")
                }
            }, 10000)
        } catch (err: any) {
            console.error("[VincularQR] Error en relink:", err)
            toast.error("No se pudo refrescar el código QR")
            setRefreshing(false)
        }
    }

    // Main effect: Setup socket listeners and initialization
    useEffect(() => {
        console.log("[VincularQR] Montando componente...")

        // Connect socket
        const socket = connectSocket()

        // Socket event handlers
        const onQr = (qrCode: string) => {
            console.log("[VincularQR] Socket: 'qr' recibido")
            setQr(qrCode)
            setStatus("scanning")
            setStatusMessage("📱 Escanea este código QR con WhatsApp")
        }

        const onReady = () => {
            console.log("[VincularQR] Socket: 'ready' recibido")
            setStatus("connected")
            setStatusMessage("Vinculación exitosa")
            safeNavigate()
        }

        const onAuthenticated = () => {
            console.log("[VincularQR] Socket: 'authenticated' recibido")
            setStatus("connected")
            setStatusMessage("Vinculación exitosa")
            safeNavigate()
        }

        const onQrRefresh = () => {
            console.log("[VincularQR] Socket: 'qr_refresh' o 'qr_expired' recibido")
            setQr(null)
            setStatusMessage("♻️ Generando nuevo código QR...")
            setStatus("loading")
            fetchQR()
        }

        const onLogoutSuccess = () => {
            console.log("[VincularQR] Socket: 'logout_success' recibido")
            setQr(null)
            setStatusMessage("Generando nuevo código QR...")
            setTimeout(() => {
                fetchQR()
                startStatusPolling()
            }, 1000)
        }

        // ✅ Socket connection monitoring
        const onDisconnect = (reason: string) => {
            console.warn("[VincularQR] Socket desconectado:", reason)
            if (reason === "io server disconnect") {
                // Server disconnected, manually reconnect
                console.log("[VincularQR] Reconectando...")
                socket.connect()
            }
            // Else socket will auto-reconnect
        }

        const onReconnect = (attemptNumber: number) => {
            console.log("[VincularQR] Socket reconectado después de", attemptNumber, "intentos")
            // Re-fetch QR if not in connected state and haven't navigated
            if (!hasNavigatedRef.current && !qr) {
                console.log("[VincularQR] Refrescando QR después de reconexión")
                fetchQR()
            }
        }

        const onReconnectAttempt = (attemptNumber: number) => {
            console.log("[VincularQR] Intento de reconexión:", attemptNumber)
            setStatusMessage(`⏳ Reconectando (intento ${attemptNumber})...`)
        }

        const onConnectError = (error: Error) => {
            console.error("[VincularQR] Error de conexión socket:", error.message)
        }

        // Register all listeners
        socket.on("qr", onQr)
        socket.on("ready", onReady)
        socket.on("authenticated", onAuthenticated)
        socket.on("qr_refresh", onQrRefresh)
        socket.on("qr_expired", onQrRefresh)
        socket.on("logout_success", onLogoutSuccess)
        socket.on("disconnect", onDisconnect)
        socket.on("reconnect", onReconnect)
        socket.on("reconnect_attempt", onReconnectAttempt)
        socket.on("connect_error", onConnectError)

        // ✅ Connection health monitor
        const socketCheckInterval = setInterval(() => {
            if (!socket.connected && !hasNavigatedRef.current) {
                console.warn("[VincularQR] Socket no conectado, intentando reconectar...")
                socket.connect()
            }
        }, 5000)

        // Initialize
        const init = async () => {
            try {
                const res = await api.whatsapp.status()
                if (res.data?.connected) {
                    console.log("[VincularQR] Ya está conectado, navegando...")
                    safeNavigate()
                    return
                }

                fetchQR()
                startStatusPolling()
            } catch (err) {
                console.error("[VincularQR] Error en init:", err)
                fetchQR()
                startStatusPolling()
            }
        }

        init()

        // Cleanup
        return () => {
            console.log("[VincularQR] Desmontando componente...")

            clearInterval(socketCheckInterval)

            if (statusPollRef.current) {
                clearInterval(statusPollRef.current)
                statusPollRef.current = null
            }

            socket.off("qr", onQr)
            socket.off("ready", onReady)
            socket.off("authenticated", onAuthenticated)
            socket.off("qr_refresh", onQrRefresh)
            socket.off("qr_expired", onQrRefresh)
            socket.off("logout_success", onLogoutSuccess)
            socket.off("disconnect", onDisconnect)
            socket.off("reconnect", onReconnect)
            socket.off("reconnect_attempt", onReconnectAttempt)
            socket.off("connect_error", onConnectError)
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={cn(
                    "w-full max-w-md rounded-2xl shadow-2xl p-8 flex flex-col items-center",
                    theme === "dark"
                        ? "bg-gradient-to-br from-gray-900/90 to-gray-800/90 border border-white/10"
                        : "bg-gradient-to-br from-white to-gray-50 border border-purple-100"
                )}
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <h2
                        className={cn(
                            "text-2xl font-bold mb-2",
                            theme === "dark" ? "text-white" : "text-gray-800"
                        )}
                    >
                        🔗 Vincular WhatsApp
                    </h2>
                    <p
                        className={cn(
                            "text-sm",
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                        )}
                    >
                        {statusMessage}
                    </p>
                </div>

                {/* QR Code Display */}
                <div className="mb-6">
                    {status === "loading" || refreshing ? (
                        <div className="flex flex-col items-center justify-center w-64 h-64">
                            <Loader2 className={cn(
                                "w-12 h-12 animate-spin",
                                theme === "dark" ? "text-gray-400" : "text-gray-500"
                            )} />
                            <p className={cn(
                                "mt-4 text-sm",
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                            )}>
                                Cargando...
                            </p>
                        </div>
                    ) : qr ? (
                        <motion.div
                            key={qr}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="border-4 border-white shadow-xl p-3 bg-white rounded-xl"
                        >
                            <QRCode value={qr} size={256} />
                        </motion.div>
                    ) : status === "connected" ? (
                        <div className="flex flex-col items-center justify-center w-64 h-64">
                            <div className="text-6xl mb-4">✅</div>
                            <p className={cn(
                                "text-lg font-semibold",
                                theme === "dark" ? "text-green-400" : "text-green-600"
                            )}>
                                Conectado
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center w-64 h-64">
                            <div className="text-6xl mb-4">⏳</div>
                            <p className={cn(
                                "text-sm",
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                            )}>
                                Esperando código QR...
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || status === "connected"}
                        className={cn(
                            "w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2",
                            refreshing || status === "connected"
                                ? "bg-gray-400 cursor-not-allowed text-gray-200"
                                : theme === "dark"
                                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg"
                                    : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg"
                        )}
                    >
                        <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                        {refreshing ? "Actualizando..." : "♻️ Refrescar código QR"}
                    </button>
                </div>

                {/* Instructions */}
                <div className={cn(
                    "mt-6 p-4 rounded-lg text-sm text-center",
                    theme === "dark" ? "bg-white/5 text-gray-400" : "bg-purple-50 text-gray-600"
                )}>
                    <p className="font-semibold mb-1">Cómo vincular:</p>
                    <p>
                        1. Abre WhatsApp en tu teléfono<br />
                        2. Ve a <strong>Dispositivos vinculados</strong><br />
                        3. Escanea este código QR
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
