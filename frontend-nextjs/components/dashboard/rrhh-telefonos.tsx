/**
 * ============================================================
 * GESTIÓN DE TELÉFONOS CORPORATIVOS (rrhh-telefonos.tsx)
 * ============================================================
 * Interfaz para gestionar teléfonos corporativos asignados a equipos.
 * Incluye CRUD de teléfonos y registro de recargas/gastos.
 * 
 * Permisos:
 * - Supervisor: Ver/editar solo teléfonos de su equipo, no puede borrar
 * - Gerencia: Acceso completo a todos los teléfonos
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useTheme } from "./theme-provider"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
    Phone,
    Plus,
    Edit2,
    Trash2,
    DollarSign,
    Calendar,
    User,
    Users,
    Search,
    X,
    AlertTriangle,
    CheckCircle2,
    Clock,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Smartphone,
} from "lucide-react"

/* ========== INTERFACES ========== */
interface Recharge {
    _id: string
    motivo: "Recarga" | "Otro"
    descripcion: string
    monto: number
    fecha: string
    registradoPor?: {
        _id: string
        nombre: string
        email: string
    }
}

interface PhoneData {
    _id: string
    supervisor: {
        _id: string
        nombre: string
        email: string
        numeroEquipo: string
    }
    numeroEquipo: string
    modelo: string
    numeroTelefono: string
    asesorAsignado?: {
        _id: string
        nombre: string
        email: string
    }
    historialRecargas: Recharge[]
    ultimaRecarga?: string
    proximoVencimiento?: string
    notificacionEnviada: boolean
    activo: boolean
    notas: string
    createdAt: string
    updatedAt: string
}

interface PhoneStats {
    total: number
    sinRecarga: number
    proximosAVencer: number
    vencidos: number
    totalGastadoMes: number
}

interface UserOption {
    _id: string
    nombre: string
    email: string
    numeroEquipo?: string
}

