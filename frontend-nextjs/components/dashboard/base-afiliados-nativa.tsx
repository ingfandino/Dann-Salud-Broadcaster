/**
 * ============================================================
 * BASE NATIVA (base-afiliados-nativa.tsx)
 * ============================================================
 * Vista de registros adquiridos por el bot de datos nativos.
 * Solo accesible para el rol 'Gerencia'.
 * Visualmente idéntico a failed-affiliations.tsx.
 */

"use client"

import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { useTheme } from "./theme-provider"
import { cn } from "@/lib/utils"
import {
    Filter, Download, ChevronDown, ChevronUp, RefreshCw,
    Search, Database, Play, Square, Pause, X, Plus
} from "lucide-react"
import { api } from "@/lib/api"
import { toast } from "sonner"
import * as XLSX from "xlsx"

/* ─── Interfaces ──────────────────────────────────────────── */
interface PadronData {
    status: 'not_found' | 'found_expired' | 'found_active' | 'captcha_failed' | 'error' | null
    checkedAt: string | null
    canSell: boolean | null
    periodoDesde: string | null
    obraSocial: string | null
}

interface NativeAffiliate {
    _id: string
    nombre: string
    cuil: string
    obraSocial: string
    codigoObraSocial?: string
    provincia?: string
    localidad?: string
    edad?: number
    telefono: string | null
    ultimoAporte?: string
    trimPagos?: number
    dniOrigen?: string
    createdAt: string
    padron?: PadronData | null
}

interface DateasTaskState {
    _id: string
    status: 'pending' | 'running' | 'completed' | 'error' | 'stopped'
    maxIterations: number
    startedAt: string | null
    completedAt: string | null
    paused?: boolean
    finished?: boolean
    progress: {
        total: number
        processed: number
        saved: number
        discarded: number
        lastCode: string | null
        lastError: string | null
    }
}

/* ─── Helpers ─────────────────────────────────────────────── */
const formatDateTime = (value: string) => {
    if (!value) return "-"
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return "-"
    return `${date.toLocaleDateString("es-AR")} ${date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false })}`
}

