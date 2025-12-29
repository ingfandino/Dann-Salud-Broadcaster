/**
 * ============================================================
 * NOTIFICACIÓN AUTO-RESPUESTA (auto-response-notification.tsx)
 * ============================================================
 * Toast de notificación cuando se envía una auto-respuesta.
 * Muestra el contacto, palabra clave y respuesta enviada.
 */

"use client"

import { MessageSquare, X, ExternalLink } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface AutoResponseNotificationProps {
    data: {
        contact: { nombre: string; telefono: string }
        keyword: string
        response: string
        timestamp: Date
    }
    onDismiss: () => void
}

export function AutoResponseNotification({
    data,
    onDismiss
}: AutoResponseNotificationProps) {
    const { theme } = useTheme()

    return (
        <div className="fixed bottom-4 right-4 z-[100] animate-slide-in-right">
            <div
                className={cn(
                    "w-80 rounded-xl border shadow-2xl p-4",
                    theme === "dark"
                        ? "bg-[#1a1333]/95 border-purple-500/30 backdrop-blur-md"
                        : "bg-white/95 border-purple-200"
                )}
            >
                {/* Encabezado de notificación */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", theme === "dark" ? "bg-purple-500/20" : "bg-purple-100")}>
                            <MessageSquare className={cn("w-4 h-4", theme === "dark" ? "text-purple-300" : "text-purple-600")} />
                        </div>
                        <div>
                            <h3 className={cn("text-sm font-semibold", theme === "dark" ? "text-white" : "text-gray-900")}>
                                Auto-respuesta enviada
                            </h3>
                            <p className={cn("text-[10px]", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                {new Date(data.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onDismiss}
                        className={cn(
                            "p-1 rounded-md transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Contenido de la notificación */}
                <div className="space-y-2">
                    <div className={cn("text-xs p-2 rounded-lg", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
                        <p className={cn("font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Contacto: <span className="font-normal">{data.contact?.nombre || data.contact?.telefono}</span>
                        </p>
                        <p className={cn("font-medium", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Keyword: <span className={cn("font-normal px-1.5 py-0.5 rounded text-[10px]", theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-600")}>
                                {data.keyword}
                            </span>
                        </p>
                    </div>

                    <div className={cn("text-xs italic opacity-80 pl-2 border-l-2", theme === "dark" ? "border-purple-500/50 text-gray-400" : "border-purple-300 text-gray-600")}>
                        "{data.response.length > 50 ? data.response.substring(0, 50) + '...' : data.response}"
                    </div>
                </div>
            </div>
        </div>
    )
}
