/**
 * ============================================================
 * ADMINISTRACIÓN DE CONTACTOS (contactar-administracion.tsx)
 * ============================================================
 * Panel de administración para asignación de leads.
 * Permite configurar distribución de datos a asesores.
 */

"use client"

import { Settings, Users, Package, Plus, Trash2, Save } from "lucide-react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface User {
    _id: string
    nombre: string
    role: string
    numeroEquipo?: string
    active?: boolean
}

interface DistributionItem {
    id: string // ID temporal para la UI
    asesorId: string
    quantity: number
    mix: {
        freshPercentage: number
        reusablePercentage: number
    }
}

export function ContactarAdministracion() {
    const { theme } = useTheme()
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [users, setUsers] = useState<User[]>([])
    const [distribution, setDistribution] = useState<DistributionItem[]>([])

    // Cargar usuarios al inicio
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.users.list()
                const allUsers: User[] = res.data

                // Filtrar según rol
                let filteredUsers: User[] = []

                if (user?.role === 'gerencia' || user?.role === 'admin') {
                    // Gerencia: ve todos los asesores y auditores activos (con numeroEquipo)
                    filteredUsers = allUsers.filter(u =>
                        u.active === true && (
                            u.role === 'asesor' ||
                            (u.role === 'auditor' && u.numeroEquipo)
                        )
                    )
                } else if (user?.role === 'supervisor') {
                    // Supervisor: ve los de su mismo grupo activos + puede auto-asignarse
                    filteredUsers = allUsers.filter(u =>
                        u.active === true && (
                            // Asesores y auditores del mismo equipo
                            ((u.role === 'asesor' || u.role === 'auditor') && u.numeroEquipo === user.numeroEquipo) ||
                            // ✅ El supervisor mismo puede auto-asignarse
                            u._id === user._id
                        )
                    )
                }

                // Ordenar: Primero por equipo, luego por nombre
                filteredUsers.sort((a, b) => {
                    // Manejar casos sin equipo (ponerlos al final o al principio, aquí al final)
                    const equipoA = a.numeroEquipo ? parseInt(a.numeroEquipo) : 999999;
                    const equipoB = b.numeroEquipo ? parseInt(b.numeroEquipo) : 999999;

                    if (equipoA !== equipoB) {
                        return equipoA - equipoB;
                    }
                    return a.nombre.localeCompare(b.nombre);
                });

                setUsers(filteredUsers)
            } catch (error) {
                console.error("Error cargando usuarios:", error)
                toast.error("Error al cargar lista de asesores")
            }
        }

        if (user) {
            fetchUsers()
        }
    }, [user])

    const handleAddAsesor = () => {
        setDistribution([
            ...distribution,
            {
                id: Math.random().toString(36).substr(2, 9),
                asesorId: "",
                quantity: 50,
                mix: { freshPercentage: 50, reusablePercentage: 50 }
            }
        ])
    }

    const handleRemoveAsesor = (id: string) => {
        setDistribution(distribution.filter(item => item.id !== id))
    }

    const handleChange = (id: string, field: keyof DistributionItem | 'freshPercentage', value: any) => {
        setDistribution(distribution.map(item => {
            if (item.id !== id) return item

            if (field === 'freshPercentage') {
                return {
                    ...item,
                    mix: {
                        freshPercentage: Number(value),
                        reusablePercentage: 100 - Number(value)
                    }
                }
            }

            return { ...item, [field]: value }
        }))
    }

    // Supervisor Stats
    interface SupervisorStats {
        freshCount: number
        reusableCount: number
        byObraSocial: { obraSocial: string; count: number }[]
    }
    const [supervisorStats, setSupervisorStats] = useState<SupervisorStats | null>(null)

    const handleSave = async () => {
        // Validaciones
        if (distribution.length === 0) {
            toast.error("Agrega al menos un asesor para distribuir")
            return
        }

        const invalid = distribution.find(d => !d.asesorId || d.quantity <= 0)
        if (invalid) {
            toast.error("Completa todos los campos de asesor y cantidad")
            return
        }

        setLoading(true)
        try {
            // Preparar payload limpio
            const payload = {
                distribution: distribution.map(({ asesorId, quantity, mix }) => ({
                    asesorId,
                    quantity: Number(quantity),
                    mix
                }))
            }

            await api.assignments.distribute(payload)
            toast.success("Distribución completada exitosamente")
            setDistribution([]) // Limpiar formulario

            // Reload stats if supervisor
            if (user?.role === 'supervisor') {
                const statsRes = await api.affiliates.getSupervisorStats()
                setSupervisorStats(statsRes.data)
            }
        } catch (error) {
            console.error("Error distribuyendo:", error)
            toast.error("Error al realizar la distribución")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (user?.role === 'supervisor') {
            const fetchStats = async () => {
                try {
                    const statsRes = await api.affiliates.getSupervisorStats()
                    setSupervisorStats(statsRes.data)
                } catch (error) {
                    console.error("Error fetching supervisor stats:", error)
                }
            }
            fetchStats()
        }
    }, [user])

    return (
        <div className="animate-fade-in-up space-y-4">
            {/* Encabezado de la sección */}
            <div
                className={cn(
                    "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
                    theme === "dark"
                        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                        : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
                )}
            >
                <h2
                    className={cn(
                        "text-lg lg:text-xl font-semibold flex items-center gap-2",
                        theme === "dark" ? "text-white" : "text-gray-700",
                    )}
                >
                    <Settings className={cn("w-5 h-5", theme === "dark" ? "text-purple-400" : "text-purple-500")} />
                    Administración de Datos
                </h2>
                <p className={cn("text-sm mt-2", theme === "dark" ? "text-gray-400" : "text-gray-600")}>
                    Configura la distribución digital de afiliados a los asesores.
                </p>
            </div>

            {/* Panel de estadísticas para supervisor */}
            {user?.role === 'supervisor' && (
                <div className="space-y-6">
                    {/* Tarjeta de estadísticas */}
                    <div className={cn(
                        "rounded-2xl border p-6 backdrop-blur-sm",
                        theme === "dark"
                            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30"
                    )}>
                        <h2 className={cn("text-xl font-semibold flex items-center gap-2 mb-6", theme === "dark" ? "text-white" : "text-gray-800")}>
                            {/* Icono de disponibilidad de datos */}
                            Disponibilidad de Datos
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Datos frescos */}
                            <div className={cn(
                                "p-6 rounded-2xl border transition-all duration-300",
                                theme === "dark"
                                    ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20"
                                    : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={cn("text-sm font-medium", theme === "dark" ? "text-emerald-300" : "text-emerald-700")}>
                                        Datos Frescos
                                    </span>
                                    <div className={cn("p-2 rounded-lg", theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-200")}>
                                        <Users className={cn("w-5 h-5", theme === "dark" ? "text-emerald-400" : "text-emerald-600")} />
                                    </div>
                                </div>
                                <div className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                                    {supervisorStats?.freshCount || 0}
                                </div>
                                <p className={cn("text-xs mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                    Disponibles para asignar
                                </p>
                            </div>

                            {/* Datos reutilizables */}
                            <div className={cn(
                                "p-6 rounded-2xl border transition-all duration-300",
                                theme === "dark"
                                    ? "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                                    : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                            )}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className={cn("text-sm font-medium", theme === "dark" ? "text-blue-300" : "text-blue-700")}>
                                        Datos Reutilizables
                                    </span>
                                    {/* Icono de paquete */}
                                    <div className={cn("p-2 rounded-lg", theme === "dark" ? "bg-blue-500/20" : "bg-blue-200")}>
                                        <Package className={cn("w-5 h-5", theme === "dark" ? "text-blue-400" : "text-blue-600")} />
                                    </div>
                                </div>
                                <div className={cn("text-3xl font-bold", theme === "dark" ? "text-white" : "text-gray-900")}>
                                    {supervisorStats?.reusableCount || 0}
                                </div>
                                <p className={cn("text-xs mt-2", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                    Disponibles para re-asignar
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Desglose por Obra Social */}
                    <div className={cn(
                        "rounded-2xl border p-6 backdrop-blur-sm",
                        theme === "dark"
                            ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                            : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30"
                    )}>
                        <h3 className={cn("text-lg font-semibold mb-4", theme === "dark" ? "text-white" : "text-gray-800")}>
                            Detalle por Obra Social
                        </h3>

                        {supervisorStats?.byObraSocial && supervisorStats.byObraSocial.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {supervisorStats.byObraSocial.map((item, idx) => (
                                    <div key={idx} className={cn(
                                        "flex items-center justify-between p-3 rounded-xl border",
                                        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-100"
                                    )}>
                                        <span className={cn("text-sm font-medium truncate flex-1", theme === "dark" ? "text-gray-300" : "text-gray-700")}>
                                            {item.obraSocial || 'Sin especificar'}
                                        </span>
                                        <span className={cn("text-sm font-bold px-2 py-1 rounded-lg ml-2",
                                            theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-100 text-purple-700"
                                        )}>
                                            {item.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={cn("text-center py-8 text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                                No hay datos disponibles
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Panel de configuración */}
            <div
                className={cn(
                    "rounded-2xl border p-4 lg:p-6 backdrop-blur-sm",
                    theme === "dark"
                        ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                        : "bg-gradient-to-br from-white to-[#FAF7F2]/80 border-purple-200/30 shadow-lg shadow-purple-100/30",
                )}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3
                        className={cn(
                            "font-semibold flex items-center gap-2",
                            theme === "dark" ? "text-orange-400" : "text-orange-500",
                        )}
                    >
                        <Package className="w-4 h-4" />
                        Configuración de Distribución
                    </h3>
                    <button
                        onClick={handleAddAsesor}
                        className={cn(
                            "flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                            theme === "dark"
                                ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                : "bg-green-100 text-green-600 hover:bg-green-200",
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Asesor
                    </button>
                </div>

                {/* Lista de asesores */}
                <div className="space-y-3">
                    {distribution.length === 0 && (
                        <div className={cn("text-center py-8 text-sm", theme === "dark" ? "text-gray-500" : "text-gray-400")}>
                            No hay configuraciones. Haz clic en "Agregar Asesor" para comenzar.
                        </div>
                    )}

                    {distribution.map((item, index) => (
                        <div
                            key={item.id}
                            className={cn(
                                "rounded-xl border p-4 transition-all",
                                theme === "dark" ? "border-white/10 bg-white/5" : "border-gray-200 bg-gray-50",
                            )}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className={cn("font-medium text-sm", theme === "dark" ? "text-white" : "text-gray-700")}>
                                    Asignación #{index + 1}
                                </span>
                                <button
                                    onClick={() => handleRemoveAsesor(item.id)}
                                    className="text-red-400 hover:text-red-500 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                                {/* Selector de asesor */}
                                <div className="lg:col-span-4">
                                    <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                        Asesor
                                    </label>
                                    <select
                                        value={item.asesorId}
                                        onChange={(e) => handleChange(item.id, 'asesorId', e.target.value)}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm",
                                            theme === "dark"
                                                ? "bg-white/5 border-white/10 text-white"
                                                : "bg-white border-gray-200 text-gray-700",
                                        )}
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {users.map(u => (
                                            <option key={u._id} value={u._id}>
                                                {u.nombre} {u.numeroEquipo ? `(Eq: ${u.numeroEquipo})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Campo cantidad */}
                                <div className="lg:col-span-2">
                                    <label className={cn("text-xs mb-1 block", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                        Cantidad
                                    </label>
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleChange(item.id, 'quantity', e.target.value)}
                                        className={cn(
                                            "w-full px-3 py-2 rounded-lg border text-sm",
                                            theme === "dark"
                                                ? "bg-white/5 border-white/10 text-white"
                                                : "bg-white border-gray-200 text-gray-700",
                                        )}
                                    />
                                </div>

                                {/* Control de mezcla Fresh/Reusable */}
                                <div className="lg:col-span-6">
                                    <label className={cn("text-xs mb-1 block flex justify-between", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                        <span>Mezcla: {item.mix.freshPercentage}% Frescos</span>
                                        <span>{item.mix.reusablePercentage}% Reutilizables</span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="10"
                                        value={item.mix.freshPercentage}
                                        onChange={(e) => handleChange(item.id, 'freshPercentage', e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Botón guardar */}
            <button
                onClick={handleSave}
                disabled={loading || distribution.length === 0}
                className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100",
                    theme === "dark"
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400"
                        : "bg-gradient-to-r from-blue-500 to-blue-400 text-white hover:from-blue-400 hover:to-blue-300",
                )}
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4" />
                        Ejecutar Distribución
                    </>
                )}
            </button>
        </div>
    )
}