export function BaseAfiliadosNativa() {
    const { theme } = useTheme()

    /* ─── State ─── */
    const [records, setRecords]               = useState<NativeAffiliate[]>([])
    const [loading, setLoading]               = useState(false)
    const [filtersExpanded, setFiltersExpanded] = useState(true)
    const [page, setPage]                     = useState(1)
    const [totalPages, setTotalPages]         = useState(1)
    const [total, setTotal]                   = useState(0)
    const [activeTask, setActiveTask]         = useState<DateasTaskState | null>(null)
    const [queuedCount, setQueuedCount]       = useState(0)
    const [botLoading, setBotLoading]         = useState(false)
    const [maxIterInput, setMaxIterInput]     = useState("50")
    const [detailRecord, setDetailRecord]     = useState<NativeAffiliate | null>(null)

    const [filters, setFilters] = useState({
        search:     "",
        obraSocial: "",
        provincia:  "",
    })

    const activePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const lastSavedRef  = useRef<number>(0)

    /* ─── Effects ─── */
    useEffect(() => {
        fetchRecords()
        fetchActiveTask()
        activePollRef.current = setInterval(fetchActiveTask, 4000)
        return () => { if (activePollRef.current) clearInterval(activePollRef.current) }
    }, [])

    /* ─── Data fetching ─── */
    const fetchRecords = async () => {
        try {
            setLoading(true)
            const { data } = await api.nativeBot.listAffiliates({
                page,
                limit: 100,
                search:     filters.search     || undefined,
                obraSocial: filters.obraSocial || undefined,
                provincia:  filters.provincia  || undefined,
            })
            setRecords(data.records || [])
            setTotal(data.total || 0)
            setTotalPages(data.pages || 1)
        } catch (err) {
            console.error(err)
            toast.error("Error al cargar registros nativos")
        } finally {
            setLoading(false)
        }
    }

    const fetchActiveTask = async () => {
        try {
            const { data } = await api.dateasBot.status() // Use status to get the signal
            const act = data.active
            if (act) {
                act.paused = data.signal === "pause"
            }
            setActiveTask(act || null)
            setQueuedCount(data.queuedCount || 0)
            const currentSaved = data.active?.progress?.saved ?? 0
            if (currentSaved > lastSavedRef.current) {
                lastSavedRef.current = currentSaved
                fetchRecords()
            }
        } catch { /* silencioso */ }
    }

    /* ─── Bot control ─── */
    const handleEnqueueTask = async () => {
        const maxIterations = parseInt(maxIterInput, 10) || 50
        try {
            setBotLoading(true)
            await api.dateasBot.start({ maxIterations })
            const msg = activeTask?.status === 'running'
                ? `Tarea encolada — ${maxIterations} iteraciones`
                : `Bot iniciado — ${maxIterations} iteraciones`
            toast.success(msg)
            await fetchActiveTask()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'No se pudo iniciar el bot')
        } finally {
            setBotLoading(false)
        }
    }

    const handleStopBot = async () => {
        try {
            setBotLoading(true)
            await api.dateasBot.stop()
            toast.info('Bot detenido')
            await fetchActiveTask()
            await fetchRecords()
        } catch {
            toast.error('Error al detener el bot')
        } finally {
            setBotLoading(false)
        }
    }

    const handlePauseBot = async () => {
        try {
            if (activeTask?.paused) {
                await api.dateasBot.resume()
            } else {
                await api.dateasBot.pause()
            }
            await fetchActiveTask()
        } catch {
            toast.error('Error al pausar/reanudar el bot')
        }
    }

    /* ─── Filters ─── */
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }))
    }

    const clearFilters = () => {
        setFilters({ search: "", obraSocial: "", provincia: "" })
        setTimeout(fetchRecords, 0)
    }

    /* ─── Export ─── */
    const handleExportXLSX = () => {
        if (!records.length) { toast.info("No hay datos para exportar"); return }
        const rows = records.map(r => ({
            "Fecha":              formatDateTime(r.createdAt),
            "Nombre":             r.nombre,
            "CUIL":               r.cuil,
            "Obra Social":        r.obraSocial,
            "Cód. Obra Social":   r.codigoObraSocial || "-",
            "Provincia":          r.provincia || "-",
            "Localidad":          r.localidad || "-",
            "Edad":               r.edad ?? "-",
            "Últ. Aporte":        r.ultimoAporte || "-",
            "Trim. Pagos":        r.trimPagos ?? "-",
        }))
        const ws = XLSX.utils.json_to_sheet(rows)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Base Nativa")
        XLSX.writeFile(wb, `base_nativa_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }

    /* ─── Render ─────────────────────────────────────────── */
    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Encabezado */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h2 className={cn("text-2xl font-bold flex items-center gap-2", theme === "dark" ? "text-white" : "text-gray-800")}>
                        <span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500">
                            <Database className="w-6 h-6" />
                        </span>
                        Base Nativa
                    </h2>
                    <p className={cn("text-sm mt-1", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Registros adquiridos automáticamente — {total} en base
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

            {/* Control del Bot — Compact task-progress card */}
            <div className={cn(
                "rounded-xl border p-3",
                theme === "dark" ? "bg-[#1a1333]/50 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
                {/* Header row: status + queue badge + action buttons */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            activeTask?.status === "running" && !activeTask.paused
                                ? "bg-emerald-400 animate-pulse"
                                : activeTask?.status === "running" && activeTask.paused
                                ? "bg-yellow-400"
                                : activeTask?.finished
                                ? "bg-blue-400"
                                : "bg-gray-400"
                        )} />
                        <span className={cn("text-xs font-semibold", theme === "dark" ? "text-gray-200" : "text-gray-700")}>
                            {activeTask?.status === "running"
                                ? (activeTask.paused ? "Pausado" : "Corriendo")
                                : activeTask?.finished
                                ? "Completado"
                                : "Inactivo"}
                        </span>
                        {activeTask?.status === "running" && (
                            <span className={cn("text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                                {activeTask.progress.processed}/{activeTask.maxIterations}
                            </span>
                        )}
                        {queuedCount > 0 && (
                            <span className={cn(
                                "text-xs px-1.5 py-0.5 rounded-md font-medium",
                                theme === "dark" ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"
                            )}>
                                +{queuedCount} en cola
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        {activeTask?.status === "running" && (
                            <>
                                <button
                                    onClick={handlePauseBot}
                                    title={activeTask.paused ? "Reanudar" : "Pausar"}
                                    className={cn(
                                        "p-1.5 rounded-lg transition-all",
                                        activeTask.paused
                                            ? (theme === "dark"
                                                ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200")
                                            : (theme === "dark"
                                                ? "bg-yellow-500/15 text-yellow-300 hover:bg-yellow-500/25"
                                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200")
                                    )}
                                >
                                    {activeTask.paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                    onClick={handleStopBot}
                                    disabled={botLoading}
                                    title="Detener y limpiar cola"
                                    className={cn(
                                        "p-1.5 rounded-lg transition-all disabled:opacity-50",
                                        theme === "dark"
                                            ? "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                                            : "bg-red-100 text-red-700 hover:bg-red-200"
                                    )}
                                >
                                    <Square className="w-3.5 h-3.5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => { fetchActiveTask(); fetchRecords() }}
                            title="Actualizar"
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                theme === "dark"
                                    ? "text-gray-400 hover:text-white hover:bg-white/5"
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {activeTask?.status === "running" && (
                    <div className={cn("w-full h-1 rounded-full mb-2", theme === "dark" ? "bg-white/10" : "bg-gray-100")}>
                        <div
                            className="h-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                            style={{
                                width: `${Math.min(100, activeTask.maxIterations > 0
                                    ? (activeTask.progress.processed / activeTask.maxIterations) * 100
                                    : 0)}%`
                            }}
                        />
                    </div>
                )}

                {/* Stats row */}
                {activeTask && (
                    <div className={cn("flex items-center gap-4 mb-2.5 text-xs", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        <span>Proc. <b className={theme === "dark" ? "text-white" : "text-gray-800"}>{activeTask.progress.processed}</b></span>
                        <span>Guard. <b className="text-emerald-500">{activeTask.progress.saved}</b></span>
                        <span>Desc. <b className="text-red-400">{activeTask.progress.discarded}</b></span>
                        {activeTask.progress.lastCode && (
                            <span className="ml-auto font-mono text-gray-400 truncate max-w-[60px]">
                                {activeTask.progress.lastCode}
                            </span>
                        )}
                    </div>
                )}
                {activeTask?.progress?.lastError && (
                    <p className="text-xs text-red-400 mb-2 truncate">Error: {activeTask.progress.lastError}</p>
                )}

                {/* Enqueue row */}
                <div className="flex items-center gap-2">
                    <label className={cn("text-xs flex-shrink-0", theme === "dark" ? "text-gray-400" : "text-gray-500")}>
                        Iter.
                    </label>
                    <input
                        type="number"
                        value={maxIterInput}
                        onChange={e => setMaxIterInput(e.target.value)}
                        min={1}
                        max={500}
                        className={cn(
                            "w-16 px-2 py-1 rounded-lg text-xs border outline-none",
                            theme === "dark"
                                ? "bg-white/5 border-white/10 text-white"
                                : "bg-gray-50 border-gray-200 text-gray-900"
                        )}
                    />
                    <button
                        onClick={handleEnqueueTask}
                        disabled={botLoading}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {activeTask?.status === "running"
                            ? <><Plus className="w-3.5 h-3.5" /> Encolar</>
                            : <><Play className="w-3.5 h-3.5" /> Iniciar</>
                        }
                    </button>
                </div>
            </div>

            {/* Sección de filtros */}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Búsqueda nombre/CUIL */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 block text-gray-500">Nombre / CUIL</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={e => handleFilterChange("search", e.target.value)}
                                    placeholder="Buscar..."
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

                        {/* Obra Social */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 block text-gray-500">Obra Social</label>
                            <input
                                type="text"
                                value={filters.obraSocial}
                                onChange={e => handleFilterChange("obraSocial", e.target.value)}
                                placeholder="Filtrar por obra social..."
                                className={cn(
                                    "w-full px-3 py-2 rounded-xl text-sm border transition-all outline-none",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-300"
                                )}
                            />
                        </div>

                        {/* Provincia */}
                        <div>
                            <label className="text-xs font-medium mb-1.5 block text-gray-500">Provincia</label>
                            <input
                                type="text"
                                value={filters.provincia}
                                onChange={e => handleFilterChange("provincia", e.target.value)}
                                placeholder="Filtrar por provincia..."
                                className={cn(
                                    "w-full px-3 py-2 rounded-xl text-sm border transition-all outline-none",
                                    theme === "dark"
                                        ? "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50"
                                        : "bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-purple-300"
                                )}
                            />
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
                        onClick={fetchRecords}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95",
                            "bg-gradient-to-r from-purple-600 to-blue-600"
                        )}
                    >
                        Aplicar filtros
                    </button>
                </div>
            </div>

            {/* Tabla de registros */}
            <div className={cn(
                "rounded-2xl border overflow-hidden",
                theme === "dark" ? "bg-[#1a1333]/50 border-white/5" : "bg-white border-gray-100 shadow-sm"
            )}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className={cn(
                                "text-center text-xs font-medium uppercase tracking-wider",
                                theme === "dark" ? "bg-white/5 text-gray-400" : "bg-gray-50 text-gray-500"
                            )}>
                                <th className="px-2 py-2">Fecha</th>
                                <th className="px-2 py-2">Nombre</th>
                                <th className="px-2 py-2">CUIL</th>
                                <th className="px-2 py-2">Obra Social</th>
                                <th className="px-2 py-2">Provincia</th>
                                <th className="px-2 py-2">Localidad</th>
                                <th className="px-2 py-2">Edad</th>
                                <th className="px-2 py-2">Últ. Aporte</th>
                                <th className="px-2 py-2">Trim. pagos</th>
                                <th className="px-2 py-2">Padrón</th>
                            </tr>
                        </thead>
                        <tbody className={cn("divide-y", theme === "dark" ? "divide-white/5" : "divide-gray-100")}>
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-2 py-3 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
                                            <span className="text-gray-500">Cargando datos...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : records.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-2 py-6 text-center text-gray-500">
                                        No se encontraron registros nativos
                                    </td>
                                </tr>
                            ) : (
                                records.map(rec => (
                                    <tr
                                        key={rec._id}
                                        onClick={() => setDetailRecord(rec)}
                                        className={cn(
                                            "transition-colors text-xs cursor-pointer",
                                            theme === "dark" ? "hover:bg-white/5 text-gray-300" : "hover:bg-gray-50 text-gray-700"
                                        )}
                                    >
                                        <td className="px-2 py-2 text-center whitespace-nowrap">{formatDateTime(rec.createdAt)}</td>
                                        <td className="px-2 py-2 text-center font-medium max-w-[110px] overflow-hidden">
                                            <span className="block truncate">{rec.nombre.toUpperCase()}</span>
                                        </td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap font-mono">{rec.cuil || "-"}</td>
                                        <td className="px-2 py-2 text-center max-w-[130px] overflow-hidden">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-md text-xs font-medium no-underline block truncate",
                                                theme === "dark" ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800"
                                            )}>
                                                {rec.obraSocial}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-center max-w-[80px] overflow-hidden">
                                            <span className="block truncate">{rec.provincia || "-"}</span>
                                        </td>
                                        <td className="px-2 py-2 text-center max-w-[80px] overflow-hidden">
                                            <span className="block truncate">{rec.localidad || "-"}</span>
                                        </td>
                                        <td className="px-2 py-2 text-center">{rec.edad ?? "-"}</td>
                                        <td className="px-2 py-2 text-center whitespace-nowrap font-mono">{rec.ultimoAporte || "-"}</td>
                                        <td className="px-2 py-2 text-center">
                                            <span className={cn(
                                                "px-1.5 py-0.5 rounded-md text-xs font-medium",
                                                (rec.trimPagos ?? 0) >= 2
                                                    ? theme === "dark" ? "bg-blue-500/20 text-blue-300" : "bg-blue-100 text-blue-800"
                                                    : theme === "dark" ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-600"
                                            )}>
                                                {rec.trimPagos ?? 0}
                                            </span>
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            {(() => {
                                                const p = rec.padron
                                                if (!p || !p.status) return <span className={cn("px-1.5 py-0.5 rounded-md text-xs", theme === "dark" ? "text-gray-600" : "text-gray-400")}>—</span>
                                                const calcExpiry = (pd: string | null | undefined) => {
                                                    if (!pd) return '—'
                                                    const [mm, yyyy] = pd.split('/')
                                                    if (!mm || !yyyy) return pd
                                                    const d = new Date(parseInt(yyyy), parseInt(mm) - 1 + 12, 1)
                                                    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
                                                }
                                                const map: Record<string, { label: string; cls: string }> = {
                                                    not_found:     { label: 'No',                    cls: theme === 'dark' ? 'bg-green-500/20 text-green-300'  : 'bg-green-100 text-green-700' },
                                                    found_expired: { label: 'No',                    cls: theme === 'dark' ? 'bg-green-500/20 text-green-300'  : 'bg-green-100 text-green-700' },
                                                    found_active:  { label: calcExpiry(p.periodoDesde), cls: theme === 'dark' ? 'bg-red-500/20 text-red-300'   : 'bg-red-100 text-red-700' },
                                                    captcha_failed:{ label: 'CAPTCHA',               cls: theme === 'dark' ? 'bg-orange-500/20 text-orange-300': 'bg-orange-100 text-orange-700' },
                                                    error:         { label: 'Error',                 cls: theme === 'dark' ? 'bg-red-500/20 text-red-400'     : 'bg-red-50 text-red-600' },
                                                }
                                                const b = map[p.status] ?? { label: '—', cls: '' }
                                                return <span className={cn("px-1.5 py-0.5 rounded-md text-xs font-medium", b.cls)}>{b.label}</span>
                                            })()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de detalle del registro */}
            {detailRecord && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
                    onClick={() => setDetailRecord(null)}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className={cn(
                            "animate-in zoom-in-95 fade-in duration-200",
                            "relative max-w-lg w-full rounded-2xl shadow-2xl border p-6",
                            theme === "dark" ? "bg-[#1a1333] border-white/10" : "bg-white border-gray-200"
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={cn("text-lg font-semibold", theme === "dark" ? "text-white" : "text-gray-800")}>
                                Detalle del Registro
                            </h3>
                            <button
                                onClick={() => setDetailRecord(null)}
                                className={cn(
                                    "p-1 rounded-lg transition-colors",
                                    theme === "dark" ? "hover:bg-white/10 text-gray-400 hover:text-white" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                                )}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className={cn("rounded-lg p-4 space-y-2", theme === "dark" ? "bg-white/5" : "bg-gray-50")}>
                            {[
                                ["Nombre",            detailRecord.nombre],
                                ["CUIL",              detailRecord.cuil],
                                ["Obra Social",       detailRecord.obraSocial],
                                ["Cód. Obra Social",  detailRecord.codigoObraSocial || "-"],
                                ["Provincia",         detailRecord.provincia || "-"],
                                ["Localidad",         detailRecord.localidad || "-"],
                                ["Edad",              String(detailRecord.edad ?? "-")],
                                ["Últ. Aporte",       detailRecord.ultimoAporte || "-"],
                                ["Trim. Pagos",       String(detailRecord.trimPagos ?? "-")],
                                ["DNI Origen",        detailRecord.dniOrigen || "-"],
                                ["Teléfono",          "-"],
                                ["Registrado",        formatDateTime(detailRecord.createdAt)],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between items-center text-sm">
                                    <span className={cn("font-medium", theme === "dark" ? "text-gray-400" : "text-gray-500")}>{label}</span>
                                    <span className={cn("text-right", theme === "dark" ? "text-gray-200" : "text-gray-800")}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
