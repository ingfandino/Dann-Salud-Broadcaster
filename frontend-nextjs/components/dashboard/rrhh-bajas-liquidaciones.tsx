"use client"

import { useState, useEffect } from "react"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
    DollarSign,
    Clock,
    CheckCircle,
    RefreshCw,
    Search,
    CalendarDays,
    User,
    Briefcase,
    Users,
    TrendingUp,
    AlertCircle
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"

interface Separation {
    _id: string
    employeeId: {
        _id: string
        nombreCompleto: string
        cargo: string
        numeroEquipo: string
    }
    userId: {
        _id: string
        nombre: string
        email: string
        role: string
    }
    nombreEmpleado: string
    cargo: string
    numeroEquipo: string
    fechaInicio: string
    fechaBaja: string
    motivoBaja: string
    motivoBajaNormalizado: string | null
    correspondeLiquidacion: string
    ventasQRHistorico: number
    ventasQRMesBaja: number
    liquidacionPagada: boolean
    fechaPagoLiquidacion: string | null
    pagadaPor: {
        _id: string
        nombre: string
    } | null
    createdAt: string
}

const MOTIVO_BAJA_OPTIONS = [
    { value: '', label: 'Sin asignar' },
    { value: 'Renuncia', label: 'Renuncia' },
    { value: 'Despido por bajo rendimiento', label: 'Despido por bajo rendimiento' },
    { value: 'Despido por inasistencias', label: 'Despido por inasistencias' },
]

