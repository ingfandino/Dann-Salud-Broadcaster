"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import { Filter, Download, ChevronDown, ChevronUp, RefreshCw, Search, AlertCircle, Eye, X } from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"

// Interfaces
interface FailedAffiliation {
    _id: string
    nombre: string
    cuil: string
    telefono: string
    obraSocial: string
    leadStatus: string
    lastInteraction: string
    assignedTo?: {
        nombre: string
    }
    supervisor?: string
    source: 'audit' | 'affiliate'
    motivo: string
}

interface User {
    _id: string
    nombre: string
    email: string
    role: string
    numeroEquipo?: string
    active?: boolean
}

// Helper functions
const formatDateTime = (value: string) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    const formattedDate = date.toLocaleDateString("es-AR")
    const formattedTime = date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    })
    return `${formattedDate} ${formattedTime}`
}

const getStatusColor = (status: string, theme: string | undefined) => {
    const s = status?.toLowerCase() || ""
    if (s.includes("fallido") || s.includes("rechazada") || s.includes("caída"))
        return theme === "dark" ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-800"
    if (s.includes("interesado"))
        return theme === "dark" ? "bg-orange-500/20 text-orange-400" : "bg-orange-100 text-orange-800"
    if (s.includes("cortó"))
        return theme === "dark" ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-800"

    return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-800"
}

const getSupervisorClass = (supervisor: string, theme: string | undefined) => {
    const nombreLower = (supervisor || "").toLowerCase()

    // Specific supervisor colors (matching old frontend)
    // RED - 4 supervisors
    if ((nombreLower.includes('nahuel') && nombreLower.includes('sanchez')) ||
        (nombreLower.includes('nahia') && nombreLower.includes('avellaneda')) ||
        (nombreLower.includes('santiago') && nombreLower.includes('goldsztein')) ||
        (nombreLower.includes('facundo') && nombreLower.includes('tevez'))) {
        return theme === "dark" ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800"
    }

    // FUCHSIA - Abigail Vera
    if (nombreLower.includes('abigail') && nombreLower.includes('vera')) {
        return theme === "dark" ? "bg-fuchsia-900 text-fuchsia-200" : "bg-fuchsia-100 text-fuchsia-800"
    }

    // BLUE - Mateo Viera
    if (nombreLower.includes('mateo') && nombreLower.includes('viera')) {
        return theme === "dark" ? "bg-blue-900 text-blue-200" : "bg-blue-100 text-blue-800"
    }

    // PURPLE - Belen Salaverry
    if (nombreLower.includes('belen') && nombreLower.includes('salaverry')) {
        return theme === "dark" ? "bg-purple-900 text-purple-200" : "bg-purple-100 text-purple-800"
    }

    // PINK - Analia Suarez
    if (nombreLower.includes('analia') && nombreLower.includes('suarez')) {
        return theme === "dark" ? "bg-pink-900 text-pink-200" : "bg-pink-100 text-pink-800"
    }

    // GREEN - Erika Cardozo
    if (nombreLower.includes('erika') && nombreLower.includes('cardozo')) {
        return theme === "dark" ? "bg-green-900 text-green-200" : "bg-green-100 text-green-800"
    }

    // YELLOW - Aryel Puiggros
    if (nombreLower.includes('aryel') && nombreLower.includes('puiggros')) {
        return theme === "dark" ? "bg-yellow-900 text-yellow-200" : "bg-yellow-100 text-yellow-800"
    }

    // VIOLET - Joaquín Valdez
    if ((nombreLower.includes('joaquin') && nombreLower.includes('valdez')) ||
        (nombreLower.includes('joquin') && nombreLower.includes('vald ez'))) {
        return theme === "dark" ? "bg-violet-900 text-violet-200" : "bg-violet-100 text-violet-800"
    }

    // GRAY - Luciano Carugno
    if (nombreLower.includes('luciano') && nombreLower.includes('carugno')) {
        return theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-800"
    }

    // AMBER - Alejandro Mejail
    if (nombreLower.includes('alejandro') && nombreLower.includes('mejail')) {
        return theme === "dark" ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-800"
    }

    // ORANGE - Gaston Sarmiento
    if (nombreLower.includes('gaston') && nombreLower.includes('sarmiento')) {
        return theme === "dark" ? "bg-orange-900 text-orange-200" : "bg-orange-100 text-orange-800"
    }

    // Fallback colors for other supervisors
    const colors = [
        { light: "bg-teal-100 text-teal-800", dark: "bg-teal-900 text-teal-200" },
        { light: "bg-cyan-100 text-cyan-800", dark: "bg-cyan-900 text-cyan-200" },
        { light: "bg-rose-100 text-rose-800", dark: "bg-rose-900 text-rose-200" },
        { light: "bg-emerald-100 text-emerald-800", dark: "bg-emerald-900 text-emerald-200" },
        { light: "bg-indigo-100 text-indigo-800", dark: "bg-indigo-900 text-indigo-200" },
    ]

    // Simple hash based on supervisor name length
    const hash = supervisor.length % colors.length
    return theme === "dark" ? colors[hash].dark : colors[hash].light
}

