"use client"

import { useState } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Users, Calendar, Plus, Pencil, Trash2, AlertCircle } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"

import { useAuth } from "@/lib/auth"

interface TeamPeriod {
    _id: string
    numeroEquipo: string
    fechaInicio: string
    fechaFin?: string | null
    changedBy?: { _id: string; nombre: string }
    changedAt: string
    notes?: string
}

interface TeamHistoryProps {
    userId: string
    teamHistory?: TeamPeriod[]
    currentNumeroEquipo?: string
    onUpdate: () => void
}

export function TeamHistorySection({ userId, teamHistory = [], currentNumeroEquipo, onUpdate }: TeamHistoryProps) {
    const { theme } = useTheme()
    const { user } = useAuth()
    const role = user?.role?.toLowerCase() || ''
    // Permitir gerencia y cualquier variante de rrhh (rrhh, rr.hh, rrhh., etc)
    const canChangeTeam = role === 'gerencia' || role.includes('rrhh') || role.includes('rr.hh')

    const [showChangeModal, setShowChangeModal] = useState(false)
    const [nuevoEquipo, setNuevoEquipo] = useState("")
    const [fechaInicio, setFechaInicio] = useState("")
    const [notes, setNotes] = useState("")
    const [saving, setSaving] = useState(false)

    const handleAddTeamChange = async () => {
        if (!nuevoEquipo || !fechaInicio) {
            toast.error("Equipo y fecha de inicio son requeridos")
            return
        }

        try {
            setSaving(true)
            await api.users.addTeamChange(userId, { nuevoEquipo, fechaInicio, notes })
            toast.success("Cambio de equipo registrado exitosamente")
            setShowChangeModal(false)
            setNuevoEquipo("")
            setFechaInicio("")
            setNotes("")
            onUpdate()
        } catch (error: any) {
            console.error("Error adding team change:", error)
            toast.error(error.response?.data?.error || "Error al registrar cambio de equipo")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    <h4 className={cn("font-medium", theme === "dark" ? "text-white" : "text-gray-800")}>
                        Historial de Equipos
                    </h4>
                </div>
                {canChangeTeam && (
                    <button
                        onClick={() => setShowChangeModal(true)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        Cambiar Equipo
                    </button>
                )}
            </div>

            {teamHistory.length === 0 ? (
                <div className={cn(
                    "p-4 rounded-lg border text-center text-sm",
                    theme === "dark" ? "bg-white/5 border-white/10 text-gray-400" : "bg-gray-50 border-gray-200 text-gray-500"
                )}>
                    <AlertCircle className="w-5 h-5 mx-auto mb-2 opacity-50" />
                    No hay historial de equipos registrado
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                                <th className={cn("px-2 py-2 text-left font-semibold", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                    Equipo
                                </th>
                                <th className={cn("px-2 py-2 text-left font-semibold", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                    Desde
                                </th>
                                <th className={cn("px-2 py-2 text-left font-semibold", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                    Hasta
                                </th>
                                <th className={cn("px-2 py-2 text-left font-semibold", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                    Notas
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamHistory.map((period) => (
                                <tr key={period._id} className={cn(
                                    "border-t",
                                    theme === "dark" ? "border-white/5" : "border-gray-200"
                                )}>
                                    <td className="px-2 py-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-xs font-medium",
                                            !period.fechaFin
                                                ? "bg-green-500/20 text-green-600"
                                                : theme === "dark" ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"
                                        )}>
                                            {period.numeroEquipo} {!period.fechaFin && "(Actual)"}
                                        </span>
                                    </td>
                                    <td className={cn("px-2 py-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                        {new Date(period.fechaInicio).toLocaleDateString('es-AR')}
                                    </td>
                                    <td className={cn("px-2 py-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                        {period.fechaFin ? new Date(period.fechaFin).toLocaleDateString('es-AR') : "-"}
                                    </td>
                                    <td className={cn("px-2 py-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                                        {period.notes || "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Cambio de Equipo */}
            {showChangeModal && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 overflow-y-auto">
                    <div className={cn(
                        "w-full max-w-md rounded-2xl border p-6 shadow-xl",
                        theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200"
                    )}>
                        <h3 className={cn("text-lg font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-800")}>
                            Cambiar Equipo
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Nuevo Equipo (numeroEquipo) *
                                </label>
                                <input
                                    type="text"
                                    value={nuevoEquipo}
                                    onChange={(e) => setNuevoEquipo(e.target.value)}
                                    placeholder="Ej: 42"
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white"
                                            : "bg-white border-gray-200 text-gray-800"
                                    )}
                                />
                            </div>

                            <div>
                                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Fecha de Inicio *
                                </label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white"
                                            : "bg-white border-gray-200 text-gray-800"
                                    )}
                                />
                            </div>

                            <div>
                                <label className={cn("block text-sm font-medium mb-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                    Notas (opcional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Motivo del cambio..."
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                                            : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
                                    )}
                                />
                            </div>

                            {currentNumeroEquipo && (
                                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 text-xs">
                                    ⚠️ El equipo actual ({currentNumeroEquipo}) se cerrará automáticamente el día anterior a la fecha de inicio.
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowChangeModal(false)}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
                                    theme === "dark"
                                        ? "border-white/10 text-gray-400 hover:bg-white/5"
                                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                )}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddTeamChange}
                                disabled={saving || !nuevoEquipo || !fechaInicio}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? "Guardando..." : "Confirmar Cambio"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