export function RRHHBajasLiquidaciones() {
    const { theme } = useTheme()
    const { user } = useAuth()
    const isGerencia = user?.role?.toLowerCase() === 'gerencia'
    const [loading, setLoading] = useState(true)
    const [pendientes, setPendientes] = useState<Separation[]>([])
    const [pagadas, setPagadas] = useState<Separation[]>([])
    const [mesActual, setMesActual] = useState("")
    const [busqueda, setBusqueda] = useState("")
    const [markingPaid, setMarkingPaid] = useState<string | null>(null)
    const [updatingMotivo, setUpdatingMotivo] = useState<string | null>(null)

    useEffect(() => {
        fetchSeparations()
    }, [])

    const fetchSeparations = async () => {
        try {
            setLoading(true)
            const response = await api.separations.list()

            if (response.data.success) {
                setPendientes(response.data.data.pendientes || [])
                setPagadas(response.data.data.pagadas || [])
                setMesActual(response.data.data.mesActual || "")
            }
        } catch (error: any) {
            console.error("Error fetching separations:", error)
            if (error.response?.status === 403) {
                toast.error("No tienes permisos para ver esta sección")
            } else {
                toast.error("Error al cargar bajas y liquidaciones")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleMarkAsPaid = async (id: string, nombreEmpleado: string) => {
        if (!confirm(`¿Confirmas que la liquidación de ${nombreEmpleado} ha sido pagada?`)) {
            return
        }

        try {
            setMarkingPaid(id)
            const response = await api.separations.markPaid(id)

            if (response.data.success) {
                toast.success(`Liquidación de ${nombreEmpleado} marcada como pagada`)
                fetchSeparations() // Refrescar datos
            }
        } catch (error) {
            console.error("Error marking as paid:", error)
            toast.error("Error al marcar como pagada")
        } finally {
            setMarkingPaid(null)
        }
    }

    const handleUpdateMotivoBaja = async (id: string, motivoBajaNormalizado: string | null) => {
        try {
            setUpdatingMotivo(id)
            const response = await api.separations.updateMotivoBaja(id, motivoBajaNormalizado)
            if (response.data.success) {
                toast.success('Motivo de baja actualizado')
                fetchSeparations()
            }
        } catch (error) {
            console.error('Error updating motivo baja:', error)
            toast.error('Error al actualizar motivo de baja')
        } finally {
            setUpdatingMotivo(null)
        }
    }

    // Filtrar por búsqueda
    const filterBySearch = (items: Separation[]) => {
        if (!busqueda.trim()) return items
        const search = busqueda.toLowerCase()
        return items.filter(sep =>
            sep.nombreEmpleado.toLowerCase().includes(search) ||
            sep.userId?.email?.toLowerCase().includes(search) ||
            sep.cargo?.toLowerCase().includes(search) ||
            sep.numeroEquipo?.toLowerCase().includes(search)
        )
    }

    const filteredPendientes = filterBySearch(pendientes)
    const filteredPagadas = filterBySearch(pagadas)

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-"
        // Usar timeZone UTC para evitar conversión a hora local (off-by-one-day)
        return new Date(dateStr).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC"
        })
    }

    const formatMes = (mesStr: string) => {
        if (!mesStr) return ""
        const [year, month] = mesStr.split("-")
        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ]
        return `${meses[parseInt(month) - 1]} ${year}`
    }

    // Stats cards
    const statsCards = [
        {
            label: "Pendientes",
            value: pendientes.length,
            icon: Clock,
            color: "#F4C04A"
        },
        {
            label: "Pagadas (mes)",
            value: pagadas.length,
            icon: CheckCircle,
            color: "#17C787"
        },
        {
            label: "Total",
            value: pendientes.length + pagadas.length,
            icon: DollarSign,
            color: "#7C3AED"
        }
    ]

    const cargoColors: Record<string, string> = {
        supervisor: "#17C787",
        auditor: "#1E88E5",
        asesor: "#F4C04A",
        admin: "#C62FA8",
        rrhh: "#C8376B",
        gerencia: "#7C3AED",
        administrativo: "#FF6B6B",
        recuperador: "#00BCD4"
    }

    const SeparationTable = ({
        separations,
        isPending,
        title,
        icon: Icon,
        color
    }: {
        separations: Separation[]
        isPending: boolean
        title: string
        icon: typeof Clock
        color: string
    }) => (
        <div
            className={cn(
                "rounded-2xl border p-6",
                theme === "dark"
                    ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                    : "bg-white border-gray-200 shadow-sm"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${color}20` }}
                    >
                        <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                    <div>
                        <h3 className={cn(
                            "text-lg font-semibold",
                            theme === "dark" ? "text-white" : "text-gray-800"
                        )}>
                            {title}
                        </h3>
                        <p className={cn(
                            "text-sm",
                            theme === "dark" ? "text-gray-400" : "text-gray-500"
                        )}>
                            {separations.length} registros
                        </p>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {separations.length === 0 && (
                <div className="text-center py-12">
                    <AlertCircle className={cn(
                        "w-12 h-12 mx-auto mb-4",
                        theme === "dark" ? "text-gray-600" : "text-gray-400"
                    )} />
                    <p className={cn(
                        "text-sm",
                        theme === "dark" ? "text-gray-500" : "text-gray-400"
                    )}>
                        {isPending
                            ? "No hay liquidaciones pendientes este mes"
                            : "No hay liquidaciones pagadas este mes"
                        }
                    </p>
                </div>
            )}

            {/* Table */}
            {separations.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={theme === "dark" ? "bg-white/5" : "bg-gray-50"}>
                                {[
                                    "EMPLEADO",
                                    "FECHA INGRESO",
                                    "FECHA BAJA",
                                    "MOTIVO",
                                    "CORRESPONDE LIQ.",
                                    "CARGO",
                                    "EQUIPO",
                                    "QR MES",
                                    "QR TOTAL",
                                    isPending ? "ACCIÓN" : "PAGADO"
                                ].map((header) => (
                                    <th
                                        key={header}
                                        className={cn(
                                            "px-3 py-3 text-left font-semibold text-xs",
                                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                                        )}
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {separations.map((sep) => (
                                <tr
                                    key={sep._id}
                                    className={cn(
                                        "border-t transition-colors",
                                        theme === "dark"
                                            ? "border-white/5 hover:bg-white/5"
                                            : "border-gray-100 hover:bg-gray-50"
                                    )}
                                >
                                    {/* Empleado */}
                                    <td className="px-3 py-4">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold",
                                                    theme === "dark" ? "bg-purple-500/30" : "bg-purple-100"
                                                )}
                                            >
                                                {sep.nombreEmpleado?.charAt(0)?.toUpperCase() || "?"}
                                            </div>
                                            <div>
                                                <p className={cn(
                                                    "font-medium",
                                                    theme === "dark" ? "text-white" : "text-gray-800"
                                                )}>
                                                    {sep.nombreEmpleado}
                                                </p>
                                                <p className={cn(
                                                    "text-xs",
                                                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                                                )}>
                                                    {sep.userId?.email || "-"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Fecha ingreso */}
                                    <td className={cn(
                                        "px-3 py-4",
                                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                                    )}>
                                        <div className="flex items-center gap-1">
                                            <CalendarDays className="w-3 h-3" />
                                            {formatDate(sep.fechaInicio)}
                                        </div>
                                    </td>

                                    {/* Fecha baja */}
                                    <td className={cn(
                                        "px-3 py-4",
                                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                                    )}>
                                        <div className="flex items-center gap-1">
                                            <CalendarDays className="w-3 h-3 text-red-500" />
                                            {formatDate(sep.fechaBaja)}
                                        </div>
                                    </td>

                                    {/* Motivo de baja normalizado */}
                                    <td className="px-3 py-4">
                                        {isGerencia ? (
                                            <select
                                                value={sep.motivoBajaNormalizado || ''}
                                                onChange={(e) => handleUpdateMotivoBaja(
                                                    sep._id,
                                                    e.target.value || null
                                                )}
                                                disabled={updatingMotivo === sep._id}
                                                className={cn(
                                                    "px-2 py-1 rounded-lg border text-xs font-medium min-w-[140px]",
                                                    updatingMotivo === sep._id && "opacity-50 cursor-not-allowed",
                                                    !sep.motivoBajaNormalizado && "italic",
                                                    theme === "dark"
                                                        ? "bg-white/5 border-white/10 text-white"
                                                        : "bg-white border-gray-200 text-gray-800"
                                                )}
                                            >
                                                {MOTIVO_BAJA_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={cn(
                                                "text-xs",
                                                sep.motivoBajaNormalizado
                                                    ? (theme === "dark" ? "text-gray-300" : "text-gray-700")
                                                    : "italic " + (theme === "dark" ? "text-gray-500" : "text-gray-400")
                                            )}>
                                                {sep.motivoBajaNormalizado || 'Pendiente de normalización'}
                                            </span>
                                        )}
                                    </td>

                                    {/* Corresponde liquidación */}
                                    <td className="px-3 py-4">
                                        <span className={cn(
                                            "px-2 py-1 rounded text-xs font-medium",
                                            sep.correspondeLiquidacion === 'Sí'
                                                ? (theme === "dark" ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700")
                                                : (theme === "dark" ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700")
                                        )}>
                                            {sep.correspondeLiquidacion || 'No'}
                                        </span>
                                    </td>

                                    {/* Cargo */}
                                    <td className="px-3 py-4">
                                        <span
                                            className="px-2 py-1 rounded text-xs font-medium text-white capitalize"
                                            style={{
                                                backgroundColor: cargoColors[sep.cargo?.toLowerCase()] || "#6B7280"
                                            }}
                                        >
                                            {sep.cargo || "-"}
                                        </span>
                                    </td>

                                    {/* Equipo */}
                                    <td className="px-3 py-4">
                                        <div className="flex items-center gap-1">
                                            <Users className="w-3 h-3" style={{ color: "#1E88E5" }} />
                                            <span className={cn(
                                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                                            )}>
                                                {sep.numeroEquipo || "S/E"}
                                            </span>
                                        </div>
                                    </td>

                                    {/* QR Mes Baja */}
                                    <td className="px-3 py-4">
                                        <div className={cn(
                                            "flex items-center gap-1 font-semibold",
                                            sep.ventasQRMesBaja > 0 ? "text-green-500" : "text-gray-400"
                                        )}>
                                            <TrendingUp className="w-3 h-3" />
                                            {sep.ventasQRMesBaja}
                                        </div>
                                    </td>

                                    {/* QR Total Histórico */}
                                    <td className="px-3 py-4">
                                        <div className={cn(
                                            "flex items-center gap-1 font-bold",
                                            theme === "dark" ? "text-purple-400" : "text-purple-600"
                                        )}>
                                            <DollarSign className="w-3 h-3" />
                                            {sep.ventasQRHistorico}
                                        </div>
                                    </td>

                                    {/* Acción / Estado de pago */}
                                    <td className="px-3 py-4">
                                        {isPending ? (
                                            <button
                                                onClick={() => handleMarkAsPaid(sep._id, sep.nombreEmpleado)}
                                                disabled={markingPaid === sep._id || sep.correspondeLiquidacion !== 'Sí'}
                                                title={sep.correspondeLiquidacion !== 'Sí' ? 'No corresponde liquidación para este motivo de baja' : ''}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                                                    (markingPaid === sep._id || sep.correspondeLiquidacion !== 'Sí')
                                                        ? "opacity-50 cursor-not-allowed"
                                                        : "hover:scale-105",
                                                    theme === "dark"
                                                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                                        : "bg-green-100 text-green-700 hover:bg-green-200"
                                                )}
                                            >
                                                {markingPaid === sep._id ? (
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <CheckCircle className="w-3 h-3" />
                                                )}
                                                {markingPaid === sep._id ? "Procesando..." : "Marcar pagada"}
                                            </button>
                                        ) : (
                                            <div className="text-xs">
                                                <div className="flex items-center gap-1 text-green-500">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Pagada
                                                </div>
                                                <p className={cn(
                                                    "text-[10px] mt-1",
                                                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                                                )}>
                                                    {formatDate(sep.fechaPagoLiquidacion || "")}
                                                    {sep.pagadaPor && ` por ${sep.pagadaPor.nombre}`}
                                                </p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Encabezado con mes actual */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className={cn(
                        "text-xl font-bold flex items-center gap-2",
                        theme === "dark" ? "text-white" : "text-gray-800"
                    )}>
                        <DollarSign className="w-6 h-6" style={{ color: "#7C3AED" }} />
                        Bajas y Liquidaciones
                    </h2>
                    <p className={cn(
                        "text-sm mt-1",
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                    )}>
                        Gestión de liquidaciones del mes de{" "}
                        <span className="font-semibold" style={{ color: "#7C3AED" }}>
                            {formatMes(mesActual)}
                        </span>
                    </p>
                </div>

                {/* Barra de búsqueda */}
                <div className="flex-1 max-w-sm">
                    <div className="relative">
                        <Search
                            className={cn(
                                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
                                theme === "dark" ? "text-gray-500" : "text-gray-400"
                            )}
                        />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email, cargo..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className={cn(
                                "w-full pl-10 pr-4 py-2 rounded-lg border text-sm",
                                theme === "dark"
                                    ? "bg-white/5 border-white/10 text-white placeholder-gray-500"
                                    : "bg-white border-gray-200 text-gray-800 placeholder-gray-400"
                            )}
                        />
                    </div>
                </div>
            </div>

            {/* Tarjetas de estadísticas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statsCards.map((stat, index) => {
                    const Icon = stat.icon
                    return (
                        <div
                            key={index}
                            className={cn(
                                "rounded-xl border p-4 flex items-center justify-between",
                                theme === "dark"
                                    ? "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10"
                                    : "bg-white border-gray-200 shadow-sm"
                            )}
                        >
                            <div>
                                <p className={cn(
                                    "text-xs",
                                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                                )}>
                                    {stat.label}
                                </p>
                                <p
                                    className="text-2xl font-bold"
                                    style={{ color: stat.color }}
                                >
                                    {stat.value}
                                </p>
                            </div>
                            <div
                                className="p-3 rounded-lg"
                                style={{ backgroundColor: `${stat.color}20` }}
                            >
                                <Icon className="w-6 h-6" style={{ color: stat.color }} />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Estado de carga */}
            {loading && (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            )}

            {/* Contenido */}
            {!loading && (
                <div className="space-y-6">
                    {/* Liquidaciones pendientes */}
                    <SeparationTable
                        separations={filteredPendientes}
                        isPending={true}
                        title="Liquidaciones Pendientes"
                        icon={Clock}
                        color="#F4C04A"
                    />

                    {/* Liquidaciones pagadas */}
                    <SeparationTable
                        separations={filteredPagadas}
                        isPending={false}
                        title="Liquidaciones Pagadas (mes actual)"
                        icon={CheckCircle}
                        color="#17C787"
                    />
                </div>
            )}
        </div>
    )
}