const formatMotivo = (text: string) => {
    if (!text || text === '-') return '-'
    const lower = text.toLowerCase()
    return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export function FailedAffiliations() {
    const { theme } = useTheme()
    const { user } = useAuth()

    // State
    const [affiliates, setAffiliates] = useState<FailedAffiliation[]>([])
    const [loading, setLoading] = useState(false)
    const [filtersExpanded, setFiltersExpanded] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [stats, setStats] = useState<Record<string, number>>({})
    const [motivoModalOpen, setMotivoModalOpen] = useState(false)
    const [selectedMotivo, setSelectedMotivo] = useState("")

    // Filter states
    const [filters, setFilters] = useState({
        asesor: "",
        supervisor: "",
        cuil: "",
        dateFrom: "",
        dateTo: "",
    })

    // Dropdown states
    const [isAsesorDropdownOpen, setIsAsesorDropdownOpen] = useState(false)
    const [isSupervisorDropdownOpen, setIsSupervisorDropdownOpen] = useState(false)

    // Lists for dropdowns
    const [asesoresList, setAsesoresList] = useState<User[]>([])
    const [supervisoresList, setSupervisoresList] = useState<User[]>([])

    // Refs
    const asesorFilterRef = useRef<HTMLDivElement>(null)
    const supervisorFilterRef = useRef<HTMLDivElement>(null)

    // Load initial data
    useEffect(() => {
        fetchFilterOptions()
        fetchFailedAffiliations()
    }, [])

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (asesorFilterRef.current && !asesorFilterRef.current.contains(event.target as Node)) {
                setIsAsesorDropdownOpen(false)
            }
            if (supervisorFilterRef.current && !supervisorFilterRef.current.contains(event.target as Node)) {
                setIsSupervisorDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchFilterOptions = async () => {
        try {
            const usersRes = await api.users.list()
            const usersData = Array.isArray(usersRes.data) ? usersRes.data : []

            // Asesores
            const asesores = usersData
                .filter((u: User) => u.active !== false && (u.role === "asesor" || u.role === "Asesor"))
                .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
            setAsesoresList(asesores)

            // Supervisores
            const supervisores = usersData
                .filter((u: User) => u.active !== false && (u.role === "supervisor" || u.role === "Supervisor"))
                .sort((a: User, b: User) => a.nombre.localeCompare(b.nombre))
            setSupervisoresList(supervisores)
        } catch (err) {
            console.error("Error loading filter options:", err)
        }
    }

    const fetchFailedAffiliations = async () => {
        try {
            setLoading(true)
            const { data } = await api.affiliates.getFailed({ page, limit: 100 })

            let filtered = data.affiliates || []

            // Set stats from backend
            if (data.stats) {
                setStats(data.stats)
            }

            // Client-side filtering
            if (filters.asesor) {
                filtered = filtered.filter((a: FailedAffiliation) =>
                    a.assignedTo?.nombre?.toLowerCase().includes(filters.asesor.toLowerCase())
                )
            }
            if (filters.supervisor) {
                filtered = filtered.filter((a: FailedAffiliation) =>
                    a.supervisor?.toLowerCase().includes(filters.supervisor.toLowerCase())
                )
            }
            if (filters.cuil) {
                filtered = filtered.filter((a: FailedAffiliation) => a.cuil.includes(filters.cuil))
            }

            setAffiliates(filtered)
            setTotalPages(data.pages)
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar afiliaciones fallidas")
        } finally {
            setLoading(false)
        }
    }

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }))
    }

    const clearFilters = () => {
        setFilters({
            asesor: "",
            supervisor: "",
            cuil: "",
            dateFrom: "",
            dateTo: "",
        })
        fetchFailedAffiliations()
    }

    const handleExportXLSX = () => {
        if (!affiliates.length) {
            toast.info("No hay datos para exportar")
            return
        }

        const rows = affiliates.map(a => ({
            "Fecha": formatDateTime(a.lastInteraction),
            "Nombre": a.nombre,
            "CUIL": a.cuil,
            "Teléfono": a.telefono,
            "Estado": a.leadStatus,
            "Motivo": a.motivo,
            "Asesor": a.assignedTo?.nombre || "-",
            "Supervisor": a.supervisor || "-",
            "Origen": a.source === 'audit' ? 'Auditoría' : 'Base de Datos'
        }))

        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Afiliaciones Fallidas")
        XLSX.writeFile(wb, `afiliaciones_fallidas_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h2 className={cn("text-2xl font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                        <span className="p-2 rounded-lg bg-red-500/20 text-red-500">
                            <AlertCircle className="w-6 h-6" />
                        </span>
                        Afiliaciones Fallidas
                    </h2>
                    <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Listado de ventas caídas, rechazadas y leads fallidos
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleExportXLSX}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                            theme === "dark"
                                ? "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                        )}
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={cn(
                "rounded-2xl border p-4 transition-all duration-300",
                theme === "dark" ? "bg-[#1a1333]/50 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Filter className={cn("w-4 h-4", theme === "dark" ? "text-purple-400" : "text-purple-600")} />
                        <h3 className={cn("font-medium", theme === "dark" ? "text-gray-200" : "text-gray-700")}>Filtros</h3>
                    </div>
                    <button
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        className={cn("p-1 rounded-lg transition-colors", theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-100")}
                    >
                        {filtersExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>

                {filtersExpanded && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Asesor Filter */}
                        <div className="relative" ref={asesorFilterRef}>
                            <label className="text-xs font-medium mb-1.5 block text-gray-500">Asesor</label>
                            <div
                                onClick={() => setIsAsesorDropdownOpen(!isAsesorDropdownOpen)}
                                className={cn(
                                    "w-full px-3 py-2 rounded-xl text-sm border cursor-pointer flex items-center justify-between",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-gray-300 hover:border-purple-500/50"
                                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300"
                                )}
                            >
                                <span className="truncate">{filters.asesor || "Todos los asesores"}</span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                            </div>
                            {isAsesorDropdownOpen && (
                                <div className={cn(
                                    "absolute top-full left-0 w-full mt-1 rounded-xl border shadow-xl z-50 max-h-60 overflow-y-auto",
                                    theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-100"
                                )}>
                                    <div
                                        onClick={() => {
                                            handleFilterChange("asesor", "")
                                            setIsAsesorDropdownOpen(false)
                                        }}
                                        className={cn(
                                            "px-3 py-2 text-sm cursor-pointer transition-colors",
                                            theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        Todos los asesores
                                    </div>
                                    {asesoresList.map((asesor) => (
                                        <div
                                            key={asesor._id}
                                            onClick={() => {
                                                handleFilterChange("asesor", asesor.nombre)
                                                setIsAsesorDropdownOpen(false)
                                            }}
                                            className={cn(
                                                "px-3 py-2 text-sm cursor-pointer transition-colors",
                                                theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700",
                                                filters.asesor === asesor.nombre && (theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                                            )}
                                        >
                                            {asesor.nombre}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Supervisor Filter */}
                        <div className="relative" ref={supervisorFilterRef}>
                            <label className="text-xs font-medium mb-1.5 block text-gray-500">Supervisor</label>
                            <div
                                onClick={() => setIsSupervisorDropdownOpen(!isSupervisorDropdownOpen)}
                                className={cn(
                                    "w-full px-3 py-2 rounded-xl text-sm border cursor-pointer flex items-center justify-between",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-gray-300 hover:border-purple-500/50"
                                        : "bg-gray-50 border-gray-200 text-gray-700 hover:border-purple-300"
                                )}
                            >
                                <span className="truncate">{filters.supervisor || "Todos los supervisores"}</span>
                                <ChevronDown className="w-4 h-4 opacity-50" />
                            </div>
                            {isSupervisorDropdownOpen && (
                                <div className={cn(
                                    "absolute top-full left-0 w-full mt-1 rounded-xl border shadow-xl z-50 max-h-60 overflow-y-auto",
                                    theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-100"
                                )}>
                                    <div
                                        onClick={() => {
                                            handleFilterChange("supervisor", "")
                                            setIsSupervisorDropdownOpen(false)
                                        }}
                                        className={cn(
                                            "px-3 py-2 text-sm cursor-pointer transition-colors",
                                            theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        Todos los supervisores
                                    </div>
                                    {supervisoresList.map((sup) => (
                                        <div
                                            key={sup._id}
                                            onClick={() => {
                                                handleFilterChange("supervisor", sup.nombre)
                                                setIsSupervisorDropdownOpen(false)
                                            }}
                                            className={cn(
                                                "px-3 py-2 text-sm cursor-pointer transition-colors",
                                                theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700",
                                                filters.supervisor === sup.nombre && (theme === "dark" ? "bg-purple-500/20 text-purple-300" : "bg-purple-50 text-purple-700")
                                            )}
                                        >
                                            {sup.nombre}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* CUIL Filter */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 block text-gray-500">CUIL</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={filters.cuil}
                                    onChange={(e) => handleFilterChange("cuil", e.target.value)}
                                    placeholder="Buscar por CUIL..."
                                    className={cn(
                                        "w-full px-3 py-2 rounded-xl text-sm border pl-9 transition-all outline-none",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                                            : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-300"
                                    )}
                                />
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        {/* Date Range Filter */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-xs font-medium mb-1.5 block text-gray-500">Desde</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-xl text-sm border outline-none",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                                            : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-300"
                                    )}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium mb-1.5 block text-gray-500">Hasta</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                                    className={cn(
                                        "w-full px-3 py-2 rounded-xl text-sm border outline-none",
                                        theme === "dark"
                                            ? "bg-white/5 border-white/10 text-white focus:border-purple-500/50"
                                            : "bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-300"
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={clearFilters}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-colors",
                            theme === "dark"
                                ? "text-gray-400 hover:text-white hover:bg-white/5"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        )}
                    >
                        Limpiar filtros
                    </button>
                    <button
                        onClick={fetchFailedAffiliations}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95",
                            theme === "dark"
                                ? "bg-gradient-to-r from-purple-600 to-blue-600"
                                : "bg-gradient-to-r from-purple-600 to-blue-600"
                        )}
                    >
                        Aplicar filtros
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className={cn(
                "rounded-2xl border overflow-hidden",
                theme === "dark" ? "bg-[#1a1333]/50 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={cn(
                                "text-left text-xs font-medium uppercase tracking-wider",
                                theme === "dark" ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500"
                            )}>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Afiliado</th>
                                <th className="px-4 py-3">CUIL</th>
                                <th className="px-4 py-3">Teléfono</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Motivo</th>
                                <th className="px-4 py-3">Asesor</th>
                                <th className="px-4 py-3">Supervisor</th>
                            </tr>
                        </thead>
                        <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-gray-100")}>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
                                            <span className="text-gray-500">Cargando datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : affiliates.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                                        No se encontraron afiliaciones fallidas
                                    </td>
                                </tr>
                            ) : (
                                affiliates.map((affiliate) => (
                                    <tr
                                        key={affiliate._id}
                                        className={cn(
                                            "transition-colors text-sm",
                                            theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDateTime(affiliate.lastInteraction)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-xs">{affiliate.nombre.toUpperCase()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">{affiliate.cuil || "-"}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">{affiliate.telefono || "-"}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", getStatusColor(affiliate.leadStatus, theme))}>
                                                {affiliate.leadStatus}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {affiliate.motivo && affiliate.motivo !== '-' ? (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMotivo(formatMotivo(affiliate.motivo))
                                                        setMotivoModalOpen(true)
                                                    }}
                                                    className={cn(
                                                        "flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors",
                                                        theme === "dark"
                                                            ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                                                    )}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                    Ver
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">{affiliate.assignedTo?.nombre || "-"}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium", getSupervisorClass(affiliate.supervisor || '', theme))}>
                                                {affiliate.supervisor || "-"}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Motivo Modal */}
            {motivoModalOpen && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
                    onClick={() => setMotivoModalOpen(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                            "animate-in zoom-in-95 fade-in duration-200",
                            "relative max-w-lg w-full rounded-2xl shadow-2xl border p-6",
                            theme === "dark"
                                ? "bg-[#1a1333] border-white/10"
                                : "bg-white border-gray-200"
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn(
                                "text-lg font-semibold",
                                theme === "dark" ? "text-white" : "text-gray-800"
                            )}>
                                Motivo del Estado
                            </h3>
                            <button
                                onClick={() => setMotivoModalOpen(false)}
                                className={cn(
                                    "p-1 rounded-lg transition-colors",
                                    theme === "dark"
                                        ? "hover:bg-white/10 text-gray-400 hover:text-white"
                                        : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className={cn(
                            "p-4 rounded-lg",
                            theme === "dark" ? "bg-white/5" : "bg-gray-50"
                        )}>
                            <p className={cn(
                                "text-sm whitespace-pre-wrap",
                                theme === "dark" ? "text-gray-300" : "text-gray-700"
                            )}>
                                {selectedMotivo}
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