/* ========== COMPONENTE PRINCIPAL ========== */
export function RRHHTelefonos() {
    const { theme } = useTheme()
    const { user } = useAuth()
    const role = user?.role?.toLowerCase()
    const isGerencia = role === "gerencia"
    const isSupervisor = role === "supervisor"

    // Estados
    const [phones, setPhones] = useState<PhoneData[]>([])
    const [stats, setStats] = useState<PhoneStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [expandedPhone, setExpandedPhone] = useState<string | null>(null)

    // Modales
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showRechargeModal, setShowRechargeModal] = useState(false)
    const [selectedPhone, setSelectedPhone] = useState<PhoneData | null>(null)

    // Opciones para dropdowns
    const [supervisors, setSupervisors] = useState<UserOption[]>([])
    const [asesores, setAsesores] = useState<UserOption[]>([])

    /* ========== CARGA DE DATOS ========== */
    const loadPhones = useCallback(async () => {
        try {
            setLoading(true)
            const [phonesRes, statsRes] = await Promise.all([
                api.phones.list(),
                api.phones.getStats()
            ])
            setPhones(phonesRes.data)
            setStats(statsRes.data)
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Error al cargar teléfonos")
        } finally {
            setLoading(false)
        }
    }, [])

    const loadSupervisors = useCallback(async () => {
        try {
            const res = await api.users.getSupervisors()
            setSupervisors(res.data)
        } catch (error) {
            console.error("Error cargando supervisores:", error)
        }
    }, [])

    const loadAsesores = useCallback(async (numeroEquipo: string) => {
        try {
            const res = await api.phones.getAsesoresByEquipo(numeroEquipo)
            setAsesores(res.data)
        } catch (error) {
            console.error("Error cargando asesores:", error)
        }
    }, [])

    useEffect(() => {
        loadPhones()
        if (isGerencia) {
            loadSupervisors()
        }
    }, [loadPhones, loadSupervisors, isGerencia])

    /* ========== FILTRADO ========== */
    const filteredPhones = phones.filter(phone => {
        if (!searchTerm) return true
        const search = searchTerm.toLowerCase()
        return (
            phone.numeroTelefono.toLowerCase().includes(search) ||
            phone.modelo.toLowerCase().includes(search) ||
            phone.supervisor?.nombre?.toLowerCase().includes(search) ||
            phone.asesorAsignado?.nombre?.toLowerCase().includes(search) ||
            phone.numeroEquipo?.toLowerCase().includes(search)
        )
    })

    // Agrupar por equipo
    const phonesByEquipo = filteredPhones.reduce((acc, phone) => {
        const equipo = phone.numeroEquipo || "Sin equipo"
        if (!acc[equipo]) acc[equipo] = []
        acc[equipo].push(phone)
        return acc
    }, {} as Record<string, PhoneData[]>)

    /* ========== HELPERS ========== */
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-"
        return new Date(dateStr).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS"
        }).format(amount)
    }

    const getVencimientoStatus = (phone: PhoneData) => {
        if (!phone.proximoVencimiento) return { status: "sin-recarga", label: "Sin recargas", color: "gray" }
        
        const now = new Date()
        const vencimiento = new Date(phone.proximoVencimiento)
        const diffHours = (vencimiento.getTime() - now.getTime()) / (1000 * 60 * 60)

        if (diffHours < 0) {
            return { status: "vencido", label: "Vencido", color: "red" }
        } else if (diffHours <= 48) {
            return { status: "proximo", label: "Próximo a vencer", color: "yellow" }
        } else {
            return { status: "vigente", label: "Vigente", color: "green" }
        }
    }

    /* ========== RENDER ========== */
    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Encabezado */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className={cn(
                        "text-xl lg:text-2xl font-bold flex items-center gap-2",
                        theme === "dark" ? "text-white" : "text-gray-800"
                    )}>
                        <Smartphone className="w-6 h-6" />
                        Teléfonos Corporativos
                    </h2>
                    <p className={cn(
                        "text-sm mt-1",
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                    )}>
                        Gestión de dispositivos y control de recargas
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (isSupervisor && user?.numeroEquipo) {
                            loadAsesores(user.numeroEquipo)
                        }
                        setShowCreateModal(true)
                    }}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200",
                        theme === "dark"
                            ? "bg-purple-600 hover:bg-purple-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Teléfono
                </button>
            </div>

            {/* Estadísticas */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <StatCard
                        label="Total"
                        value={stats.total}
                        icon={<Phone className="w-4 h-4" />}
                        color="blue"
                        theme={theme}
                    />
                    <StatCard
                        label="Sin recarga"
                        value={stats.sinRecarga}
                        icon={<AlertTriangle className="w-4 h-4" />}
                        color="gray"
                        theme={theme}
                    />
                    <StatCard
                        label="Próximos a vencer"
                        value={stats.proximosAVencer}
                        icon={<Clock className="w-4 h-4" />}
                        color="yellow"
                        theme={theme}
                    />
                    <StatCard
                        label="Vencidos"
                        value={stats.vencidos}
                        icon={<AlertTriangle className="w-4 h-4" />}
                        color="red"
                        theme={theme}
                    />
                    <StatCard
                        label="Gasto mensual"
                        value={formatCurrency(stats.totalGastadoMes)}
                        icon={<DollarSign className="w-4 h-4" />}
                        color="green"
                        theme={theme}
                        isText
                    />
                </div>
            )}

            {/* Búsqueda */}
            <div className="relative">
                <Search className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                )} />
                <input
                    type="text"
                    placeholder="Buscar por número, modelo, supervisor, asesor o equipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                        "w-full pl-10 pr-4 py-2 rounded-lg border transition-colors",
                        theme === "dark"
                            ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500"
                            : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500"
                    )}
                />
                {searchTerm && (
                    <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {/* Lista de teléfonos */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <RefreshCw className={cn(
                        "w-8 h-8 animate-spin",
                        theme === "dark" ? "text-purple-500" : "text-emerald-500"
                    )} />
                </div>
            ) : filteredPhones.length === 0 ? (
                <div className={cn(
                    "text-center py-12 rounded-lg border",
                    theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                )}>
                    <Smartphone className={cn(
                        "w-12 h-12 mx-auto mb-3",
                        theme === "dark" ? "text-gray-600" : "text-gray-400"
                    )} />
                    <p className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                        {searchTerm ? "No se encontraron teléfonos" : "No hay teléfonos registrados"}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(phonesByEquipo).sort(([a], [b]) => a.localeCompare(b)).map(([equipo, equipoPhones]) => (
                        <div key={equipo} className={cn(
                            "rounded-xl border overflow-hidden",
                            theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
                        )}>
                            {/* Header del equipo */}
                            <div className={cn(
                                "px-4 py-3 flex items-center gap-2",
                                theme === "dark" ? "bg-purple-500/10" : "bg-emerald-50"
                            )}>
                                <Users className={cn(
                                    "w-4 h-4",
                                    theme === "dark" ? "text-purple-400" : "text-emerald-600"
                                )} />
                                <span className={cn(
                                    "font-semibold",
                                    theme === "dark" ? "text-white" : "text-gray-800"
                                )}>
                                    Equipo {equipo}
                                </span>
                                <span className={cn(
                                    "text-sm px-2 py-0.5 rounded-full",
                                    theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-emerald-100 text-emerald-700"
                                )}>
                                    {equipoPhones.length} teléfono{equipoPhones.length !== 1 ? "s" : ""}
                                </span>
                            </div>

                            {/* Lista de teléfonos del equipo */}
                            <div className="divide-y divide-gray-200 dark:divide-white/10">
                                {equipoPhones.map(phone => (
                                    <PhoneCard
                                        key={phone._id}
                                        phone={phone}
                                        theme={theme}
                                        isGerencia={isGerencia}
                                        isExpanded={expandedPhone === phone._id}
                                        onToggleExpand={() => setExpandedPhone(
                                            expandedPhone === phone._id ? null : phone._id
                                        )}
                                        onEdit={() => {
                                            setSelectedPhone(phone)
                                            if (phone.numeroEquipo) {
                                                loadAsesores(phone.numeroEquipo)
                                            }
                                            setShowEditModal(true)
                                        }}
                                        onDelete={async () => {
                                            if (!confirm("¿Está seguro de eliminar este teléfono?")) return
                                            try {
                                                await api.phones.delete(phone._id)
                                                toast.success("Teléfono eliminado")
                                                loadPhones()
                                            } catch (error: any) {
                                                toast.error(error.response?.data?.message || "Error al eliminar")
                                            }
                                        }}
                                        onAddRecharge={() => {
                                            setSelectedPhone(phone)
                                            setShowRechargeModal(true)
                                        }}
                                        formatDate={formatDate}
                                        formatCurrency={formatCurrency}
                                        getVencimientoStatus={getVencimientoStatus}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Crear Teléfono */}
            {showCreateModal && (
                <PhoneModal
                    theme={theme}
                    isGerencia={isGerencia}
                    supervisors={supervisors}
                    asesores={asesores}
                    user={user}
                    onClose={() => setShowCreateModal(false)}
                    onSave={async (data) => {
                        try {
                            await api.phones.create(data)
                            toast.success("Teléfono creado exitosamente")
                            setShowCreateModal(false)
                            loadPhones()
                        } catch (error: any) {
                            toast.error(error.response?.data?.message || "Error al crear teléfono")
                        }
                    }}
                    loadAsesores={loadAsesores}
                />
            )}

            {/* Modal Editar Teléfono */}
            {showEditModal && selectedPhone && (
                <PhoneModal
                    theme={theme}
                    isGerencia={isGerencia}
                    supervisors={supervisors}
                    asesores={asesores}
                    user={user}
                    phone={selectedPhone}
                    onClose={() => {
                        setShowEditModal(false)
                        setSelectedPhone(null)
                    }}
                    onSave={async (data) => {
                        try {
                            await api.phones.update(selectedPhone._id, data)
                            toast.success("Teléfono actualizado exitosamente")
                            setShowEditModal(false)
                            setSelectedPhone(null)
                            loadPhones()
                        } catch (error: any) {
                            toast.error(error.response?.data?.message || "Error al actualizar teléfono")
                        }
                    }}
                    loadAsesores={loadAsesores}
                />
            )}

            {/* Modal Agregar Recarga */}
            {showRechargeModal && selectedPhone && (
                <RechargeModal
                    theme={theme}
                    phone={selectedPhone}
                    onClose={() => {
                        setShowRechargeModal(false)
                        setSelectedPhone(null)
                    }}
                    onSave={async (data) => {
                        try {
                            await api.phones.addRecharge(selectedPhone._id, data)
                            toast.success("Recarga registrada exitosamente")
                            setShowRechargeModal(false)
                            setSelectedPhone(null)
                            loadPhones()
                        } catch (error: any) {
                            toast.error(error.response?.data?.message || "Error al registrar recarga")
                        }
                    }}
                />
            )}
        </div>
    )
}

/* ========== COMPONENTES AUXILIARES ========== */

function StatCard({ label, value, icon, color, theme, isText = false }: {
    label: string
    value: number | string
    icon: React.ReactNode
    color: string
    theme: string
    isText?: boolean
}) {
    const colorClasses: Record<string, string> = {
        blue: theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600",
        gray: theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-600",
        yellow: theme === "dark" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600",
        red: theme === "dark" ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600",
        green: theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600",
    }

    return (
        <div className={cn(
            "p-3 rounded-lg border transition-all duration-200",
            theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
        )}>
            <div className="flex items-center gap-2 mb-1">
                <span className={cn("p-1 rounded", colorClasses[color])}>
                    {icon}
                </span>
                <span className={cn(
                    "text-xs",
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                    {label}
                </span>
            </div>
            <p className={cn(
                isText ? "text-sm font-semibold" : "text-xl font-bold",
                theme === "dark" ? "text-white" : "text-gray-800"
            )}>
                {value}
            </p>
        </div>
    )
}

function PhoneCard({ phone, theme, isGerencia, isExpanded, onToggleExpand, onEdit, onDelete, onAddRecharge, formatDate, formatCurrency, getVencimientoStatus }: {
    phone: PhoneData
    theme: string
    isGerencia: boolean
    isExpanded: boolean
    onToggleExpand: () => void
    onEdit: () => void
    onDelete: () => void
    onAddRecharge: () => void
    formatDate: (date: string) => string
    formatCurrency: (amount: number) => string
    getVencimientoStatus: (phone: PhoneData) => { status: string; label: string; color: string }
}) {
    const vencimiento = getVencimientoStatus(phone)

    const statusColors: Record<string, string> = {
        "sin-recarga": theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-600",
        "vencido": theme === "dark" ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600",
        "proximo": theme === "dark" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-600",
        "vigente": theme === "dark" ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600",
    }

    return (
        <div className="p-4">
            {/* Información principal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className={cn(
                        "p-2 rounded-lg",
                        theme === "dark" ? "bg-purple-500/20" : "bg-emerald-100"
                    )}>
                        <Smartphone className={cn(
                            "w-5 h-5",
                            theme === "dark" ? "text-purple-400" : "text-emerald-600"
                        )} />
                    </div>
                    <div>
                        <h4 className={cn(
                            "font-semibold",
                            theme === "dark" ? "text-white" : "text-gray-800"
                        )}>
                            {phone.numeroTelefono}
                        </h4>
                        <p className={cn(
                            "text-sm",
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                        )}>
                            {phone.modelo}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full flex items-center gap-1",
                                theme === "dark" ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-600"
                            )}>
                                <User className="w-3 h-3" />
                                {phone.asesorAsignado?.nombre || "Sin asignar"}
                            </span>
                            <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                statusColors[vencimiento.status]
                            )}>
                                {vencimiento.label}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onAddRecharge}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            theme === "dark"
                                ? "hover:bg-emerald-500/20 text-emerald-400"
                                : "hover:bg-emerald-100 text-emerald-600"
                        )}
                        title="Agregar recarga"
                    >
                        <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onEdit}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            theme === "dark"
                                ? "hover:bg-blue-500/20 text-blue-400"
                                : "hover:bg-blue-100 text-blue-600"
                        )}
                        title="Editar"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {isGerencia && (
                        <button
                            onClick={onDelete}
                            className={cn(
                                "p-2 rounded-lg transition-colors",
                                theme === "dark"
                                    ? "hover:bg-red-500/20 text-red-400"
                                    : "hover:bg-red-100 text-red-600"
                            )}
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={onToggleExpand}
                        className={cn(
                            "p-2 rounded-lg transition-colors",
                            theme === "dark"
                                ? "hover:bg-white/10 text-gray-400"
                                : "hover:bg-gray-100 text-gray-600"
                        )}
                        title={isExpanded ? "Ocultar historial" : "Ver historial"}
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Información de vencimiento */}
            {phone.ultimaRecarga && (
                <div className={cn(
                    "mt-3 flex flex-wrap gap-4 text-xs",
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Última recarga: {formatDate(phone.ultimaRecarga)}
                    </span>
                    {phone.proximoVencimiento && (
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Vencimiento: {formatDate(phone.proximoVencimiento)}
                        </span>
                    )}
                </div>
            )}

            {/* Historial de recargas */}
            {isExpanded && (
                <div className={cn(
                    "mt-4 pt-4 border-t",
                    theme === "dark" ? "border-white/10" : "border-gray-200"
                )}>
                    <h5 className={cn(
                        "text-sm font-medium mb-3",
                        theme === "dark" ? "text-white" : "text-gray-700"
                    )}>
                        Historial de Recargas y Gastos
                    </h5>
                    {phone.historialRecargas.length === 0 ? (
                        <p className={cn(
                            "text-sm",
                            theme === "dark" ? "text-gray-500" : "text-gray-400"
                        )}>
                            No hay registros de recargas
                        </p>
                    ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {phone.historialRecargas
                                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                                .map(recharge => (
                                    <div
                                        key={recharge._id}
                                        className={cn(
                                            "flex items-center justify-between p-2 rounded-lg",
                                            theme === "dark" ? "bg-white/5" : "bg-gray-50"
                                        )}
                                    >
                                        <div>
                                            <span className={cn(
                                                "text-sm font-medium",
                                                theme === "dark" ? "text-white" : "text-gray-800"
                                            )}>
                                                {formatDate(recharge.fecha)} — {recharge.motivo === "Recarga" ? "Recarga" : recharge.descripcion}
                                            </span>
                                            {recharge.registradoPor && (
                                                <span className={cn(
                                                    "text-xs block",
                                                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                                                )}>
                                                    Por: {recharge.registradoPor.nombre}
                                                </span>
                                            )}
                                        </div>
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                                        )}>
                                            {formatCurrency(recharge.monto)}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

/* ========== MODAL CREAR/EDITAR TELÉFONO ========== */
function PhoneModal({ theme, isGerencia, supervisors, asesores, user, phone, onClose, onSave, loadAsesores }: {
    theme: string
    isGerencia: boolean
    supervisors: UserOption[]
    asesores: UserOption[]
    user: any
    phone?: PhoneData
    onClose: () => void
    onSave: (data: any) => Promise<void>
    loadAsesores: (numeroEquipo: string) => void
}) {
    const [form, setForm] = useState({
        supervisor: phone?.supervisor?._id || (isGerencia ? "" : user?._id) || "",
        modelo: phone?.modelo || "",
        numeroTelefono: phone?.numeroTelefono || "",
        asesorAsignado: phone?.asesorAsignado?._id || "",
        notas: phone?.notas || ""
    })
    const [saving, setSaving] = useState(false)

    // Cargar asesores cuando cambia el supervisor (solo para Gerencia)
    useEffect(() => {
        if (isGerencia && form.supervisor) {
            const sup = supervisors.find(s => s._id === form.supervisor)
            if (sup?.numeroEquipo) {
                loadAsesores(sup.numeroEquipo)
            }
        }
    }, [form.supervisor, isGerencia, supervisors, loadAsesores])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.modelo || !form.numeroTelefono) {
            toast.error("Complete los campos obligatorios")
            return
        }
        if (!form.supervisor) {
            toast.error("Debe seleccionar un supervisor")
            return
        }

        setSaving(true)
        try {
            await onSave({
                ...form,
                asesorAsignado: form.asesorAsignado || null
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0" onClick={onClose} />
            <div className={cn(
                "relative w-full max-w-md rounded-xl p-6 shadow-xl animate-scale-in",
                theme === "dark" ? "bg-gray-900" : "bg-white"
            )}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className={cn(
                    "text-lg font-bold mb-4",
                    theme === "dark" ? "text-white" : "text-gray-800"
                )}>
                    {phone ? "Editar Teléfono" : "Nuevo Teléfono"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Supervisor (solo editable por Gerencia) */}
                    {isGerencia ? (
                        <div>
                            <label className={cn(
                                "block text-sm font-medium mb-1",
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}>
                                Supervisor *
                            </label>
                            <select
                                value={form.supervisor}
                                onChange={(e) => {
                                    setForm({ ...form, supervisor: e.target.value, asesorAsignado: "" })
                                }}
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-white"
                                        : "bg-white border-gray-200 text-gray-900"
                                )}
                            >
                                <option value="">Seleccione supervisor</option>
                                {supervisors.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.nombre} - Equipo {s.numeroEquipo}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <input type="hidden" value={form.supervisor} />
                    )}

                    {/* Modelo */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Modelo del dispositivo *
                        </label>
                        <input
                            type="text"
                            value={form.modelo}
                            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                            placeholder="Ej: Samsung Galaxy A14"
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                            )}
                        />
                    </div>

                    {/* Número de teléfono */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Número de teléfono *
                        </label>
                        <input
                            type="tel"
                            value={form.numeroTelefono}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '')
                                setForm({ ...form, numeroTelefono: value })
                            }}
                            placeholder="Ej: 1189754312"
                            disabled={!!phone && !isGerencia}
                            title={!!phone && !isGerencia ? "Solo Gerencia puede modificar el número" : undefined}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400",
                                !!phone && !isGerencia && "opacity-60 cursor-not-allowed"
                            )}
                        />
                    </div>

                    {/* Asesor asignado */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Asesor asignado
                        </label>
                        <select
                            value={form.asesorAsignado}
                            onChange={(e) => setForm({ ...form, asesorAsignado: e.target.value })}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-white border-gray-200 text-gray-900"
                            )}
                        >
                            <option value="">Sin asignar</option>
                            {asesores.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Notas
                        </label>
                        <textarea
                            value={form.notas}
                            onChange={(e) => setForm({ ...form, notas: e.target.value })}
                            rows={2}
                            placeholder="Observaciones adicionales..."
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border resize-none",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                    : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                            )}
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "flex-1 py-2 rounded-lg font-medium transition-colors",
                                theme === "dark"
                                    ? "bg-white/10 hover:bg-white/20 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={cn(
                                "flex-1 py-2 rounded-lg font-medium transition-colors disabled:opacity-50",
                                theme === "dark"
                                    ? "bg-purple-600 hover:bg-purple-700 text-white"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            {saving ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

/* ========== MODAL AGREGAR RECARGA ========== */
function RechargeModal({ theme, phone, onClose, onSave }: {
    theme: string
    phone: PhoneData
    onClose: () => void
    onSave: (data: any) => Promise<void>
}) {
    const [form, setForm] = useState({
        motivo: "Recarga" as "Recarga" | "Otro",
        descripcion: "",
        monto: "",
        fecha: new Date().toISOString().split("T")[0]
    })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!form.monto || parseFloat(form.monto) <= 0) {
            toast.error("Ingrese un monto válido")
            return
        }

        if (form.motivo === "Otro" && !form.descripcion.trim()) {
            toast.error("Ingrese una descripción para el motivo")
            return
        }

        setSaving(true)
        try {
            await onSave({
                motivo: form.motivo,
                descripcion: form.descripcion,
                monto: parseFloat(form.monto),
                fecha: form.fecha
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0" onClick={onClose} />
            <div className={cn(
                "relative w-full max-w-md rounded-xl p-6 shadow-xl animate-scale-in",
                theme === "dark" ? "bg-gray-900" : "bg-white"
            )}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="w-5 h-5" />
                </button>

                <h3 className={cn(
                    "text-lg font-bold mb-2",
                    theme === "dark" ? "text-white" : "text-gray-800"
                )}>
                    Nueva Recarga / Gasto
                </h3>
                <p className={cn(
                    "text-sm mb-4",
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                )}>
                    {phone.numeroTelefono} - {phone.modelo}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Motivo */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Motivo *
                        </label>
                        <select
                            value={form.motivo}
                            onChange={(e) => setForm({ 
                                ...form, 
                                motivo: e.target.value as "Recarga" | "Otro",
                                descripcion: e.target.value === "Recarga" ? "" : form.descripcion
                            })}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-white border-gray-200 text-gray-900"
                            )}
                        >
                            <option value="Recarga">Recarga</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    {/* Descripción (solo si es "Otro") */}
                    {form.motivo === "Otro" && (
                        <div>
                            <label className={cn(
                                "block text-sm font-medium mb-1",
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}>
                                Descripción *
                            </label>
                            <textarea
                                value={form.descripcion}
                                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                rows={2}
                                placeholder="Describa el motivo del gasto..."
                                className={cn(
                                    "w-full px-3 py-2 rounded-lg border resize-none",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                )}
                            />
                        </div>
                    )}

                    {/* Monto */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Monto *
                        </label>
                        <div className="relative">
                            <span className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 text-sm",
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                            )}>
                                $
                            </span>
                            <input
                                type="number"
                                value={form.monto}
                                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className={cn(
                                    "w-full pl-8 pr-3 py-2 rounded-lg border",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                                        : "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
                                )}
                            />
                        </div>
                    </div>

                    {/* Fecha */}
                    <div>
                        <label className={cn(
                            "block text-sm font-medium mb-1",
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                        )}>
                            Fecha
                        </label>
                        <input
                            type="date"
                            value={form.fecha}
                            onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                            className={cn(
                                "w-full px-3 py-2 rounded-lg border",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white"
                                    : "bg-white border-gray-200 text-gray-900"
                            )}
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                "flex-1 py-2 rounded-lg font-medium transition-colors",
                                theme === "dark"
                                    ? "bg-white/10 hover:bg-white/20 text-white"
                                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            )}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className={cn(
                                "flex-1 py-2 rounded-lg font-medium transition-colors disabled:opacity-50",
                                theme === "dark"
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                            )}
                        >
                            {saving ? "Guardando..." : "Registrar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
