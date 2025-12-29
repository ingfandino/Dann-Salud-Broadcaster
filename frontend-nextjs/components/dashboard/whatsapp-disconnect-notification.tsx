/**
 * ============================================================
 * NOTIFICACIÓN DESCONEXIÓN WHATSAPP (whatsapp-disconnect-notification.tsx)
 * ============================================================
 * Alerta cuando WhatsApp pierde conexión.
 * Ofrece botón para reconectar o descartar.
 */

"use client"

import { WifiOff, X, RefreshCw } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface WhatsAppDisconnectNotificationProps {
    onDismiss: () => void
    onReconnect: () => void
}

export function WhatsAppDisconnectNotification({
    onDismiss,
    onReconnect
}: WhatsAppDisconnectNotificationProps) {
    const { theme } = useTheme()

    return (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
            <div
                className={cn(
                    "w-96 rounded-xl border-2 shadow-2xl p-5 animate-pulse-border",
                    theme === "dark"
                        ? "bg-gradient-to-br from-red-900/90 to-red-800/90 border-red-500 backdrop-blur-md"
                        : "bg-gradient-to-br from-red-50 to-orange-50 border-red-400"
                )}
            >
                {/* Encabezado de notificación */}
                <div className="flex items-start gap-3 mb-3">
                    <div
                        className={cn(
                            "p-2.5 rounded-lg animate-bounce",
                            theme === "dark" ? "bg-red-500/30" : "bg-red-200"
                        )}
                    >
                        <WifiOff className={cn("w-6 h-6", theme === "dark" ? "text-red-300" : "text-red-700")} />
                    </div>
                    <div className="flex-1">
                        <h3 className={cn("text-lg font-bold mb-1", theme === "dark" ? "text-red-100" : "text-red-900")}>
                            ⚠️ WhatsApp Desconectado
                        </h3>
                        <p className={cn("text-sm", theme === "dark" ? "text-red-200" : "text-red-800")}>
                            Se perdió la conexión con WhatsApp
                        </p>
                    </div>
                    <button
                        onClick={onDismiss}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-red-700/50 text-red-300" : "hover:bg-red-200 text-red-700"
                        )}
                        title="Cerrar notificación"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mensaje de alerta */}
                <div
                    className={cn(
                        "p-3 rounded-lg mb-4 text-sm",
                        theme === "dark"
                            ? "bg-red-800/50 text-red-100 border border-red-600/50"
                            : "bg-white/80 text-red-900 border border-red-300"
                    )}
                >
                    <p className="font-medium mb-2">🛑 Tus campañas se han detenido</p>
                    <p className="text-xs opacity-90">
                        Es necesario volver a vincular WhatsApp para reanudar el envío de mensajes.
                        Las campañas en progreso permanecerán pausadas hasta que reconectes.
                    </p>
                </div>

                {/* Botón de acción */}
                <button
                    onClick={onReconnect}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-[1.02]",
                        theme === "dark"
                            ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg"
                            : "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg"
                    )}
                >
                    <RefreshCw className="w-5 h-5" />
                    Vincular WhatsApp Ahora
                </button>

                {/* Indicador de animación */}
                <div className="flex items-center justify-center gap-1 mt-3">
                    <div className={cn("w-2 h-2 rounded-full animate-ping", theme === "dark" ? "bg-red-400" : "bg-red-600")} />
                    <span className={cn("text-[10px] font-medium", theme === "dark" ? "text-red-300" : "text-red-700")}>
                        Alerta activa - Requiere atención
                    </span>
                </div>
            </div>
        </div>
    )
}
