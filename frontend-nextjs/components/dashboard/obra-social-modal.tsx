/**
 * ============================================================
 * MODAL DE OBRA SOCIAL (obra-social-modal.tsx)
 * ============================================================
 * Selector de obra social con cantidad a asignar.
 * Se usa en la configuración de exportación de afiliados.
 */

"use client"

import { useEffect, useRef, useState } from "react"
import { Plus, X } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"

interface ObraSocialModalProps {
    isOpen: boolean
    onClose: () => void
    availableObrasSociales: string[]
    onAdd: (nombre: string, cantidad: number) => void
    triggerElement?: HTMLElement | null
}

export function ObraSocialModal({
    isOpen,
    onClose,
    availableObrasSociales,
    onAdd,
    triggerElement
}: ObraSocialModalProps) {
    const { theme } = useTheme()
    const [nombre, setNombre] = useState("")
    const [cantidad, setCantidad] = useState(0)
    const [position, setPosition] = useState({ top: 0, left: 0 })
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (isOpen && triggerElement) {
            const rect = triggerElement.getBoundingClientRect()
            const scrollY = window.scrollY || window.pageYOffset
            const scrollX = window.scrollX || window.pageXOffset

            setPosition({
                top: rect.bottom + scrollY + 8, // 8px below button
                left: rect.left + scrollX
            })
        }
    }, [isOpen, triggerElement])

    // Handle escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                console.log("🔍 [Modal Debug] Closing: Escape key")
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener("keydown", handleEscape)
            return () => document.removeEventListener("keydown", handleEscape)
        }
    }, [isOpen, onClose])

    // Handle backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            console.log("🔍 [Modal Debug] Closing: Backdrop click")
            onClose()
        }
    }

    const handleAdd = () => {
        if (!nombre || cantidad <= 0) return
        onAdd(nombre, cantidad)
        setNombre("")
        setCantidad(0)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "w-full max-w-md rounded-2xl shadow-xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200",
                    theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"
                )}
            >
                {/* Header */}
                <div className={cn(
                    "px-6 py-4 border-b flex items-center justify-between",
                    theme === "dark" ? "border-white/10" : "border-gray-100"
                )}>
                    <div>
                        <h2 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                            Agregar Obra Social
                        </h2>
                        <p className={cn("text-sm", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                            Nueva configuración de distribución
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            theme === "dark" ? "hover:bg-white/10 text-gray-400" : "hover:bg-gray-100 text-gray-500"
                        )}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Nombre de Obra Social
                        </label>
                        <select
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-purple-500/50",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                    : "bg-white border-gray-200 text-gray-800"
                            )}
                        >
                            <option value="">-- Seleccione una Obra Social --</option>
                            {availableObrasSociales.map((os) => (
                                <option key={os} value={os} className={theme === "dark" ? "bg-[#1a1333]" : ""}>
                                    {os}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                            Cantidad de Afiliados
                        </label>
                        <input
                            type="number"
                            value={cantidad}
                            onChange={(e) => setCantidad(Number(e.target.value))}
                            min="1"
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-purple-500/50",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-white border-gray-200 text-gray-800"
                            )}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className={cn(
                    "px-6 py-4 border-t flex justify-end gap-3",
                    theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-100 bg-gray-50"
                )}>
                    <button
                        onClick={onClose}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                            theme === "dark"
                                ? "hover:bg-white/10 text-gray-300"
                                : "hover:bg-gray-200 text-gray-600"
                        )}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleAdd}
                        disabled={!nombre || cantidad <= 0}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                            theme === "dark"
                                ? "bg-purple-600 text-white hover:bg-purple-500"
                                : "bg-purple-600 text-white hover:bg-purple-700"
                        )}
                    >
                        Agregar Obra Social
                    </button>
                </div>
            </div>
        </div>
    )
}
