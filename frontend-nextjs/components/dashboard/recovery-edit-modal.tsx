/**
 * ============================================================
 * MODAL DE EDICIÓN DE RECUPERACIÓN (recovery-edit-modal.tsx)
 * ============================================================
 * Modal para editar auditorías en estado de recuperación.
 * Permite cambiar estado y reasignar a otros usuarios.
 */

"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { X, Trash2, Save } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface User {
    _id: string
    nombre: string
    email: string
    role: string
    active?: boolean
}

interface Audit {
    _id: string
    nombre: string
    cuil: string
    telefono: string
    obraSocialVendida: string
    status: string
    administrador?: User | string
    datosExtra?: string
    asesor?: any
    scheduledAt?: string
    statusUpdatedAt?: string
}

interface RecoveryEditModalProps {
    audit: Audit
    onClose: () => void
    onSave: (updatedAudit: Audit | null, deletedId?: string) => void
}

const STATUS_OPTIONS = [
    "Falta documentación", "Falta clave", "Falta clave y documentación",
    "Completa", "Rechazó", "QR hecho", "Aprobada",
    "Aprobada, pero no reconoce clave",
    "Cortó", "Autovinculación", "Caída",
    "Pendiente", "Cargada", "Contactado"
]

const OBRAS_VENDIDAS = ["Binimed", "Meplife", "TURF"]

export function RecoveryEditModal({ audit, onClose, onSave }: RecoveryEditModalProps) {
    const { theme } = useTheme()
    const { user } = useAuth()

    const wasInCargadaStatus = audit.status === "Cargada"

    const [form, setForm] = useState({
        nombre: audit.nombre || "",
        cuil: audit.cuil || "",
        telefono: audit.telefono || "",
        obraSocialVendida: audit.obraSocialVendida || "",
        status: audit.status || "Pendiente",
        administrador: typeof audit.administrador === 'object' ? audit.administrador?._id : audit.administrador || "",
        datosExtra: audit.datosExtra || ""
    })

    const [loading, setLoading] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [administradores, setAdministradores] = useState<User[]>([])

    useEffect(() => {
        const loadAdministradores = async () => {
            try {
                const { data } = await api.users.list()
                const admins = (Array.isArray(data) ? data : []).filter((u: User) => u.role === 'administrativo' && u.active !== false)
                setAdministradores(admins)
            } catch (error) {
                console.error("Error loading admins:", error)
            }
        }
        loadAdministradores()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.nombre || !form.cuil || !form.telefono || !form.obraSocialVendida || !form.status) {
            toast.error("Por favor complete todos los campos obligatorios")
            return
        }

        setLoading(true)
        try {
            const payload: any = { ...form }

            // Handle administrator assignment
            if (form.administrador === "" || form.administrador === "Seleccione") {
                payload.administrador = null
            }

            const { data } = await api.audits.update(audit._id, payload)
            toast.success("Recuperación actualizada correctamente")
            onSave(data)
            onClose()
        } catch (err: any) {
            console.error(err)
            toast.error(err.response?.data?.message || "Error al actualizar")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm("¿Estás seguro de que deseas ELIMINAR esta recuperación? Esta acción no se puede deshacer.")) return

        setDeleting(true)
        try {
            await api.audits.delete(audit._id)
            toast.success("Recuperación eliminada correctamente")
            onSave(null, audit._id)
            onClose()
        } catch (err: any) {
            console.error(err)
            toast.error(err.response?.data?.message || "Error al eliminar")
        } finally {
            setDeleting(false)
        }
    }

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    if (!mounted) return null

    const { createPortal } = require('react-dom')

    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
            <div className={cn(
                "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border",
                theme === "dark" ? "bg-gray-900 border-white/10" : "bg-white border-gray-200"
            )}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-600 to-blue-600 p-6 flex justify-between items-center text-white">
                    <div>
                        <h2 className="text-xl font-bold">Editar Recuperación</h2>
                        <p className="text-sm text-purple-100 mt-1 opacity-90">
                            {audit.nombre} - {audit.cuil}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Read-only Info */}
                    <div className={cn(
                        "p-4 rounded-xl text-sm space-y-3",
                        theme === "dark" ? "bg-white/5" : "bg-gray-50"
                    )}>
                        <h3 className="font-semibold opacity-70">📋 Información Original</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="opacity-60 block text-xs">Asesor original</span>
                                <span className="font-medium">{audit.asesor?.nombre || audit.asesor?.email || '-'}</span>
                            </div>
                            <div>
                                <span className="opacity-60 block text-xs">Supervisor original</span>
                                <span className="font-medium">{audit.asesor?.supervisor?.nombre || '-'}</span>
                            </div>
                            <div>
                                <span className="opacity-60 block text-xs">Grupo original</span>
                                <span className="font-medium">{audit.asesor?.numeroEquipo || '-'}</span>
                            </div>
                            <div>
                                <span className="opacity-60 block text-xs">Fecha inicio</span>
                                <span className="font-medium">
                                    {audit.scheduledAt ? new Date(audit.scheduledAt).toLocaleDateString('es-AR') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nombre *</label>
                            <input
                                type="text"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm",
                                    theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">CUIL *</label>
                                <input
                                    type="text"
                                    value={form.cuil}
                                    onChange={(e) => setForm({ ...form, cuil: e.target.value })}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Teléfono *</label>
                                <input
                                    type="text"
                                    value={form.telefono}
                                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Obra Social Vendida *</label>
                                <select
                                    value={form.obraSocialVendida}
                                    onChange={(e) => setForm({ ...form, obraSocialVendida: e.target.value })}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {OBRAS_VENDIDAS.map(os => (
                                        <option key={os} value={os}>{os}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Estado *</label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-lg border text-sm",
                                        theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                    )}
                                    required
                                >
                                    {STATUS_OPTIONS.map(st => {
                                        const isAprobadaDisabled = (st === "Aprobada" || st === "Aprobada, pero no reconoce clave") && !wasInCargadaStatus
                                        return (
                                            <option key={st} value={st} disabled={isAprobadaDisabled}>
                                                {st} {isAprobadaDisabled ? "(req. Cargada)" : ""}
                                            </option>
                                        )
                                    })}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Administrador (opcional)</label>
                            <select
                                value={form.administrador}
                                onChange={(e) => setForm({ ...form, administrador: e.target.value })}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm",
                                    theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                            >
                                <option value="">Sin asignar</option>
                                {administradores.map(admin => (
                                    <option key={admin._id} value={admin._id}>
                                        {admin.nombre || admin.email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Datos Extra / Notas</label>
                            <textarea
                                value={form.datosExtra}
                                onChange={(e) => setForm({ ...form, datosExtra: e.target.value })}
                                rows={3}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border text-sm resize-none",
                                    theme === "dark" ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"
                                )}
                            />
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting || loading}
                            className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                        >
                            <Trash2 className="w-4 h-4" />
                            {deleting ? "Eliminando..." : "Eliminar"}
                        </button>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className={cn(
                                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                    theme === "dark" ? "bg-white/10 hover:bg-white/20 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                                )}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={loading || deleting}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-purple-500/20"
                            >
                                <Save className="w-4 h-4" />
                                {loading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}
