/**
 * ============================================================
 * NOTIFICACIÓN CONTACTOS RECHAZADOS (rejected-contacts-notification.tsx)
 * ============================================================
 * Alerta de contactos rechazados durante importación.
 * Permite descargar reporte de rechazados.
 */

"use client"

import { AlertTriangle, X, Download, FileWarning } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface RejectedContactsNotificationProps {
    count: number
    onDismiss: () => void
    onDownload: () => void
}

export function RejectedContactsNotification({
    count,
    onDismiss,
    onDownload
}: RejectedContactsNotificationProps) {
    const { theme } = useTheme()

    return (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
            <div
                className={cn(
                    "w-96 rounded-xl border-2 shadow-2xl p-5",
                    theme === "dark"
                        ? "bg-gradient-to-br from-yellow-900/90 to-orange-900/90 border-yellow-500 backdrop-blur-md"
                        : "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-400"
                )}
            >
                {/* Encabezado de notificación */}
                <div className="flex items-start gap-3 mb-3">
                    <div
                        className={cn(
                            "p-2.5 rounded-lg",
                            theme === "dark" ? "bg-yellow-500/30" : "bg-yellow-200"
                        )}
                    >
                        <AlertTriangle className={cn("w-6 h-6", theme === "dark" ? "text-yellow-300" : "text-yellow-700")} />
                    </div>
                    <div className="flex-1">
                        <h3 className={cn("text-lg font-bold mb-1", theme === "dark" ? "text-yellow-100" : "text-yellow-900")}>
                            ⚠️ Contactos Rechazados
                        </h3>
                        <p className={cn("text-sm", theme === "dark" ? "text-yellow-200" : "text-yellow-800")}>
                            {count} contacto{count !== 1 ? 's' : ''} no se {count !== 1 ? 'pudieron' : 'pudo'} cargar
                        </p>
                    </div>
                    <button
                        onClick={onDismiss}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-yellow-700/50 text-yellow-300" : "hover:bg-yellow-200 text-yellow-700"
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
                            ? "bg-yellow-800/50 text-yellow-100 border border-yellow-600/50"
                            : "bg-white/80 text-yellow-900 border border-yellow-300"
                    )}
                >
                    <p className="font-medium mb-2 flex items-center gap-2">
                        <FileWarning className="w-4 h-4" />
                        Motivos comunes:
                    </p>
                    <ul className="list-disc list-inside text-xs opacity-90 space-y-1">
                        <li>Números de teléfono inválidos</li>
                        <li>Datos obligatorios faltantes</li>
                        <li>Duplicados en el archivo</li>
                    </ul>
                </div>

                {/* Botón de acción */}
                <button
                    onClick={onDownload}
                    className={cn(
                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all transform hover:scale-[1.02]",
                        theme === "dark"
                            ? "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white shadow-lg"
                            : "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg"
                    )}
                >
                    <Download className="w-5 h-5" />
                    Descargar Reporte de Rechazos
                </button>
            </div>
        </div>
    )
}
