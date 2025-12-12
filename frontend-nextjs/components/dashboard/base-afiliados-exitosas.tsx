"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
    Filter, Download, Calendar, BarChart3, Eye,
    X, ChevronDown, ChevronUp, RefreshCw, Search
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import * as XLSX from "xlsx"

// Interfaces
interface Audit {
    _id: string
    nombre: string
    cuil?: string
    telefono: string
    tipoVenta: string
    obraSocialAnterior?: string
    obraSocialVendida: string
    scheduledAt: string
    status: string
    statusUpdatedAt?: string
    asesor?: {
        _id: string
        nombre: string
        numeroEquipo?: string
        supervisor?: {
            nombre: string
        }
    }
    auditor?: {
        _id: string
        nombre: string
    }
    administrador?: {
        _id: string
        nombre: string
    }
    groupId?: {
        _id: string
        nombre: string
        numeroEquipo?: string
    }
    isRecuperada?: boolean
    datosExtra?: string
    createdAt: string
    migrada?: boolean
    fechaCreacionQR?: string
    supervisorSnapshot?: {
        _id: string
        nombre: string
        numeroEquipo: string
    }
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

const getSupervisorName = (audit: Audit): string => {
    if (audit.supervisorSnapshot?.nombre) {
        return audit.supervisorSnapshot.nombre
    }
    if (audit.asesor?.supervisor?.nombre) {
        return audit.asesor.supervisor.nombre
    }
    return "-"
}

const getSupervisorColor = (nombre: string, theme: string | undefined) => {
    const nombreLower = nombre.toLowerCase()

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
        (nombreLower.includes('joquin') && nombreLower.includes('valdez'))) {
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

    return theme === "dark" ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-800"
}

const getObraVendidaClass = (obraSocial: string, theme: string | undefined) => {
    const v = obraSocial?.toLowerCase()?.trim()
    if (v === "binimed") return theme === "dark" ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-800"
    if (v === "meplife" || v === "meplife ") return theme === "dark" ? "bg-green-500/20 text-green-400" : "bg-green-200 text-green-800"
    if (v === "turf") return theme === "dark" ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-800"
    return theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-700"
}

export function BaseAfiliadosExitosas() {
    const { theme } = useTheme()
    const { user } = useAuth()

    // State
    const [audits, setAudits] = useState<Audit[]>([])
    const [loading, setLoading] = useState(false)
    const [filtersExpanded, setFiltersExpanded] = useState(true)

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

    // Stats Modal states
    const [showSupervisorStats, setShowSupervisorStats] = useState(false)
    const [showObraSocialStats, setShowObraSocialStats] = useState(false)
    const [supervisorStats, setSupervisorStats] = useState<any[]>([])
    const [obraSocialStats, setObraSocialStats] = useState<any[]>([])
    const [loadingStats, setLoadingStats] = useState(false)

    // Refs
    const asesorFilterRef = useRef<HTMLDivElement>(null)
    const supervisorFilterRef = useRef<HTMLDivElement>(null)

    // Load initial data
    useEffect(() => {
        console.log("BaseAfiliadosExitosas: Component mounted")
        fetchFilterOptions()
        fetchAudits()
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
        console.log("BaseAfiliadosExitosas: fetchFilterOptions started")
        try {
            const usersRes = await api.users.list()
            const usersData = Array.isArray(usersRes.data) ? usersRes.data : []
            console.log("BaseAfiliadosExitosas: users loaded", usersData.length)

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

    const fetchAudits = async () => {
        console.log("BaseAfiliadosExitosas: fetchAudits started")
        try {
            setLoading(true)
            const params: any = {
                estado: "QR hecho",
                ignoreDate: "true", // Default to all history unless date filter is set
            }

            if (filters.asesor) params.asesor = filters.asesor
            if (filters.supervisor) params.supervisor = filters.supervisor
            if (filters.cuil) params.cuil = filters.cuil

            if (filters.dateFrom && filters.dateTo) {
                params.dateFrom = filters.dateFrom
                params.dateTo = filters.dateTo
                params.dateField = "fechaCreacionQR" // Filter by QR date
                delete params.ignoreDate
            }

            console.log("BaseAfiliadosExitosas: fetching with params", params)
            const { data } = await api.audits.list(params)
            console.log("BaseAfiliadosExitosas: audits loaded", Array.isArray(data) ? data.length : 0)
            // Sort by date descending (newest first)
            const sortedData = (Array.isArray(data) ? data : []).sort((a: Audit, b: Audit) => {
                const dateA = new Date(a.fechaCreacionQR || a.scheduledAt).getTime()
                const dateB = new Date(b.fechaCreacionQR || b.scheduledAt).getTime()
                return dateB - dateA
            })

            setAudits(sortedData)
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar afiliaciones")
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
        fetchAudits()
    }

    const handleExportXLSX = () => {
        if (!audits.length) {
            toast.info("No hay datos para exportar")
            return
        }

        const rows = audits.map(a => ({
            "Fecha de carga": formatDateTime(a.createdAt),
            "Fecha de QR": formatDateTime(a.fechaCreacionQR || a.scheduledAt),
            "Nombre del afiliado": a.nombre,
            "CUIL": a.cuil || "-",
            "Teléfono": a.telefono || "-",
            "Obra social vendida": a.obraSocialVendida || "-",
            "Asesor": a.asesor?.nombre || "-",
            "Supervisor": getSupervisorName(a)
        }))

        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Afiliaciones Exitosas")
        XLSX.writeFile(wb, `afiliaciones_exitosas_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    const openSupervisorStats = async () => {
        setShowSupervisorStats(true)
        setLoadingStats(true)
        try {
            const { data } = await api.audits.getSupervisorStats()
            setSupervisorStats(data)
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar estadísticas")
        } finally {
            setLoadingStats(false)
        }
    }

    const openObraSocialStats = async () => {
        setShowObraSocialStats(true)
        setLoadingStats(true)
        try {
            const { data } = await api.audits.getObraSocialStats()
            setObraSocialStats(data)
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar estadísticas")
        } finally {
            setLoadingStats(false)
        }
    }

    // Calculate summary counts
    const summaryCounts = {
        binimed: audits.filter(a => a.obraSocialVendida?.toLowerCase().trim() === "binimed").length,
        meplife: audits.filter(a => a.obraSocialVendida?.toLowerCase().trim().includes("meplife")).length,
        turf: audits.filter(a => a.obraSocialVendida?.toLowerCase().trim() === "turf").length,
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h2 className={cn("text-2xl font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                        <span className="p-2 rounded-lg bg-green-500/20 text-green-500">
                            <BarChart3 className="w-6 h-6" />
                        </span>
                        Afiliaciones Exitosas
                    </h2>
                    <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Listado histórico de ventas con estado "QR hecho"
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={openSupervisorStats}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                            theme === "dark"
                                ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                                : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        )}
                    >
                        <BarChart3 className="w-4 h-4" />
                        Historial de ventas por Supervisor
                    </button>
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
                                <label className="text-xs font-medium mb-1.5 block text-gray-500">Desde (Fecha QR)</label>
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
                                <label className="text-xs font-medium mb-1.5 block text-gray-500">Hasta (Fecha QR)</label>
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
                        onClick={fetchAudits}
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

            {/* Summary Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    theme === "dark" ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-100"
                )}>
                    <span className={cn("font-medium", theme === "dark" ? "text-blue-300" : "text-blue-700")}>Binimed</span>
                    <span className={cn("text-2xl font-bold", theme === "dark" ? "text-blue-200" : "text-blue-800")}>{summaryCounts.binimed}</span>
                </div>
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    theme === "dark" ? "bg-green-500/10 border-green-500/20" : "bg-green-100 border-green-200"
                )}>
                    <span className={cn("font-medium", theme === "dark" ? "text-green-300" : "text-green-700")}>Meplife</span>
                    <span className={cn("text-2xl font-bold", theme === "dark" ? "text-green-400" : "text-green-800")}>{summaryCounts.meplife}</span>
                </div>
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    theme === "dark" ? "bg-purple-500/10 border-purple-500/20" : "bg-purple-50 border-purple-200"
                )}>
                    <span className={cn("font-medium", theme === "dark" ? "text-purple-300" : "text-purple-700")}>TURF</span>
                    <span className={cn("text-2xl font-bold", theme === "dark" ? "text-purple-200" : "text-purple-800")}>{summaryCounts.turf}</span>
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
                                <th className="px-6 py-4">Fecha de carga</th>
                                <th className="px-6 py-4">Fecha de QR</th>
                                <th className="px-6 py-4">Afiliado</th>
                                <th className="px-6 py-4">CUIL</th>
                                <th className="px-6 py-4">Teléfono</th>
                                <th className="px-6 py-4">Obra Social</th>
                                <th className="px-6 py-4">Asesor</th>
                                <th className="px-6 py-4">Supervisor</th>
                            </tr>
                        </thead>
                        <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-gray-100")}>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
                                            <span className="text-gray-500">Cargando datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : audits.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron afiliaciones exitosas
                                    </td>
                                </tr>
                            ) : (
                                audits.map((audit) => (
                                    <tr
                                        key={audit._id}
                                        className={cn(
                                            "transition-colors text-sm",
                                            theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">{formatDateTime(audit.createdAt)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-green-500">
                                            {formatDateTime(audit.fechaCreacionQR || audit.scheduledAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium">{audit.nombre.toUpperCase()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{audit.cuil || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{audit.telefono || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={cn("px-2 py-1 rounded-md text-xs font-medium", getObraVendidaClass(audit.obraSocialVendida, theme))}>
                                                {audit.obraSocialVendida || "-"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">{audit.asesor?.nombre || "-"}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={cn("px-2 py-1 rounded-md text-xs font-medium", getSupervisorColor(getSupervisorName(audit), theme))}>
                                                {getSupervisorName(audit)}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats Modals */}
            {showSupervisorStats && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSupervisorStats(false)} />
                    <div className={cn(
                        "relative w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in-up max-h-[80vh] overflow-y-auto",
                        theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"
                    )}>
                        <button
                            onClick={() => setShowSupervisorStats(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-purple-500" />
                            Historial de ventas por Supervisor
                        </h3>

                        {loadingStats ? (
                            <div className="flex justify-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {supervisorStats.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                            index === 0 ? "bg-yellow-500 text-white" :
                                                index === 1 ? "bg-gray-400 text-white" :
                                                    index === 2 ? "bg-orange-400 text-white" :
                                                        "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium">{item.nombre}</span>
                                                <span className="font-bold">{item.count}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${(item.count / supervisorStats[0].count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {showObraSocialStats && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowObraSocialStats(false)} />
                    <div className={cn(
                        "relative w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-fade-in-up max-h-[80vh] overflow-y-auto",
                        theme === "dark" ? "bg-[#1a1333] border border-white/10" : "bg-white"
                    )}>
                        <button
                            onClick={() => setShowObraSocialStats(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-blue-500" />
                            Top Obras Sociales (Histórico)
                        </h3>

                        {loadingStats ? (
                            <div className="flex justify-center py-8">
                                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {obraSocialStats.map((item, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                            index === 0 ? "bg-yellow-500 text-white" :
                                                index === 1 ? "bg-gray-400 text-white" :
                                                    index === 2 ? "bg-orange-400 text-white" :
                                                        "bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                                        )}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-medium">{item.nombre}</span>
                                                <span className="font-bold">{item.count}</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${(item.count / obraSocialStats[0].count) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
